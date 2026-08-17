#!/usr/bin/env bash
# Clears Xerocare test data across all four service databases.
#
# PRESERVED (confirmed with the user before running):
#   • xerocare_employee.admin           — the Admin account, so login still works
#   • xerocare_employee.auth (admin rows) — the Admin's sessions/refresh tokens
#   • xerocare_vendor.branches          — the QATAR branch row ONLY (its shell/config)
#   • billing: chart_of_accounts, country_tax_rules, exchange_rates
#     ^ system configuration rather than test data. Deleting these does not "clear test
#       data", it removes the definitions the Accounts pages read on load. Flagged to the
#       user separately; remove from KEEP_BILLING below if they want them gone too.
#
# DELETED: everything else — all employees, all other branches, customers, products,
# models, brands, vendors, warehouses, purchases/lots/RFQs, and every billing record
# (invoices, contracts, cheques, expenses, equity, payments, allocations, usage…).
#
# TRUNCATE ... CASCADE resolves intra-database FK order automatically, so tables do not
# need to be listed child-first. Cross-service references are not FK-enforced; deleting
# every service in the same run leaves none dangling.
set -uo pipefail

export PGPASSWORD=password123
PSQL="psql -h localhost -U xerouser -v ON_ERROR_STOP=1 -qtA"

QATAR_BRANCH='426625c1-62e8-4e14-952b-457452eb0f28'
KEEP_BILLING="chart_of_accounts country_tax_rules exchange_rates"
KEEP_EMPLOYEE="admin auth"
KEEP_VENDOR="branches"

count() { $PSQL -d "$1" -c "SELECT count(*) FROM \"$2\"" 2>/dev/null || echo "?"; }

# Truncates every table in $1 except those named in $2, reporting per-table row counts.
clear_db() {
  local db="$1"; shift
  local keep=" $* "
  echo ""
  echo "=== $db ==="
  local tables targets=()
  tables=$($PSQL -d "$db" -c "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
  for t in $tables; do
    if [[ "$keep" == *" $t "* ]]; then
      printf "  KEEP     %-34s %s rows\n" "$t" "$(count "$db" "$t")"
    else
      local before; before=$(count "$db" "$t")
      [[ "$before" == "0" ]] && continue   # nothing to report for already-empty tables
      printf "  clear    %-34s %s -> " "$t" "$before"
      targets+=("\"$t\"")
      echo "0"
    fi
  done
  if [[ ${#targets[@]} -gt 0 ]]; then
    local list; list=$(IFS=,; echo "${targets[*]}")
    $PSQL -d "$db" -c "TRUNCATE TABLE $list RESTART IDENTITY CASCADE" >/dev/null \
      && echo "  -> truncated ${#targets[@]} table(s)" \
      || { echo "  !! TRUNCATE FAILED in $db"; return 1; }
  else
    echo "  (nothing to clear)"
  fi
}

echo "############################################################"
echo "# Xerocare test-data clear"
echo "# Preserving: Admin account + Qatar branch shell + billing config"
echo "############################################################"

clear_db xerocare_billing  $KEEP_BILLING
clear_db xerocare_vendor   $KEEP_VENDOR
clear_db xerocare_employee $KEEP_EMPLOYEE
clear_db xerocare_crm

# --- Targeted deletes inside the preserved tables -------------------------------------
echo ""
echo "=== targeted deletes within preserved tables ==="

# Branches: keep only Qatar's row.
before=$(count xerocare_vendor branches)
$PSQL -d xerocare_vendor -c "DELETE FROM branches WHERE id <> '$QATAR_BRANCH'" >/dev/null
echo "  branches         $before -> $(count xerocare_vendor branches)  (Qatar row kept)"

# Auth: keep the Admin's sessions, drop every employee session.
before=$(count xerocare_employee auth)
$PSQL -d xerocare_employee -c "DELETE FROM auth WHERE admin_id IS NULL" >/dev/null
echo "  auth             $before -> $(count xerocare_employee auth)  (admin sessions kept)"

echo ""
echo "=== preserved, final state ==="
echo "  admin accounts:  $(count xerocare_employee admin)"
echo "  branches:        $(count xerocare_vendor branches)"
echo "  chart_of_accounts: $(count xerocare_billing chart_of_accounts)"
echo ""
echo "Done."
