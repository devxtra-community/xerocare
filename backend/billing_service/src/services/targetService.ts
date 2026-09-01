import { sign } from 'jsonwebtoken';
import { Source } from '../config/dataSource';
import { EmployeeTarget, TargetTier } from '../entities/employeeTargetEntity';
import { EmployeeTargetAchievement } from '../entities/employeeTargetAchievementEntity';
import { Invoice } from '../entities/invoiceEntity';
import { SaleType } from '../entities/enums/saleType';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { TargetType } from '../entities/enums/targetType';
import { TargetStatus } from '../entities/enums/targetStatus';
import { AppError } from '../errors/appError';
import { logger } from '../config/logger';
import { getBranchCurrencyInfo, getBranchName, searchEmployeesByName } from './billingHelpers';
import { applyBranchQB } from '../middlewares/branchFilterMiddleware';
import { NotificationPublisher } from '../events/publisher/notificationPublisher';
import { TARGET_ASSIGNED } from '../constants/notificationTypes';

export interface RequestUser {
  userId: string;
  role: string;
  branchId: string;
}

export interface AchievementRecord {
  id: string;
  label: string;
  amount: number;
  date: string;
}

export interface AchievementResult {
  achievement: EmployeeTargetAchievement;
  records: AchievementRecord[];
}

export interface EmployeeMonthlyActivity {
  employeeId: string;
  salesCount: number;
  salesRevenue: number;
  rentCount: number;
  rentRevenue: number;
  leaseCount: number;
  leaseRevenue: number;
  totalRevenue: number;
}

const JOB_TARGET_TYPE_MAP: Record<string, TargetType> = {
  SALES: TargetType.SALES,
  RENT_AND_LEASE: TargetType.RENT_LEASE,
  SERVICE_TECHNICIAN: TargetType.SERVICE,
  SERVICE_HELP_DESK: TargetType.SERVICE,
};

export function getCurrentMonthStr(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getPreviousMonthStr(): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getMonthRange(targetMonth: string): { monthStart: Date; monthEnd: Date } {
  const [yearStr, monthStr] = targetMonth.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  return { monthStart, monthEnd };
}

function isMonthStarted(targetMonth: string): boolean {
  return targetMonth <= getCurrentMonthStr();
}

function validateTiers(tiers: unknown): TargetTier[] {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    throw new AppError('At least one incentive tier is required', 400);
  }
  return tiers.map((t: Record<string, unknown>) => {
    const fromPercent = Number(t.fromPercent);
    const toPercent =
      t.toPercent === null || t.toPercent === undefined ? null : Number(t.toPercent);
    const incentivePercent = Number(t.incentivePercent);
    if (
      Number.isNaN(fromPercent) ||
      Number.isNaN(incentivePercent) ||
      (toPercent !== null && Number.isNaN(toPercent))
    ) {
      throw new AppError(
        'Invalid tier values: fromPercent/toPercent/incentivePercent required',
        400,
      );
    }
    return { fromPercent, toPercent, incentivePercent };
  });
}

async function resolveEmployeeJobAndBranch(
  employeeId: string,
): Promise<{ job: string | null; branchId: string | null } | null> {
  try {
    const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3002';
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    const response = await fetch(`${employeeServiceUrl}/employee/${employeeId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return null;
    const json = await response.json();
    const emp = json?.data;
    if (!emp) return null;
    return { job: emp.employee_job ?? null, branchId: emp.branch_id ?? null };
  } catch (err) {
    logger.error('Error resolving employee job/branch for targets:', err);
    return null;
  }
}

async function fetchServiceAchievementSummary(
  employeeId: string,
  monthStart: Date,
  monthEnd: Date,
): Promise<{ totalAmount: number; dealCount: number }> {
  try {
    const venInvUrl = process.env.VENDOR_INVENTORY_SERVICE_URL || 'http://localhost:3003';
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );

    const url = `${venInvUrl}/service/tickets/achievement-summary?employeeId=${employeeId}&monthStart=${monthStart.toISOString()}&monthEnd=${monthEnd.toISOString()}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });

    if (!response.ok) return { totalAmount: 0, dealCount: 0 };
    const json = await response.json();
    return {
      totalAmount: Number(json?.data?.totalAmount || 0),
      dealCount: Number(json?.data?.dealCount || 0),
    };
  } catch (err) {
    logger.error('Error fetching service achievement summary from ven_inv_service:', err);
    return { totalAmount: 0, dealCount: 0 };
  }
}

