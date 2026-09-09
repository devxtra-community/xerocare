import { EntityManager } from 'typeorm';
import { Invoice } from '../entities/invoiceEntity';
import { InvoiceType } from '../entities/enums/invoiceType';
import { logger } from '../config/logger';

/** While a document is still an offer. */
export const QUOTATION_PREFIX = 'QTN';
/** Once it has been converted into a rent, lease or sale contract. */
export const INVOICE_PREFIX = 'INV';

/** True while the document still carries its quotation-stage number. */
export function isQuotationNumber(value?: string | null): boolean {
  return !!value && value.toUpperCase().startsWith(`${QUOTATION_PREFIX}-`);
}

/**
 * Tables that keep their own copy of the invoice number as a display snapshot rather
 * than joining for it. Renumbering has to carry them along or they keep pointing at a
 * number that no longer exists anywhere — someone searching the new INV number would
 * not find the installation request or payment that belongs to it.
 */
const DENORMALISED_COPIES: Array<{ table: string; numberColumn: string; linkColumn: string }> = [
  { table: 'credit_notes', numberColumn: 'invoiceNumber', linkColumn: 'invoice_id' },
  { table: 'installation_requests', numberColumn: 'invoiceNumber', linkColumn: 'invoiceId' },
  { table: 'sale_payment_requests', numberColumn: 'invoiceNumber', linkColumn: 'invoiceId' },
  { table: 'machine_swap_requests', numberColumn: 'invoice_number', linkColumn: 'contract_id' },
];

/**
 * Next free document number for a prefix (e.g. INV-2026-0007).
 *
 * Reads the highest number already issued this year rather than counting rows, so
 * deleting a document never causes its number to be handed out a second time. Ordered on
 * the numeric suffix because zero-padding stops equalising width past 9999.
 */
export async function generateDocumentNumber(
  manager: EntityManager,
  prefix: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const stem = `${prefix}-${year}-`;

  // The `::int` cast on the bound parameter is load-bearing. Postgres overloads
  // SUBSTRING: with an integer it means "from this position", but with TEXT it treats
  // the argument as a POSIX regex. A bound parameter carries no inferred type here, so
  // without the cast Postgres picks the regex form, matches nothing, and MAX collapses
  // to NULL — which silently hands out 0001 for every document and collides with the
  // unique constraint on the second one.
  const row = await manager
    .createQueryBuilder(Invoice, 'i')
    .select(`MAX(SUBSTRING(i."invoiceNumber" FROM :from::int)::int)`, 'max')
    .where('i."invoiceNumber" LIKE :pattern', { pattern: `${stem}%` })
    .setParameter('from', stem.length + 1)
    .getRawOne<{ max: number | null }>();

  return `${stem}${String((row?.max ?? 0) + 1).padStart(4, '0')}`;
}

/**
 * Renumbers a converted quotation from QTN- to INV-, once.
 *
 * Call it after the conversion has been saved — it reads the persisted type, so a
 * document only gets an invoice number when it has genuinely stopped being a quotation.
 * Safe to call repeatedly and from anywhere in the conversion flow: a document whose
 * number is already an INV- one is left alone, which is what makes it idempotent.
 *
 * The original quotation number is kept in `quotationNumber` rather than discarded —
 * customers and staff quote it for months after conversion, and an audit trail that
 * silently loses the reference it was filed under is worse than no renumbering at all.
 *
 * Pass the surrounding transaction's EntityManager where there is one, so the renumber
 * commits or rolls back with the conversion itself.
 */
export async function promoteQuotationToInvoice(
  manager: EntityManager,
  invoiceId: string,
): Promise<string | null> {
  const current = await manager
    .createQueryBuilder(Invoice, 'i')
    .select(['i.id', 'i.type', 'i.invoiceNumber', 'i.quotationNumber'])
    .where('i.id = :invoiceId', { invoiceId })
    .getOne();

  if (!current) return null;
  // Still an offer — it keeps its QTN number until it is actually converted.
  if (current.type === InvoiceType.QUOTATION) return null;
  // Already promoted (or never had a quotation number, e.g. an opening-balance import).
  if (!isQuotationNumber(current.invoiceNumber)) return null;

  const previousNumber = current.invoiceNumber;
  const newNumber = await generateDocumentNumber(manager, INVOICE_PREFIX);

  await manager
    .createQueryBuilder()
    .update(Invoice)
    .set({ invoiceNumber: newNumber, quotationNumber: previousNumber })
    .where('id = :invoiceId', { invoiceId })
    .execute();

  for (const copy of DENORMALISED_COPIES) {
    await manager.query(
      `UPDATE ${copy.table} SET "${copy.numberColumn}" = $1 WHERE "${copy.linkColumn}" = $2`,
      [newNumber, invoiceId],
    );
  }

  logger.info('Quotation converted — renumbered', { invoiceId, previousNumber, newNumber });
  return newNumber;
}
