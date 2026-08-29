# Rent/Lease Billing, Security Deposit & Accounts Workflow

_How a Rent or Lease contract actually moves money today — quotation through advance, security
deposit, every periodic month-end cycle, and into the accounts — based on the current code._

_Repeatedly updated across several rounds of fixes that changed real behavior described here
(see §9 for what changed and why, across every round). Treat this as the current source of truth
over any other Rent/Lease workflow document in this repo — several predate the Bill + customer-
approval redesign entirely and describe mechanisms (e.g. a three-status "Collect Now/Later"
toggle, a Security Deposit that bypasses Accounts approval) that no longer exist._

---

## 1. Overview

A Rent/Lease contract moves money through **three distinct channels**, all sharing the same
underlying approval pipeline but differing in what they represent and how Accounts treats them:

| Channel                               | What it is                                                                                                                                                                                               | Is it revenue?                              | First collected                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Advance**                           | Under Advance billing: prepays period 1's rent at signing, then each period's own bill effectively prepays the _next_ period's rent too (see §3) — under Arrears billing, no advance is collected at all | Yes                                         | At contract conversion, normally (Advance billing only)                             |
| **Security Deposit**                  | A refundable guarantee, never rent                                                                                                                                                                       | **No** — a liability, held for the customer | At contract conversion, normally — but can be collected later by two fallback paths |
| **Periodic (month-end) usage charge** | The actual metered bill for each billing cycle                                                                                                                                                           | Yes                                         | Every cycle, after meter readings are recorded                                      |

All three go through the same two-stage pattern:

1. **A payment request is recorded and Accounts must approve it.** Nothing — no cashbook entry,
   no ledger movement, no receivable change — happens until Accounts approves.
2. **For the periodic charge specifically, there's an earlier gate too**: the customer must
   approve that period's **Bill** (the calculated charge) before Finance can even record a
   collection against it. Advance and Security Deposit don't have this customer-approval gate on
   the payment itself — but they do get a **Bill document** generated afterward, for the
   customer's records and sign-off (§6).

---

## 2. Contract Lifecycle

```
DRAFT → SENT → CUSTOMER_ACCEPTED → EMPLOYEE_APPROVED → WAITING_FINANCE_APPROVAL
  → FINANCE_APPROVED → (convert) → PENDING_CONFIRMATION → (activate) → ACTIVE_CONTRACT
  → (final month billed) → COMPLETED
```

(`InvoiceStatus` and `ContractStatus` are two separate enums tracked in parallel —
`contractStatus` only has `PENDING_CONFIRMATION | ACTIVE | COMPLETED | CANCELLED`; `status` is
the finer-grained one above.)

1. **Employee** creates a Rent or Lease quotation — machine, billing plan (Fixed Limit / Fixed
   Combo / Fixed Flat / CPC / CPC Combo for Rent and FSM-Lease; EMI for simplified Lease),
   billing cycle, price, and — optionally — an advance amount and a security deposit amount.
2. Quotation goes through customer/employee sign-off, then **Finance approves pricing**.
3. **Employee converts** the approved quotation into a live contract via `QuotationConversionFlow`
   and **allocates a physical machine**. `contractStatus` → `PENDING_CONFIRMATION`.
4. From here, three independent actions can happen in **any order** (the system does not enforce
   sequencing between them):
   - **Sign Contract Agreement** (`ContractAgreementModal`)
   - **Collect Advance and/or Security Deposit** (§3, §4)
   - **Activate Contract** — `contractStatus` → `ACTIVE`

---

## 3. Monthly Advance Payment Workflow

### Collection

The Advance is collected via `recordSalePayment(contractId, { amount, paymentMode, ... })`,
creating a `SalePaymentRequest`. If the caller doesn't pass an explicit `paymentContext`,
`salePaymentRequestService.createSalePaymentRequest` auto-detects it:

- First non-deposit payment on a RENT contract → `RENT_ADVANCE`
- First non-deposit payment on a LEASE contract → `LEASE_ADVANCE`
- Any later non-deposit payment → `RENT_PERIODIC` / `LEASE_PERIODIC`

(Deposit payments are excluded from that "first payment" count — see §4 for why that matters.)

