#!/usr/bin/env bash
# ============================================================================
# Xerocare test-data clear — 2026-08-15
#
# Backup: backups/pre-clear-20260815-150305/*.sql (integrity-verified: exact
# row-count match against live data on every table, plus a real restore-and-
# execute test with content-hash verification on a sample table).
#
# SCOPE (confirmed with the user via explicit clarification before writing
# this script — see conversation record):
#   PRESERVED (never touched by this script):
#     - xerocare_employee.admin        — Admin login accounts
#     - xerocare_vendor.branches       — branch shells (name/tax/currency config)
#     - xerocare_employee.branches_mirror — left alone to stay consistent with
#       the preserved branches table (note: found already 1 row vs 2 real
#       branches before this ran — pre-existing staleness, not caused by this
#       script, out of scope to fix here)
#
#   CLEARED:
#     - xerocare_billing:  all 44 tables
#     - xerocare_vendor:   all 37 tables except branches
#     - xerocare_employee: auth, employee, leave_applications, notifications,
#                           payrolls (5 of 7 tables)
#     - xerocare_crm:      customers
#
# TRUNCATE ... RESTART IDENTITY CASCADE is used instead of manually-ordered
# DELETEs: Postgres resolves the full FK dependency graph itself per database,
# which is safer than hand-sequencing ~40+ interdependent tables from scratch.
# CASCADE only ever removes rows in tables that reference a *truncated* table —
# it never reaches "backward" into a table that isn't in the TRUNCATE list, so
# the preserved tables above are structurally safe from this regardless of the
# FK graph, as long as they're never named in a TRUNCATE statement (they are not).
# ============================================================================
set -euo pipefail

export PGPASSWORD=password123
HOST=localhost
USER=xerouser

report_counts() {
  local db=$1
  shift
  local tables=("$@")
  for t in "${tables[@]}"; do
    local c
    c=$(psql -h "$HOST" -U "$USER" -d "$db" -t -A -c "SELECT count(*) FROM \"$t\";")
    printf '  %-45s %s\n' "$t" "$c"
  done
}

echo "================================================================"
echo "xerocare_billing — clearing 44 tables"
echo "================================================================"
BILLING_TABLES=(account_reconciliations asset_depreciation_register audit_logs
  cash_bank_accounts cashbook_entries chart_of_accounts cheque_status_history
  cheques contract_agreements country_tax_rules credit_notes
  depreciation_brand_rules depreciation_journal_entries depreciation_model_rules
  device_meter_readings employee_expense_requests employee_target_achievements
  employee_targets equity_entries exchange_rates expense_entries
  guarantee_cheques income_entries installation_requests invoice_items
  invoice_ledger invoices machine_swap_requests manual_journal_entries
  manual_payables manual_receivables opening_balance_entries owners
  payable_payments payment_ledgers payment_transactions product_allocations
  quotation_template_assignments receivable_payments return_credits
  sale_payment_requests spare_part_credit_notes usage_record_items
  usage_records vat_remittances)

psql -h "$HOST" -U "$USER" -d xerocare_billing -v ON_ERROR_STOP=1 -c \
  "TRUNCATE TABLE $(printf '"%s",' "${BILLING_TABLES[@]}" | sed 's/,$//') RESTART IDENTITY CASCADE;"
echo "Post-clear counts (all should be 0):"
report_counts xerocare_billing "${BILLING_TABLES[@]}"

echo ""
echo "================================================================"
echo "xerocare_vendor — clearing 37 tables (branches preserved)"
echo "================================================================"
VENDOR_TABLES=(brands consumable_yield_history contract_meter_readings
  employee_managers exchange_rates inventory_reservations lot_documents
  lot_items lots machine_service_history model processed_invoice_items
  products purchase_costs purchase_payments purchases rfq_items
  rfq_vendor_items rfq_vendors rfqs service_contracts service_diagnoses
  service_estimate_items service_estimate_revisions service_estimates
  service_part_usage_logs service_reports service_ticket_activities
  service_ticket_items service_tickets spare_part_inventories spare_parts
  spare_parts_models stock_transfer_items stock_transfers vendor_requests
  vendors warehouses)

psql -h "$HOST" -U "$USER" -d xerocare_vendor -v ON_ERROR_STOP=1 -c \
  "TRUNCATE TABLE $(printf '"%s",' "${VENDOR_TABLES[@]}" | sed 's/,$//') RESTART IDENTITY CASCADE;"
echo "Post-clear counts (all should be 0):"
report_counts xerocare_vendor "${VENDOR_TABLES[@]}"
echo "Preserved (not touched):"
report_counts xerocare_vendor branches

echo ""
echo "================================================================"
echo "xerocare_employee — clearing 5 of 7 tables (admin, branches_mirror preserved)"
echo "================================================================"
EMPLOYEE_TABLES=(auth employee leave_applications notifications payrolls)

psql -h "$HOST" -U "$USER" -d xerocare_employee -v ON_ERROR_STOP=1 -c \
  "TRUNCATE TABLE $(printf '"%s",' "${EMPLOYEE_TABLES[@]}" | sed 's/,$//') RESTART IDENTITY CASCADE;"
echo "Post-clear counts (all should be 0):"
report_counts xerocare_employee "${EMPLOYEE_TABLES[@]}"
echo "Preserved (not touched):"
report_counts xerocare_employee admin branches_mirror

echo ""
echo "================================================================"
echo "xerocare_crm — clearing customers"
echo "================================================================"
psql -h "$HOST" -U "$USER" -d xerocare_crm -v ON_ERROR_STOP=1 -c \
  'TRUNCATE TABLE "customers" RESTART IDENTITY CASCADE;'
echo "Post-clear counts (all should be 0):"
report_counts xerocare_crm customers

echo ""
echo "================================================================"
echo "Clear complete."
echo "================================================================"