export class TargetService {
  private targetRepo = Source.getRepository(EmployeeTarget);
  private achievementRepo = Source.getRepository(EmployeeTargetAchievement);
  private invoiceRepo = Source.getRepository(Invoice);

  private assertBranchAccess(user: RequestUser, branchId: string) {
    if (user.role === 'MANAGER' && user.branchId !== branchId) {
      throw new AppError('Access denied: target belongs to another branch', 403);
    }
  }

  async createTarget(
    user: RequestUser,
    dto: { employeeId: string; targetMonth: string; targetAmount: number; tiers: unknown },
  ): Promise<EmployeeTarget> {
    const { employeeId, targetMonth, targetAmount } = dto;
    if (!employeeId) throw new AppError('employeeId is required', 400);
    if (!/^\d{4}-\d{2}$/.test(targetMonth || '')) {
      throw new AppError('targetMonth must be in YYYY-MM format', 400);
    }
    if (targetMonth < getCurrentMonthStr()) {
      throw new AppError('targetMonth must be the current or a future month', 400);
    }
    if (!targetAmount || Number(targetAmount) <= 0) {
      throw new AppError('targetAmount must be greater than zero', 400);
    }
    const tiers = validateTiers(dto.tiers);

    const employee = await resolveEmployeeJobAndBranch(employeeId);
    if (!employee || !employee.branchId) {
      throw new AppError('Employee not found', 404);
    }

    this.assertBranchAccess(user, employee.branchId);

    const targetType = employee.job ? JOB_TARGET_TYPE_MAP[employee.job] : undefined;
    if (!targetType) {
      throw new AppError(
        `Employee job '${employee.job || 'UNKNOWN'}' is not eligible for sales targets`,
        400,
      );
    }

    const currencyInfo = await getBranchCurrencyInfo(employee.branchId);

    const target = this.targetRepo.create({
      employeeId,
      branchId: employee.branchId,
      assignedBy: user.userId,
      targetMonth,
      targetAmount: Number(targetAmount),
      targetType,
      currencyCode: currencyInfo?.currencyCode || 'AED',
      tiers,
      status: TargetStatus.ACTIVE,
    });

    let saved: EmployeeTarget;
    try {
      saved = await this.targetRepo.save(target);
    } catch (err: unknown) {
      const pgErr = err as { code?: string };
      if (pgErr.code === '23505') {
        throw new AppError('A target already exists for this employee for this month', 409);
      }
      throw err;
    }

    try {
      await NotificationPublisher.publishInAppRequest({
        recipientId: employeeId,
        title: 'New Target Assigned',
        message: `You have a new ${saved.targetType} target of ${saved.currencyCode} ${saved.targetAmount} for ${targetMonth}.`,
        type: TARGET_ASSIGNED,
        referenceId: saved.id,
        referenceType: 'TARGET',
      });
    } catch (err) {
      logger.error('Failed to publish target-assigned notification:', err);
    }

    return saved;
  }

  async listTargets(
    user: RequestUser,
    filters: { month?: string; employeeId?: string; branchId?: string },
  ): Promise<EmployeeTarget[]> {
    const where: Record<string, unknown> = {};
    if (user.role === 'MANAGER') {
      where.branchId = user.branchId;
    } else if (filters.branchId) {
      where.branchId = filters.branchId;
    }
    if (filters.month) where.targetMonth = filters.month;
    if (filters.employeeId) where.employeeId = filters.employeeId;

    return this.targetRepo.find({ where, order: { targetMonth: 'DESC', createdAt: 'DESC' } });
  }

