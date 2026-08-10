# Rent / Lease Workflow Overview

## Quotation → Contract → Installation → Recurring Payment Approval

---

## Step-by-Step Flow

### 1. Quotation

**Employee** creates a RENT or LEASE quotation — specifying the machine, billing plan (Fixed Limit / CPC / EMI / FSM etc.), cycle length, and pricing. The quotation is sent to Finance for pricing review via the same `employeeApproveInvoice` call used for Sales.

### 2. Finance Approves Pricing

**Finance** reviews and approves the quotation terms (`FINANCE_APPROVED`). This is Finance's only role in the pre-activation stages — they do not activate or configure the contract. Pricing adjustments can be made before sign-off.

### 3. Employee Converts and Allocates Machine

**Employee** converts the finance-approved quotation into a live RENT/LEASE record and allocates a specific physical machine to it — all in one step via `QuotationConversionFlow`. After conversion, `contractStatus = PENDING_CONFIRMATION`. Machine allocation is locked in at this point.

### 4. Employee Handles Pre-Activation Steps (any order)

With the contract at `PENDING_CONFIRMATION`, the Employee sees three action buttons in the Rent Management table:

- **Sign Contract Agreement** (PenLine) — opens the shared `ContractAgreementModal`. Employee signs using live e-signature or uploads a scanned physical copy with an attestation note. Customer sign-off options are identical to Sales (in-person, remote 72-hour link, or upload).
- **Record Advance Payment** (DollarSign) — opens a payment form (Cash / Bank Transfer / Cheque). Creates a `SalePaymentRequest` with `paymentContext = RENT_ADVANCE` or `LEASE_ADVANCE`. The advance is **pending until Finance/Accounts approves it** — not counted as money received yet.
- **Activate Contract** (Settings2 gear) — directly calls `activateContractInvoice` with no deposit or readings. Contract status moves to `ACTIVE`.

These three can be done in any order. The contract can be activated before the advance is approved.

### 5. Contract Appears on Service Help Desk

Once `ACTIVE`, the contract appears in the shared Customer Contracts table (the same table as Sale contracts — no separate Rent/Lease table). The Help Desk / Manager creates an Installation Request and assigns a Technician.

### 6. Technician Installs — and Captures Initial Meter Readings

**Technician** starts the job (status `IN_PROGRESS`) via the Installation Requests page. For RENT/LEASE jobs the Complete button is labeled **"Readings"** instead of "Complete" and opens a meter reading dialog before marking the job done:

- **B&W count** (required)
- **B&W A3 count** (optional)
- **Color count** (optional)
- **Color A3 count** (optional)
- **Reading date**

On submission, the readings are written to the `InvoiceItem` entity (`initialBwCount`, `initialColorCount` etc.) and an audit trail is stored on the `InstallationRequest` (who entered them, when, and the reading date). Status moves to `COMPLETED`.

For Sale-type jobs on the same page the button says "Complete" and no reading form appears — the RENT/LEASE branch is detected from the `saleType` field on the `InstallationRequest` record.

> **No Finance fallback for readings in the current build.** The original design called for Finance to have an override option in the Monthly Collection screen. This was not implemented — if a reading needs correction it currently requires a direct database fix or re-entry via a future Finance override.

### 7. Finance Records Usage Each Billing Period

The contract appears in Finance's **Monthly Collections** screen. Each billing cycle follows a three-status progression:

| Status              | What Finance does                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **USAGE_PENDING**   | Click "Record Usage" → opens the Usage Recording modal to enter meter counts for the period |
| **INVOICE_PENDING** | Usage recorded; Finance clicks **"Collect"** to record the period payment                   |
| **SUMMARY_PENDING** | Contract tenure reached; Finance generates the final consolidated summary                   |

### 8. Finance Collects the Period Payment (two paths)

When Finance clicks **Collect** on an `INVOICE_PENDING` row, a payment dialog opens with a **Collect Now / Collect Later** toggle:

- **Collect Now** — Finance has the money in hand. Fills in amount, mode, date, account. Creates a `SalePaymentRequest` (`paymentContext = RENT_PERIODIC` or `LEASE_PERIODIC`, `collectLater = false`). Goes straight to the Accounts approval queue.
- **Collect Later** — Finance pre-enters the expected payment details but hasn't physically received it yet. Creates the same `SalePaymentRequest` with `collectLater = true`. Sits in the Accounts queue labeled **"Collect Later"** until a Finance/Accounts user confirms receipt.

### 9. Accounts Approves / Confirms the Payment

Finance (in the Accounts role) sees all contract payments in the **Contract Payments** page (Finance → Accounts → Contract Payments). Each row shows the request number, a **"Collect Later"** badge if applicable, and the payment context (e.g. "RENT ADVANCE", "RENT PERIODIC").

- For a standard payment: the approve button reads **"Approve"**.
- For a Collect Later entry: the button reads **"Confirm Receipt"** — same backend logic, different label to reflect that this is confirming physical arrival.

On approval:

