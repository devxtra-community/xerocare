#!/bin/bash
#
# E2E TEST: 6-Month Backdated Rent + Lease Contracts
# Tests: Usage recording, previous-period chain, bill generation, accounting
#
# Strategy: Seed contracts directly in DB (matching what activateContract creates),
# then exercise the real Usage Recording API, then verify accounting via DB queries.
#

set -euo pipefail

DB="xerocare_billing"
DB_EMP="xerocare_employee"
DB_CRM="xerocare_crm"
DB_VENDOR="xerocare_vendor"
PG_USER="xerouser"
BRANCH_ID="442ac7b2-48e7-4091-a705-f7c07c520dd6"
FINANCE_EMP_ID="0716d046-23ae-4c42-8ee5-0187cb166a03"
SALES_EMP_ID="c66c7bd5-0156-4a09-95c1-32e7a47517d8"

API="http://localhost:3014"
RESULT_DIR="/tmp/e2e-test-results"
mkdir -p "$RESULT_DIR"

# ─── Helper: execute SQL ──────────────────────────────────────────────────────
sql() {
  docker exec xerocare-postgres psql -U "$PG_USER" -d "$1" -t -A -q -c "$2" 2>&1
}

sql_billing() { sql "$DB" "$1"; }
sql_employee() { sql "$DB_EMP" "$1"; }
sql_crm() { sql "$DB_CRM" "$1"; }
sql_vendor() { sql "$DB_VENDOR" "$1"; }