  async getTargetById(
    user: RequestUser,
    id: string,
  ): Promise<AchievementResult & { target: EmployeeTarget }> {
    const target = await this.targetRepo.findOne({ where: { id } });
    if (!target) throw new AppError('Target not found', 404);
    this.assertBranchAccess(user, target.branchId);

    const result = await this.calculateAchievement(target.id);
    return { target, ...result };
  }

  async updateTarget(
    user: RequestUser,
    id: string,
    dto: { targetAmount?: number; tiers?: unknown },
  ): Promise<EmployeeTarget> {
    const target = await this.targetRepo.findOne({ where: { id } });
    if (!target) throw new AppError('Target not found', 404);
    this.assertBranchAccess(user, target.branchId);

    if (target.status !== TargetStatus.ACTIVE) {
      throw new AppError('Cannot edit a cancelled or completed target', 400);
    }

    const monthStarted = isMonthStarted(target.targetMonth);

    if (dto.targetAmount !== undefined) {
      if (monthStarted && Number(dto.targetAmount) !== Number(target.targetAmount)) {
        throw new AppError('Target amount cannot be changed after the month has started', 400);
      }
      if (!monthStarted) {
        if (Number(dto.targetAmount) <= 0) {
          throw new AppError('targetAmount must be greater than zero', 400);
        }
        target.targetAmount = Number(dto.targetAmount);
      }
    }

    if (dto.tiers !== undefined) {
      target.tiers = validateTiers(dto.tiers);
    }

    return this.targetRepo.save(target);
  }

  async cancelTarget(user: RequestUser, id: string): Promise<EmployeeTarget> {
    const target = await this.targetRepo.findOne({ where: { id } });
    if (!target) throw new AppError('Target not found', 404);
    this.assertBranchAccess(user, target.branchId);

    if (isMonthStarted(target.targetMonth)) {
      throw new AppError('Cannot cancel a target once its month has started', 400);
    }

    target.status = TargetStatus.CANCELLED;
    return this.targetRepo.save(target);
  }

  async listByEmployee(
    user: RequestUser,
    employeeId: string,
  ): Promise<Array<{ target: EmployeeTarget } & AchievementResult>> {
    const where: Record<string, unknown> = { employeeId };
    if (user.role === 'MANAGER') where.branchId = user.branchId;
    const targets = await this.targetRepo.find({ where, order: { targetMonth: 'DESC' } });
    return Promise.all(
      targets.map(async (target) => ({ target, ...(await this.calculateAchievement(target.id)) })),
    );
  }

  /**
   * Fetches targets for a month, scoped to `branchFilter` (as resolved by
   * parseBranchFilter: [] = all branches, [id] = one, [id1,id2,...] = several),
   * optionally narrowed further by employee name.
   */
  private async fetchTargetsForFilter(
    branchFilter: string[],
    month: string,
    search?: string,
  ): Promise<EmployeeTarget[]> {
    const qb = this.targetRepo.createQueryBuilder('t').where('t.targetMonth = :month', { month });
    applyBranchQB(qb as never, 't', branchFilter);
    let targets = await qb.getMany();

    if (search && search.trim()) {
      const matchedIds = new Set(await searchEmployeesByName(search));
      targets = targets.filter((t) => matchedIds.has(t.employeeId));
    }

    return targets;
  }

  private async branchNameMapFor(
    targets: EmployeeTarget[],
  ): Promise<Record<string, string | null>> {
    const uniqueBranchIds = [...new Set(targets.map((t) => t.branchId))];
    const entries = await Promise.all(
      uniqueBranchIds.map(async (id) => [id, await getBranchName(id)] as const),
    );
    return Object.fromEntries(entries);
  }

