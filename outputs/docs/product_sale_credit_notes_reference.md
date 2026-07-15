# Product Sale Credit Notes & Returns — Technical Reference

**Xerocare Billing Service**
**Date:** 2026-07-15
**Status:** Authoritative as-built documentation derived from source code

---

## Table of Contents

1. [Overview](#1-overview)
2. [The Three Return Types](#2-the-three-return-types)
   - 2.1 [DIRECT_REFUND — Direct Cash Return](#21-direct_refund--direct-cash-return)
   - 2.2 [REPLACEMENT](#22-replacement)
   - 2.3 [CREDIT_EXCHANGE](#23-credit_exchange)
3. [Data Model](#3-data-model)
4. [API Reference](#4-api-reference)
5. [Frontend — Pages and Components](#5-frontend--pages-and-components)
6. [Inventory Impact (RabbitMQ Event)](#6-inventory-impact-rabbitmq-event)
7. [Reporting / Accounting Impact](#7-reporting--accounting-impact)
8. [Worked Numeric Examples](#8-worked-numeric-examples)
9. [Edge Cases Handled](#9-edge-cases-handled)
10. [Known Limitations and Discrepancies](#10-known-limitations-and-discrepancies)

---

## 1. Overview

The Credit Note system allows the sales team to initiate product returns after a sale has been completed. A **credit note** is raised against a specific invoice line item (one product per credit note) and must be reviewed by Finance before any refund, swap, or exchange is actioned.

**When to use a credit note vs. invoice cancellation:**

- A **credit note** is used when a product has already been delivered, accepted, and payment has been made. The invoice remains in the system and is not deleted.
- An **invoice cancellation** (setting status to `CANCELLED`) is used for pre-delivery reversals where no financial transaction has cleared.
- When a DIRECT_REFUND credit note is approved, the originating invoice is automatically updated to `REFUNDED` status (terminal).

**Scope:** Product sale invoices only. This module is separate from the Spare Part Returns feature (which uses the same `return_credits` table but goes through `billingService.processReturn()`).

---

## 2. The Three Return Types

The `type` field on a credit note is set at creation and cannot be changed. It determines the entire downstream flow.

```
CreditNoteType enum (backend):
  DIRECT_REFUND    → "Direct Refund" (cash back to customer)
  REPLACEMENT      → "Replacement"   (like-for-like swap)
  CREDIT_EXCHANGE  → "Credit"        (swap for a different product, with value adjustment)
```

---

### 2.1 DIRECT_REFUND — Direct Cash Return

**Definition:** The returned product is accepted back, the customer receives a cash/transfer refund equal to the original product amount stored on the credit note, and the invoice is closed as refunded.

**Typical scenario:** Customer received a defective unit and wants money back, not a replacement.

#### Status Flow

```
DRAFT  →  PENDING_APPROVAL  →  COMPLETED
  (Sales)      (Sales)           (Finance)
```

DIRECT_REFUND is the only type that does **not** pass through the `APPROVED` state. Finance approval transitions it directly to `COMPLETED` in a single step.

#### Step-by-Step Workflow

| Step | Actor              | Action                                                                            | System Result                              |
| ---- | ------------------ | --------------------------------------------------------------------------------- | ------------------------------------------ |
| 1    | EMPLOYEE / MANAGER | Creates credit note via form                                                      | Status = `DRAFT`, `creditNoteNo` generated |
| 2    | EMPLOYEE / MANAGER | Clicks "Send to Finance"                                                          | Status = `DRAFT` → `PENDING_APPROVAL`      |
| 3    | FINANCE / ADMIN    | Reviews in Finance Returns page, clicks "Approve"                                 | Opens `FinanceApprovalModal`               |
| 4    | FINANCE / ADMIN    | Selects damage reason, payment mode, enters finance note, clicks "Approve Return" | `POST /b/credit-notes/:id/approve`         |
| 5    | Backend            | Validates `financeNote` and `damageReason` are present                            | Throws 400 if missing                      |
| 6    | Backend            | Sets `status = COMPLETED`, saves `financeNote`, `damageReason`                    | —                                          |
| 7    | Backend            | Emits RabbitMQ event to mark old product as DAMAGED or RETURNED                   | See §6                                     |
| 8    | Backend            | Creates a `ReturnCredit` record                                                   | See §3                                     |
| 9    | Backend            | Updates originating invoice `status = REFUNDED`                                   | Invoice is now terminal                    |
| 10   | —                  | No further action required                                                        | Flow complete                              |

#### Calculation Logic

There is **no server-side calculation** in this flow. The refund amount is whatever value is stored in `creditNote.productAmount`, which was entered by the sales user at creation time (typically copied from the invoice item's unit price).

```
refund_amount = creditNote.productAmount
```

**Tax:** The `productAmount` field has no tax breakdown. The credit note entity stores no `taxAmount`, `taxPercent`, or `taxName` fields. Whether the `productAmount` is VAT-inclusive or exclusive depends entirely on what the sales user entered. The system makes no automatic tax reversal calculation.

#### Accounting Impact

| What                   | How                                                                                                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `return_credits` table | A row is inserted with `amount = creditNote.productAmount`. This row is later aggregated in `BillingReportService` to reduce reported sales revenue.                                                       |
| `invoices` table       | `status` updated to `REFUNDED`                                                                                                                                                                             |
| Chart of Accounts / GL | **None.** There are no double-entry journal entries, no cashbook debit/credit entries, and no accounts-payable records created. The accounting impact is limited to the reporting layer (sales deduction). |
| Cashbook               | **None.** The `paymentMode` field collected by the frontend (CASH / CHECK / BANK_TRANSFER) is **not persisted** — see §10 Discrepancy #1.                                                                  |

#### Inventory Impact

The old product's status in the ven_inv_service is updated via RabbitMQ:

- If `damageReason === 'Damaged Product'` → product marked `DAMAGED`
- All other damage reasons → product marked `RETURNED`

---

### 2.2 REPLACEMENT

**Definition:** The defective product is swapped for a new unit of the **same model**. No money changes hands (the replacement is always treated as equal value regardless of individual unit prices).

**Typical scenario:** Customer received a defective printer; exchange for another identical printer from stock.

#### Status Flow

```
DRAFT  →  PENDING_APPROVAL  →  APPROVED  →  PRODUCT_REPLACED
  (Sales)      (Sales)           (Finance)       (Sales)
```

Unlike DIRECT_REFUND, Finance approval stops at `APPROVED` — it awaits a second action from Sales to confirm the physical handover.

#### Step-by-Step Workflow

| Step | Actor              | Action                                                                                                                                                                                         | System Result                                                        |
| ---- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1    | EMPLOYEE / MANAGER | Creates credit note, selects type = REPLACEMENT                                                                                                                                                | Status = `DRAFT`                                                     |
| 2    | EMPLOYEE / MANAGER | Sends to Finance                                                                                                                                                                               | Status = `PENDING_APPROVAL`                                          |
| 3    | FINANCE / ADMIN    | Approves (damage reason + finance note required)                                                                                                                                               | Status = `APPROVED`; no ReturnCredit created; no inventory event yet |
| 4    | EMPLOYEE / MANAGER | Sees `APPROVED` status; clicks "Complete"                                                                                                                                                      | Opens `CompletionModal`                                              |
| 5    | EMPLOYEE / MANAGER | System fetches available stock: same model only, status=AVAILABLE, serial ≠ returned unit                                                                                                      | Scrollable list shown                                                |
| 6    | EMPLOYEE / MANAGER | Selects new unit (or enters serial manually if out of stock)                                                                                                                                   | Serial auto-fills                                                    |
| 7    | EMPLOYEE / MANAGER | Clicks "Confirm and Complete"                                                                                                                                                                  | `POST /b/credit-notes/:id/complete`                                  |
| 8    | Backend            | Sets `status = PRODUCT_REPLACED`; saves `replacementProductId`, `replacementProductName`, `replacementSerialNumber`, `replacementAmount = creditNote.productAmount`, `replacementDiscount = 0` | —                                                                    |
| 9    | Backend            | Emits RabbitMQ event for **old product** → DAMAGED or RETURNED                                                                                                                                 | See §6                                                               |
| 10   | Backend            | Emits RabbitMQ event for **new product** → SALE                                                                                                                                                | See §6                                                               |

#### Calculation Logic

There is **no price calculation** for REPLACEMENT. The `replacementAmount` is always set to the original `productAmount`:

```
replacementAmount = creditNote.productAmount   // set in CompletionModal.handleSubmit():
                                               // replacementAmount: isExchange ? newPrice : record?.productAmount
replacementDiscount = 0 (default, not user-editable for REPLACEMENT)
```

Even if the replacement unit has a different `sale_price` in inventory, the credit note records the original purchase price and no adjustment is made.

#### Accounting Impact

| What                   | How                                                                          |
| ---------------------- | ---------------------------------------------------------------------------- |
| `return_credits` table | **None created** for REPLACEMENT.                                            |
| `invoices` table       | **Not updated**. The invoice stays in its current status (e.g. `PAID`).      |
| Chart of Accounts / GL | **None.**                                                                    |
| Cashbook               | **None.**                                                                    |
| Sales reports          | Not affected (no ReturnCredit row, no adjustment in `BillingReportService`). |

#### Inventory Impact

Two RabbitMQ events emitted at completion:

- Old product → `DAMAGED` or `RETURNED` (based on `damageReason` set during Finance approval)
- New product → `SALE` (hardcoded; see §10 Discrepancy #4)

---

### 2.3 CREDIT_EXCHANGE

**Definition:** The customer returns a product and selects a **different model** as replacement. If the new product is more expensive, the customer pays the difference; if cheaper, the customer is owed a refund of the balance. An optional extra discount can also be applied.

**Typical scenario:** Customer bought Model A for 1,000 QAR and wants to upgrade to Model B at 1,200 QAR; they pay the 200 QAR gap.

#### Status Flow

```
DRAFT  →  PENDING_APPROVAL  →  APPROVED  →  PRODUCT_REPLACED
  (Sales)      (Sales)           (Finance)       (Sales)
```

Same two-step flow as REPLACEMENT (Finance approves, then Sales completes). The final status is also `PRODUCT_REPLACED` — there is no separate terminal status for exchanges.

#### Step-by-Step Workflow

| Step | Actor              | Action                                                                                                 | System Result                                                                            |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 1    | EMPLOYEE / MANAGER | Creates credit note, type = CREDIT_EXCHANGE                                                            | Status = `DRAFT`                                                                         |
| 2    | EMPLOYEE / MANAGER | Sends to Finance                                                                                       | Status = `PENDING_APPROVAL`                                                              |
| 3    | FINANCE / ADMIN    | Approves                                                                                               | Status = `APPROVED`; no ReturnCredit; no inventory event                                 |
| 4    | EMPLOYEE / MANAGER | Clicks "Complete"                                                                                      | Opens `CompletionModal` (exchange mode)                                                  |
| 5    | EMPLOYEE / MANAGER | System fetches available stock: **different model only** (model_id ≠ original model), status=AVAILABLE | List shown                                                                               |
| 6    | EMPLOYEE / MANAGER | Selects new unit and optionally enters extra discount                                                  | Variance panel updates in real time                                                      |
| 7    | EMPLOYEE / MANAGER | Reviews "Payable Gap" or "Refundable Balance" and confirms                                             | `POST /b/credit-notes/:id/complete`                                                      |
| 8    | Backend            | Sets `status = PRODUCT_REPLACED`; saves replacement fields                                             | `replacementAmount = new product's sale_price`, `replacementDiscount = entered discount` |
| 9    | Backend            | Emits RabbitMQ for old product → DAMAGED or RETURNED                                                   | See §6                                                                                   |
| 10   | Backend            | Emits RabbitMQ for new product → SALE                                                                  | See §6                                                                                   |

#### Calculation Logic (frontend only — not persisted as accounting entry)

The variance calculation is performed in `CompletionModal.tsx` for display purposes only:

```
originalValue  = creditNote.productAmount       // original purchase price
newValue       = selectedProduct.sale_price     // new product's current sale price
discount       = user-entered extra discount    // defaults to 0

variation = newValue - originalValue - discount

if variation >= 0:
    display "Payable Gap: QAR {variation}"      // customer pays this amount
else:
    display "Refundable Balance: QAR {|variation|}"  // shop refunds this amount
```

This variance is **shown to the user** as a guide for how much cash to collect or return, but it is **not recorded as an accounting entry**. The cash transaction must be handled outside the system (e.g. via the Cashbook / Payment module manually).

What IS persisted:

```
credit_note.replacementAmount   = newValue       (new product's sale_price)
credit_note.replacementDiscount = discount
credit_note.productAmount       = originalValue  (unchanged from creation)
```

The `billingReportService.ts` then picks up completed CREDIT_EXCHANGE records and adjusts reported sales:

```
sales_adjustment = replacementAmount - productAmount
// Added to totalSales in branch and global sales reports
// (No discount deduction applied in this report-level formula)
```

#### Accounting Impact

| What                   | How                                                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `return_credits` table | **None created** for CREDIT_EXCHANGE.                                                                                                                                  |
| `invoices` table       | **Not updated.**                                                                                                                                                       |
| Chart of Accounts / GL | **None.**                                                                                                                                                              |
| Cashbook               | **None.** The payable gap / refundable balance shown on screen must be collected/paid manually; no system record is created.                                           |
| Sales reports          | `BillingReportService` adds `(replacementAmount − productAmount)` to reported branch/global sales totals. The `replacementDiscount` is not subtracted in this formula. |

#### Inventory Impact

Same as REPLACEMENT:

- Old product → `DAMAGED` or `RETURNED`
- New product → `SALE` (hardcoded)

#### Customer Credit Ledger

Despite the name "Credit Exchange", there is **no customer credit balance ledger**. The system does not track a store-credit balance that can be drawn down on a future purchase. The transaction is settled in full at the time of completion.

---

## 3. Data Model

### 3.1 `credit_notes` Table

**Entity file:** `backend/billing_service/src/entities/creditNoteEntity.ts`

| Column                    | DB Type       | Nullable | Default | Notes                                                 |
| ------------------------- | ------------- | -------- | ------- | ----------------------------------------------------- |
| `id`                      | UUID          | No       | auto    | Primary key                                           |
| `creditNoteNo`            | VARCHAR       | No       | —       | Unique; format `CN-YYYY-NNNNN`                        |
| `invoice_id`              | UUID          | No       | —       | FK → `invoices.id`; indexed                           |
| `invoiceNumber`           | VARCHAR       | Yes      | —       | Denormalized copy; indexed                            |
| `customerId`              | UUID          | No       | —       | Indexed                                               |
| `customerName`            | VARCHAR       | Yes      | —       | Denormalized; indexed                                 |
| `branchId`                | UUID          | No       | —       | Indexed                                               |
| `productId`               | UUID          | No       | —       | Indexed                                               |
| `productName`             | VARCHAR       | No       | —       |                                                       |
| `modelName`               | VARCHAR       | No       | —       |                                                       |
| `brand`                   | VARCHAR       | No       | —       |                                                       |
| `serialNumber`            | VARCHAR       | Yes      | NULL    |                                                       |
| `productAmount`           | DECIMAL(12,2) | No       | —       | Original sale price of the returned item              |
| `type`                    | ENUM          | No       | —       | `DIRECT_REFUND` \| `REPLACEMENT` \| `CREDIT_EXCHANGE` |
| `status`                  | ENUM          | No       | `DRAFT` | See §3.3; indexed                                     |
| `sellerEmployeeId`        | UUID          | No       | —       |                                                       |
| `notes`                   | TEXT          | Yes      | NULL    | Sales notes                                           |
| `financeNote`             | TEXT          | Yes      | NULL    | Set at Finance approval                               |
| `damageReason`            | ENUM          | Yes      | NULL    | Set at Finance approval; see §3.4                     |
| `rejectionReason`         | TEXT          | Yes      | NULL    | Set on rejection                                      |
| `replacementProductId`    | UUID          | Yes      | NULL    | Set at complete()                                     |
| `replacementProductName`  | VARCHAR       | Yes      | NULL    | Set at complete()                                     |
| `replacementSerialNumber` | VARCHAR       | Yes      | NULL    | Set at complete()                                     |
| `replacementAmount`       | DECIMAL(12,2) | Yes      | NULL    | Set at complete(); see §2 per type                    |
| `replacementDiscount`     | DECIMAL(12,2) | No       | `0`     | Extra discount; only meaningful for CREDIT_EXCHANGE   |
| `createdAt`               | TIMESTAMP     | No       | auto    |                                                       |
| `updatedAt`               | TIMESTAMP     | No       | auto    |                                                       |

**Columns absent from the entity (but expected by some stakeholders):**

- `paymentMode` — collected in frontend, sent to backend, **not stored** (see §10 #1)
- `taxAmount`, `taxPercent` — not present; no per-credit-note tax breakdown

### 3.2 `return_credits` Table

**Entity file:** `backend/billing_service/src/entities/returnCreditEntity.ts`

Created only for `DIRECT_REFUND` type at Finance approval. Used exclusively by `BillingReportService` to deduct from sales totals.

| Column             | DB Type       | Nullable | Default | Notes                                                           |
| ------------------ | ------------- | -------- | ------- | --------------------------------------------------------------- |
| `id`               | UUID          | No       | auto    | Primary key                                                     |
| `invoice_id`       | UUID          | No       | —       | FK → `invoices.id` (CASCADE DELETE); indexed                    |
| `branchId`         | VARCHAR       | No       | —       | Indexed                                                         |
| `createdBy`        | VARCHAR       | No       | —       | Employee ID of Finance approver                                 |
| `amount`           | DECIMAL(12,2) | No       | —       | = `creditNote.productAmount`                                    |
| `note`             | TEXT          | Yes      | NULL    | `"Refund for Credit Note CN-XXXX. Finance Note: {financeNote}"` |
| `returnedItemId`   | UUID          | Yes      | NULL    | `creditNote.productId`                                          |
| `returnedItemType` | VARCHAR(50)   | Yes      | NULL    | Hardcoded `'PRODUCT'`                                           |
| `createdAt`        | TIMESTAMP     | No       | auto    |                                                                 |

No `updatedAt` field — records are insert-only.

### 3.3 `CreditNoteStatus` Enum

```
DRAFT             → Initial state; editable/deletable
PENDING_APPROVAL  → Visible to Finance; not editable
APPROVED          → Finance-approved; awaiting Sales completion (REPLACEMENT / CREDIT_EXCHANGE only)
REJECTED          → Terminal; no further transitions
COMPLETED         → Terminal; DIRECT_REFUND only
PRODUCT_REPLACED  → Terminal; REPLACEMENT and CREDIT_EXCHANGE only
```

### 3.4 `DamageReason` Enum

Stored as string values (not labels):

| Enum Key               | String Value             |
| ---------------------- | ------------------------ |
| `DAMAGED_PRODUCT`      | `"Damaged Product"`      |
| `INCOMPLETE_PARTS`     | `"Incomplete Parts"`     |
| `DEFECTIVE`            | `"Defective"`            |
| `WRONG_ITEM_DELIVERED` | `"Wrong Item Delivered"` |
| `OTHER`                | `"Other"`                |

Only `"Damaged Product"` maps to `DAMAGED` inventory status. All other values map to `RETURNED`.

### 3.5 Credit Note Number Generation

```typescript
year    = new Date().getFullYear()          // e.g. 2026
count   = COUNT(*) WHERE creditNoteNo LIKE `CN-${year}-%`
sequence = (count + 1).toString().padStart(5, '0')
creditNoteNo = `CN-${year}-${sequence}`    // e.g. CN-2026-00001
```

**Race condition note:** This uses `COUNT + 1` without a transaction/lock. Concurrent creates in the same second could produce duplicate sequences. If a credit note is deleted, the count-based sequence will skip a number on the next creation.

---

## 4. API Reference

**Base path:** `/b/credit-notes` (via API Gateway, prefix `/b`)
**Auth:** All routes require `authMiddleware` (JWT in `Authorization: Bearer` header)

### 4.1 Route Table

| Method   | Path                           | Role Required     | Handler         |
| -------- | ------------------------------ | ----------------- | --------------- |
| `GET`    | `/b/credit-notes/stats`        | Any authenticated | `getStats`      |
| `GET`    | `/b/credit-notes`              | Any authenticated | `list`          |
| `POST`   | `/b/credit-notes`              | EMPLOYEE, MANAGER | `create`        |
| `PUT`    | `/b/credit-notes/:id`          | EMPLOYEE, MANAGER | `update`        |
| `DELETE` | `/b/credit-notes/:id`          | EMPLOYEE, MANAGER | `delete`        |
| `POST`   | `/b/credit-notes/:id/send`     | EMPLOYEE, MANAGER | `sendToFinance` |
| `POST`   | `/b/credit-notes/:id/approve`  | FINANCE, ADMIN    | `approve`       |
| `POST`   | `/b/credit-notes/:id/reject`   | FINANCE, ADMIN    | `reject`        |
| `POST`   | `/b/credit-notes/:id/complete` | EMPLOYEE, MANAGER | `complete`      |

### 4.2 Role-Based Data Visibility

| Role            | What they see                                             |
| --------------- | --------------------------------------------------------- |
| EMPLOYEE        | Only their own credit notes (`sellerEmployeeId = userId`) |
| MANAGER         | All credit notes for their branch (`branchId = branchId`) |
| FINANCE / ADMIN | All credit notes **except** `DRAFT` status ones           |

### 4.3 POST `/b/credit-notes` — Create

**Request body:**

```json
{
  "invoiceId": "uuid",
  "invoiceNumber": "INV-2026-00042",
  "customerId": "uuid",
  "customerName": "Al Noor Trading LLC",
  "branchId": "uuid",
  "productId": "uuid",
  "productName": "HP LaserJet Pro",
  "modelName": "M404dn",
  "brand": "HP",
  "serialNumber": "SN-HP-0042",
  "productAmount": 1050.0,
  "type": "DIRECT_REFUND",
  "notes": "Customer reports paper jam issue from day 1",
  "sellerEmployeeId": "uuid"
}
```

**Required fields:** `invoiceId`, `invoiceNumber`, `customerId`, `customerName`, `productId`, `type`

**Response (201):**

```json
{
  "success": true,
  "data": {
    /* full CreditNote object */
  },
  "message": "Credit Note created as Draft"
}
```

### 4.4 POST `/b/credit-notes/:id/send` — Send to Finance

No body required.

**Response (200):**

```json
{
  "success": true,
  "data": {
    /* credit note with status: PENDING_APPROVAL */
  },
  "message": "Credit Note sent for Finance Approval"
}
```

### 4.5 POST `/b/credit-notes/:id/approve` — Finance Approval

**Request body:**

```json
{
  "financeNote": "Unit returned with visible scratches and internal defect confirmed",
  "damageReason": "Damaged Product",
  "paymentMode": "CASH"
}
```

**Required by backend:** `financeNote`, `damageReason` (both validated server-side)
**`paymentMode`:** Sent by frontend but **silently ignored** by the backend (not stored — see §10 #1)

**Response for DIRECT_REFUND (200):**

```json
{
  "success": true,
  "data": {
    /* credit note with status: COMPLETED */
  },
  "message": "Refund Completed"
}
```

**Response for REPLACEMENT / CREDIT_EXCHANGE (200):**

```json
{
  "success": true,
  "data": {
    /* credit note with status: APPROVED */
  },
  "message": "Credit Note Approved"
}
```

**Example — REPLACEMENT request body:**

```json
{
  "financeNote": "Defective unit confirmed by technician",
  "damageReason": "Defective",
  "paymentMode": "CASH"
}
```

**Example — CREDIT_EXCHANGE request body:**

```json
{
  "financeNote": "Customer wants to upgrade to higher model",
  "damageReason": "Other",
  "paymentMode": "BANK_TRANSFER"
}
```

### 4.6 POST `/b/credit-notes/:id/reject` — Reject

**Request body:**

```json
{
  "rejectionReason": "Product shows physical damage not covered by return policy"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    /* credit note with status: REJECTED */
  },
  "message": "Credit Note Rejected"
}
```

### 4.7 POST `/b/credit-notes/:id/complete` — Complete Replacement or Exchange

Only valid if `status = APPROVED`. Only applicable to REPLACEMENT and CREDIT_EXCHANGE.

**Request body — REPLACEMENT example:**

```json
{
  "replacementSerialNumber": "SN-HP-0099",
  "replacementProductId": "uuid-of-new-unit",
  "replacementProductName": "HP LaserJet Pro M404dn",
  "replacementAmount": 1050.0,
  "replacementDiscount": 0
}
```

**Request body — CREDIT_EXCHANGE example (upgrade):**

```json
{
  "replacementSerialNumber": "SN-KYO-0015",
  "replacementProductId": "uuid-of-kyocera",
  "replacementProductName": "Kyocera ECOSYS P2235dn",
  "replacementAmount": 1400.0,
  "replacementDiscount": 50.0
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    /* credit note with status: PRODUCT_REPLACED */
  },
  "message": "Return Process Completed"
}
```

### 4.8 GET `/b/credit-notes/stats`

**Response (200):**

```json
{
  "success": true,
  "data": {
    "total": 12,
    "directRefund": 5,
    "replacement": 4,
    "creditExchange": 3
  }
}
```

Stats exclude `DRAFT` status records for all roles.

---

## 5. Frontend — Pages and Components

### 5.1 Pages

| URL Path                  | Role     | File                                              |
| ------------------------- | -------- | ------------------------------------------------- |
| `/employee/sales/returns` | EMPLOYEE | `app/employee/(dashboard)/sales/returns/page.tsx` |
| `/manager/sales/returns`  | MANAGER  | `app/manager/(dashboard)/sales/returns/page.tsx`  |
| `/admin/sales/returns`    | ADMIN    | `app/admin/(dashboard)/sales/returns/page.tsx`    |
| `/finance/returns`        | FINANCE  | `app/finance/(dashboard)/returns/page.tsx`        |

All pages consume the same service functions from `services/creditNoteService.ts`.

### 5.2 Component Summary

| Component              | File                                          | Purpose                                                                  |
| ---------------------- | --------------------------------------------- | ------------------------------------------------------------------------ |
| `ReturnsStatCards`     | `components/returns/ReturnsStatCards.tsx`     | Stat cards: total / direct refund / replacement / credit exchange counts |
| `ReturnsTable`         | `components/returns/ReturnsTable.tsx`         | Main data table with role-sensitive action buttons                       |
| `CreditNoteFormModal`  | `components/returns/CreditNoteFormModal.tsx`  | Create / edit credit note                                                |
| `FinanceApprovalModal` | `components/returns/FinanceApprovalModal.tsx` | Finance: damage reason + payment mode + finance note                     |
| `CompletionModal`      | `components/returns/CompletionModal.tsx`      | Sales: select replacement unit + exchange variance                       |
| `CreditNoteViewModal`  | `components/returns/CreditNoteViewModal.tsx`  | Read-only view of any credit note                                        |

### 5.3 CreditNoteFormModal — Creation Flow

1. **Customer selection** (dropdown via CRM API)
2. **Invoice selection** (filtered to selected customer's invoices)
3. **Product selection** (populated from invoice items; filters out items with qty = 0; if a prior PRODUCT_REPLACED credit note exists on the invoice, its replacement product is added to the list)
4. **Return type selection** (3 styled option cards)
5. **Notes** (optional free text)
6. Right panel shows product preview (image, brand, model, serial, original price, sold date)

### 5.4 ReturnsTable — Actions by Role and Status

| Status                                  | EMPLOYEE/MANAGER                                  | FINANCE/ADMIN         |
| --------------------------------------- | ------------------------------------------------- | --------------------- |
| DRAFT                                   | Edit, Delete, Send to Finance, View               | — (not visible)       |
| PENDING_APPROVAL                        | View                                              | Approve, Reject, View |
| APPROVED                                | Complete (REPLACEMENT/CREDIT_EXCHANGE only), View | View                  |
| COMPLETED / PRODUCT_REPLACED / REJECTED | View                                              | View                  |

### 5.5 FinanceApprovalModal UI Notes

- Displays product amount with `₹` (Indian Rupee) symbol — this is a **frontend bug** (see §10 #5); Xerocare operates in QAR.
- All three fields (damage reason, payment mode, finance note) are required by the modal's submit guard (`disabled={!financeNote || !damageReason || !paymentMode}`), but the backend only validates `financeNote` and `damageReason`.

### 5.6 CompletionModal — Stock Filter Logic

```
For REPLACEMENT:
  filter: product_status = AVAILABLE
        AND serial_no ≠ returned_serial
        AND model.id = original_model_id

For CREDIT_EXCHANGE:
  filter: product_status = AVAILABLE
        AND serial_no ≠ returned_serial
        AND model.id ≠ original_model_id   ← different model required
```

Manual serial entry is always available, including when the list is empty (out-of-stock case).

---

## 6. Inventory Impact (RabbitMQ Event)

**Publisher file:** `backend/billing_service/src/events/publisher/productStatusEvent.ts`
**Exchange:** `domain_events` (topic, durable)
**Routing key:** `inventory.product.status.update`

**Event payload structure:**

```json
{
  "eventId": "uuid",
  "billId": "invoiceId",
  "invoiceId": "invoiceId",
  "productId": "productId",
  "branchId": "",
  "billType": "SALE | RETURNED | DAMAGED",
  "approvedBy": "userId",
  "approvedAt": "2026-07-15T10:30:00.000Z",
  "customerId": null
}
```

**When events fire:**

| Credit Note Type | Trigger Point | Old Product Event   | New Product Event |
| ---------------- | ------------- | ------------------- | ----------------- |
| DIRECT_REFUND    | `approve()`   | DAMAGED or RETURNED | —                 |
| REPLACEMENT      | `complete()`  | DAMAGED or RETURNED | SALE              |
| CREDIT_EXCHANGE  | `complete()`  | DAMAGED or RETURNED | SALE              |

**Note:** `branchId` is hardcoded as empty string `""` in the event payload (line 27 of productStatusEvent.ts: `branchId: ''`). The inventory service consumer receives no branch context from these events.

---

## 7. Reporting / Accounting Impact

The `BillingReportService` (`backend/billing_service/src/services/billingReportService.ts`) is the only place where credit notes affect reported numbers.

### 7.1 DIRECT_REFUND Impact on Reports

`return_credits` rows are summed and **subtracted** from branch/global sales totals:

```typescript
sales.totalSales -= returns.totalReturns;
// Also deducted from the first matching sale category: SALE | PRODUCT_SALE | SPAREPART_SALE
```

This affects:

- `getBranchSalesTotals(branchId, year)`
- `getGlobalSalesTotals(year)`
- Monthly P&L report (income column reduced)

### 7.2 CREDIT_EXCHANGE Impact on Reports

For completed CREDIT_EXCHANGE credit notes, the report service calculates:

```typescript
adjustment = replacementAmount - productAmount;
sales.totalSales += adjustment;
// Positive if customer upgraded (higher price), negative if downgraded
```

Note: `replacementDiscount` is **not deducted** in this formula.

### 7.3 REPLACEMENT Impact on Reports

**None.** Replacements create no `return_credits` record and are not included in any CREDIT_EXCHANGE adjustment query. The original invoice sale stands as-is in sales reports.

### 7.4 What Is NOT Done (Accounting Gaps)

The system does **not** create:

- General Ledger / Chart of Accounts journal entries
- Accounts Receivable adjustments
- VAT/Output Tax reversal entries
- Formal cashbook debit/credit entries for refunds paid
- Accounts Payable entries for credit exchange cash settlements

The only financial record is the `return_credits` table row (for DIRECT_REFUND only).

---

## 8. Worked Numeric Examples

### Example 1 — DIRECT_REFUND

**Scenario:** Customer bought an HP LaserJet Pro for QAR 1,050 (entered as `productAmount`). Unit is defective. Customer wants money back.

| Field           | Value                                                 |
| --------------- | ----------------------------------------------------- |
| `productAmount` | 1,050.00                                              |
| `type`          | DIRECT_REFUND                                         |
| `damageReason`  | Defective                                             |
| `financeNote`   | "Technical inspection confirmed manufacturing defect" |
| `paymentMode`   | CASH (frontend only — not stored)                     |

**On Finance approval:**

- `credit_notes.status` → `COMPLETED`
- `return_credits` row inserted: `amount = 1,050.00`
- `invoices.status` → `REFUNDED`
- RabbitMQ event: old product → `RETURNED`

**Accounting effect on reports:**

- Sales total this month: reduced by QAR 1,050.00

**Cash paid to customer:** QAR 1,050.00 (must be handled manually outside system)

---

### Example 2 — REPLACEMENT

**Scenario:** Same HP LaserJet Pro, QAR 1,050. Customer wants identical unit.

| Field           | Value           |
| --------------- | --------------- |
| `productAmount` | 1,050.00        |
| `type`          | REPLACEMENT     |
| `damageReason`  | Damaged Product |

**On Finance approval:**

- `credit_notes.status` → `APPROVED`
- No `return_credits` row created
- No inventory event yet

**At Sales completion (new unit selected, SN: SN-HP-0099, sale_price in inventory: QAR 1,100):**

- `replacementAmount` = 1,050.00 (original price — NOT the new unit's sale_price)
- `replacementDiscount` = 0
- `credit_notes.status` → `PRODUCT_REPLACED`
- RabbitMQ: old product → `DAMAGED`
- RabbitMQ: new product → `SALE`

**No cash changes hands. No accounting entries. Sales reports unchanged.**

---

### Example 3 — CREDIT_EXCHANGE (Upgrade)

**Scenario:** Customer bought HP LaserJet Pro for QAR 1,050. Wants to upgrade to Kyocera ECOSYS P2235dn (sale_price: QAR 1,400). Finance gives extra QAR 50 discount.

| Field           | Value           |
| --------------- | --------------- |
| `productAmount` | 1,050.00        |
| `type`          | CREDIT_EXCHANGE |
| `damageReason`  | Other           |

**CompletionModal variance calculation:**

```
originalValue  = 1,050.00
newValue       = 1,400.00  (Kyocera sale_price)
discount       = 50.00     (extra discount entered)

variation = 1,400 - 1,050 - 50 = 300.00
→ display: "Payable Gap: QAR 300.00"
```

**Saved to credit_notes:**

- `replacementAmount` = 1,400.00
- `replacementDiscount` = 50.00
- `status` → `PRODUCT_REPLACED`

**RabbitMQ events:**

- Old HP unit → `RETURNED`
- New Kyocera unit → `SALE`

**Sales report adjustment:**

- `adjustment = 1,400 - 1,050 = 350.00` (note: discount NOT applied in report formula)
- Sales total increased by QAR 350.00

**Customer pays QAR 300.00 to sales (manually, no system record)**

---

### Example 4 — CREDIT_EXCHANGE (Downgrade / Refundable Balance)

**Scenario:** Customer bought Kyocera ECOSYS P2235dn for QAR 1,400. Wants cheaper HP LaserJet Pro (sale_price: QAR 1,050). No extra discount.

**CompletionModal variance calculation:**

```
originalValue  = 1,400.00
newValue       = 1,050.00
discount       = 0

variation = 1,050 - 1,400 - 0 = -350.00
→ display: "Refundable Balance: QAR 350.00"
```

**Customer receives QAR 350.00 refund from sales (manually, no system record)**

**Sales report adjustment:**

- `adjustment = 1,050 - 1,400 = -350.00`
- Sales total reduced by QAR 350.00

---

## 9. Edge Cases Handled

### 9.1 Invoice with Prior PRODUCT_REPLACED Credit Note

If an invoice already has a credit note in `PRODUCT_REPLACED` status, the `CreditNoteFormModal` detects it and adds the replacement product to the product selection dropdown. This allows a return to be initiated against the replacement unit rather than the original unit.

```typescript
const replacement = selectedInvoice.creditNotes?.find((cn) => cn.status === 'PRODUCT_REPLACED');
// If found, replacement's product details are added to selectable list
```

### 9.2 Out-of-Stock for Replacement/Exchange

If no units pass the availability filter, `CompletionModal` shows an orange warning banner and allows manual serial entry. The system does not block completion — serial entry proceeds without inventory validation.

### 9.3 User Overrides Auto-Selected Serial

If the user clicks a unit from the stock list (auto-filling the serial field) then manually types a different serial, `selectedProduct` state is cleared but the typed serial is preserved. The `replacementProductId` and `replacementProductName` will then be `undefined` in the submitted payload.

### 9.4 FINANCE Role Cannot See DRAFTs

Finance's `list` query explicitly excludes `DRAFT` status records, so sales staff can edit freely without Finance seeing in-progress drafts.

### 9.5 Status Guard on All Mutations

Every mutation endpoint (update, delete, sendToFinance, approve, reject, complete) checks the current status before proceeding and throws a 400 `AppError` with a descriptive message if the transition is invalid.

---

## 10. Known Limitations and Discrepancies

The following issues were found by reading the actual code. They are documented here, not smoothed over.

---

### Discrepancy #1 — `paymentMode` is collected but never stored

**Severity: Medium**

**Frontend:** `FinanceApprovalModal.tsx` collects `paymentMode` (CASH / CHECK / BANK_TRANSFER) and includes it in the request body to `POST /b/credit-notes/:id/approve`.

**Backend:** The `approve` controller reads only `financeNote` and `damageReason` from `req.body` (line 195 of creditNoteController.ts). `paymentMode` is never destructured, never saved.

**Entity:** `CreditNote` has no `paymentMode` column.

**Frontend type:** `CreditNoteRecord` interface declares `paymentMode?: string` and `CreditNoteViewModal` references it, but the value will always be `undefined` because the database never stores it.

**Impact:** Finance cannot record how the refund was paid. Cash/bank/cheque settlement mode is not tracked. The `CreditNoteViewModal`'s "Payment Mode" display section will always be blank.

---

### Discrepancy #2 — No VAT/Tax reversal on refunds

**Severity: High (for VAT-registered entities)**

Credit notes have no tax fields. The `productAmount` field is whatever the sales user enters — there is no mechanism to:

- Parse the original VAT from the invoice
- Calculate the proportional tax on the returned item
- Create a VAT credit note for tax reporting purposes

The `Invoice` entity has `taxName`, `taxPercent`, and `taxAmount` fields, but these are not referenced anywhere in the credit note creation or approval flows.

**Impact:** If products are sold with 5% VAT and a return is processed, the QAR 1,050 refund entered by sales may be the VAT-inclusive price, but the system has no way to confirm this. There are no Output Tax reversal entries. Tax authority reporting (VAT returns) will require manual adjustment.

---

### Discrepancy #3 — `billingReportService` CREDIT_EXCHANGE formula ignores `replacementDiscount`

**Severity: Low**

In `billingReportService.getBranchSalesTotals()` and `getGlobalSalesTotals()`, the adjustment formula for CREDIT_EXCHANGE is:

```typescript
adjustment = Number(cn.replacementAmount) - Number(cn.productAmount);
```

It does not subtract `replacementDiscount`. So if a QAR 50 discount was given on a QAR 1,400 exchange, the report shows a +QAR 350 revenue adjustment instead of +QAR 300.

---

### Discrepancy #4 — New product's billType hardcoded to `'SALE'` in complete()

**Severity: Low**

In `creditNoteController.complete()` (line 335):

```typescript
await emitProductStatusUpdate({
  productId: replacementProductId,
  billType: 'SALE', // Defaulting to SALE for now, ideally fetch from Invoice
  ...
});
```

The comment in the code itself acknowledges this is a placeholder. If the original invoice had a different billType (e.g., SERVICE or LEASE), the replacement product would still be marked as a regular SALE in inventory.

---

### Discrepancy #5 — Currency symbol `₹` in FinanceApprovalModal

**Severity: Low (UI only)**

`FinanceApprovalModal.tsx` line 55 displays the amount as:

```tsx
<p>Amount: ₹{record?.productAmount?.toLocaleString()}</p>
```

This uses the Indian Rupee symbol. `CompletionModal` uses `QAR`. Xerocare operates in QAR. The ₹ symbol is incorrect.

---

### Discrepancy #6 — Dead code path in `complete()` for DIRECT_REFUND

**Severity: Negligible (code quality)**

In `complete()`:

```typescript
if (creditNote.type === 'REPLACEMENT' || creditNote.type === 'CREDIT_EXCHANGE') {
  creditNote.status = CreditNoteStatus.PRODUCT_REPLACED;
} else {
  creditNote.status = CreditNoteStatus.COMPLETED; // ← dead code
}
```

The `else` branch would only trigger for DIRECT_REFUND, but `complete()` only accepts `APPROVED` status, and DIRECT_REFUND never reaches `APPROVED` (it goes directly from PENDING_APPROVAL to COMPLETED in `approve()`). This else branch is unreachable.

---

### Discrepancy #7 — `branchId` is empty string in RabbitMQ product status events

**Severity: Medium (depends on inventory consumer)**

`productStatusEvent.ts` line 27:

```typescript
branchId: '',  // Will be populated if needed
```

The branch context is never populated. Any inventory service consumer that relies on `branchId` for routing or filtering will receive an empty string and may silently misprocess the event.

---

### Discrepancy #8 — `billingService.processReturn()` is a parallel, unused path for product returns

**Severity: Low (architectural confusion)**

`billingService.ts` contains a `processReturn()` method (lines 2946–3002) that:

1. Creates a `ReturnCredit` via `returnCreditRepo.createReturnCredit()`
2. Makes a REST HTTP call to `{INVENTORY_SERVICE_URL}/inventory/returns/process`

This is a **different implementation** from the credit note controller, which:

1. Creates `ReturnCredit` inline via `Source.getRepository(ReturnCredit).save()`
2. Updates inventory via RabbitMQ (`emitProductStatusUpdate`)

`billingService.processReturn()` is not called by the credit note controller at all. It appears to be an earlier or alternative implementation that was never wired up to the credit note flow, or belongs to the spare-part returns path. The existence of two parallel implementations for the same operation is a maintainability risk.

---

### Limitation #9 — Single product per credit note only

**Severity: Medium**

Each credit note is tied to exactly one product. If a customer returns three items from a multi-item invoice, three separate credit notes must be created. There is no bulk return mechanism.

---

### Limitation #10 — No expiry, approval deadline, or credit note numbering lock

**Severity: Low**

- Credit notes have no expiry date or SLA tracking.
- The credit note number generation (`COUNT + 1`) is not atomic — concurrent creates at the same millisecond could produce duplicate or skipped numbers.
- There is no lock preventing a second credit note from being created against the same invoice item while the first is still in flight.

---

_Document generated from source code inspection on 2026-07-15. Authoritative source files: `backend/billing_service/src/controllers/creditNoteController.ts`, `backend/billing_service/src/entities/creditNoteEntity.ts`, `backend/billing_service/src/entities/returnCreditEntity.ts`, `backend/billing_service/src/routes/creditNoteRoutes.ts`, `backend/billing_service/src/services/billingReportService.ts`, `frontend/components/returns/`, `frontend/app/_/returns/`.\*
