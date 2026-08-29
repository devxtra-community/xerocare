import { Source } from '../config/dataSource';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceType } from '../entities/enums/invoiceType';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { ContractStatus } from '../entities/enums/contractStatus';
import { SaleType } from '../entities/enums/saleType';
import { LeaseType } from '../entities/enums/leaseType';
import { ProductAllocation, AllocationStatus } from '../entities/productAllocationEntity';
import { UsageRecord } from '../entities/usageRecordEntity';
import { AppError } from '../errors/appError';
import { logAudit } from './auditLogService';
import { resolveBillingCycle } from '../utils/billingPeriod';

/**
 * Contract Renewal — the Finance-facing "this contract is entering its final billing
 * period, does the customer want to renew?" workflow.
 *
 * Scoped to RENT and LEASE-FSM only: both bill through the same recurring
 * meter-reading/usage cycle (see usageService.ts), so "one more billing period" means
 * the same thing for either — push out effectiveTo and let the next recordUsage call
 * pick up where it left off. LEASE-EMI has no such cycle (a fixed installment schedule
 * instead); extending its tenure would mean recomputing that schedule, a genuinely
 * different feature, so it's excluded here rather than half-supported.
 */

function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isRenewableContract(invoice: Invoice): boolean {
  if (invoice.saleType === SaleType.RENT) return true;
  if (invoice.saleType === SaleType.LEASE && invoice.leaseType === LeaseType.FSM) return true;
  return false;
}

export interface OngoingContractSummary {
  id: string;
  invoiceNumber: string;
  saleType: string;
  customerId?: string;
  customerName?: string | null;
  branchId?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  monthlyRent?: number;
  rentPeriod?: string;
  leaseType?: string;
  contractStatus?: string;
  status?: string;
  renewalDecision?: string | null;
  renewalDecisionBy?: string;
  renewalDecisionAt?: Date;
  cycleDays: number;
  daysRemaining: number;
  /** Real billing periods already invoiced (USAGE bills only — ADVANCE and
   *  SECURITY_DEPOSIT rows are payment wrappers with placeholder dates, not periods). */
  periodsBilled: number;
  /** Periods still to bill before the contract's end date is reached. */
  periodsRemaining: number;
  periodsTotal: number;
  /** End date of the latest period actually billed — how far billing has got, which is
   *  not the same thing as how far the calendar has got. */
  billedThrough?: string;
  /** Every period through effectiveTo has been billed; nothing left to invoice. */
  isFullyBilled: boolean;
  /** True once EITHER the calendar or the billing has reached the final period. */
  isLastPeriod: boolean;
  /** Which of the two put it there — drives how the status reads in the UI. */
  lastPeriodReason?: 'CALENDAR' | 'BILLING';
  isPastEnd: boolean;
  machineDescriptions: string[];
}

/**
 * Every RENT / LEASE-FSM contract still live enough to matter for renewal — ACTIVE, or
 * COMPLETED but not yet decided (the customer's final period was billed, but Finance
 * hasn't said whether they're renewing). CANCELLED contracts are never renewal
 * candidates. Sorted soonest-ending first so the most urgent ones lead the table.
 */