  async monthlyAchievement(
    _user: RequestUser,
    month: string,
    branchFilter: string[],
    search?: string,
  ): Promise<Array<{ target: EmployeeTarget; branchName: string | null } & AchievementResult>> {
    if (!month) throw new AppError('month is required', 400);

    const targets = await this.fetchTargetsForFilter(branchFilter, month, search);
    const branchNames = await this.branchNameMapFor(targets);

    return Promise.all(
      targets.map(async (target) => ({
        target,
        branchName: branchNames[target.branchId] ?? null,
        ...(await this.calculateAchievement(target.id)),
      })),
    );
  }

  async myTargets(
    user: RequestUser,
  ): Promise<Array<{ target: EmployeeTarget; rank: number | null } & AchievementResult>> {
    const targets = await this.targetRepo.find({
      where: { employeeId: user.userId },
      order: { targetMonth: 'DESC' },
    });
    const currentMonth = getCurrentMonthStr();
    const rows = await Promise.all(
      targets.map(async (target) => {
        const result = await this.calculateAchievement(target.id);
        const rank = target.targetMonth === currentMonth ? await this.getOwnRank(target) : null;
        return { target, rank, ...result };
      }),
    );
    return rows;
  }

  async myTargetMonth(
    user: RequestUser,
    month: string,
  ): Promise<{ target: EmployeeTarget; rank: number | null } & AchievementResult> {
    const target = await this.targetRepo.findOne({
      where: { employeeId: user.userId, targetMonth: month },
    });
    if (!target) throw new AppError('No target found for this month', 404);
    const result = await this.calculateAchievement(target.id);
    const rank = await this.getOwnRank(target);
    return { target, rank, ...result };
  }

  /**
   * Ranking computation for a single branch/month, used to compute an employee's
   * own rank without exposing other employees' rows to them.
   */
  private async rankedTargetsForBranch(
    branchId: string,
    month: string,
  ): Promise<Array<{ target: EmployeeTarget } & AchievementResult>> {
    const targets = await this.targetRepo.find({ where: { branchId, targetMonth: month } });
    const rows = await Promise.all(
      targets.map(async (target) => ({ target, ...(await this.calculateAchievement(target.id)) })),
    );
    rows.sort(
      (a, b) => Number(b.achievement.achievementPercent) - Number(a.achievement.achievementPercent),
    );
    return rows;
  }

  private async getOwnRank(target: EmployeeTarget): Promise<number | null> {
    const rows = await this.rankedTargetsForBranch(target.branchId, target.targetMonth);
    const index = rows.findIndex((row) => row.target.id === target.id);
    return index === -1 ? null : index + 1;
  }

  async leaderboard(
    _user: RequestUser,
    month: string,
    branchFilter: string[],
    search?: string,
  ): Promise<
    Array<{ rank: number; target: EmployeeTarget; branchName: string | null } & AchievementResult>
  > {
    if (!month) throw new AppError('month is required', 400);

    const targets = await this.fetchTargetsForFilter(branchFilter, month, search);
    const branchNames = await this.branchNameMapFor(targets);

    const rows = await Promise.all(
      targets.map(async (target) => ({
        target,
        branchName: branchNames[target.branchId] ?? null,
        ...(await this.calculateAchievement(target.id)),
      })),
    );
    rows.sort(
      (a, b) => Number(b.achievement.achievementPercent) - Number(a.achievement.achievementPercent),
    );
    return rows.map((row, index) => ({ rank: index + 1, ...row }));
  }

