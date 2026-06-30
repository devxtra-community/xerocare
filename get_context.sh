#!/bin/bash
file_print() {
  file=$1
  lines=$2
  echo "======================================"
  echo "$file"
  echo "--------------------------------------"
  sed -n "${lines}p" "$file" | cat -n | awk -v offset="${lines%-*}" '{print $1 + offset - 1 ": " $0}'
}

file_print "backend/billing_service/src/controllers/accountsController.ts" "720,735"
file_print "frontend/app/admin/(dashboard)/accounts/page.tsx" "10,25"
file_print "frontend/app/admin/(dashboard)/accounts/receivable/page.tsx" "1,15"
file_print "frontend/app/finance/(dashboard)/accounts/assets/page.tsx" "125,140"
file_print "frontend/app/finance/(dashboard)/accounts/cash-bank/page.tsx" "35,45"
file_print "frontend/app/finance/(dashboard)/accounts/cash-flow/page.tsx" "55,70"
file_print "frontend/app/finance/(dashboard)/accounts/chart-of-accounts/page.tsx" "35,50"
file_print "frontend/app/finance/(dashboard)/accounts/equity/page.tsx" "20,30"
file_print "frontend/app/finance/(dashboard)/accounts/payable/page.tsx" "35,45"
file_print "frontend/app/finance/(dashboard)/accounts/receivable/page.tsx" "30,50"
file_print "frontend/app/finance/(dashboard)/accounts/receivable/page.tsx" "280,295"
file_print "frontend/app/finance/(dashboard)/accounts/reports/page.tsx" "5,20"
file_print "frontend/app/manager/(dashboard)/accounts/equity/page.tsx" "5,15"
file_print "frontend/app/manager/(dashboard)/accounts/expenses/page.tsx" "5,15"
file_print "frontend/app/manager/(dashboard)/accounts/page.tsx" "1,10"