export async function getOngoingContracts(branchId: string): Promise<OngoingContractSummary[]> {
  const invoiceRepo = Source.getRepository(Invoice);
  const invoices = await invoiceRepo.find({
    where: [
      {
        branchId,
        type: InvoiceType.PROFORMA,
        saleType: SaleType.RENT,
        contractStatus: ContractStatus.ACTIVE,
      },
      {
        branchId,
        type: InvoiceType.PROFORMA,
        saleType: SaleType.RENT,
        contractStatus: ContractStatus.COMPLETED,
      },
      {
        branchId,
        type: InvoiceType.PROFORMA,
        saleType: SaleType.LEASE,
        contractStatus: ContractStatus.ACTIVE,
      },
      {
        branchId,
        type: InvoiceType.PROFORMA,
        saleType: SaleType.LEASE,
        contractStatus: ContractStatus.COMPLETED,
      },
    ],
    relations: ['items', 'productAllocations'],
  });

  const renewable = invoices.filter(isRenewableContract);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // How far BILLING has actually got on each contract, which is a different question
  // from how far the calendar has got. Periods are recorded when the meter is read, not
  // on a timer, so the two drift apart routinely — a contract can be eleven periods into
  // a twelve-period term while its end date is still months away. Judging "final period"
  // on the calendar alone (what this used to do) meant a contract with one period left
  // to bill still reported a full year remaining and never surfaced a renewal decision.
  const billingProgress = new Map<string, { billed: number; billedThrough: Date | null }>();
  const contractIds = renewable.map((inv) => inv.id);
  if (contractIds.length > 0) {
    const rows = await Source.getRepository(UsageRecord)
      .createQueryBuilder('u')
      .select('u.contractId', 'contractId')
      .addSelect('COUNT(*)', 'billed')
      .addSelect('MAX(u.billingPeriodEnd)', 'billedThrough')
      .where('u.contractId IN (:...contractIds)', { contractIds })
      // USAGE only — an ADVANCE or SECURITY_DEPOSIT row is a payment sign-off carrying
      // placeholder dates, and counting either would report a period that never happened.
      .andWhere('u.billType = :billType', { billType: 'USAGE' })
      .groupBy('u.contractId')
      .getRawMany<{ contractId: string; billed: string; billedThrough: string | Date | null }>();
    for (const r of rows) {
      billingProgress.set(r.contractId, {
        billed: Number(r.billed) || 0,
        billedThrough: r.billedThrough ? new Date(r.billedThrough) : null,
      });
    }
  }

  const summaries: OngoingContractSummary[] = renewable.map((inv) => {
    const cycle = resolveBillingCycle(inv.rentPeriod, inv.billingCycleInDays);
    const effectiveTo = inv.effectiveTo ? new Date(inv.effectiveTo) : undefined;
    let daysRemaining = Infinity;
    if (effectiveTo) {
      const endMidnight = new Date(effectiveTo);
      endMidnight.setHours(0, 0, 0, 0);
      daysRemaining = Math.round((endMidnight.getTime() - today.getTime()) / 86400000);
    }

    const progress = billingProgress.get(inv.id);
    const periodsBilled = progress?.billed ?? 0;

    // Periods still to bill, counted by ROLLING THE REAL BOUNDARIES FORWARD rather than
    // dividing the leftover days by a nominal cycle length.
    //
    // Dividing was wrong for the ordinary case, not an edge one. resolveBillingCycle
    // calls a MONTHLY cycle 30 days, but a calendar month is 28-31, so a contract with
    // exactly one month left to bill (e.g. billed through 28 Oct, ending 28 Nov — 31
    // days, because October has 31) came out as ceil(31/30) = 2 periods remaining. That
    // invented a period that will never be billed, reported the wrong total ("2 of 4"
    // instead of "2 of 3"), and — worse — made the "one cycle left" test miss by a
    // single day, so the contract never surfaced a renewal decision or an Extend button
    // on the period the customer was actually in.
    //
    // Walking the boundaries removes the guesswork: each period runs from the previous
    // period's end + 1 day to the same day next cycle, minus a day, clamped at
    // effectiveTo. That is exactly how a period is rolled forward when a usage bill is
    // recorded (see UsageRecordingModal's next-period calculation), including the
    // month-overflow behaviour that re-anchors the cycle after a short month — so this
    // count matches what will genuinely be billed, whatever the month lengths are.
    const nextPeriodEnd = (start: Date): Date => {
      const end = new Date(start);
      if (cycle.months >= 1 && Number.isInteger(cycle.months)) {
        end.setMonth(end.getMonth() + cycle.months);
      } else {
        // CUSTOM cycles are defined in days, not months.
        end.setDate(end.getDate() + cycle.days);
      }
      end.setDate(end.getDate() - 1);
      return end;
    };

    let periodsRemaining = 0;
    if (effectiveTo) {
      const contractEnd = new Date(effectiveTo);
      contractEnd.setHours(0, 0, 0, 0);

      // Where billing has reached. With nothing billed yet, start the walk the day
      // BEFORE the contract begins so the first period counted is the contract's own.
      let cursor: Date | null = null;
      if (progress?.billedThrough) {
        cursor = new Date(progress.billedThrough);
      } else if (inv.effectiveFrom) {
        cursor = new Date(inv.effectiveFrom);
        cursor.setDate(cursor.getDate() - 1);
      }

      if (cursor) {
        cursor.setHours(0, 0, 0, 0);
        // Bounded: a contract can only hold so many periods, and a malformed cycle must
        // never spin here.
        const MAX_PERIODS = 600;
        while (cursor.getTime() < contractEnd.getTime() && periodsRemaining < MAX_PERIODS) {
          const start = new Date(cursor);
          start.setDate(start.getDate() + 1);
          let end = nextPeriodEnd(start);
          if (end.getTime() > contractEnd.getTime()) end = contractEnd;
          if (end.getTime() <= cursor.getTime()) break; // no forward progress — bail out
          periodsRemaining += 1;
          cursor = end;
        }
      }
    }

    const isFullyBilled = !!effectiveTo && periodsRemaining === 0;

    const calendarLastPeriod = daysRemaining <= cycle.days;
    // One period left to bill IS the final period — no day arithmetic, so a 31-day month
    // can no longer push it out of range.
    const billingLastPeriod = !!effectiveTo && periodsRemaining <= 1;
    const isLastPeriod = calendarLastPeriod || billingLastPeriod;

    const machines = (inv.productAllocations || [])
      .filter((a) => a.status === AllocationStatus.ALLOCATED)
      .map((a) => a.serialNumber)
      .filter(Boolean) as string[];

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      saleType: inv.saleType,
      customerId: inv.customerId,
      customerName: inv.customerName,
      branchId: inv.branchId,
      effectiveFrom: inv.effectiveFrom,
      effectiveTo: inv.effectiveTo,
      monthlyRent: Number(inv.monthlyRent || inv.monthlyLeaseAmount || 0),
      rentPeriod: inv.rentPeriod,
      leaseType: inv.leaseType,
      contractStatus: inv.contractStatus,
      status: inv.status,
      renewalDecision: inv.renewalDecision ?? null,
      renewalDecisionBy: inv.renewalDecisionBy,
      renewalDecisionAt: inv.renewalDecisionAt,
      cycleDays: cycle.days,
      daysRemaining,
      periodsBilled,
      periodsRemaining,
      periodsTotal: periodsBilled + periodsRemaining,
      // Formatted from local date parts, not toISOString(): the driver hands back a
      // 'date' column as local midnight, which toISOString() shifts back across UTC and
      // reports as the previous day on any timezone ahead of it.
      billedThrough: progress?.billedThrough ? toDateOnly(progress.billedThrough) : undefined,
      isFullyBilled,
      isLastPeriod,
      lastPeriodReason: !isLastPeriod ? undefined : calendarLastPeriod ? 'CALENDAR' : 'BILLING',
      isPastEnd: daysRemaining < 0,
      machineDescriptions: machines,
    };
  });

  // Soonest-to-need-a-decision first, by whichever clock is further along — a contract
  // one period from being fully billed is as urgent as one a month from its end date.
  const urgency = (c: OngoingContractSummary) =>
    Math.min(c.daysRemaining, c.periodsRemaining * c.cycleDays);
  return summaries.sort((a, b) => urgency(a) - urgency(b));
}