- **Cash / Bank Transfer** — cashbook entry posted immediately, account balance updated, invoice ledger updated.
- **Cheque** — intent recorded, no cashbook entry yet. Cash moves when the cheque is Deposited and Cleared in the Cheque module.

---

## Who Does What

| Role                    | Step                                                         | What They See Next                                                 |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| **Employee**            | Creates RENT/LEASE quotation                                 | Waits for Finance pricing approval                                 |
| **Finance**             | Approves quotation pricing                                   | Employee notified; can convert                                     |
| **Employee**            | Converts quotation → RENT/LEASE, allocates machine           | Contract at PENDING_CONFIRMATION                                   |
| **Employee**            | Signs contract agreement                                     | Agreement moves toward FULLY_SIGNED                                |
| **Employee**            | Records advance payment (optional)                           | Advance sits PENDING in Accounts queue                             |
| **Finance**             | Approves advance payment                                     | Cashbook / ledger updated                                          |
| **Employee**            | Activates contract                                           | Contract becomes ACTIVE; appears in Service Desk                   |
| **Help Desk / Manager** | Creates Installation Request, assigns Technician             | Technician sees job in Installation Requests list                  |
| **Technician**          | Starts job → captures initial meter readings → completes     | Readings stored; status COMPLETED                                  |
| **Finance**             | Records period usage (USAGE_PENDING)                         | Status moves to INVOICE_PENDING                                    |
| **Finance**             | Collects payment — Collect Now or Collect Later              | SalePaymentRequest created; appears in Contract Payments queue     |
| **Finance / Accounts**  | Approves ("Approve") or confirms arrival ("Confirm Receipt") | Cash/Bank: ledger + account updated. Cheque: money moves at Clear. |

---

## Key Business Rules

**Every payment is PENDING until Accounts approval — no exceptions.**  
Advance payment, periodic collection, Collect Now, Collect Later — all create a `SalePaymentRequest` with status `PENDING`. Nothing hits the invoice ledger or cashbook until Finance/Accounts explicitly approves it.

**Collect Later is a pre-registration, not a receipt.**  
When Finance marks Collect Later, the amount and payment mode are recorded but the money has not arrived. The record stays PENDING in the Accounts queue. "Confirm Receipt" is the approval step that happens when cash or a cheque physically arrives.

**Cash and Bank Transfer move on approval; Cheque moves at Clear.**  
Same rule as the Sale workflow. Cheque approval records the intent. The actual cashbook entry and account balance update only happen when the cheque is marked Cleared in the Cheque module.

**Initial reading responsibility: Technician only (in the current build).**  
The Technician captures B&W and Color counts at Stop Installation. B&W count is the only required field. These readings are the starting point for all future billing calculations — if they are wrong, billing figures for the full contract tenure will be off.

**Finance no longer activates RENT/LEASE contracts.**  
Finance's role ends after pricing approval. Activation, signing, and advance collection are all done by the Employee. Finance only re-enters at the Usage / Collection phase.

---

## How This Compares to the Sale Workflow

**What's shared:**  
Contract Agreement generation, all three customer signature methods (in-person / remote link / upload), the SalePaymentRequest approval-gate, Cash vs Cheque cashbook rules, the Service Help Desk Customer Contracts table, the Installation Requests page and Technician start/stop flow, and the overall Finance → Accounts approval pattern.

**What's genuinely different:**

|                          | Sale                                         | Rent / Lease                                                             |
| ------------------------ | -------------------------------------------- | ------------------------------------------------------------------------ |
| Initial meter readings   | Not applicable (no metered billing)          | Technician captures at Stop Installation                                 |
| Payment after activation | One or a few ad-hoc payments                 | Recurring per-period collection                                          |
| Collection UX            | Employee records via Customer Contracts page | Finance records via Monthly Collections with Collect Now / Collect Later |
| Finance activation role  | Finance activates contract                   | Employee activates; Finance only approves pricing                        |
| Payment context tags     | `SALE`                                       | `RENT_ADVANCE`, `RENT_PERIODIC`, `LEASE_ADVANCE`, `LEASE_PERIODIC`       |

---

## What Ended Up Different from the Original Plan

**Finance fallback for initial readings was not built.**  
The original design specified "Technician primary, Finance fallback" — Finance would have an override option in the Monthly Collection screen. Only the Technician path was implemented. The Finance override is a future addition.

**Photo upload for readings is backend-ready but not surfaced in the UI.**  
The entity and controller accept `readingPhotoUrl` and `initialReadingPhotoUrl`, but the Technician's meter reading dialog does not currently include a photo upload field. The field exists in the database for when a camera/file input is added.

**Activation order is flexible, not enforced.**  
The original plan described activation as the final step after signing and advance payment. In the build, the three pre-activation actions (sign, pay advance, activate) can be done in any order — the system does not block activation if the contract isn't yet signed or the advance isn't yet approved.

**Finance's approval role in periodic collection is the same queue as Sale advances.**  
The original plan used "Accounts" as a distinct concept from "Finance" for periodic collection. In the build, the same Finance role handles both — the Contract Payments page (previously "Sale Payments") shows all `SalePaymentRequest` records regardless of context. The `paymentContext` tag distinguishes them visually.
