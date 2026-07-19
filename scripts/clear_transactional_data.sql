-- ============================================================
-- XEROCARE — Clear Transactional and Core Data
-- Run with:  psql -U postgres -f clear_transactional_data.sql
--
-- PRESERVES (admin / config — never touched):
--   xerocare_employee  : admin, auth (ADMIN rows only)
--   xerocare_billing   : country_tax_rules
--
-- CLEARS:
--   Employees, branches, products, brands, models,
--   finance, accounts, quotations, orders, returns, and other data.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. xerocare_billing   (Finance, Accounts, Invoices, Orders)
-- ────────────────────────────────────────────────────────────
\c xerocare_billing

BEGIN;

TRUNCATE TABLE
  account_reconciliations,
  asset_depreciation_register,
  cash_bank_accounts,
  cashbook_entries,
  cheque_status_history,
  cheques,
  credit_notes,
  depreciation_brand_rules,
  depreciation_journal_entries,
  depreciation_model_rules,
  device_meter_readings,
  employee_expense_requests,
  employee_target_achievements,
  employee_targets,
  equity_entries,
  exchange_rates,
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

COMMIT;


-- ────────────────────────────────────────────────────────────
-- 2. xerocare_vendor   (Branches, Products, Brands, Models, Orders, Service)
-- ────────────────────────────────────────────────────────────
\c xerocare_vendor

BEGIN;

TRUNCATE TABLE
  branches,
  brands,
  consumable_yield_history,
  contract_meter_readings,
  employee_managers,
  exchange_rates,
  inventory_reservations,
  lot_items,
  lots,
  machine_service_history,
  model,
  processed_invoice_items,
  products,
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
  vendor_requests,
  vendors,
  warehouses
  RESTART IDENTITY CASCADE;

COMMIT;


-- ────────────────────────────────────────────────────────────
-- 3. xerocare_employee   (Employees, Branches Mirror, keep admin/auth)
-- ────────────────────────────────────────────────────────────
\c xerocare_employee

BEGIN;

TRUNCATE TABLE
  branches_mirror,
  leave_applications,
  notifications,
  payrolls,
  employee
  RESTART IDENTITY CASCADE;

-- Delete non-admin auth rows only — preserve ADMIN accounts (linked via admin_id)
DELETE FROM auth WHERE admin_id IS NULL;

COMMIT;


-- ────────────────────────────────────────────────────────────
-- 4. xerocare_crm   (Customers)
-- ────────────────────────────────────────────────────────────
\c xerocare_crm

BEGIN;

TRUNCATE TABLE customers RESTART IDENTITY CASCADE;

COMMIT;


\echo ''
\echo '✅ All requested tables cleared successfully.'
\echo '   Preserved: admin, auth (ADMIN), country_tax_rules.'
\echo ''