/**
 * Finance's decision for a last-period contract: will the customer renew, or is the
 * contract ending? Recording "CONTRACT_ENDED" does nothing beyond stopping the alert
 * from nagging about this contract again — the contract still runs its normal course
 * (final period bills as usual; the existing daily expiry job releases the machine on
 * schedule once effectiveTo passes). Only "RENEWAL_APPROVED" unlocks Extend Contract.
 */
export async function recordRenewalDecision(
  invoiceId: string,
  userId: string,
  decision: 'RENEWAL_APPROVED' | 'CONTRACT_ENDED',
): Promise<Invoice> {
  const invoiceRepo = Source.getRepository(Invoice);
  const invoice = await invoiceRepo.findOne({ where: { id: invoiceId } });
  if (!invoice) throw new AppError('Contract not found', 404);
  if (!isRenewableContract(invoice)) {
    throw new AppError('Renewal decisions apply to Rent and Lease-FSM contracts only.', 400);
  }
  if (
    invoice.contractStatus !== ContractStatus.ACTIVE &&
    invoice.contractStatus !== ContractStatus.COMPLETED
  ) {
    throw new AppError('This contract is not in a state that can be decided on.', 400);
  }

  invoice.renewalDecision = decision;
  invoice.renewalDecisionBy = userId;
  invoice.renewalDecisionAt = new Date();
  await invoiceRepo.save(invoice);

  await logAudit(invoice.id, 'RENEWAL_DECISION', userId, `Renewal decision recorded: ${decision}`);

  return invoice;
}

export interface ExtendContractResult {
  invoice: Invoice;
  warning?: string;
}

/**
 * Pushes a contract's effectiveTo out by N months so it keeps billing through
 * usageService.ts's normal monthly cycle — the same mechanism used throughout its
 * original term, nothing new. Requires renewalDecision to already be
 * RENEWAL_APPROVED (Finance can't skip straight to extending without recording why).
 */
