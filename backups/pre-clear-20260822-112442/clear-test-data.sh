#!/usr/bin/env bash
# ============================================================================
# Xerocare test-data clear — 2026-08-22
#
# Backup: backups/pre-clear-20260822-112442/*.sql — integrity-verified:
#   1. Exact row-count match against live data, every table, all 4 databases
#      (zero mismatches after fixing a COPY-statement parsing bug in the
#      verification script itself, not the dump).
#   2. Real restore test: xerocare_billing.sql restored into an isolated
#      schema (xerouser lacks CREATEDB, so a same-database schema stood in
#      for a separate database — schema-qualified refs rewritten via sed,
#      with the uuid_generate_v4() extension function reference reverted
#      back to public. since that function only exists there), then
#      content-hash compared against live data on chart_of_accounts (43
#      rows) and invoices (3 rows) — both matched exactly. Test schema
#      dropped after verification.
#
# SCOPE (confirmed with the user via explicit clarification before writing
# this script):
#   Target: LOCAL NATIVE DEV ONLY (the 4 databases below). Explicitly NOT
#   the separate Docker Compose stack (ports 3010-3015, its own Postgres
#   container) and NOT the remote deployment at 15.252.52.227 (separate
#   database, no access to inspect or back up from here).
#
#   PRESERVED (never touched by this script):
#     - xerocare_employee.admin — the 1 Admin login account + its password
#       hash. Its `auth` (session/refresh-token) rows ARE cleared below —
#       that's fine, they carry no credentials, just active sessions, and a
#       fresh login re-creates one. The `admin` row itself is what makes
#       login possible, and it is never touched.
#
#   Unlike the 2026-08-15 clear (backups/pre-clear-20260815-150305), this
#   run does NOT preserve branches — the user explicitly confirmed "Admin
#   login only," clearing employees, branches, and everything else. Because
#   branchId is referenced (without a real cross-database FK — these are 4
#   separate Postgres databases) by nearly every other table in all 4
#   services, this is effectively a full reset: nothing will have a valid
#   branch to attach to until at least one branch is recreated.
#
#   CLEARED:
#     - xerocare_billing:  all 45 tables (44 from 08-15 + migration_markers,
#       new since then — a one-time-backfill bookkeeping table, not
#       business data, but no harm clearing it: the backfill it recorded
#       would just no-op again against now-empty usage_records)
#     - xerocare_vendor:   all 38 tables (37 from 08-15 + branches, now
#       in scope)
#     - xerocare_employee: auth, employee, leave_applications, notifications,
#       payrolls, branches_mirror (6 of 7 — branches_mirror now cleared to
#       stay consistent with branches itself being cleared; admin preserved)
#     - xerocare_crm:      customers (only table in this database)
#
# TRUNCATE ... RESTART IDENTITY CASCADE is used instead of manually-ordered
# DELETEs: Postgres resolves the full FK dependency graph itself per
# database, which is safer than hand-sequencing 90+ interdependent tables
# across 4 schemas from scratch. CASCADE only ever removes rows in tables
# that reference a *truncated* table — it never reaches "backward" into a
# table that isn't named in the TRUNCATE list, so `admin` is structurally
# safe from this regardless of the FK graph, as long as it's never named in
# a TRUNCATE statement (it is not, anywhere below).
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
echo "xerocare_billing — clearing 45 tables"
echo "================================================================"
BILLING_TABLES=(account_reconciliations asset_depreciation_register audit_logs
  cash_bank_accounts cashbook_entries chart_of_accounts cheque_status_history
  cheques contract_agreements country_tax_rules credit_notes
  depreciation_brand_rules depreciation_journal_entries depreciation_model_rules
  device_meter_readings employee_expense_requests employee_target_achievements
  employee_targets equity_entries exchange_rates expense_entries
  guarantee_cheques income_entries installation_requests invoice_items
  invoice_ledger invoices machine_swap_requests manual_journal_entries
  manual_payables manual_receivables migration_markers opening_balance_entries
  owners payable_payments payment_ledgers payment_transactions
  product_allocations quotation_template_assignments receivable_payments
  return_credits sale_payment_requests spare_part_credit_notes
  usage_record_items usage_records vat_remittances)

psql -h "$HOST" -U "$USER" -d xerocare_billing -v ON_ERROR_STOP=1 -c \
  "TRUNCATE TABLE $(printf '"%s",' "${BILLING_TABLES[@]}" | sed 's/,$//') RESTART IDENTITY CASCADE;"
echo "Post-clear counts (all should be 0):"
report_counts xerocare_billing "${BILLING_TABLES[@]}"

echo ""
echo "================================================================"
echo "xerocare_vendor — clearing 38 tables (branches included this time)"
echo "================================================================"
VENDOR_TABLES=(branches brands consumable_yield_history contract_meter_readings
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

echo ""
echo "================================================================"
echo "xerocare_employee — clearing 6 of 7 tables (admin preserved)"
echo "================================================================"
EMPLOYEE_TABLES=(auth employee leave_applications notifications payrolls branches_mirror)

psql -h "$HOST" -U "$USER" -d xerocare_employee -v ON_ERROR_STOP=1 -c \
  "TRUNCATE TABLE $(printf '"%s",' "${EMPLOYEE_TABLES[@]}" | sed 's/,$//') RESTART IDENTITY CASCADE;"
echo "Post-clear counts (all should be 0):"
report_counts xerocare_employee "${EMPLOYEE_TABLES[@]}"
echo "Preserved (not touched):"
report_counts xerocare_employee admin

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