**Two real entry points** actually collect it:

- `QuotationConversionFlow.tsx` (Employee, at conversion) — steps 4/5 of the flow, `recordSalePayment`
  called directly with `paymentContext` omitted (auto-detected).
- `ActivateContractModal.tsx` (Finance, at activation) — passes `paymentContext` explicitly via
  `activateContractInvoice`'s own `deposit`-style payload (only for the deposit half — the
  advance itself still goes through `recordSalePayment` the same way).
- **Fallback if nobody collected it**: none currently exists for the advance specifically (unlike
  the deposit, which has two fallback paths — see §4). `EmployeeRentTable.tsx`'s "Activate
  Contract" button calls `activateContractInvoice` with **no** deposit/advance payload at all —
  a contract can reach `ACTIVE` with zero money collected.

### Accounts Approval

- **PENDING** → Accounts reviews → **APPROVED** (or **REJECTED**).
- On approval: a `PaymentTransaction` is created, `InvoiceLedger.paidAmount` increases by the
  advance amount, and — for CASH/BANK_TRANSFER — a `CashbookEntry` posts immediately and the
  `CashBankAccount.currentBalance` updates. For CHEQUE, a regular `Cheque` row is created
  (`status: PENDING`) — cash only moves once that cheque is separately **Deposited** then
  **Cleared**.

### How Advance Billing vs. Arrears Billing Actually Differ (confirmed design)

> **For the complete deep-dive** — worked multi-period numeric examples, every file that reads
> `paymentTiming`, and the full edge-case analysis — see the dedicated
> [`advance_vs_arrears_billing.md`](./advance_vs_arrears_billing.md). The summary below covers
> just enough to follow the rest of this section.

`Invoice.paymentTiming` (`'ADVANCE' | 'ARREARS'`, set on the quotation form) is a **billing
method**, distinct from the one-off Advance payment above — though the two are directly related
under Advance billing.

- **Advance Billing**: the customer pays the **upcoming** period's rent up front, alongside the
  **current** period's actual excess usage, every billing cycle. Concretely:
  - The Advance collected at conversion (§3 above) **is period 1's rent, paid before period 1
    starts.**
  - Every period's bill after that (`usageService.ts`'s "STANDARD MONTH LOGIC" branch) charges
    `monthlyRent + that period's excess` — and because `monthlyRent` is constant for the life of
    the contract, this is numerically identical to "next period's rent, paid now" — there's no
    separate forward-looking charge needed, the existing per-period formula already _is_ that
    charge.
  - The **only** period that must not re-charge rent is the **final** one: its rent was already
    paid by the prior period's bill (or, if the contract is only one period long, by the original
    advance). `advanceAdjusted` — computed as `min(monthlyRent, contract.advanceAmount)`, **not**
    unconditionally `monthlyRent` (fixed in this round — see §9) — credits that back, so the final
    bill charges only the period's excess usage.
  - The Bill document reflects this: a non-final period's rent line reads **"Rent — Upcoming
    Period (paid in advance)"**; the final period's shows the `Advance Adjusted` credit instead.
- **Arrears (Postpaid) Billing**: the customer pays the **current** period's rent + excess usage
  **after** that period completes. No advance is collected at conversion at all
  (`QuotationConversionFlow.tsx` skips the advance-collection step when `paymentTiming ===
'ARREARS'`), and every period — including the final one — is billed the same way:
  `monthlyRent + that period's excess`, no credit applied.

**The one case this doesn't handle**: if a contract's collected advance amount doesn't exactly
equal one period's `monthlyRent` (a partial advance, or a deliberately larger one), the final
period's bill credits only `min(monthlyRent, advanceAmount)` — a partial advance leaves the
shortfall still payable on the final bill (correct); any advance amount _above_ one period's rent
is not otherwise refunded or applied anywhere once the contract completes.

### Advance Bill (the document)