  /**
   * Sales/rent/lease activity for EVERY employee who has at least one invoice
   * in the branch for the month — including employees with no target assigned
   * at all. Unlike calculateAchievement (which merges SALE+RENT+LEASE into one
   * bucket per target), this splits them out per saleType so the "all
   * employees" view on the targets page can show real activity even when
   * nobody has set a target yet. Employees with zero invoices simply won't
   * appear in the result; the caller merges this against the full employee
   * roster and zero-fills the rest.
   */
  async branchMonthlyActivity(
    branchFilter: string[],
    month: string,
  ): Promise<EmployeeMonthlyActivity[]> {
    if (!month) throw new AppError('month is required', 400);
    const { monthStart, monthEnd } = getMonthRange(month);

    // Same three statuses calculateAchievement uses for both SALES and
    // RENT_LEASE targets — a single shared filter is correct here too.
    const statuses = [InvoiceStatus.PAID, InvoiceStatus.ACTIVE_CONTRACT, InvoiceStatus.INVOICED];

    const qb = this.invoiceRepo
      .createQueryBuilder('invoice')
      .select('invoice.createdBy', 'employeeId')
      .addSelect('invoice.saleType', 'saleType')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(invoice.totalAmount)', 'revenue')
      .where('invoice.status IN (:...statuses)', { statuses })
      .andWhere('invoice.createdAt >= :monthStart AND invoice.createdAt < :monthEnd', {
        monthStart,
        monthEnd,
      })
      .groupBy('invoice.createdBy')
      .addGroupBy('invoice.saleType');
    applyBranchQB(qb as never, 'invoice', branchFilter);

    const raw = await qb.getRawMany<{
      employeeId: string;
      saleType: SaleType;
      count: string;
      revenue: string;
    }>();

    const SALES_TYPES = new Set<SaleType>([
      SaleType.SALE,
      SaleType.PRODUCT_SALE,
      SaleType.SPAREPART_SALE,
    ]);

    const byEmployee = new Map<string, EmployeeMonthlyActivity>();
    const entryFor = (employeeId: string): EmployeeMonthlyActivity => {
      let entry = byEmployee.get(employeeId);
      if (!entry) {
        entry = {
          employeeId,
          salesCount: 0,
          salesRevenue: 0,
          rentCount: 0,
          rentRevenue: 0,
          leaseCount: 0,
          leaseRevenue: 0,
          totalRevenue: 0,
        };
        byEmployee.set(employeeId, entry);
      }
      return entry;
    };

    for (const row of raw) {
      const entry = entryFor(row.employeeId);
      const count = Number(row.count) || 0;
      const revenue = Number(row.revenue) || 0;
      if (SALES_TYPES.has(row.saleType)) {
        entry.salesCount += count;
        entry.salesRevenue += revenue;
      } else if (row.saleType === SaleType.RENT) {
        entry.rentCount += count;
        entry.rentRevenue += revenue;
      } else if (row.saleType === SaleType.LEASE) {
        entry.leaseCount += count;
        entry.leaseRevenue += revenue;
      }
      entry.totalRevenue += revenue;
    }

    return [...byEmployee.values()];
  }

  async adminOverview(
    user: RequestUser,
    filters: { branchId?: string; month?: string; targetType?: string },
  ): Promise<Array<{ target: EmployeeTarget } & AchievementResult>> {
    if (user.role !== 'ADMIN') throw new AppError('Access denied', 403);

    const where: Record<string, unknown> = {};
    if (filters.branchId) where.branchId = filters.branchId;
    if (filters.month) where.targetMonth = filters.month;
    if (filters.targetType) where.targetType = filters.targetType;

    const targets = await this.targetRepo.find({ where, order: { targetMonth: 'DESC' } });
    const rows = await Promise.all(
      targets.map(async (target) => ({ target, ...(await this.calculateAchievement(target.id)) })),
    );
    rows.sort(
      (a, b) => Number(b.achievement.achievementPercent) - Number(a.achievement.achievementPercent),
    );
    return rows;
  }

