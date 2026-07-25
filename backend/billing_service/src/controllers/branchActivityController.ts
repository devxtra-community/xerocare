import { Request, Response, NextFunction } from 'express';
import { sign } from 'jsonwebtoken';
import { Source } from '../config/dataSource';
import { todayInBusinessTz, toBusinessDate } from '../utils/businessDate';

const INV_URL = process.env.VEN_INV_SERVICE_URL ?? 'http://localhost:3003';

async function internalFetchJSON<T>(url: string): Promise<T | null> {
  try {
    const token = sign(
      { userId: 'billing_service', role: 'ADMIN' },
      process.env.ACCESS_SECRET as string,
      { expiresIn: '1m' },
    );
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}`, 'x-internal-service': 'billing' },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function branchSql(alias: string, branches: string[] | null, col = 'branchId'): string {
  if (!branches || branches.length === 0) return '';
  if (branches.length === 1) return `AND ${alias}."${col}" = '${branches[0]}'`;
  return `AND ${alias}."${col}" IN (${branches.map((b) => `'${b}'`).join(',')})`;
}

function safeBranches(branchFilter: string[]): string[] | null {
  const uuidRe = /^[0-9a-f-]{36}$/i;
  const safe = branchFilter.filter((b) => uuidRe.test(b));
  return safe.length > 0 ? safe : null;
}

// This deployment's Postgres/Node stack runs on Asia/Kolkata (IST) — naive
// `timestamp` columns store IST wall-clock, not UTC. But the app's designated
// business calendar day is Asia/Qatar (see businessDate.ts) — a real, ~2.5h
// difference. Re-projecting IST wall-clock through Asia/Kolkata → Asia/Qatar
// here matches toBusinessDate()'s own JS-side computation (verified against
// real rows), so a "today" bucket here always agrees with the sibling Day
// Book's "today" default — without this, events near midnight IST would land
// on the wrong calendar day relative to the rest of this endpoint.
function bizDateSql(col: string): string {
  return `TO_CHAR(${col} AT TIME ZONE 'Asia/Kolkata' AT TIME ZONE 'Asia/Qatar', 'YYYY-MM-DD')`;
}

export interface ActivityEvent {
  id: string;
  type:
    | 'QUOTATION'
    | 'INVOICE'
    | 'PURCHASE'
    | 'SERVICE_TICKET'
    | 'STOCK_TRANSFER'
    | 'CHEQUE'
    | 'EXPENSE'
    | 'EXPENSE_REQUEST'
    | 'CREDIT_NOTE';
  subType: string;
  time: string;
  title: string;
  description?: string;
  amount?: number;
  currency?: string;
  refId: string;
  meta?: Record<string, unknown>;
}

// Everything that happened in one branch on one calendar day — a chronological
// index of financial/operational events, each linking through to its own
// existing detail view rather than duplicating that record's full data here.
// Deliberately separate from getDayBook: that endpoint's Total Earnings/Total
// Expenses/Net Cash figures must stay strictly cash-transaction-based, so this
// endpoint never feeds into or is read by that one.
export const getBranchActivity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const date = (req.query.date as string) || todayInBusinessTz();
    const branchF = req.branchFilter ?? [];
    const bParam = safeBranches(branchF);
    const events: ActivityEvent[] = [];

    // ── 1. Quotations & Invoices — created that day (invoices table, all types) ──
    const invoiceRows = await Source.query<
      {
        id: string;
        invoiceNumber: string;
        customer_name: string | null;
        saleType: string;
        type: string;
        status: string;
        totalAmount: string;
        currency_code: string | null;
        createdAt: string;
        branchId: string;
      }[]
    >(`
      SELECT id, "invoiceNumber", customer_name, "saleType", type, status,
             "totalAmount", currency_code, "createdAt", "branchId"
      FROM invoices
      WHERE "deletedAt" IS NULL
        AND ${bizDateSql('"createdAt"')} = '${date}'
        ${branchSql('invoices', bParam)}
    `);
    for (const r of invoiceRows) {
      const isQuotation = r.type === 'QUOTATION' || r.type === 'PROFORMA';
      events.push({
        id: `INV-CREATE-${r.id}`,
        type: isQuotation ? 'QUOTATION' : 'INVOICE',
        subType: 'CREATED',
        time: r.createdAt,
        title: `${isQuotation ? 'Quotation' : 'Invoice'} ${r.invoiceNumber} created`,
        description: `${r.customer_name ?? 'Unknown Customer'} · ${(r.saleType ?? '').replace(/_/g, ' ')}`,
        amount: Number(r.totalAmount),
        currency: r.currency_code ?? 'AED',
        refId: r.id,
      });
    }

    // ── 2. Invoice status changes that day (audit_logs, action=STATUS_CHANGE) ──
    const statusRows = await Source.query<
      {
        id: string;
        entityId: string;
        newValue: string | null;
        details: string | null;
        createdAt: string;
        invoiceNumber: string;
        customer_name: string | null;
        saleType: string;
        type: string;
        branchId: string;
        currency_code: string | null;
        totalAmount: string;
      }[]
    >(`
      SELECT al.id, al."entityId", al."newValue", al.details, al."createdAt",
             i."invoiceNumber", i.customer_name, i."saleType", i.type, i."branchId",
             i.currency_code, i."totalAmount"
      FROM audit_logs al
      JOIN invoices i ON i.id::text = al."entityId"
      WHERE al.action = 'STATUS_CHANGE'
        AND ${bizDateSql('al."createdAt"')} = '${date}'
        AND i."deletedAt" IS NULL
        ${branchSql('i', bParam)}
    `);
    for (const r of statusRows) {
      events.push({
        id: `INV-STATUS-${r.id}`,
        type: 'INVOICE',
        subType: 'STATUS_CHANGE',
        time: r.createdAt,
        title: `${r.invoiceNumber} status changed${r.newValue ? ` → ${r.newValue}` : ''}`,
        description:
          r.details ??
          `${r.customer_name ?? 'Unknown Customer'} · ${(r.saleType ?? '').replace(/_/g, ' ')}`,
        amount: Number(r.totalAmount),
        currency: r.currency_code ?? 'AED',
        refId: r.entityId,
      });
    }

    // ── 3. Cheques — created (received/issued) that day ──
    const chequeCreateRows = await Source.query<
      {
        id: string;
        cheque_no: string;
        party_name: string;
        amount: string;
        type: string;
        status: string;
        created_at: string;
        branch_id: string;
      }[]
    >(`
      SELECT id, cheque_no, party_name, amount, type, status, created_at, branch_id
      FROM cheques
      WHERE ${bizDateSql('created_at')} = '${date}'
        ${branchSql('cheques', bParam, 'branch_id')}
    `);
    for (const r of chequeCreateRows) {
      events.push({
        id: `CHQ-CREATE-${r.id}`,
        type: 'CHEQUE',
        subType: r.type === 'ISSUED' ? 'ISSUED' : 'RECEIVED',
        time: r.created_at,
        title: `Cheque ${r.cheque_no} ${r.type === 'ISSUED' ? 'issued to' : 'received from'} ${r.party_name}`,
        amount: Number(r.amount),
        refId: r.id,
      });
    }

    // ── 4. Cheque status transitions that day (deposited/cleared/bounced/cancelled) ──
    const chequeHistRows = await Source.query<
      {
        id: string;
        cheque_id: string;
        from_status: string | null;
        to_status: string;
        changed_at: string;
        cheque_no: string;
        party_name: string;
        amount: string;
        branch_id: string;
      }[]
    >(`
      SELECT h.id, h.cheque_id, h.from_status, h.to_status, h.changed_at,
             c.cheque_no, c.party_name, c.amount, c.branch_id
      FROM cheque_status_history h
      JOIN cheques c ON c.id = h.cheque_id
      WHERE ${bizDateSql('h.changed_at')} = '${date}'
        ${branchSql('c', bParam, 'branch_id')}
    `);
    for (const r of chequeHistRows) {
      events.push({
        id: `CHQ-HIST-${r.id}`,
        type: 'CHEQUE',
        subType: r.to_status,
        time: r.changed_at,
        title: `Cheque ${r.cheque_no} ${r.to_status.toLowerCase()} — ${r.party_name}`,
        amount: Number(r.amount),
        refId: r.cheque_id,
      });
    }

    // ── 5. Expense entries created that day ──
    const expenseRows = await Source.query<
      {
        id: string;
        expenseNo: string;
        category: string;
        description: string;
        netAmount: string;
        currency: string;
        status: string;
        createdAt: string;
        branchId: string;
      }[]
    >(`
      SELECT id, "expenseNo", category, description, "netAmount", currency, status, "createdAt", "branchId"
      FROM expense_entries
      WHERE ${bizDateSql('"createdAt"')} = '${date}'
        ${branchSql('expense_entries', bParam)}
    `);
    for (const r of expenseRows) {
      events.push({
        id: `EXP-${r.id}`,
        type: 'EXPENSE',
        subType: 'CREATED',
        time: r.createdAt,
        title: `Expense ${r.expenseNo} — ${(r.category ?? '').replace(/_/g, ' ')}`,
        description: r.description,
        amount: Number(r.netAmount),
        currency: r.currency ?? 'AED',
        refId: r.id,
        meta: {
          expenseNo: r.expenseNo,
          category: r.category,
          description: r.description,
          amount: Number(r.netAmount),
          currency: r.currency ?? 'AED',
          status: r.status,
        },
      });
    }

    // ── 6. Expense Requests — created / approved / paid that day ──
    const expReqRows = await Source.query<
      {
        id: string;
        requestNo: string;
        employeeName: string;
        category: string;
        description: string;
        amount: string;
        currency: string;
        status: string;
        requestSource: string;
        vendorName: string | null;
        createdAt: string;
        reviewedAt: string | null;
        reviewedByName: string | null;
        paidAt: string | null;
        rejectionReason: string | null;
        branchId: string;
      }[]
    >(`
      SELECT id, "requestNo", "employeeName", category, description, amount, currency, status,
             "requestSource", "vendorName", "createdAt", "reviewedAt", "reviewedByName", "paidAt",
             "rejectionReason", "branchId"
      FROM employee_expense_requests
      WHERE (
        ${bizDateSql('"createdAt"')} = '${date}'
        OR ${bizDateSql('"reviewedAt"')} = '${date}'
        OR ${bizDateSql('"paidAt"')} = '${date}'
      )
      ${branchSql('employee_expense_requests', bParam)}
    `);
    for (const r of expReqRows) {
      const label =
        r.requestSource === 'MANAGER_PURCHASE' ? 'Purchase payment request' : 'Expense request';
      const meta = {
        requestNo: r.requestNo,
        employeeName: r.employeeName,
        category: r.category,
        description: r.description,
        amount: Number(r.amount),
        currency: r.currency ?? 'AED',
        status: r.status,
        vendorName: r.vendorName,
        reviewedByName: r.reviewedByName,
        reviewedAt: r.reviewedAt,
        rejectionReason: r.rejectionReason,
      };
      if (toBusinessDate(r.createdAt) === date) {
        events.push({
          id: `EXPREQ-CREATE-${r.id}`,
          type: 'EXPENSE_REQUEST',
          subType: 'CREATED',
          time: r.createdAt,
          title: `${label} ${r.requestNo} submitted — ${r.employeeName}`,
          description: r.description,
          amount: Number(r.amount),
          currency: r.currency ?? 'AED',
          refId: r.id,
          meta,
        });
      }
      if (r.reviewedAt && toBusinessDate(r.reviewedAt) === date) {
        events.push({
          id: `EXPREQ-REVIEW-${r.id}`,
          type: 'EXPENSE_REQUEST',
          subType: r.status === 'REJECTED' ? 'REJECTED' : 'APPROVED',
          time: r.reviewedAt,
          title: `${label} ${r.requestNo} ${r.status === 'REJECTED' ? 'rejected' : 'approved'}${r.reviewedByName ? ` by ${r.reviewedByName}` : ''}`,
          description: r.description,
          amount: Number(r.amount),
          currency: r.currency ?? 'AED',
          refId: r.id,
          meta,
        });
      }
      if (r.paidAt && toBusinessDate(r.paidAt) === date) {
        events.push({
          id: `EXPREQ-PAID-${r.id}`,
          type: 'EXPENSE_REQUEST',
          subType: 'PAID',
          time: r.paidAt,
          title: `${label} ${r.requestNo} paid — ${r.employeeName}`,
          description: r.description,
          amount: Number(r.amount),
          currency: r.currency ?? 'AED',
          refId: r.id,
          meta,
        });
      }
    }

    // ── 7. Credit Notes / Returns — created that day (Product & Spare Part) ──
    const creditNoteRows = await Source.query<
      {
        id: string;
        creditNoteNo: string;
        invoiceId: string;
        invoiceNumber: string | null;
        customerId: string;
        customerName: string | null;
        branchId: string;
        itemCategory: string;
        productAmount: string;
        type: string;
        status: string;
        productName: string | null;
        sku: string | null;
        createdAt: string;
        updatedAt: string;
      }[]
    >(`
      SELECT id, "creditNoteNo", invoice_id AS "invoiceId", "invoiceNumber", "customerId",
             "customerName", "branchId", item_category AS "itemCategory",
             "productAmount", type, status, "productName", sku,
             "createdAt", "updatedAt"
      FROM credit_notes
      WHERE ${bizDateSql('"createdAt"')} = '${date}'
        ${branchSql('credit_notes', bParam)}
    `);
    for (const r of creditNoteRows) {
      events.push({
        id: `CN-${r.id}`,
        type: 'CREDIT_NOTE',
        subType: r.itemCategory,
        time: r.createdAt,
        title: `${r.itemCategory === 'SPARE_PART' ? 'Spare Part' : 'Product'} return ${r.creditNoteNo} — ${r.type.replace(/_/g, ' ')}`,
        description: `${r.customerName ?? 'Unknown Customer'}${r.productName ? ` · ${r.productName}` : ''}${r.sku ? ` (${r.sku})` : ''}`,
        amount: Number(r.productAmount),
        refId: r.id,
        meta: { ...r, productAmount: Number(r.productAmount) },
      });
    }

    // ── 8. Purchases — created that day (cross-service, ven_inv_service) ──
    if (bParam) {
      for (const branchId of bParam) {
        const purchases = await internalFetchJSON<{
          success: boolean;
          data: {
            id: string;
            branchId: string;
            totalAmount: number;
            currencyCode?: string;
            purchaseOrigin?: string;
            purchaseCategory?: string;
            createdAt: string;
            vendor?: { name?: string };
          }[];
        }>(`${INV_URL}/purchases?branchId=${branchId}`);
        for (const p of purchases?.data ?? []) {
          if (toBusinessDate(p.createdAt) !== date) continue;
          events.push({
            id: `PUR-${p.id}`,
            type: 'PURCHASE',
            subType: p.purchaseOrigin ?? 'DOMESTIC',
            time: p.createdAt,
            title: `Purchase created — ${p.vendor?.name ?? 'Unknown Vendor'}`,
            description: `${p.purchaseOrigin ?? ''}${p.purchaseCategory ? ` · ${p.purchaseCategory}` : ''}`,
            amount: Number(p.totalAmount),
            currency: p.currencyCode ?? 'AED',
            refId: p.id,
          });
        }

        // ── 9. Service tickets — opened/diagnosed/completed that day ──
        const tickets = await internalFetchJSON<{
          success: boolean;
          data: {
            id: string;
            ticketNumber: string;
            branchId: string;
            issueDescription?: string;
            productName?: string;
            status: string;
            created_at: string;
            diagnosisCompletedAt?: string | null;
            completedAt?: string | null;
          }[];
        }>(`${INV_URL}/service/tickets?branchId=${branchId}`);
        for (const t of tickets?.data ?? []) {
          if (toBusinessDate(t.created_at) === date) {
            events.push({
              id: `TKT-OPEN-${t.id}`,
              type: 'SERVICE_TICKET',
              subType: 'OPENED',
              time: t.created_at,
              title: `Service ticket ${t.ticketNumber} opened`,
              description: `${t.productName ?? ''}${t.issueDescription ? ` · ${t.issueDescription.slice(0, 80)}` : ''}`,
              refId: t.id,
            });
          }
          if (t.diagnosisCompletedAt && toBusinessDate(t.diagnosisCompletedAt) === date) {
            events.push({
              id: `TKT-DIAG-${t.id}`,
              type: 'SERVICE_TICKET',
              subType: 'DIAGNOSED',
              time: t.diagnosisCompletedAt,
              title: `Service ticket ${t.ticketNumber} diagnosed`,
              description: t.productName,
              refId: t.id,
            });
          }
          if (t.completedAt && toBusinessDate(t.completedAt) === date) {
            events.push({
              id: `TKT-DONE-${t.id}`,
              type: 'SERVICE_TICKET',
              subType: 'COMPLETED',
              time: t.completedAt,
              title: `Service ticket ${t.ticketNumber} completed`,
              description: t.productName,
              refId: t.id,
            });
          }
        }

        // ── 10. Stock transfers — initiated/approved/received that day ──
        const transfers = await internalFetchJSON<{
          success: boolean;
          data: {
            id: string;
            transfer_number: string;
            source_branch_id: string;
            destination_branch_id: string;
            status: string;
            created_at: string;
            dispatched_at?: string | null;
            received_at?: string | null;
            updated_at: string;
          }[];
        }>(`${INV_URL}/stock-transfers?branch=${branchId}`);
        for (const s of transfers?.data ?? []) {
          if (toBusinessDate(s.created_at) === date) {
            events.push({
              id: `ST-INIT-${s.id}`,
              type: 'STOCK_TRANSFER',
              subType: 'INITIATED',
              time: s.created_at,
              title: `Stock transfer ${s.transfer_number} initiated`,
              refId: s.id,
            });
          }
          if (s.status === 'APPROVED' && toBusinessDate(s.updated_at) === date) {
            events.push({
              id: `ST-APPR-${s.id}`,
              type: 'STOCK_TRANSFER',
              subType: 'APPROVED',
              time: s.updated_at,
              title: `Stock transfer ${s.transfer_number} approved`,
              refId: s.id,
            });
          }
          if (s.received_at && toBusinessDate(s.received_at) === date) {
            events.push({
              id: `ST-RECV-${s.id}`,
              type: 'STOCK_TRANSFER',
              subType: 'RECEIVED',
              time: s.received_at,
              title: `Stock transfer ${s.transfer_number} received`,
              refId: s.id,
            });
          }
        }
      }
    }

    events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json({ success: true, data: { date, events } });
  } catch (err) {
    next(err);
  }
};