`generateAdvanceBill(contractId)` — get-or-create, idempotent — creates a `UsageRecord` with
`billType = 'ADVANCE'`, wrapping the real collected `RENT_ADVANCE`/`LEASE_ADVANCE`
`SalePaymentRequest` (amount/mode/date/status). `billingPeriodStart`/`End` are both set to the
payment date as a placeholder (there's no real period for this row). `totalCharge` is the advance
amount, VAT-grossed if applicable — this stays **advance-only**, never combined with the deposit
(see §4).

Reachable from: Finance's Rent/Lease Monthly Collection table, and now also the Employee's own
Rent/Lease tables (`EmployeeRentTable.tsx`, `EmployeeLeaseTable.tsx`) — whoever actually collected
it can generate and send the bill immediately, not only Finance.

---

## 4. Security Deposit Workflow

### The Core Design Decision (as of 2026-08-27)

**A security deposit is never rent, never revenue, and is now fully wired through the same
Accounts-approval pipeline as every other payment** — this was **not** true before this date; see
§9 for the bugs that made it effectively broken. Concretely, `isSecurityDeposit: true` on a
`SalePaymentRequest`:

- Auto-resolves `paymentContext` to `RENT_SECURITY_DEPOSIT` / `LEASE_SECURITY_DEPOSIT` directly
  (never falls through to the advance/periodic auto-detect logic).
- Still goes through the full PENDING → Accounts-approval → APPROVED pipeline.
- **On approval, is excluded from `InvoiceLedger`** entirely (no `paidAmount`/`balanceAmount`
  change) — a deposit was never part of `invoice.totalAmount` (the contract's accrued revenue),
  so folding it in there would both misstate "paid" and — because most contracts' advance/rent is
  already fully paid by the time a deposit gets approved — made the ledger's overpayment guard
  reject _every_ deposit approval outright. Excluding it here is what actually made deposit
  approval work at all.
- **CHEQUE mode routes to `GuaranteeCheque`, not the regular `Cheque` table.** A guarantee cheque
  never moves Cash at Bank at all — its lifecycle is `RECEIVED → DEPOSITED` (bank confirms) or
  `RECEIVED → RETURNED` (refunded to the customer), distinct from a normal cheque's
  `PENDING → DEPOSITED → CLEARED`. It shows up in the dedicated **Guarantee Cheques** page
  (Finance/Admin → Accounts), not the ordinary cheque register.
- **CASH/BANK_TRANSFER mode** posts a normal `CashbookEntry` and moves the chosen account's
  balance immediately on approval — same as any other cash/bank collection.
- **Excluded from every AR/receivable calculation** (`accountsShared.ts`,
  `lineItemDrilldownController.ts`) — a deposit sitting PENDING or APPROVED never inflates
  Accounts Receivable, since it was never owed by the customer as rent in the first place.
- **Counted on the Balance Sheet as "Security Deposits Received"** (liability code `2004`) — but
  only the _actually collected and approved_ amount, not every contract's quoted requirement
  (again, see §9 — this used to be wrong).

### Three Collection Paths

1. **Employee, at conversion** — `QuotationConversionFlow.tsx` step 5, a separate
   `recordSalePayment(..., { isSecurityDeposit: true })` call, always after the advance (if any).
2. **Technician fallback** — Installation Requests page. A "Collect Security Deposit" icon
   (`ShieldCheck`) appears per-row **only when** the contract's `securityDepositAmount > 0` **and**
   no `PENDING`/`APPROVED` deposit `SalePaymentRequest` exists yet for it. Opens
   `CollectSecurityDepositModal` (shared component — see below), prefilled with the contract's
   quoted amount, editable. Exists specifically for the case where the Employee didn't collect it
   at conversion.
3. **Finance fallback** — Monthly Collection table (`MonthlyCollectionTable.tsx`), same gating
   and same shared `CollectSecurityDepositModal`, as the last-resort catch-all.

All three submit through the **exact same** `recordSalePayment(..., { isSecurityDeposit: true })`
call — there is no parallel/alternate mechanism, so a deposit collected by any of the three lands
in the same Accounts approval queue and the same Guarantee Cheques routing.

### Security Deposit Bill (the document) — now folded into the Advance Bill

**As of 2026-08-27, a security deposit does not get its own separate bill document when an
advance also exists.** `getBill`/`getBillForSigning`, when viewing an `ADVANCE`-billType bill,
now also fetch the deposit payment (if any, `PENDING` or `APPROVED`) and return it as
`depositPayment` alongside `advancePayment`. The frontend (`BillDocumentBody.tsx`) renders it as
a **second section within the same document** — "Security Deposit", clearly separated from
"Advance Payment", never summed into the bill's own charged total. The document/modal title
becomes **"Advance & Security Deposit Bill"** when both are present.

A standalone `billType = 'SECURITY_DEPOSIT'` bill (`generateSecurityDepositBill`) still exists
**only for the edge case** of a deposit with no advance on the same contract at all — the "Generate
Security Deposit Bill" button in Employee/Finance tables is gated on
`hasSecurityDepositPayment && !hasAdvancePayment` and hidden whenever the deposit is already
showing inside the Advance Bill.

---

## 5. Month-End / Periodic Usage & Billing Workflow (repeats every cycle)

1. **Finance enters the period's meter readings** via `UsageRecordingModal` (Monthly Collection
   table → "Record Usage"). The moment those readings are submitted, the system:
   - Computes the delta from the previous period's ending reading (or the machine's initial
     reading, for the first period).
   - Calculates the charge per the contract's plan (Fixed Limit/Combo/Flat excess rate, CPC slab
     tiers, or CPC Combo) plus `monthlyRent`, minus `advanceAdjusted` (only non-zero on the final
     month — §3) and any discount, then layers VAT via `computePeriodTax`.
   - Creates the `UsageRecord` (`billType = 'USAGE'`) — one action does both the reading entry and
     the bill creation.