  /**
   * Recomputes (and upserts) the achievement for a target. Once an achievement is
   * finalized (by the monthly cron), this becomes a pure read — no further writes,
   * per the "locked forever" finalization rule.
   */
  async calculateAchievement(targetId: string): Promise<AchievementResult> {
    const target = await this.targetRepo.findOne({ where: { id: targetId } });
    if (!target) throw new AppError('Target not found', 404);

    const existing = await this.achievementRepo.findOne({ where: { targetId } });
    if (existing?.isFinalized) {
      return { achievement: existing, records: [] };
    }

    const { monthStart, monthEnd } = getMonthRange(target.targetMonth);

    let achievedAmount = 0;
    let dealCount = 0;
    let records: AchievementRecord[] = [];

    if (target.targetType === TargetType.SALES || target.targetType === TargetType.RENT_LEASE) {
      const saleTypes =
        target.targetType === TargetType.SALES
          ? [SaleType.SALE, SaleType.PRODUCT_SALE, SaleType.SPAREPART_SALE]
          : [SaleType.RENT, SaleType.LEASE];
      const statuses =
        target.targetType === TargetType.SALES
          ? [InvoiceStatus.PAID, InvoiceStatus.ACTIVE_CONTRACT, InvoiceStatus.INVOICED]
          : [InvoiceStatus.ACTIVE_CONTRACT, InvoiceStatus.INVOICED, InvoiceStatus.PAID];

      const invoices = await this.invoiceRepo
        .createQueryBuilder('invoice')
        .where('invoice.createdBy = :employeeId', { employeeId: target.employeeId })
        .andWhere('invoice.saleType IN (:...saleTypes)', { saleTypes })
        .andWhere('invoice.status IN (:...statuses)', { statuses })
        .andWhere('invoice.createdAt >= :monthStart AND invoice.createdAt < :monthEnd', {
          monthStart,
          monthEnd,
        })
        .getMany();

      achievedAmount = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
      dealCount = invoices.length;
      records = invoices.map((inv) => ({
        id: inv.id,
        label: inv.invoiceNumber,
        amount: Number(inv.totalAmount || 0),
        date: inv.createdAt.toISOString(),
      }));
    } else {
      const summary = await fetchServiceAchievementSummary(target.employeeId, monthStart, monthEnd);
      achievedAmount = summary.totalAmount;
      dealCount = summary.dealCount;
    }

    const achievementPercent =
      Number(target.targetAmount) > 0 ? (achievedAmount / Number(target.targetAmount)) * 100 : 0;

    const sortedTiers = [...target.tiers].sort((a, b) => a.fromPercent - b.fromPercent);
    const matchedTier = sortedTiers.find(
      (t) =>
        achievementPercent >= t.fromPercent &&
        (t.toPercent === null || achievementPercent < t.toPercent),
    );
    const appliedTierPercent = matchedTier?.incentivePercent ?? 0;
    const incentiveAmount = achievedAmount * (appliedTierPercent / 100);

    const fields = {
      targetId: target.id,
      employeeId: target.employeeId,
      branchId: target.branchId,
      targetMonth: target.targetMonth,
      targetAmount: target.targetAmount,
      achievedAmount,
      achievementPercent: Number(achievementPercent.toFixed(2)),
      appliedTierPercent,
      incentiveAmount: Number(incentiveAmount.toFixed(2)),
      dealCount,
      calculatedAt: new Date(),
      isFinalized: false,
    };

    let saved: EmployeeTargetAchievement;
    if (existing) {
      Object.assign(existing, fields);
      saved = await this.achievementRepo.save(existing);
    } else {
      saved = await this.achievementRepo.save(this.achievementRepo.create(fields));
    }

    return { achievement: saved, records };
  }

  /**
   * Locks an achievement in place. Called only by the monthly finalization cron.
   * Idempotent — re-running for an already-finalized target is a no-op.
   */
  async finalizeTarget(targetId: string): Promise<EmployeeTargetAchievement> {
    const { achievement } = await this.calculateAchievement(targetId);
    if (achievement.isFinalized) return achievement;
    achievement.isFinalized = true;
    return this.achievementRepo.save(achievement);
  }
}
