import { Source } from '../config/dataSource';
import { Invoice } from '../entities/invoiceEntity';
import { UsageRecord } from '../entities/usageRecordEntity';
import { InstallationRequest } from '../entities/installationRequestEntity';
import { ReplacementRequest, ReplacementStatus } from '../entities/replacementRequestEntity';
import { EmployeeExpenseRequest } from '../entities/employeeExpenseRequestEntity';
import { InvoiceStatus } from '../entities/enums/invoiceStatus';
import { InvoiceType } from '../entities/enums/invoiceType';
import { logger } from '../config/logger';

/**
 * Counts of work waiting for someone to act on, keyed for the sidebar badge.
 *
 * Every key means the same thing: "there are N things here you have not dealt with yet".
 * A key is only worth adding if a dot next to that menu item would actually prompt
 * someone to click it — report pages (Balance Sheet, Chart of Accounts) have no such
 * state and deliberately get no key.
 *
 * Where a single record queues for different people at different stages, it gets one key
 * PER audience rather than one shared key. A replacement sitting at PENDING_FINANCE is
 * Finance's work; the same record at APPROVED is the employee's, and at DELIVERED it is
 * the service desk's. Collapsing those into one "replacements" count would light the dot
 * for all three roles whenever any one of them had something to do.
 */
export type NavCounts = Record<string, number>;

/** Statuses a replacement can sit in while it waits for each desk. */
const REPLACEMENT_QUEUES = {
  /** Raised by an employee, or swapped and now awaiting the stock/GWR audit. */
  FINANCE: [ReplacementStatus.PENDING_FINANCE, ReplacementStatus.INSTALLED],
  /** Finance approved it — the employee still has to choose the incoming unit. */
  EMPLOYEE: [ReplacementStatus.APPROVED],
  /** Unit chosen — the service desk delivers, assigns a technician and closes it out. */
  SERVICE: [
    ReplacementStatus.UNIT_SELECTED,
    ReplacementStatus.DELIVERED,
    ReplacementStatus.TECHNICIAN_ASSIGNED,
  ],
} as const;

/**
 * Pending counts owned by the billing service, for one branch.
 *
 * Runs every query concurrently — this endpoint is polled by every open sidebar, so it
 * must not become a serial chain of round-trips.
 */
export async function getBillingNavCounts(branchId: string): Promise<NavCounts> {
  const invoiceRepo = Source.getRepository(Invoice);
  const usageRepo = Source.getRepository(UsageRecord);
  const installRepo = Source.getRepository(InstallationRequest);
  const replacementRepo = Source.getRepository(ReplacementRequest);
  const expenseRepo = Source.getRepository(EmployeeExpenseRequest);

  const countReplacements = (statuses: readonly string[]) =>
    replacementRepo
      .createQueryBuilder('r')
      .where('r.branchId = :branchId', { branchId })
      .andWhere('r.status IN (:...statuses)', { statuses: [...statuses] })
      .getCount();

  const [invoiceRows, bills, installations, replFinance, replEmployee, replService, expenses] =
    await Promise.all([
      // Contracts and quotations an employee has approved and passed to Finance. Grouped in
      // one pass rather than four counts so the sale-type split costs a single query.
      invoiceRepo
        .createQueryBuilder('invoice')
        .select('invoice.saleType', 'saleType')
        .addSelect('invoice.type', 'type')
        .addSelect('COUNT(invoice.id)', 'count')
        .where('invoice.status = :status', { status: InvoiceStatus.EMPLOYEE_APPROVED })
        .andWhere('invoice.branchId = :branchId', { branchId })
        .groupBy('invoice.saleType')
        .addGroupBy('invoice.type')
        .getRawMany<{ saleType: string | null; type: string | null; count: string }>(),

      // Bills raised but not yet signed off by the customer — nothing can be collected
      // against them until they are, so they are genuinely blocking work.
      usageRepo
        .createQueryBuilder('u')
        .innerJoin(Invoice, 'i', 'i.id = u."contractId"')
        .where('u.billStatus = :status', { status: 'PENDING_APPROVAL' })
        .andWhere('i.branchId = :branchId', { branchId })
        .getCount(),

      installRepo
        .createQueryBuilder('ir')
        .where('ir.branchId = :branchId', { branchId })
        .andWhere('ir.status = :status', { status: 'PENDING' })
        .getCount(),

      countReplacements(REPLACEMENT_QUEUES.FINANCE),
      countReplacements(REPLACEMENT_QUEUES.EMPLOYEE),
      countReplacements(REPLACEMENT_QUEUES.SERVICE),

      expenseRepo
        .createQueryBuilder('e')
        .where('e.branchId = :branchId', { branchId })
        .andWhere('e.status IN (:...statuses)', { statuses: ['PENDING', 'SUBMITTED'] })
        .getCount(),
    ]);

  const counts: NavCounts = {
    QUOTATIONS: 0,
    RENT: 0,
    LEASE: 0,
    SALE: 0,
    BILLS: bills,
    INSTALLATION_REQUESTS: installations,
    MACHINE_REPLACEMENTS_FINANCE: replFinance,
    MACHINE_REPLACEMENTS_EMPLOYEE: replEmployee,
    MACHINE_REPLACEMENTS_SERVICE: replService,
    EXPENSES: expenses,
  };

  for (const row of invoiceRows) {
    const n = Number(row.count);
    if (row.type === InvoiceType.QUOTATION) {
      counts.QUOTATIONS += n;
      continue;
    }
    if (row.saleType === 'RENT') counts.RENT += n;
    else if (row.saleType === 'LEASE') counts.LEASE += n;
    else if (
      row.saleType === 'SALE' ||
      row.saleType === 'PRODUCT_SALE' ||
      row.saleType === 'SPAREPART_SALE'
    )
      counts.SALE += n;
  }

  logger.debug('navCounts(billing)', { branchId, counts });
  return counts;
}