2. **The instant that record exists, its `totalCharge` is Outstanding on Accounts Receivable** —
   before anyone approves anything, before any money moves. The charge is real and owed as soon
   as it's calculated.
3. **Customer approval** — via remote signing link, or Finance marking it approved manually (with
   a required note — no silent override). `billStatus`: `PENDING_APPROVAL → CUSTOMER_APPROVED` (or
   `CUSTOMER_REJECTED`, which Finance can correct and resend — unlike the Advance Bill, a
   periodic bill's amount genuinely can be recalculated).
4. **Collection is blocked until that specific bill is `CUSTOMER_APPROVED`.** This is a hard
   server-side block (`"This bill has not been approved by the customer yet."`), not a soft
   warning.
5. **Collecting the period's payment** — the correct, period-linked path is
   `POST /usage-records/:usageRecordId/collect-pending` (`collectPendingUsagePayment`), reachable
   from **Finance's Accounts Receivable page → a bill's drilldown → `UsageBillCollectionDialog`**,
   not from the Monthly Collection table's own "Collect" button (that one is gated to
   `INVOICE_PENDING`/`SEND_PENDING` alerts only — i.e. **final consolidated settlement invoices**,
   not mid-contract periodic bills). This distinction matters: calling the generic
   `recordSalePayment` endpoint for a periodic collection (without `usageRecordId`) still works
   and still moves money correctly, but leaves that specific bill's own `amountGiven`/
   `amountPending` tracking blind to the collection — always use the period-linked endpoint for a
   periodic bill.
6. **Accounts approves the collection** — same as Advance/Deposit: CASH/BANK move immediately;
   CHEQUE creates a regular `Cheque` (`source_type: RENT`/`LEASE`), moving cash only at
   Deposit-then-Clear.

### Machine Replacement Mid-Contract

If a machine needs replacing, **Finance or Admin** does it directly (a separate path from the
Sale-side "machine swap," which is blocked for Rent/Lease since it captures no meter readings).
The old machine's final reading is frozen at replacement; the new machine starts from its own
initial reading. The next bill automatically combines both — each machine's usage window is
bounded to itself, so nothing is double-counted.

---

## 6. Bill Documents & Customer Approval — Summary

| Bill type                                 | `billType`         | Created by                    | Wraps                                                    | Shown together with              |
| ----------------------------------------- | ------------------ | ----------------------------- | -------------------------------------------------------- | -------------------------------- |
| Advance (+ deposit if present)            | `ADVANCE`          | `generateAdvanceBill`         | `RENT_ADVANCE`/`LEASE_ADVANCE` payment                   | Deposit payment, if any (§4)     |
| Security Deposit (deposit-only edge case) | `SECURITY_DEPOSIT` | `generateSecurityDepositBill` | `RENT_SECURITY_DEPOSIT`/`LEASE_SECURITY_DEPOSIT` payment | —                                |
| Periodic usage                            | `USAGE`            | Automatic, on recording usage | That period's calculated charge                          | Meter readings, charge breakdown |

