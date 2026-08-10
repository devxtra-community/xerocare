# Sale Workflow Overview

## Quotation → Contract → Installation → Payment Approval

---

## Step-by-Step Flow

### 1. Quotation

**Employee** creates a quotation (PROFORMA) for the customer — specifying sale type (Sale / Product Sale / Sparepart Sale), items, and pricing. The system automatically notifies the branch Manager/Finance of the new quotation. The employee can send the quotation PDF to the customer via Email or WhatsApp directly from the UI.

### 2. Finance Approves Pricing

**Finance / Manager** reviews the quotation and approves the pricing and terms (`financeApproveQuotation`). The quotation status moves to `FINANCE_APPROVED`. Finance can adjust pricing at this stage before sign-off.

### 3. Employee Converts to Sale

**Employee** converts the finance-approved quotation into an active Sale transaction (`convertToTransaction`). This locks in the items and customer, and the record becomes a live invoice.

### 4. Finance Allocates & Activates

**Finance** picks the specific physical machines to send to the customer (`allocateMachines`), then activates the contract (`activateContract`). An optional advance/deposit amount can be recorded at activation. Contract status moves to `ACTIVE`.

### 5. Contract Agreement — Employee Signs

**Employee** opens the Contract Agreement modal from the Customer Contracts page. The agreement is auto-generated from the invoice data. The employee signs using one of two methods:

- **Live signature** — draws on-screen (ESignatureCanvas).
- **Upload** — uploads a scanned/photographed signed document + a required attestation note confirming physical signature was obtained.

Signature status: `PENDING_SIGNATURES` → `EMPLOYEE_SIGNED`

### 6. Contract Agreement — Customer Signs

The employee handles customer sign-off using one of three methods:

- **In-person** — employee captures the customer's live signature on the same device.
- **Remote link** — employee generates a one-time 72-hour signing link; the customer signs on their own device via a public page (no login required).
- **Upload** — employee uploads a scanned physically-signed copy + attestation note.

When both parties have signed, status becomes `FULLY_SIGNED`.

### 7. Service Help Desk Assigns Technician

Once a contract is active, the **Help Desk / Manager** sees it in the Installation Requests queue. They assign a Technician to the job, setting status to `ASSIGNED`.

### 8. Technician Starts & Completes Installation

**Technician** starts the job (status → `IN_PROGRESS`), then marks it complete (status → `COMPLETED`). The system records `startTime`, `endTime`, and calculated `durationSeconds` for the work record.

### 9. Employee Records Payment

**Employee** records a customer payment against the invoice — choosing mode (Cash / Bank Transfer / Cheque), date, amount, and the target cash/bank account. A `SalePaymentRequest` is created with status `PENDING`. The invoice ledger is **not updated yet** — the payment is only a request at this point.

### 10. Finance Reviews & Approves Payment

**Finance** sees all pending sale payments in the Accounts → Sale Payments queue. On approval:

- **Cash / Bank Transfer** — a cashbook entry is posted immediately to the selected account, the account balance updates, and the invoice ledger (paidAmount / balanceAmount) is updated.
- **Cheque** — the payment is approved and recorded, but **no cashbook entry is posted and no balance moves** until the cheque goes through the separate Cheque module's deposit + clear lifecycle.

---

## Who Does What

| Role                    | Step                                                          | What They See Next                                                                  |
| ----------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Employee**            | Creates quotation, sends to customer                          | Waits for Finance approval                                                          |
| **Finance / Manager**   | Approves quotation pricing                                    | Employee notified; can convert                                                      |
| **Employee**            | Converts quotation → Sale                                     | Finance proceeds to allocate                                                        |
| **Finance**             | Allocates machines, activates contract                        | Contract becomes ACTIVE                                                             |
| **Employee**            | Signs contract agreement; captures/uploads customer signature | Agreement moves to FULLY_SIGNED                                                     |
| **Customer** (optional) | Signs via remote link on own device                           | Confirmation page shown                                                             |
| **Help Desk / Manager** | Assigns technician to installation request                    | Technician notified                                                                 |
| **Technician**          | Starts and stops installation                                 | Duration recorded; status COMPLETED                                                 |
| **Employee**            | Records sale payment (Cash/Bank/Cheque)                       | Payment sits as PENDING                                                             |
| **Finance**             | Approves or rejects pending payment                           | Cash/Bank: ledger + account updated immediately. Cheque: money moves only at clear. |

---

## Key Business Rules

**Payments are always pending until Finance approval.**  
A recorded payment does not count as collected money. The invoice's paid/balance amounts do not change, and no cashbook entry is posted, until Finance explicitly approves it.

**Cash and Bank Transfer: cash moves on approval.**  
When Finance approves a Cash or Bank Transfer payment, the cashbook entry is posted and the account balance updates in the same transaction.

**Cheque: cash moves at Clear, not at Deposit, and not at Approval.**  
Approval records the intent. Deposit is a status change only (cheque is physically at the bank). The actual cashbook entry and account balance update only happen when the cheque is marked **Cleared** in the Cheque module. The deposit step shows the message "Cash at Bank updates once it clears" to make this explicit.

**Customer sign-off has three valid methods.**  
In-person live signature, remote link (72h one-time token), and uploading a scanned physically-signed document are all treated as equivalent. Upload requires a mandatory attestation note from the employee confirming the physical signature was obtained. All three result in the same `FULLY_SIGNED` status.

---

## What Ended Up Different from the Original Plan

- **Upload-as-customer-signature was not in the original design.** It was added as a practical alternative to live e-signature, since employees often collect signed paperwork offline. The entity gained three new columns (`customerSignedDocumentUrl`, `customerSignedDocumentNote`, `customerSignedMethod`) and a dedicated upload endpoint with Multer/R2 file storage.

- **Employee sign also supports upload.** The original design only described a live on-screen signature for the employee. Upload was extended to the employee signing step as well for the same practical reason.

- **No dedicated "receipt generation" step in the sale payment flow.** Receipt generation for customers uses the existing invoice payment receipt mechanism (shared with the general billing flow), rather than a new standalone receipt step in the sale payment approval chain.
