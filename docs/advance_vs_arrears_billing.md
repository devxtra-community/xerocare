# Advance vs. Arrears Billing — Complete Guide

**Scope of this document**: everything about the `paymentTiming` billing-method choice on a
Rent/Lease contract — what it means, where it's chosen, exactly how each period's bill is
calculated under each method, worked numeric examples, every place in the codebase that reads or
displays it, and the one edge case that needs a specific number to behave correctly.

This is the standalone deep-dive requested on top of the broader
[`rent_lease_billing_and_accounts_workflow.md`](./rent_lease_billing_and_accounts_workflow.md),
which covers the full contract lifecycle, Security Deposit workflow, and Accounts integration.
Where the two overlap (mainly §3 of that doc), this document is the more detailed source — the
content here supersedes/expands it, not contradicts it. Security Deposit and Accounts/Balance
Sheet mechanics are only touched briefly here (§7, §8) — for the full treatment, see that doc's
§4 and §7.

Verified against the codebase as of **2026-08-28**, including the `advanceAdjusted` fix confirmed
live on contract QTN-2026-0003.

---

## 1. TL;DR

|                                                          | **Advance Billing**                                                                          | **Arrears (Postpaid) Billing**                                                           |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `paymentTiming` value                                    | `'ADVANCE'` (the default)                                                                    | `'ARREARS'`                                                                              |
| Money collected at contract conversion                   | Yes — one period's rent, up front                                                            | No — nothing collected until period 1 completes                                          |
| What each period's bill charges                          | `monthlyRent + that period's excess usage`                                                   | `monthlyRent + that period's excess usage` (identical formula)                           |
| What's different about the **final** period's bill       | Rent is **credited back** (`advanceAdjusted`) — only excess usage is newly payable           | Rent is charged in full, same as every other period                                      |
| Customer's own description (shown in the quotation form) | _"Customer pays upcoming period rent in advance + current excess usage each billing cycle."_ | _"Customer pays current period rent + excess usage after the billing period completes."_ |

The two methods use **the exact same per-period charge formula** — the only structural difference
is _when_ the first period's rent is collected (up front vs. never-separately, because Arrears
just bills it at the end like every other period) and whether the _last_ period gets a credit for
rent that was already prepaid earlier in the contract. Section 3 below explains why that's
sufficient to implement the full "pay in advance" behavior with no separate forward-looking charge
anywhere in the per-period logic.

---

## 2. Where It's Chosen: The Quotation Form