export async function extendContract(
  invoiceId: string,
  userId: string,
  extendByMonths: number,
): Promise<ExtendContractResult> {
  if (!Number.isInteger(extendByMonths) || extendByMonths < 1 || extendByMonths > 60) {
    throw new AppError('extendByMonths must be a whole number between 1 and 60.', 400);
  }

  const invoiceRepo = Source.getRepository(Invoice);
  const invoice = await invoiceRepo.findOne({
    where: { id: invoiceId },
    relations: ['productAllocations'],
  });
  if (!invoice) throw new AppError('Contract not found', 404);
  if (!isRenewableContract(invoice)) {
    throw new AppError('Only Rent and Lease-FSM contracts can be extended here.', 400);
  }
  if (invoice.contractStatus === ContractStatus.CANCELLED) {
    throw new AppError('A cancelled contract cannot be extended.', 400);
  }
  if (invoice.renewalDecision !== 'RENEWAL_APPROVED') {
    throw new AppError(
      'Record the customer-approved renewal decision for this contract before extending it.',
      400,
    );
  }
  if (!invoice.effectiveTo) {
    throw new AppError('This contract has no end date to extend from.', 400);
  }

  const oldEffectiveTo = new Date(invoice.effectiveTo);
  const newEffectiveTo = new Date(oldEffectiveTo);
  newEffectiveTo.setMonth(newEffectiveTo.getMonth() + extendByMonths);
  invoice.effectiveTo = newEffectiveTo;

  if (invoice.saleType === SaleType.LEASE) {
    invoice.leaseTenureMonths = Number(invoice.leaseTenureMonths || 0) + extendByMonths;
  }

  let warning: string | undefined;

  // A contract whose final period was already billed (COMPLETED) resumes normal
  // billing — clear the completion snapshot so it reads as an ongoing contract again.
  if (invoice.contractStatus === ContractStatus.COMPLETED) {
    invoice.contractStatus = ContractStatus.ACTIVE;
    invoice.completedAt = undefined;
    invoice.isFinalMonth = false;
  }

  // If the daily expiry job already ran (status flipped to EXPIRED, machine released
  // to RETURNED) before Finance acted, undo both — but only if the machine hasn't
  // since been reallocated to something else (the active-allocation unique constraint
  // would reject that anyway); if it has, extension still proceeds, just without the
  // machine — Finance needs to allocate a replacement manually.
  if (invoice.status === InvoiceStatus.EXPIRED) {
    invoice.status = InvoiceStatus.ACTIVE_CONTRACT;

    const allocationRepo = Source.getRepository(ProductAllocation);
    const returnedAllocations = (invoice.productAllocations || []).filter(
      (a) => a.status === AllocationStatus.RETURNED,
    );
    const reactivated: string[] = [];
    const blocked: string[] = [];
    for (const alloc of returnedAllocations) {
      if (!alloc.productId) continue;
      const conflict = await allocationRepo.findOne({
        where: { productId: alloc.productId, status: AllocationStatus.ALLOCATED },
      });
      if (conflict) {
        blocked.push(alloc.serialNumber);
        continue;
      }
      alloc.status = AllocationStatus.ALLOCATED;
      alloc.endTimestamp = undefined;
      await allocationRepo.save(alloc);
      reactivated.push(alloc.serialNumber);
    }
    if (blocked.length > 0) {
      warning = `This contract had already expired and its machine(s) were released. ${blocked.join(', ')} ${blocked.length === 1 ? 'has' : 'have'} since been allocated elsewhere and could not be restored automatically — allocate a replacement machine for this contract.`;
    }
  }

  // Reset for the next cycle — the alert should prompt Finance again once this
  // (later) end date itself enters its final period, not show the old decision.
  invoice.renewalDecision = undefined;
  invoice.renewalDecisionBy = undefined;
  invoice.renewalDecisionAt = undefined;

  await invoiceRepo.save(invoice);

  await logAudit(
    invoice.id,
    'CONTRACT_EXTENDED',
    userId,
    `Extended by ${extendByMonths} month(s): ${oldEffectiveTo.toISOString().split('T')[0]} → ${newEffectiveTo.toISOString().split('T')[0]}`,
    oldEffectiveTo.toISOString(),
    newEffectiveTo.toISOString(),
  );

  return { invoice, warning };
}