All three share the same `UsageRecord` entity, the same `billStatus` state machine
(`PENDING_APPROVAL → CUSTOMER_APPROVED`/`CUSTOMER_REJECTED`), and the same customer-facing
`BillModal`/`BillDocumentBody` rendering and remote-signing-link mechanism
(`generateBillSigningToken` → `/public/bill/sign/:token`). `ADVANCE` and `SECURITY_DEPOSIT` bills
are excluded from Stage-B periodic collection (§5 step 5) and from `getBillsForContract`'s
amountGiven/amountPending tracking — that money was already collected via the separate
advance/deposit payment flow, not through a period-linked collection.

---

## 7. Accounts Integration

### Accounts Receivable

For an active RENT/LEASE contract:

```
AR = (Advance amount, if approved) + SUM(totalCharge of every USAGE-billType bill)
     − SUM(approved PaymentTransaction amounts against this invoice)
```

`ADVANCE` and `SECURITY_DEPOSIT` billType `UsageRecord` rows are explicitly excluded from that
sum (`accountsShared.ts`, `lineItemDrilldownController.ts`) — counting them would double-count
the advance (already counted via its own `SalePaymentRequest` join) or misrepresent a deposit as
revenue owed.

### Balance Sheet / Chart of Accounts (account codes)

**Assets:**

| Code | Account                                                                                                |
| ---- | ------------------------------------------------------------------------------------------------------ |
| 1001 | Cash in Hand                                                                                           |
| 1002 | Cash at Bank                                                                                           |
| 1003 | Accounts Receivable                                                                                    |
| 1004 | Security Deposits Receivable _(deposits we paid to others — vendors/landlords, not customer deposits)_ |
| 1005 | Prepaid Expenses                                                                                       |
| 1006 | Spare Parts Inventory                                                                                  |
| 1007 | Equipment Gross Cost (non-current)                                                                     |
| 1009 | Product Inventory                                                                                      |

**Liabilities:**

| Code | Account                                                                                                                                                                  |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2001 | Accounts Payable                                                                                                                                                         |
| 2002 | Accrued Expenses                                                                                                                                                         |
| 2003 | VAT Payable                                                                                                                                                              |
| 2004 | **Security Deposits Received** — sourced from `APPROVED` `RENT_SECURITY_DEPOSIT`/`LEASE_SECURITY_DEPOSIT` `SalePaymentRequest` rows (real collected money only — see §9) |
| 2005 | Deferred Revenue (Memo) — unearned advance on active contracts not yet recognized; informational only, excluded from `totalLiabilities`                                  |
| 2006 | Salary Payable                                                                                                                                                           |

**Equity:** 3001 Owner's Capital · 3002 Retained Earnings · 3003 Reserves · 3004 Less: Withdrawals ·
3005 Less: Dividends.

**Income:** 4001 Rental Revenue · 4002 Lease Revenue · 4003 Sales Revenue · 4004 Service Revenue ·
4005 Usage/Copy Revenue · 4006 AMC/SMA Revenue · 4007 Spare Part Sales · 4008 Other Income.

**Expenses:** 5001 Cost of Parts · 5002 Labour Cost · 5003 Depreciation Expense (+ further codes
not enumerated here).

`isBalanced` (`Assets == Liabilities + Equity`) is computed and returned at
`summary.accountingEquation` on the Chart of Accounts endpoint. As of this rewrite there is a
known, pre-existing gap traced to an inventory-valuation policy question — unrelated to
Rent/Lease — tracked separately, not something this workflow introduces.

### General Ledger / Cashbook

Every CASH/BANK movement (advance, deposit, periodic collection, cheque clearing) posts a
`CashbookEntry` (`entryType: RECEIPT`, `category: SALE_COLLECTION` or `Cheque Deposit`/`Cheque
Payment`), which is the system's ledger of record for cash movements — the Chart of Accounts'
Cash in Hand/Cash at Bank figures are the running `CashBankAccount.currentBalance` for each
account, kept in sync by these entries.