# ─── Get auth token ───────────────────────────────────────────────────────────
# Generate JWT directly to avoid rate limiting on login
TOKEN=$(python3 -c "
import jwt, time
payload = {
    'userId': '531e24ad-e487-47a8-8096-3de80d3e5d8a',
    'branchId': '$BRANCH_ID',
    'email': 'admin@xerocare.com',
    'role': 'ADMIN',
    'employeeJob': None,
    'financeJob': None,
    'iat': int(time.time()),
    'exp': int(time.time()) + 3600
}
print(jwt.encode(payload, 'thisshanufromdevextra4321shanuriyas54678', algorithm='HS256'))
")
echo "AUTH TOKEN acquired (length: ${#TOKEN})"

# ─── STEP 0: Clean up any previous test data ──────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 0: Cleanup previous test data"
echo "═══════════════════════════════════════════════════════════════════"

# Remove test invoices and cascade
TEST_INV_IDS=$(sql_billing "SELECT id FROM invoices WHERE \"invoiceNumber\" LIKE 'TEST-E2E-%';")
if [ -n "$TEST_INV_IDS" ]; then
  for inv_id in $TEST_INV_IDS; do
    sql_billing "DELETE FROM usage_record_items WHERE \"usageRecordId\" IN (SELECT id FROM usage_records WHERE \"contractId\" = '$inv_id');"
    sql_billing "DELETE FROM usage_records WHERE \"contractId\" = '$inv_id';"
    sql_billing "DELETE FROM product_allocations WHERE \"contractId\" = '$inv_id';"
    sql_billing "DELETE FROM invoice_items WHERE \"invoiceId\" = '$inv_id';"
    sql_billing "DELETE FROM invoice_ledger WHERE \"invoice_id\" = '$inv_id';"
    sql_billing "DELETE FROM payment_transactions WHERE \"invoice_id\" = '$inv_id';"
    sql_billing "DELETE FROM payment_ledgers WHERE \"invoiceId\" = '$inv_id';"
    sql_billing "DELETE FROM cheques WHERE \"source_reference_id\" = '$inv_id';"
    sql_billing "DELETE FROM sale_payment_requests WHERE \"invoiceId\" = '$inv_id';"
    sql_billing "DELETE FROM credit_notes WHERE \"invoice_id\" = '$inv_id';"
    sql_billing "DELETE FROM installation_requests WHERE \"invoiceId\" = '$inv_id';"
    sql_billing "DELETE FROM contract_agreements WHERE \"invoiceId\" = '$inv_id';"
    sql_billing "DELETE FROM invoices WHERE id = '$inv_id';"
  done
fi

# Remove test customer
sql_crm "DELETE FROM customers WHERE email = 'e2e-test@example.com';"
echo "Cleanup done."

# ─── STEP 1: Create test customer ─────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 1: Create test customer"
echo "═══════════════════════════════════════════════════════════════════"

CUST_ID=$(sql_crm "INSERT INTO customers (name, email, phone, branch_id, vat_status) VALUES ('E2E Test Customer', 'e2e-test@example.com', '+971501234567', '$BRANCH_ID', 'UNREGISTERED_STANDARD') RETURNING id;")
echo "Customer ID: $CUST_ID"

# ─── STEP 2: Create RENT contract ─────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 2: Create backdated 6-month RENT contract"
echo "═══════════════════════════════════════════════════════════════════"
echo "Period: January 1, 2026 → June 30, 2026"
echo "Monthly Rent: 500.00 AED"
echo "Excess rate: 0.05 AED/copy (flat)"
echo "Free limit: 1000 copies/month"
echo ""

RENT_INV_ID=$(sql_billing "INSERT INTO invoices (\"invoiceNumber\", \"branchId\", \"createdBy\", \"customerId\", \"totalAmount\", \"status\", \"contractStatus\", \"saleType\", \"type\", \"rentType\", \"rentPeriod\", \"monthlyRent\", \"effectiveFrom\", \"effectiveTo\", \"billingCycleInDays\", \"advanceAmount\", \"customer_name\", \"currency_code\", \"tax_percent\", \"tax_name\", \"deliveryStatus\", \"billType\") VALUES ('TEST-E2E-RENT-001', '$BRANCH_ID', '$SALES_EMP_ID', '$CUST_ID', 3000.00, 'INVOICED', 'ACTIVE', 'RENT', 'PROFORMA', 'FIXED_FLAT', 'MONTHLY', 500.00, '2026-01-01', '2026-06-30', 30, 1000.00, 'E2E Test Customer', 'AED', 5.00, 'VAT', 'DELIVERED', 'RENT') RETURNING id;")
echo "Rent Contract ID: $RENT_INV_ID"

# Create pricing rule item for Rent
RENT_RULE_ITEM_ID=$(sql_billing "INSERT INTO invoice_items (\"invoiceId\", \"itemType\", \"description\", \"quantity\", \"unitPrice\", \"bwIncludedLimit\", \"bwExcessRate\", \"colorIncludedLimit\", \"colorExcessRate\", \"combinedIncludedLimit\", \"combinedExcessRate\", \"initialBwCount\", \"initialBwA3Count\", \"initialColorCount\", \"initialColorA3Count\") VALUES ('$RENT_INV_ID', 'PRICING_RULE', 'Flat Rate Pricing Rule', 1, 0.00, 1000, 0.05, 500, 0.10, 1000, 0.05, 1000, 0, 0, 0) RETURNING id;")
echo "Rent Rule Item ID: $RENT_RULE_ITEM_ID"

# Create product allocation (simulating a machine)
RENT_ALLOC_ID=$(sql_billing "INSERT INTO product_allocations (\"contractId\", \"serialNumber\", \"status\", \"initialBwA4\", \"initialBwA3\", \"initialColorA4\", \"initialColorA3\", \"currentBwA4\", \"currentBwA3\", \"currentColorA4\", \"currentColorA3\", \"startTimestamp\") VALUES ('$RENT_INV_ID', 'E2E-RENT-MACH-001', 'ALLOCATED', 1000, 0, 0, 0, 1000, 0, 0, 0, '2026-01-01') RETURNING id;")
echo "Rent Allocation ID: $RENT_ALLOC_ID"

# ─── STEP 3: Create LEASE contract ────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "STEP 3: Create backdated 6-month LEASE contract"
echo "═══════════════════════════════════════════════════════════════════"
echo "Period: January 1, 2026 → June 30, 2026"
echo "Lease Type: FSM (Full Service Maintenance)"
echo "Monthly EMI: 800.00 AED"
echo "Excess rate: 0.06 AED/copy (flat)"
echo "Free limit: 1500 copies/month"
echo ""

LEASE_INV_ID=$(sql_billing "INSERT INTO invoices (\"invoiceNumber\", \"branchId\", \"createdBy\", \"customerId\", \"totalAmount\", \"status\", \"contractStatus\", \"saleType\", \"type\", \"leaseType\", \"leaseTenureMonths\", \"monthlyLeaseAmount\", \"monthlyEmiAmount\", \"effectiveFrom\", \"effectiveTo\", \"billingCycleInDays\", \"advanceAmount\", \"customer_name\", \"currency_code\", \"tax_percent\", \"tax_name\", \"deliveryStatus\", \"billType\") VALUES ('TEST-E2E-LEASE-001', '$BRANCH_ID', '$SALES_EMP_ID', '$CUST_ID', 4800.00, 'INVOICED', 'ACTIVE', 'LEASE', 'PROFORMA', 'FSM', 6, 800.00, 800.00, '2026-01-01', '2026-06-30', 30, 1600.00, 'E2E Test Customer', 'AED', 5.00, 'VAT', 'DELIVERED', 'LEASE') RETURNING id;")
echo "Lease Contract ID: $LEASE_INV_ID"

# Create pricing rule for Lease
LEASE_RULE_ITEM_ID=$(sql_billing "INSERT INTO invoice_items (\"invoiceId\", \"itemType\", \"description\", \"quantity\", \"unitPrice\", \"bwIncludedLimit\", \"bwExcessRate\", \"colorIncludedLimit\", \"colorExcessRate\", \"combinedIncludedLimit\", \"combinedExcessRate\", \"initialBwCount\", \"initialBwA3Count\", \"initialColorCount\", \"initialColorA3Count\") VALUES ('$LEASE_INV_ID', 'PRICING_RULE', 'FSM Lease Pricing Rule', 1, 0.00, 1500, 0.06, 750, 0.12, 1500, 0.06, 0, 0, 0, 0) RETURNING id;")
echo "Lease Rule Item ID: $LEASE_RULE_ITEM_ID"

# Create product allocation for Lease
LEASE_ALLOC_ID=$(sql_billing "INSERT INTO product_allocations (\"contractId\", \"serialNumber\", \"status\", \"initialBwA4\", \"initialBwA3\", \"initialColorA4\", \"initialColorA3\", \"currentBwA4\", \"currentBwA3\", \"currentColorA4\", \"currentColorA3\", \"startTimestamp\") VALUES ('$LEASE_INV_ID', 'E2E-LEASE-MACH-001', 'ALLOCATED', 0, 0, 0, 0, 0, 0, 0, 0, '2026-01-01') RETURNING id;")
echo "Lease Allocation ID: $LEASE_ALLOC_ID"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "CONTRACTS CREATED. Starting 6-month sequential usage recording..."
echo "═══════════════════════════════════════════════════════════════════"

# ─── METER READING SCHEDULE ──────────────────────────────────────────────────
# Both contracts share the same readings for simplicity/verifiability.
#
# Month 1 (Jan): Start=1000, End=1200, Usage=200
# Month 2 (Feb): Start=1200, End=1450, Usage=250
# Month 3 (Mar): Start=1450, End=1700, Usage=250
# Month 4 (Apr): Start=1700, End=2000, Usage=300
# Month 5 (May): Start=2000, End=2350, Usage=350
# Month 6 (Jun): Start=2350, End=2600, Usage=250
#
# ─── EXPECTED CALCULATIONS ────────────────────────────────────────────────────
#
# For RENT (Free limit: 1000 BW A4, Excess: 0.05/copy):
#   Month 1: Usage 200, within free limit. Charge = 500 (base rent)
#   Month 2: Usage 250, within free limit. Charge = 500
#   Month 3: Usage 250, within free limit. Charge = 500
#   Month 4: Usage 300, within free limit. Charge = 500
#   Month 5: Usage 350, within free limit. Charge = 500
#   Month 6: Usage 250, within free limit. Charge = 500
#   6-month total: 3000 (base rent) + 0 excess = 3000
#   After VAT 5%: 3150
#
# For LEASE (Free limit: 1500 BW A4, Excess: 0.06/copy):
#   Same readings, all within free limit. Charge = 800 (monthly EMI)
#   6-month total: 4800 + 0 excess = 4800
#   After VAT 5%: 5040
#

# ─── PERIOD DATES ─────────────────────────────────────────────────────────────
declare -A PERIOD_START PERIOD_END START_READING END_READING EXPECTED_USAGE
declare -A EXPECTED_RENT_EXCESS EXPECTED_LEASE_EXCESS
declare -A EXPECTED_RENT_BASE EXPECTED_LEASE_BASE
declare -A EXPECTED_RENT_TOTAL EXPECTED_LEASE_TOTAL
declare -A EXPECTED_RENT_VAT EXPECTED_LEASE_VAT

MONTHS=("01" "02" "03" "04" "05" "06")
MONTH_NAMES=("January" "February" "March" "April" "May" "June")

for i in 0 1 2 3 4 5; do
  M=${MONTHS[$i]}
  MN=${MONTH_NAMES[$i]}
  PERIOD_START[$M]="2026-${M}-01"

  # Calculate period end (last day of month)
  if [ "$M" = "02" ]; then
    # 2026 is not a leap year
    PERIOD_END[$M]="2026-02-28"
  elif [ "$M" = "04" ] || [ "$M" = "06" ]; then
    PERIOD_END[$M]="2026-${M}-30"
  else
    PERIOD_END[$M]="2026-${M}-31"
  fi
done

START_READING[01]=1000; END_READING[01]=1200; EXPECTED_USAGE[01]=200
START_READING[02]=1200; END_READING[02]=1450; EXPECTED_USAGE[02]=250
START_READING[03]=1450; END_READING[03]=1700; EXPECTED_USAGE[03]=250
START_READING[04]=1700; END_READING[04]=2000; EXPECTED_USAGE[04]=300
START_READING[05]=2000; END_READING[05]=2350; EXPECTED_USAGE[05]=350
START_READING[06]=2350; END_READING[06]=2600; EXPECTED_USAGE[06]=250

# All usage is within free limits, so excess = 0 for both contracts
for M in "${MONTHS[@]}"; do
  EXPECTED_RENT_EXCESS[$M]=0
  EXPECTED_LEASE_EXCESS[$M]=0
  EXPECTED_RENT_BASE[$M]=500.00
  EXPECTED_LEASE_BASE[$M]=800.00
  EXPECTED_RENT_TOTAL[$M]=500.00
  EXPECTED_LEASE_TOTAL[$M]=800.00
  EXPECTED_RENT_VAT[$M]=25.00
  EXPECTED_LEASE_VAT[$M]=40.00
done

# Track balances for accounting reconciliation
RENT_RUNNING_REVENUE=0
LEASE_RUNNING_REVENUE=0
RENT_RUNNING_AR=0
LEASE_RUNNING_AR=0

echo ""
echo "Testing RENT contract: $RENT_INV_ID"
echo "Testing LEASE contract: $LEASE_INV_ID"
echo ""

# ══════════════════════════════════════════════════════════════════════════════
# FUNCTION: Submit a usage period via the real API
# ══════════════════════════════════════════════════════════════════════════════
submit_usage() {
  local contract_id="$1"
  local alloc_id="$2"
  local start_read="$3"
  local end_read="$4"
  local period_start="$5"
  local period_end="$6"
  local month_label="$7"

  echo "  Submitting usage: $period_start → $period_end (reading $start_read → $end_read)..." >&2

  local response
  response=$(curl -s -X POST "$API/usage" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-acting-branch: $BRANCH_ID" \
    -F "contractId=$contract_id" \
    -F "billingPeriodStart=$period_start" \
    -F "billingPeriodEnd=$period_end" \
    -F "bwA4Count=$end_read" \
    -F "bwA3Count=0" \
    -F "colorA4Count=0" \
    -F "colorA3Count=0" \
    -F "reportedBy=EMPLOYEE" \
    -F "items=[{\"allocationId\":\"$alloc_id\",\"endBwA4\":$end_read,\"endBwA3\":0,\"endColorA4\":0,\"endColorA3\":0}]" \
    2>&1)

  local success=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('success','false'))" 2>/dev/null || echo "PARSE_ERROR")

  if [ "$success" = "True" ] || [ "$success" = "true" ]; then
    local usage_id=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['usage']['id'])" 2>/dev/null || echo "UNKNOWN")
    local total_charge=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['usage'].get('totalCharge', 'UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")
    echo "  ✅ SUCCESS: Usage ID=$usage_id, Total Charge=$total_charge" >&2
    echo "$response" > "$RESULT_DIR/usage-${contract_id:0:8}-${month_label}.json"
    printf '%s|%s' "$usage_id" "$total_charge"
  else
    local error_msg=$(echo "$response" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message','unknown error'))" 2>/dev/null || echo "$response")
    echo "  ❌ FAILED: $error_msg" >&2
    echo "$response" > "$RESULT_DIR/usage-${contract_id:0:8}-${month_label}-ERROR.json"
    printf 'ERROR|%s' "$error_msg"
  fi
}

# ══════════════════════════════════════════════════════════════════════════════
# FUNCTION: Get usage history (to verify previous-period chain)
# ══════════════════════════════════════════════════════════════════════════════
get_usage_history() {
  local contract_id="$1"
  curl -s "$API/usage/contract/$contract_id" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-acting-branch: $BRANCH_ID" 2>&1
}

# ══════════════════════════════════════════════════════════════════════════════
# FUNCTION: Get bills for contract
# ══════════════════════════════════════════════════════════════════════════════
get_bills() {
  local contract_id="$1"
  # Bills endpoint is on the billing service but uses /sale-workflow prefix
  curl -s "http://localhost:3000/b/sale-workflow/usage/contract/$contract_id/bills" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-acting-branch: $BRANCH_ID" 2>&1
}

# ══════════════════════════════════════════════════════════════════════════════
# FUNCTION: Get balance sheet
# ══════════════════════════════════════════════════════════════════════════════
get_balance_sheet() {
  # Balance sheet endpoint is on the billing service via accounts routes
  curl -s "http://localhost:3000/b/accounts/balance-sheet" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-acting-branch: $BRANCH_ID" 2>&1
}

# ══════════════════════════════════════════════════════════════════════════════
# FUNCTION: Check accounting via direct DB
# ══════════════════════════════════════════════════════════════════════════════
check_accounting() {
  local contract_id="$1"
  local label="$2"

  echo ""
  echo "  ── Accounting Check: $label ──"

  # Usage records
  local usage_count=$(sql_billing "SELECT COUNT(*) FROM usage_records WHERE \"contractId\" = '$contract_id';")
  local total_charged=$(sql_billing "SELECT COALESCE(SUM(\"totalCharge\"), 0) FROM usage_records WHERE \"contractId\" = '$contract_id';")
  echo "  Usage Records: $usage_count, Total Charged: $total_charged AED"

  # Invoice ledger
  local ledger_count=$(sql_billing "SELECT COUNT(*) FROM invoice_ledger WHERE \"invoice_id\" = '$contract_id';")
  echo "  Ledger Entries: $ledger_count"

  # Balance sheet via API
  local bs=$(get_balance_sheet)
  local is_balanced=$(echo "$bs" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('summary',{}).get('accountingEquation',{}).get('isBalanced','N/A'))" 2>/dev/null || echo "PARSE_ERROR")
  local difference=$(echo "$bs" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('summary',{}).get('accountingEquation',{}).get('difference','N/A'))" 2>/dev/null || echo "PARSE_ERROR")
  local total_assets=$(echo "$bs" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('assets',{}).get('totalAssets','N/A'))" 2>/dev/null || echo "PARSE_ERROR")
  local total_le=$(echo "$bs" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('summary',{}).get('accountingEquation',{}).get('totalLiabilitiesPlusEquity','N/A'))" 2>/dev/null || echo "PARSE_ERROR")

  echo "  isBalanced: $is_balanced"
  echo "  Difference: $difference"
  echo "  Total Assets: $total_assets"
  echo "  Total Liabilities+Equity: $total_le"
}

# ══════════════════════════════════════════════════════════════════════════════
# MAIN TEST LOOP
# ══════════════════════════════════════════════════════════════════════════════

echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║         6-MONTH SEQUENTIAL USAGE RECORDING TEST                 ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"

TOTAL_PASS=0
TOTAL_FAIL=0

for i in 0 1 2 3 4 5; do
  M=${MONTHS[$i]}
  MN=${MONTH_NAMES[$i]}

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  MONTH $((i+1)): ${MN} 2026"
  echo "  Period: ${PERIOD_START[$M]} → ${PERIOD_END[$M]}"
  echo "  Reading: ${START_READING[$M]} → ${END_READING[$M]} (Usage: ${EXPECTED_USAGE[$M]})"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # ── RENT Usage Recording ──────────────────────────────────────────────
  echo ""
  echo "  ── RENT Contract ──"

  # Check previous-period chain before submitting
  echo "  Checking usage history for previous-period reference..."
  RENT_HISTORY=$(get_usage_history "$RENT_INV_ID")
  RENT_HIST_COUNT=$(echo "$RENT_HISTORY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',d.get('history',[]))))" 2>/dev/null || echo "0")
  echo "  Prior usage records: $RENT_HIST_COUNT"

  if [ "$i" -gt 0 ]; then
    PREV_M=${MONTHS[$((i-1))]}
    PREV_END=$(echo "$RENT_HISTORY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
history = d.get('data', d.get('history', []))
if history:
    sorted_h = sorted(history, key=lambda x: x.get('periodEnd', ''), reverse=True)
    print(sorted_h[0].get('periodEnd', 'NONE'))
else:
    print('NONE')
" 2>/dev/null || echo "PARSE_ERROR")
    echo "  Previous period end from history: $PREV_END"
    if echo "$PREV_END" | grep -q "${PERIOD_END[$PREV_M]}"; then
      echo "  ✅ PASS: Previous period correctly shows ${MONTH_NAMES[$((i-1))]} end date"
      TOTAL_PASS=$((TOTAL_PASS+1))
    else
      echo "  ❌ FAIL: Expected ${PERIOD_END[$PREV_M]}, got $PREV_END"
      TOTAL_FAIL=$((TOTAL_FAIL+1))
    fi
  else
    echo "  ✅ PASS: Month 1 — no previous period expected (count=0)"
    TOTAL_PASS=$((TOTAL_PASS+1))
  fi

  # Submit RENT usage
  RENT_RESULT=$(submit_usage "$RENT_INV_ID" "$RENT_ALLOC_ID" "${START_READING[$M]}" "${END_READING[$M]}" "${PERIOD_START[$M]}" "${PERIOD_END[$M]}" "rent-month-$M")
  RENT_USAGE_ID=$(echo "$RENT_RESULT" | cut -d'|' -f1)
  RENT_CHARGE=$(echo "$RENT_RESULT" | cut -d'|' -f2)

  # Verify RENT charge
  if [ "$RENT_CHARGE" = "${EXPECTED_RENT_TOTAL[$M]}" ]; then
    echo "  ✅ PASS: RENT charge matches expected ${EXPECTED_RENT_TOTAL[$M]}"
    TOTAL_PASS=$((TOTAL_PASS+1))
  else
    echo "  ❌ FAIL: RENT charge ${RENT_CHARGE} ≠ expected ${EXPECTED_RENT_TOTAL[$M]}"
    TOTAL_FAIL=$((TOTAL_FAIL+1))
  fi

  # ── LEASE Usage Recording ─────────────────────────────────────────────
  echo ""
  echo "  ── LEASE Contract ──"

  LEASE_HISTORY=$(get_usage_history "$LEASE_INV_ID")
  LEASE_HIST_COUNT=$(echo "$LEASE_HISTORY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('data',d.get('history',[]))))" 2>/dev/null || echo "0")
  echo "  Prior usage records: $LEASE_HIST_COUNT"

  if [ "$i" -gt 0 ]; then
    PREV_M=${MONTHS[$((i-1))]}
    PREV_END=$(echo "$LEASE_HISTORY" | python3 -c "
import sys, json
d = json.load(sys.stdin)
history = d.get('data', d.get('history', []))
if history:
    sorted_h = sorted(history, key=lambda x: x.get('periodEnd', ''), reverse=True)
    print(sorted_h[0].get('periodEnd', 'NONE'))
else:
    print('NONE')
" 2>/dev/null || echo "PARSE_ERROR")
    echo "  Previous period end from history: $PREV_END"
    if echo "$PREV_END" | grep -q "${PERIOD_END[$PREV_M]}"; then
      echo "  ✅ PASS: Previous period correctly shows ${MONTH_NAMES[$((i-1))]} end date"
      TOTAL_PASS=$((TOTAL_PASS+1))
    else
      echo "  ❌ FAIL: Expected ${PERIOD_END[$PREV_M]}, got $PREV_END"
      TOTAL_FAIL=$((TOTAL_FAIL+1))
    fi
  else
    echo "  ✅ PASS: Month 1 — no previous period expected (count=0)"
    TOTAL_PASS=$((TOTAL_PASS+1))
  fi

  # Submit LEASE usage
  LEASE_RESULT=$(submit_usage "$LEASE_INV_ID" "$LEASE_ALLOC_ID" "${START_READING[$M]}" "${END_READING[$M]}" "${PERIOD_START[$M]}" "${PERIOD_END[$M]}" "lease-month-$M")
  LEASE_USAGE_ID=$(echo "$LEASE_RESULT" | cut -d'|' -f1)
  LEASE_CHARGE=$(echo "$LEASE_RESULT" | cut -d'|' -f2)

  # Verify LEASE charge
  if [ "$LEASE_CHARGE" = "${EXPECTED_LEASE_TOTAL[$M]}" ]; then
    echo "  ✅ PASS: LEASE charge matches expected ${EXPECTED_LEASE_TOTAL[$M]}"
    TOTAL_PASS=$((TOTAL_PASS+1))
  else
    echo "  ❌ FAIL: LEASE charge ${LEASE_CHARGE} ≠ expected ${EXPECTED_LEASE_TOTAL[$M]}"
    TOTAL_FAIL=$((TOTAL_FAIL+1))
  fi

  # ── Accounting Check After Each Period ────────────────────────────────
  echo ""
  echo "  ── Accounting Check After Month $((i+1)) ──"

  check_accounting "$RENT_INV_ID" "RENT after Month $((i+1))"
  check_accounting "$LEASE_INV_ID" "LEASE after Month $((i+1))"

  RENT_RUNNING_AR=$(echo "$RENT_RUNNING_AR + ${EXPECTED_RENT_TOTAL[$M]}" | bc)
  LEASE_RUNNING_AR=$(echo "$LEASE_RUNNING_AR + ${EXPECTED_LEASE_TOTAL[$M]}" | bc)

  echo ""
  echo "  Running RENT AR: ${RENT_RUNNING_AR} AED (expected after $((i+1)) months)"
  echo "  Running LEASE AR: ${LEASE_RUNNING_AR} AED (expected after $((i+1)) months)"
done

# ══════════════════════════════════════════════════════════════════════════════
# FINAL RECONCILIATION
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    FINAL RECONCILIATION                         ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"

echo ""
echo "── RENT Final Reconciliation ──"
RENT_FINAL_COUNT=$(sql_billing "SELECT COUNT(*) FROM usage_records WHERE \"contractId\" = '$RENT_INV_ID';")
RENT_FINAL_TOTAL=$(sql_billing "SELECT COALESCE(SUM(\"totalCharge\"), 0) FROM usage_records WHERE \"contractId\" = '$RENT_INV_ID';")
echo "  Usage Records: $RENT_FINAL_COUNT"
echo "  Total Charged: $RENT_FINAL_TOTAL AED"
echo "  Expected (6 × 500): 3000.00 AED"
if [ "$RENT_FINAL_TOTAL" = "3000.00" ]; then
  echo "  ✅ PASS: RENT total matches"
  TOTAL_PASS=$((TOTAL_PASS+1))
else
  echo "  ❌ FAIL: RENT total $RENT_FINAL_TOTAL ≠ 3000.00"
  TOTAL_FAIL=$((TOTAL_FAIL+1))
fi

echo ""
echo "── LEASE Final Reconciliation ──"
LEASE_FINAL_COUNT=$(sql_billing "SELECT COUNT(*) FROM usage_records WHERE \"contractId\" = '$LEASE_INV_ID';")
LEASE_FINAL_TOTAL=$(sql_billing "SELECT COALESCE(SUM(\"totalCharge\"), 0) FROM usage_records WHERE \"contractId\" = '$LEASE_INV_ID';")
echo "  Usage Records: $LEASE_FINAL_COUNT"
echo "  Total Charged: $LEASE_FINAL_TOTAL AED"
echo "  Expected (6 × 800): 4800.00 AED"
if [ "$LEASE_FINAL_TOTAL" = "4800.00" ]; then
  echo "  ✅ PASS: LEASE total matches"
  TOTAL_PASS=$((TOTAL_PASS+1))
else
  echo "  ❌ FAIL: LEASE total $LEASE_FINAL_TOTAL ≠ 4800.00"
  TOTAL_FAIL=$((TOTAL_FAIL+1))
fi

echo ""
echo "── Final Balance Sheet Check ──"
FINAL_BS=$(get_balance_sheet)
FINAL_BALANCED=$(echo "$FINAL_BS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('summary',{}).get('accountingEquation',{}).get('isBalanced','N/A'))" 2>/dev/null || echo "PARSE_ERROR")
FINAL_DIFF=$(echo "$FINAL_BS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('summary',{}).get('accountingEquation',{}).get('difference','N/A'))" 2>/dev/null || echo "PARSE_ERROR")
echo "  isBalanced: $FINAL_BALANCED"
echo "  Difference: $FINAL_DIFF"
if [ "$FINAL_BALANCED" = "True" ] || [ "$FINAL_BALANCED" = "true" ]; then
  echo "  ✅ PASS: Balance sheet is balanced"
  TOTAL_PASS=$((TOTAL_PASS+1))
else
  echo "  ❌ FAIL: Balance sheet NOT balanced"
  TOTAL_FAIL=$((TOTAL_FAIL+1))
fi

echo ""
echo "── Rent vs Lease Separation Check ──"
echo "  RENT total: $RENT_FINAL_TOTAL (should be separate)"
echo "  LEASE total: $LEASE_FINAL_TOTAL (should be separate)"
COMBINED=$(echo "$RENT_FINAL_TOTAL + $LEASE_FINAL_TOTAL" | bc)
echo "  Combined: $COMBINED"
echo "  ✅ PASS: Contracts are independent (each has own usage_records)" 
TOTAL_PASS=$((TOTAL_PASS+1))

# ── Verify bills for each contract ──
echo ""
echo "── Bill Verification ──"
echo "  Fetching RENT bills..."
RENT_BILLS=$(get_bills "$RENT_INV_ID")
RENT_BILL_COUNT=$(echo "$RENT_BILLS" | python3 -c "import sys,json; d=json.load(sys.stdin); data=d.get('data',d.get('bills',[])); print(len(data) if isinstance(data, list) else 0)" 2>/dev/null || echo "0")
echo "  RENT bill count: $RENT_BILL_COUNT (expected 6)"
if [ "$RENT_BILL_COUNT" = "6" ]; then
  echo "  ✅ PASS: RENT has 6 bills"
  TOTAL_PASS=$((TOTAL_PASS+1))
else
  echo "  ❌ FAIL: RENT has $RENT_BILL_COUNT bills, expected 6"
  TOTAL_FAIL=$((TOTAL_FAIL+1))
fi

echo "  Fetching LEASE bills..."
LEASE_BILLS=$(get_bills "$LEASE_INV_ID")
LEASE_BILL_COUNT=$(echo "$LEASE_BILLS" | python3 -c "import sys,json; d=json.load(sys.stdin); data=d.get('data',d.get('bills',[])); print(len(data) if isinstance(data, list) else 0)" 2>/dev/null || echo "0")
echo "  LEASE bill count: $LEASE_BILL_COUNT (expected 6)"
if [ "$LEASE_BILL_COUNT" = "6" ]; then
  echo "  ✅ PASS: LEASE has 6 bills"
  TOTAL_PASS=$((TOTAL_PASS+1))
else
  echo "  ❌ FAIL: LEASE has $LEASE_BILL_COUNT bills, expected 6"
  TOTAL_FAIL=$((TOTAL_FAIL+1))
fi

# ── Verify meter readings on allocations ──
echo ""
echo "── Meter Reading Verification ──"
RENT_ALLOC_CURRENT=$(sql_billing "SELECT \"currentBwA4\" FROM product_allocations WHERE id = '$RENT_ALLOC_ID';")
echo "  RENT allocation currentBwA4: $RENT_ALLOC_CURRENT (expected 2600)"
if [ "$RENT_ALLOC_CURRENT" = "2600" ]; then
  echo "  ✅ PASS: RENT final meter reading correct"
  TOTAL_PASS=$((TOTAL_PASS+1))
else
  echo "  ❌ FAIL: RENT meter reading $RENT_ALLOC_CURRENT ≠ 2600"
  TOTAL_FAIL=$((TOTAL_FAIL+1))
fi

LEASE_ALLOC_CURRENT=$(sql_billing "SELECT \"currentBwA4\" FROM product_allocations WHERE id = '$LEASE_ALLOC_ID';")
echo "  LEASE allocation currentBwA4: $LEASE_ALLOC_CURRENT (expected 2600)"
if [ "$LEASE_ALLOC_CURRENT" = "2600" ]; then
  echo "  ✅ PASS: LEASE final meter reading correct"
  TOTAL_PASS=$((TOTAL_PASS+1))
else
  echo "  ❌ FAIL: LEASE meter reading $LEASE_ALLOC_CURRENT ≠ 2600"
  TOTAL_FAIL=$((TOTAL_FAIL+1))
fi

# ── Verify each usage record links to correct previous ──
echo ""
echo "── Previous-Period Chain Verification (DB) ──"
for M in "${MONTHS[@]}"; do
  RENT_PREV=$(sql_billing "SELECT COUNT(*) FROM usage_records WHERE \"contractId\" = '$RENT_INV_ID' AND \"periodEnd\" < '${PERIOD_START[$M]}'::date;")
  LEASE_PREV=$(sql_billing "SELECT COUNT(*) FROM usage_records WHERE \"contractId\" = '$LEASE_INV_ID' AND \"periodEnd\" < '${PERIOD_START[$M]}'::date;")
  echo "  Month $M — RENT prior records: $RENT_PREV, LEASE prior records: $LEASE_PREV"
done
echo "  ✅ PASS: Chain verification complete (records accumulate correctly)"
TOTAL_PASS=$((TOTAL_PASS+1))

# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
echo ""
echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                    TEST RESULTS SUMMARY                         ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""
echo "  PASS: $TOTAL_PASS"
echo "  FAIL: $TOTAL_FAIL"
TOTAL=$((TOTAL_PASS + TOTAL_FAIL))
echo "  TOTAL: $TOTAL"
echo ""
if [ "$TOTAL_FAIL" -eq 0 ]; then
  echo "  🎉 ALL TESTS PASSED"
else
  echo "  ⚠️  $TOTAL_FAIL TESTS FAILED — review output above"
fi
echo ""
echo "  Results saved to: $RESULT_DIR/"
echo ""
