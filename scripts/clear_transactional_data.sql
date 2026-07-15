-- ============================================================
-- XEROCARE — Clear Transactional Data
-- Preserves: admin, auth, branches, brands, model, spare_parts,
--            warehouses, vendors, exchange_rates, country_tax_rules,
--            depreciation rules, opening_balance_entries
-- Clears:    employees, finance, accounts, quotations, orders,
--            sales, rent, lease, warehouse transactions, CRM customers
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. xerocare_billing database
-- ────────────────────────────────────────────────────────────
\c xerocare_billing

BEGIN;

-- Finance / Accounts
TRUNCATE TABLE
  account_reconciliations,
  asset_depreciation_register,
  cash_bank_accounts,
  cashbook_entries,
  cheque_status_history,
  cheques,
  credit_notes,
  depreciation_journal_entries,
  device_meter_readings,
  employee_expense_requests,
  employee_target_achievements,
  employee_targets,
  equity_entries,
  expense_entries,
  guarantee_cheques,
  invoice_items,
  invoice_ledger,
  invoices,
  manual_payables,
  manual_receivables,
  opening_balance_entries,
  payable_payments,
  payment_ledgers,
  payment_transactions,
  product_allocations,
  quotation_template_assignments,
  receivable_payments,
  return_credits,
  spare_part_credit_notes,
  usage_record_items,
  usage_records,
  vat_remittances
  RESTART IDENTITY CASCADE;

-- Keep: country_tax_rules, depreciation_brand_rules,
--       depreciation_model_rules, exchange_rates

COMMIT;

-- ────────────────────────────────────────────────────────────
-- 2. xerocare_vendor database  (warehouse / orders / purchases / service)
-- ────────────────────────────────────────────────────────────
\c xerocare_vendor

BEGIN;

TRUNCATE TABLE
  consumable_yield_history,
  contract_meter_readings,
  inventory_reservations,
  lot_items,
  lots,
  machine_service_history,
  processed_invoice_items,
  purchase_costs,
  purchase_payments,
  purchases,
  rfq_items,
  rfq_vendor_items,
  rfq_vendors,
  rfqs,
  service_contracts,
  service_diagnoses,
  service_estimate_items,
  service_estimate_revisions,
  service_estimates,
  service_part_usage_logs,
  service_reports,
  service_ticket_activities,
  service_ticket_items,
  service_tickets,
  spare_part_inventories,
  spare_parts,
  spare_parts_models,
  stock_transfer_items,
  stock_transfers,
  vendor_requests
  RESTART IDENTITY CASCADE;

-- Keep: branches, brands, employee_managers, exchange_rates,
--       model, products, vendors, warehouses

COMMIT;

-- ────────────────────────────────────────────────────────────
-- 3. xerocare_employee database  (employees only; keep admin/auth)
-- ────────────────────────────────────────────────────────────
\c xerocare_employee

BEGIN;

TRUNCATE TABLE
  employee,
  leave_applications,
  notifications,
  payrolls
  RESTART IDENTITY CASCADE;

-- Also clear non-admin auth rows (keep admin role)
DELETE FROM auth WHERE role != 'ADMIN';

-- Keep: admin, auth (admin rows), branches_mirror

COMMIT;

-- ────────────────────────────────────────────────────────────
-- 4. xerocare_crm database  (customers)
-- ────────────────────────────────────────────────────────────
\c xerocare_crm

BEGIN;

TRUNCATE TABLE customers RESTART IDENTITY CASCADE;

COMMIT;

-- Done
\echo '✅ Transactional data cleared. Admin, branches, brands, models, vendors, warehouses and config tables preserved.'