Set once, at quotation-creation time, in `EmployeeQuotationTable.tsx` — identically for RENT and
LEASE (RENT: [lines 3832–3859](../frontend/components/employeeComponents/EmployeeQuotationTable.tsx#L3832-L3859);
LEASE: [lines 4474–4501](../frontend/components/employeeComponents/EmployeeQuotationTable.tsx#L4474-L4501)):

- A **"Payment Timing"** section with a `<select>`:
  - `"Advance Billing (Advance Payment)"` → `paymentTiming = 'ADVANCE'`
  - `"Arrears Billing (Postpaid Billing)"` → `paymentTiming = 'ARREARS'`
  - Directly below the selector, the exact description text is shown live (this is the text in
    the screenshot that prompted this doc):
    - Advance: _"Customer pays upcoming period rent in advance + current excess usage each
      billing cycle."_
    - Arrears: _"Customer pays current period rent + excess usage after the billing period
      completes."_
- **The Advance Amount field itself is conditionally rendered**, not just conditionally required:
  - `paymentTiming === 'ADVANCE'` → shows an editable **"First Month Advance Payment"** input.
  - `paymentTiming === 'ARREARS'` → the input disappears entirely, replaced by a static note:
    **"Postpaid — No Advance Required"** / _"First payment collected after the first billing
    period completes."_
  - This means an Arrears quotation can never accidentally carry a stray advance amount into
    conversion — the field simply isn't there to fill in.
- Default state is `'ADVANCE'` ([`EmployeeQuotationTable.tsx:1439`](../frontend/components/employeeComponents/EmployeeQuotationTable.tsx#L1439)); editing an existing quotation
  restores its saved value ([line 1557](../frontend/components/employeeComponents/EmployeeQuotationTable.tsx#L1557)).
- Both RENT and LEASE submit payloads include `paymentTiming` alongside `advanceAmount` (RENT:
  [line 2461](../frontend/components/employeeComponents/EmployeeQuotationTable.tsx#L2461); LEASE:
  [line 2526](../frontend/components/employeeComponents/EmployeeQuotationTable.tsx#L2526)) — a
  single field on the `Invoice` entity (`invoiceEntity.ts:195`, backed by a Postgres enum
  `invoices_paymenttiming_enum`, default `'ADVANCE'`), set once at creation and editable later via
  `updateInvoice`/`updateQuotation` in `billingService.ts` (`payload.paymentTiming`).

There is no separate control anywhere else in the app to change it after creation except editing
the quotation itself before conversion — once converted to an active contract, `paymentTiming` is
fixed for the contract's lifetime (it's read by every subsequent billing cycle, so changing it
mid-contract would retroactively reinterpret already-issued bills).

---

## 3. The Core Mechanic — Why "Pay in Advance" Needs No Separate Forward Charge

This is the part that's easy to get wrong by intuition, so it's worth being explicit about.

**Naive (wrong) mental model**: "Advance billing" sounds like it should mean _"add an extra
forward-looking rent charge to every bill, on top of the current period's rent."_ That's not how
it's implemented, and implementing it that way would double-charge rent.

**Actual model — a rolling one-period-ahead prepayment**:

1. At contract conversion, the customer pays **one period's rent up front** — the "Advance
   Amount" collected by `recordSalePayment` and approved through Accounts (full detail: see the
   other doc's §3 "Collection"/"Accounts Approval"). This payment **is period 1's rent**, paid
   before period 1 starts.
2. Every period's bill from then on — `usageService.ts`'s **STANDARD MONTH LOGIC** branch
   ([usageService.ts:671](../backend/billing_service/src/services/usageService.ts#L671)) — charges:

   ```
   periodCharge = max(0, exceededCharge + monthlyRent − discountAmount)
   ```

   Because `monthlyRent` is the same number every period, "this period's bill includes
   `monthlyRent`" is **numerically identical** to "the customer is now paying for the _next_
   period's rent in advance" — there's no way to tell the two apart from the amount alone, so no
   separate forward-looking line item is needed. The bill simply always includes one period's
   rent; the _meaning_ of that rent charge ("this period" vs. "next period, prepaid") is a
   labeling/interpretation question, not a different formula. **This formula is identical for
   Advance and Arrears billing** — see §4 for why.

3. The **only** period where a rent charge would be _wrong_ is the **final** one: its rent was
   already paid — either by the previous period's bill (rolling prepayment) or, if the contract is
   only one period long, by the original advance at signing. Charging `monthlyRent` again there
   would bill the customer twice for the same period. So the **FINAL MONTH LOGIC** branch
   ([usageService.ts:502–670](../backend/billing_service/src/services/usageService.ts#L502-L670))
   credits it back:

   ```
   advanceAdjusted = isArrears ? 0 : min(monthlyRent, contract.advanceAmount)
   finalPeriodCharge = max(0, monthlyRent + exceededCharge − advanceAdjusted − discountAmount)
   ```

   In the normal case (advance == one period's rent), `advanceAdjusted == monthlyRent`, so the
   final bill collapses to just `exceededCharge − discountAmount` — only the last period's excess
   usage is newly payable. (§5 covers what happens when the advance _isn't_ exactly one period's
   rent.)

4. `contract.advanceAmount` is then decremented by `advanceAdjusted`
   ([usageService.ts:533–536](../backend/billing_service/src/services/usageService.ts#L533-L536)) — bookkeeping so the
   contract's own record reflects the advance as "used up," even though nothing here re-triggers
   a new payment collection.

**Arrears billing** skips step 1 entirely — `QuotationConversionFlow.tsx` checks
`paymentTiming === 'ARREARS'` and does not call `recordSalePayment` for an advance at all
([QuotationConversionFlow.tsx:237–253](../frontend/components/employeeComponents/QuotationConversionFlow.tsx#L237-L253)) — and every period, including the final one, uses the same
STANDARD MONTH LOGIC formula (`isArrears` forces `advanceAdjusted = 0` in the final-month branch,
so no credit is ever applied). The customer's first payment of any kind happens only after period
1's usage is recorded and approved.

---

## 4. Worked Example — 4-Month Contract, ₹5,000/month Rent

Assume a Fixed-Limit Rent contract, `monthlyRent = 5,000`, no discount, ignoring VAT for clarity,
with the following excess-usage charges recorded each period: Period 1 = 300, Period 2 = 450,
Period 3 = 0, Period 4 (final) = 600.

### Advance Billing (`paymentTiming: 'ADVANCE'`)

| Event                                                                                 | Amount | Running total collected |
| ------------------------------------------------------------------------------------- | -----: | ----------------------: |
| Conversion — Advance payment (Period 1's rent, paid up front)                         |  5,000 |                   5,000 |
| Period 1 bill: `5,000 (rent) + 300 (excess)`                                          |  5,300 |                  10,300 |
| Period 2 bill: `5,000 (rent) + 450 (excess)`                                          |  5,450 |                  15,750 |
| Period 3 bill: `5,000 (rent) + 0 (excess)`                                            |  5,000 |                  20,750 |
| Period 4 (final) bill: `5,000 (rent) + 600 (excess) − 5,000 (advanceAdjusted credit)` |    600 |                  21,350 |

Total rent paid across the contract: `5,000 (advance) + 5,000 + 5,000 + 5,000 + 0 (final, credited)
= 20,000` — exactly 4 periods × ₹5,000, never more, never less. Total excess usage billed:
`300 + 450 + 0 + 600 = 1,350`. Grand total: `20,000 + 1,350 = 21,350` — matches the running total
above. Each bill (except the final) is issued _before or during_ the period whose rent it's really
paying for — that's the "advance" in Advance Billing.

### Arrears Billing (`paymentTiming: 'ARREARS'`)

| Event                                                                         | Amount | Running total collected |
| ----------------------------------------------------------------------------- | -----: | ----------------------: |
| Conversion — no payment collected                                             |      0 |                       0 |
| Period 1 bill (after period 1 completes): `5,000 (rent) + 300 (excess)`       |  5,300 |                   5,300 |
| Period 2 bill: `5,000 (rent) + 450 (excess)`                                  |  5,450 |                  10,750 |
| Period 3 bill: `5,000 (rent) + 0 (excess)`                                    |  5,000 |                  15,750 |
| Period 4 (final) bill: `5,000 (rent) + 600 (excess) − 0 (no credit, Arrears)` |  5,600 |                  21,350 |

Same grand total (`21,350`) — Advance and Arrears never change _how much_ the customer owes
overall, only _when_ each period's rent is actually collected relative to that period. Advance
front-loads one period's worth of cash; Arrears defers everything, including the last period's
rent, to after that period is measured.

---

## 5. The Edge Case: Advance ≠ Exactly One Period's Rent

`advanceAdjusted = min(monthlyRent, contract.advanceAmount)` — deliberately a `min()`, not a
direct substitution of `monthlyRent`. This was a real bug, fixed this round (see §9): the final
bill used to credit `monthlyRent` unconditionally, regardless of what was actually collected.

- **Partial advance** (e.g. advance was only 2,000 against a 5,000 rent — perhaps a negotiated
  reduced deposit at signing): the final bill credits only 2,000, not the full 5,000. The
  remaining `5,000 − 2,000 = 3,000` shortfall is still charged on the final bill, correctly — it
  was never actually prepaid, so it can't be waived.
- **Oversized advance** (advance entered as 8,000 against a 5,000 rent): the final bill still
  credits only `min(5,000, 8,000) = 5,000` — one period's worth, since that's all any single
  period's bill needs to offset. The extra `8,000 − 5,000 = 3,000` is **not** automatically applied
  anywhere else in the contract (it isn't spread across other periods, and isn't auto-refunded) —
  this is a known, documented limitation, not a bug: an oversized advance is an unusual manual
  entry, and the system doesn't currently have a "credit balance carried forward" concept for
  rent. If this becomes a real operational need, it would require a new running-credit field on
  the contract rather than reusing `advanceAmount`/`advanceAdjusted`.
- **No advance at all under Advance billing** (`advanceAmount` left at 0, e.g. mis-keyed at
  conversion): `advanceAdjusted = min(monthlyRent, 0) = 0` — the final bill charges full rent, same
  as Arrears would have. This degrades gracefully rather than crashing or under-billing.

The same `min()` fix is mirrored in the **live estimate preview** Finance sees while entering
meter readings, so what's previewed matches what actually gets stored on submit
([`UsageRecordingModal.tsx:1012–1016`](../frontend/components/Finance/UsageRecordingModal.tsx#L1012-L1016)).

---

## 6. Where `paymentTiming` Is Read or Displayed

| Location                                                                                                           | What it does                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`EmployeeQuotationTable.tsx`](../frontend/components/employeeComponents/EmployeeQuotationTable.tsx)               | Sets it at creation/edit (§2).                                                                                                                                                                                                                                                                       |
| [`QuotationConversionFlow.tsx:237`](../frontend/components/employeeComponents/QuotationConversionFlow.tsx#L237)    | Gates whether an advance payment request is submitted at conversion.                                                                                                                                                                                                                                 |
| [`QuotationViewDialog.tsx:873, 2390–2488`](../frontend/components/employeeComponents/QuotationViewDialog.tsx#L873) | Shows `"Arrears (Postpaid)"` / `"Advance"` badge, and relabels the payment-amount field `"Initial Payment"` (Arrears) vs. `"First Month Advance Payment"` (Advance).                                                                                                                                 |
| [`ContractDocumentBody.tsx:375, 505`](../frontend/components/employeeComponents/ContractDocumentBody.tsx#L375)     | Same badge on the signed contract document; `isArrears` also gates contract-doc payment-schedule wording.                                                                                                                                                                                            |
| [`InvoiceViewDialog.tsx:630`](../frontend/components/employeeComponents/InvoiceViewDialog.tsx#L630)                | `isArrearsInvoice` flag used in the invoice detail view.                                                                                                                                                                                                                                             |
| [`UsageRecordingModal.tsx:1012`](../frontend/components/Finance/UsageRecordingModal.tsx#L1012)                     | Drives the live final-period rent-credit preview while Finance enters a period's readings (§5).                                                                                                                                                                                                      |
| [`BillDocumentBody.tsx:379–402`](../frontend/components/Finance/BillDocumentBody.tsx#L379-L402)                    | `ChargesSection` relabels the rent line on the customer-facing bill PDF/view: `"Rent — Upcoming Period (paid in advance)"` for a non-final Advance-billing period, `"Base Rent"` otherwise; shows `"Advance Adjusted (final period — already prepaid)"` as a credit line when `advanceAdjusted > 0`. |
| [`usageService.ts:511, 528`](../backend/billing_service/src/services/usageService.ts#L511)                         | The authoritative backend calculation (§3, §5).                                                                                                                                                                                                                                                      |
| [`billingService.ts:811, 1054`](../backend/billing_service/src/services/billingService.ts#L811)                    | Sets it on create (`payload.paymentTiming ?? 'ADVANCE'`), updates it on edit.                                                                                                                                                                                                                        |
| `invoiceEntity.ts:195` / `dataSource.ts:1650`                                                                      | Column + Postgres enum, default `'ADVANCE'`.                                                                                                                                                                                                                                                         |

A single field, read consistently everywhere by the exact same `=== 'ARREARS'` check — there's no
divergent copy of this logic anywhere in the codebase (verified via a full-repo grep of
`paymentTiming` this round).

---

## 7. Interaction with the Security Deposit

The Security Deposit is a **completely separate financial transaction from the Advance**, under
**either** billing method — it's never rent, never revenue, and its collection is not gated by
`paymentTiming` at all (an Arrears contract can still require a deposit; the deposit question is
orthogonal to how rent is timed). See the other doc's §4 for the full deposit workflow. The one
place the two intersect visually: when both an Advance payment _and_ a deposit exist on the same
contract, the Advance Bill document shows both as two distinct sections and its title becomes
"Advance & Security Deposit Bill" — but this only applies under Advance billing, since Arrears
contracts have no Advance Bill at all (nothing was collected at conversion to generate one from).
An Arrears contract's deposit, if any, is collected the same three ways (Employee at conversion /
Technician fallback / Finance fallback) and — having no Advance Bill to attach to — gets its own
standalone `SECURITY_DEPOSIT`-billType bill.

---

## 8. Accounts Implications

Both billing methods post through the exact same Accounts pipeline once money is actually
collected — the _timing_ differs, the _mechanics_ (approval queue, cashbook posting, cheque
handling, ledger updates) don't:

- **Advance billing**: the very first cash event on a contract is the Advance approval — AR never
  reflects "period 1 rent owed" because it's paid before period 1's `UsageRecord` even exists.
  Every subsequent period's `UsageRecord.totalCharge` becomes AR the instant it's created (see the
  other doc's §5 step 2), same as Arrears.
- **Arrears billing**: the contract can sit ACTIVE with the customer owing nothing until period 1
  is recorded — AR simply starts one period later than an equivalent Advance contract would. There
  is no "money already collected but not yet accounted for" state to reconcile, since nothing was
  collected up front.
- Neither method changes the **total** revenue/AR recognized over the life of the contract — only
  the point in time each period's rent becomes receivable and gets collected (see the worked
  totals in §4 — both methods reach the identical grand total).

---

## 9. Fixed This Round

- **`advanceAdjusted` unconditionally credited `monthlyRent`**, ignoring the contract's actual
  `advanceAmount` — fixed to `min(monthlyRent, contract.advanceAmount)` in both the authoritative
  backend calculation (`usageService.ts`) and the Finance-side live preview
  (`UsageRecordingModal.tsx`), so a partial or oversized advance is now credited correctly instead
  of always assuming a full period was prepaid (§5). Live-verified on contract QTN-2026-0003 via a
  temporary, fully-reverted advance-amount change.
- **The customer-facing bill never distinguished "prepaid upcoming rent" from a plain rent
  charge** — `ChargesSection` in `BillDocumentBody.tsx` now reads `invoice.paymentTiming` and
  relabels the rent line accordingly (§6), rather than showing the generic `"Base Rent"` label on
  every bill regardless of billing method.
- A stray, misleading code comment (`// Remaining security deposit` attached to
  `contract.advanceAmount` — unrelated to the actual Security Deposit feature, left over from
  before the two concepts were properly separated) was corrected to describe what the field
  actually tracks.

No workflow-level issue was found in the Advance vs. Arrears mechanic itself once the above was
fixed — the rolling-prepayment design (§3) is sound and matches the description given.