### Cheques vs. Guarantee Cheques

|                          | Regular `Cheque`                                           | `GuaranteeCheque`                                 |
| ------------------------ | ---------------------------------------------------------- | ------------------------------------------------- |
| Used for                 | Advance, periodic, sale, purchase, expense payments        | Security deposits only                            |
| Lifecycle                | `PENDING → DEPOSITED → CLEARED` (or `BOUNCED`/`CANCELLED`) | `RECEIVED → DEPOSITED` or `RECEIVED → RETURNED`   |
| Moves Cash at Bank       | Only at `CLEARED`                                          | Only at `DEPOSITED` (bank confirms)               |
| Deposit-eligibility gate | Blocked before `chequeDate`, both directions               | N/A — different lifecycle                         |
| Visible in               | Cheques register                                           | Guarantee Cheques page (Finance/Admin → Accounts) |

---

## 8. Who's Responsible at Each Step

| Step                              | Role                                                       | What they do                                                        | What happens next                                                                                               |
| --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Create quotation                  | Employee                                                   | Sets machine, plan, cycle, price, advance/deposit amounts           | Goes to Finance for pricing approval                                                                            |
| Approve pricing                   | Finance                                                    | Approves quoted terms                                               | Employee can convert                                                                                            |
| Convert & allocate machine        | Employee                                                   | Turns quotation into a live contract                                | `PENDING_CONFIRMATION`                                                                                          |
| Collect Advance                   | Employee (or Finance via `ActivateContractModal`)          | Records the advance payment                                         | Pending Accounts approval                                                                                       |
| Collect Security Deposit          | Employee (at conversion), or Technician/Finance (fallback) | Records the deposit payment                                         | Pending Accounts approval; CHEQUE → Guarantee Cheques                                                           |
| Activate contract                 | Employee                                                   | Marks `ACTIVE`                                                      | Appears on Service Help Desk                                                                                    |
| Assign technician                 | Help Desk / Manager                                        | Creates installation job                                            | Technician sees the job                                                                                         |
| Install & capture readings        | Technician                                                 | Enters starting meter readings                                      | Job `COMPLETED`; readings become the billing baseline                                                           |
| Generate Advance (& Deposit) Bill | Employee or Finance                                        | Creates the combined document                                       | Sent to customer for sign-off                                                                                   |
| Approve Advance Bill              | Customer                                                   | Approves/disputes via link (or Finance marks manually, with a note) | Documentation only — doesn't gate the payment's own approval                                                    |
| Approve advance/deposit payment   | Accounts                                                   | Approves the collection request                                     | Cash/Bank move immediately; Cheque waits for Deposit+Clear (or, for a deposit cheque, Guarantee Cheque Deposit) |
| Record period usage               | Finance                                                    | Enters meter readings                                               | Bill created immediately; AR increases                                                                          |
| Approve periodic Bill             | Customer                                                   | Approves/disputes                                                   | Approval unlocks collection; dispute lets Finance correct and resend                                            |
| Collect period payment            | Finance/Accounts                                           | Via the bill's own drilldown (period-linked)                        | Pending collection request                                                                                      |
| Approve collection                | Accounts                                                   | Approves Cash/Bank or Cheque                                        | AR decreases, Paid increases                                                                                    |
| Replace machine                   | Finance/Admin                                              | Closes old allocation, opens new one                                | Old reading frozen; next bill combines both automatically                                                       |

---

## 9. Change History (and why it matters if you're reading an older doc)

### Round 1 — Security Deposit made to actually work, then combined into the Advance Bill

Three real, previously-live bugs were found and fixed in the same session as the Security
Deposit → Advance Bill combination described in §4/§6. If you're comparing this document against
older behavior you observed, this is why it looks different:

1. **`isSecurityDeposit` was declared on the entity but never migrated into the database.** Every
   security deposit collection attempt — from any of the three paths in §4 — failed outright with
   a 500 error. The entire feature was structurally dead until the migration was added.
