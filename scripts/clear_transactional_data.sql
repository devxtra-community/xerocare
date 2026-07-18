-- ============================================================
-- XEROCARE — Clear Transactional Data
-- Run with:  psql -U postgres -f clear_transactional_data.sql
--
-- PRESERVES (admin / config — never touched):
--   xerocare_billing   : country_tax_rules, depreciation_brand_rules,
--                        depreciation_model_rules, exchange_rates,
--                        opening_balance_entries
--   xerocare_vendor    : branches, brands, model, products,
--                        vendors, warehouses, employee_managers, spare_parts_models
--   xerocare_employee  : admin, auth (ADMIN rows only), branches_mirror
--   xerocare_crm       : (full customers table cleared — CRM is transactional)
--
-- CLEARS:
--   Employees, payrolls, leave, notifications
--   Finance: invoices, payments, cashbook, expenses, equity,
--            receivables, payables, depreciation journals, cheques
--   Accounts: cash-bank accounts, reconciliations, asset register
--   Orders/Purchases: purchases, lots, RFQs, vendor requests
--   Quotations / Sales: quotation templates, product allocations
--   Rent / Lease: usage records, contract meter readings
--   Service: tickets, estimates, diagnoses, reports, parts usage
--   Inventory: spare parts, stock transfers, consumable history
--   CRM Customers
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. xerocare_billing   (Finance, Accounts, Invoices, Orders)
-- ────────────────────────────────────────────────────────────
\c xerocare_billing

BEGIN;

TRUNCATE TABLE
  -- child tables first (FK safety)
  receivable_payments,
  payable_payments,
  payment_transactions,
  payment_ledgers,
  invoice_items,
  invoice_ledger,
  usage_record_items,
  usage_records,
  device_meter_readings,
  credit_notes,
  spare_part_credit_notes,
  return_credits,
  product_allocations,
  quotation_template_assignments,
  -- main transactional tables
  invoices,
  manual_receivables,
  manual_payables,
  expense_entries,
  employee_expense_requests,
  employee_targets,
  employee_target_achievements,
  -- cash / bank accounts and their children
  cashbook_entries,
  account_reconciliations,
  cash_bank_accounts,
  -- cheques
  cheque_status_history,
  cheques,
  guarantee_cheques,
  -- depreciation (journals only — rules are config)
  depreciation_journal_entries,
  asset_depreciation_register,
  -- equity / vat
  equity_entries,
  vat_remittances
  RESTART IDENTITY CASCADE;

-- KEPT: country_tax_rules, depreciation_brand_rules,
--       depreciation_model_rules, exchange_rates,
--       opening_balance_entries

COMMIT;


-- ────────────────────────────────────────────────────────────
-- 2. xerocare_vendor   (Orders, Purchases, Service, Inventory)
-- ────────────────────────────────────────────────────────────
\c xerocare_vendor

BEGIN;

TRUNCATE TABLE
  -- service sub-tables first
  service_ticket_activities,
  service_ticket_items,
  service_part_usage_logs,
  service_diagnoses,
  service_estimate_items,
  service_estimate_revisions,
  service_estimates,
  service_reports,
  service_tickets,
  service_contracts,
  machine_service_history,
  -- purchase sub-tables first
  purchase_costs,
  purchase_payments,
  purchases,
  -- RFQ sub-tables first
  rfq_vendor_items,
  rfq_vendors,
  rfq_items,
  rfqs,
  -- inventory
  consumable_yield_history,
  contract_meter_readings,
  inventory_reservations,
  processed_invoice_items,
  spare_part_inventories,
  spare_parts,
  stock_transfer_items,
  stock_transfers,
  -- lots
  lot_items,
  lots,
  -- vendor requests
  vendor_requests
  RESTART IDENTITY CASCADE;

-- KEPT: branches, brands, employee_managers, model,
--       products, vendors, warehouses, spare_parts_models

COMMIT;


-- ────────────────────────────────────────────────────────────
-- 3. xerocare_employee   (Employees — keep admin/auth)
-- ────────────────────────────────────────────────────────────
\c xerocare_employee

BEGIN;

TRUNCATE TABLE
  leave_applications,
  notifications,
  payrolls,
  employee
  RESTART IDENTITY CASCADE;

-- Delete non-admin auth rows only — preserve ADMIN accounts (linked via admin_id)
DELETE FROM auth WHERE admin_id IS NULL;

-- KEPT: admin, auth (ADMIN rows), branches_mirror

COMMIT;


-- ────────────────────────────────────────────────────────────
-- 4. xerocare_crm   (Customers)
-- ────────────────────────────────────────────────────────────
\c xerocare_crm

BEGIN;

TRUNCATE TABLE customers RESTART IDENTITY CASCADE;

COMMIT;


\echo ''
\echo '✅  Transactional data cleared successfully.'
\echo '    Preserved: admin, auth (ADMIN), branches, brands, model,'
\echo '               products, vendors, warehouses, exchange_rates,'
\echo '               country_tax_rules, depreciation rules,'
\echo '               opening_balance_entries.'
\echo ''
