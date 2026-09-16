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

/**
 * Quotation/contract statuses waiting on FINANCE — the employee has approved the deal and
 * handed it over.
 */
const FINANCE_INBOX = [InvoiceStatus.EMPLOYEE_APPROVED] as const;

/**
 * The same records when they are waiting on the EMPLOYEE instead.
 *
 * Both statuses mean somebody else has acted and the ball is back in the employee's court:
 * CUSTOMER_ACCEPTED is a deal the customer has said yes to and which nobody has converted
 * into a contract yet, and FINANCE_REJECTED is one Finance sent back to be corrected and
 * resubmitted. Neither is visible in the Finance-facing counts, which is why the employee
 * sidebar's Rent/Lease/Sale dots could only ever light up for work the employee had
 * already finished.
 *
 * DRAFT and SENT are deliberately excluded. A draft is the employee's own unfinished
 * writing rather than news, and a sent quotation is waiting on the customer — badging
 * either would leave the dot permanently lit and so tell nobody anything.
 */
const EMPLOYEE_INBOX = [InvoiceStatus.CUSTOMER_ACCEPTED, InvoiceStatus.FINANCE_REJECTED] as const;

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
        .addSelect('invoice.status', 'status')
        .addSelect('COUNT(invoice.id)', 'count')
        .where('invoice.status IN (:...statuses)', {
          statuses: [...FINANCE_INBOX, ...EMPLOYEE_INBOX],
        })
        .andWhere('invoice.branchId = :branchId', { branchId })
        .groupBy('invoice.saleType')
        .addGroupBy('invoice.type')
        .addGroupBy('invoice.status')
        .getRawMany<{
          saleType: string | null;
          type: string | null;
          status: string;
          count: string;
        }>(),

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
    // Same four queues as seen from the employee's desk — see EMPLOYEE_INBOX.
    QUOTATIONS_EMPLOYEE: 0,
    RENT_EMPLOYEE: 0,
    LEASE_EMPLOYEE: 0,
    SALE_EMPLOYEE: 0,
    BILLS: bills,
    INSTALLATION_REQUESTS: installations,
    MACHINE_REPLACEMENTS_FINANCE: replFinance,
    MACHINE_REPLACEMENTS_EMPLOYEE: replEmployee,
    MACHINE_REPLACEMENTS_SERVICE: replService,
    EXPENSES: expenses,
  };

  for (const row of invoiceRows) {
    const n = Number(row.count);
    // One suffix decides which desk this row belongs to, so a record is never counted for
    // both — a quotation Finance is waiting on is not also the employee's to chase.
    const forEmployee = (EMPLOYEE_INBOX as readonly string[]).includes(row.status);
    const suffix = forEmployee ? '_EMPLOYEE' : '';

    if (row.type === InvoiceType.QUOTATION) {
      counts[`QUOTATIONS${suffix}`] += n;
      continue;
    }
    if (row.saleType === 'RENT') counts[`RENT${suffix}`] += n;
    else if (row.saleType === 'LEASE') counts[`LEASE${suffix}`] += n;
    else if (
      row.saleType === 'SALE' ||
      row.saleType === 'PRODUCT_SALE' ||
      row.saleType === 'SPAREPART_SALE'
    )
      counts[`SALE${suffix}`] += n;
  }

  logger.debug('navCounts(billing)', { branchId, counts });
  return counts;
}