2. **`paymentContext` auto-detection never checked `isSecurityDeposit`.** Once (1) was fixed, a
   deposit collected as the _first_ payment on a contract got mislabeled `RENT_ADVANCE`; collected
   _after_ an advance, it got mislabeled `RENT_PERIODIC`. Fixed to resolve to
   `RENT_SECURITY_DEPOSIT`/`LEASE_SECURITY_DEPOSIT` directly whenever `isSecurityDeposit` is set,
   checked before the advance/periodic split.
3. **Approving a deposit was posting it to `InvoiceLedger` and could never succeed on a contract
   whose advance/rent was already fully paid** (the ordinary state of an active contract) — the
   ledger's overpayment guard rejected it every time. Fixed by excluding deposit payments from the
   ledger entirely (§4).
4. **The Balance Sheet's "Security Deposits Received" summed every contract's _quoted_ deposit
   requirement, not what was actually collected and approved** — inflating that liability by the
   full deposit amount on any contract where the deposit was never collected (which, combined
   with bug 3, was every contract). Fixed to source from real `APPROVED` payments.

Before round 1, the accurate description of the system was: "the Security Deposit taken during
activation is recorded as an immediate, direct payment that bypasses Accounts approval entirely."
That is no longer true — it goes through the same full pipeline as every other payment now (§4).

### Round 2 — Deposit visibility fixed everywhere it was still generic, advance-credit edge case fixed

1. **The overpay-warning shown when _recording_ a non-deposit payment could also be triggered by a
   deposit** if `committed` (the sum used to compute "remaining balance") wasn't excluding deposit
   rows — fixed alongside round 1's ledger fix, same root cause.
2. **Accounts' payment-approval queue (`ReceiptsTab.tsx`) collapsed `RENT_ADVANCE`,
   `RENT_PERIODIC`, and `RENT_SECURITY_DEPOSIT` into the same generic "RENT" badge** — Accounts
   approving a payment couldn't tell a refundable deposit apart from an ordinary rent collection.
   Fixed with a second, distinct "Deposit" badge shown alongside the contract-type one whenever
   `isSecurityDeposit` is set. (The frontend `SalePaymentRequest` type was also missing
   `isSecurityDeposit` and the deposit `paymentContext` values entirely — added.)
3. **The printed payment receipt (`SalePaymentReceiptView.tsx`) had no case at all for
   `RENT_SECURITY_DEPOSIT`/`LEASE_SECURITY_DEPOSIT`** — it fell through to the fully generic
   `default` branch, showing "Payment Receipt" / "Contract payment" with **no Rental/Lease Details
   section at all** (not just a missing label — the whole section was skipped, since it's gated on
   `meta.type === 'RENT' | 'LEASE'` and the default case is `'OTHER'`). A `RENT_ADVANCE` receipt
   also mislabeled itself "Security Deposit / Advance" (a leftover from before the deposit had its
   own `paymentContext` at all — recall it used to get mislabeled `RENT_ADVANCE` per bug 2 above,
   so this used to be the receipt's only way to hedge). Fixed with dedicated deposit cases,
   distinct teal styling, and explicit "refundable, not applied toward rent/lease charges" wording.
4. **`advanceAdjusted` (the credit applied to the final period's bill under Advance billing) was
   unconditionally `monthlyRent`, regardless of what the contract's actual `advanceAmount` was.**
   For the ordinary case (advance collected == one period's rent) this produced the right number
   by coincidence; for a contract whose advance was ever a smaller partial amount, or a
   deliberately larger one, it silently over-credited or under-credited the final bill. Fixed to
   `min(monthlyRent, contract.advanceAmount)`, backend (`usageService.ts`) and the frontend's live
   estimate preview (`UsageRecordingModal.tsx`) both — see §3 for the confirmed rolling-advance
   model this credit is part of.
5. **The Bill document's rent line was labeled "Base Rent" unconditionally**, giving no indication
   that, under Advance billing, a non-final period's rent charge is actually prepaying the
   _upcoming_ period — confusing next to meter readings dated to the _current_ period. Relabeled to
   "Rent — Upcoming Period (paid in advance)" for that case; the final period's `Advance Adjusted`
   line now also notes "(final period — already prepaid)".
