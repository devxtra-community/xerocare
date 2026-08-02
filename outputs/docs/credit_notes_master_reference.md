# Credit Notes — Product & Spare Parts — Consolidated Technical Reference

**Xerocare Billing Service**
**Date:** 2026-08-01
**Status:** Authoritative as-built documentation, independently re-verified against current source code
**Supersedes:** `product_sale_credit_notes_reference.md` (2026-07-15) and `spare_parts_credit_notes_reference.md` (2026-07-17) — both are folded into this single document. This pass re-read every relevant file from scratch rather than trusting the prior two docs; several facts have changed or were incompletely documented before (see §9).

---

## Table of Contents

1. [Overview](#1-overview)
2. [Return Types](#2-return-types)
   - 2.1 [DIRECT_REFUND](#21-direct_refund)
   - 2.2 [REPLACEMENT](#22-replacement)
   - 2.3 [CREDIT_EXCHANGE](#23-credit_exchange)
3. [Data Model](#3-data-model)
4. [API Reference](#4-api-reference)
5. [Frontend](#5-frontend)
6. [Worked Numeric Examples](#6-worked-numeric-examples)
7. [Edge Cases Handled](#7-edge-cases-handled)
8. [Consolidated Discrepancy / Limitation Status](#8-consolidated-discrepancy--limitation-status)
9. [Newly Found Issues](#9-newly-found-issues)

---

## 1. Overview

Credit Notes are a single feature, not two. One `credit_notes` table, one `CreditNoteController`, one `CreditNoteStatus` state machine, one set of three `CreditNoteType` values — with an `itemCategory` discriminator (`'PRODUCT' | 'SPARE_PART'`) that changes which columns are populated and which downstream inventory mechanism fires. There is no separate route, table, or controller for spare parts.

**PRODUCT** credit notes track exactly one **serialized unit** — a specific physical item identified by serial number, always implicitly quantity 1.

**SPARE_PART** credit notes track a **quantity of a SKU** — no serial number, `quantity` is a real integer column that can be >1, and `productAmount` is computed client-side as `unitPrice × quantity`.

A single toggle at the top of `CreditNoteFormModal` (Product / Spare Part) sets `itemCategory` at creation and is **disabled once the record exists** (`disabled={!!record}`, `CreditNoteFormModal.tsx:529,545`) — the category can never change after creation.

**All three return types are implemented for both categories** — nothing was scoped down for Spare Parts. What differs between categories is entirely inside the calculation and inventory-update logic, documented type-by-type below.

**Status workflow is byte-identical between categories** — same `CreditNoteStatus` enum, same transitions, same role gates. The only place a category changes _workflow_ (as opposed to calculation) is which fields `complete()` reads from the request body.

```
CreditNoteStatus enum (entities/enums/creditNoteStatus.ts):
  DRAFT             → editable/deletable
  PENDING_APPROVAL  → visible to Finance; not editable
  APPROVED          → Finance-approved; awaiting Sales completion (REPLACEMENT / CREDIT_EXCHANGE only)
  REJECTED          → terminal
  COMPLETED         → terminal; DIRECT_REFUND only
  PRODUCT_REPLACED  → terminal; REPLACEMENT and CREDIT_EXCHANGE only (both categories use this same status name)
```

```
CreditNoteType enum (entities/enums/creditNoteType.ts):
  DIRECT_REFUND    → cash/transfer refund, invoice closed
  REPLACEMENT      → like-for-like swap, no cash
  CREDIT_EXCHANGE  → swap for a different item, cash difference settled manually
```

**When a credit note is used vs. invoice cancellation:** a credit note is for post-delivery, post-payment reversals — the invoice is never deleted. Invoice cancellation (`status = CANCELLED`) is for pre-delivery reversals with no cleared payment. A DIRECT_REFUND, once it covers the full quantity originally sold on that line, flips the invoice to `REFUNDED` (see §2.1 for the partial-quantity nuance — this is new since the last documentation pass).

**A parallel, older return mechanism still exists and is _not_ part of this feature**: `billingService.processReturn()`, reachable via `POST /invoices/:id/returns`, feeding a frontend component (`ReturnsManagement.tsx`) that is not rendered by any page today. It is covered in §8/§9 because it shares the `return_credits` table and is a real, live route — not because it's part of the Credit Note workflow.

---

## 2. Return Types

### 2.1 DIRECT_REFUND

**Definition:** The returned item is accepted back, the customer gets a cash/transfer refund, and — if this closes out the full quantity originally sold on that line — the invoice is marked `REFUNDED`.

**Product scenario:** Customer received a defective unit and wants money back, not a replacement.
**Spare Parts scenario:** Customer bought 5 toner cartridges, 2 are the wrong model; returns those 2 for a refund, keeps the other 3.

#### Status Flow (identical for both categories)

```
DRAFT  →  PENDING_APPROVAL  →  COMPLETED
  (Sales)      (Sales)           (Finance)
```

DIRECT_REFUND is the only type that skips `APPROVED` — Finance approval transitions it straight to `COMPLETED` (`creditNoteController.ts:333`).

#### Step-by-Step Workflow

| Step | Actor                                 | Action                                                                         | Product                                                            | Spare Part                                                                                                           |
| ---- | ------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 1    | EMPLOYEE/MANAGER                      | Selects category, item, type=DIRECT_REFUND                                     | Picks one serialized unit off the invoice                          | Picks a SKU + enters return quantity                                                                                 |
| 2    | EMPLOYEE/MANAGER                      | Submits                                                                        | `productAmount` = unit price as entered                            | `productAmount` = `unitPrice × quantity`, computed client-side (`CreditNoteFormModal.tsx:360-368`)                   |
| 3    | Backend `create()`                    | Validates required fields, snapshots tax                                       | `productId` required                                               | `sparePartId` required (400 if missing, `creditNoteController.ts:124-129`)                                           |
| 4    | EMPLOYEE/MANAGER                      | "Send to Finance"                                                              | Status → `PENDING_APPROVAL`                                        | same                                                                                                                 |
| 5    | FINANCE/ADMIN (or MANAGER — see §4.2) | Approves with damage reason + finance note + payment mode                      | `POST /credit-notes/:id/approve`                                   | same                                                                                                                 |
| 6    | Backend `approve()`                   | Sets `status = COMPLETED`, persists `financeNote`/`damageReason`/`paymentMode` | —                                                                  | —                                                                                                                    |
| 7    | Backend `approve()`                   | Updates inventory                                                              | RabbitMQ `emitProductStatusUpdate` → old unit `DAMAGED`/`RETURNED` | REST `POST /inventory/returns/process` → `sparePart.quantity += quantity` (no damage routing — see §8 #S1)           |
| 8    | Backend `approve()`                   | Creates `ReturnCredit`                                                         | `returnedItemType='PRODUCT'`                                       | `returnedItemType='SPARE_PART'`                                                                                      |
| 9    | Backend `approve()`                   | Closes invoice if fully covered                                                | Always closes (qty is implicitly 1 = the whole line)               | Only closes if cumulative returned quantity ≥ originally sold quantity on that line (`isFullyReturned()`, see below) |
| 10   | Backend                               | In-app notifications to seller, branch manager, all admins                     | —                                                                  | —                                                                                                                    |

All of steps 4-10 run inside a single DB transaction (`queryRunner`) in `approve()` (`creditNoteController.ts:304-467`) — the credit note status, the `ReturnCredit` row, and the invoice status update commit or roll back together. RabbitMQ/REST inventory calls fire **after** commit and are best-effort/non-fatal (logged on failure, never roll back the DB writes — see the inline comment at `creditNoteController.ts:294-302`).

#### Calculation Logic

No server-side recalculation of `productAmount` for either category — the client-entered value is trusted (`create()`, `creditNoteController.ts:115,167`).

```
PRODUCT:      productAmount = unit price as entered by sales (no formula)
SPARE_PART:   productAmount = unitPrice × returnQuantity   (client-side, CreditNoteFormModal.tsx:360-368)
```

**Tax snapshot (category-agnostic, computed identically for both at `create()` time)** — `creditNoteController.ts:131-144`:

```ts
if (invoice?.taxPercent) {
  taxName = invoice.taxName;
  taxPercent = Number(invoice.taxPercent);
  taxAmount = (Number(productAmount) * taxPercent) / 100;
}
```

**Refund amount actually recorded in `return_credits` — includes tax (this is a change from what either prior doc found):**

```ts
// creditNoteController.ts:360-372, approve()
amount: Number(creditNote.productAmount) + Number(creditNote.taxAmount || 0);
```

This is category-agnostic — both PRODUCT and SPARE_PART DIRECT_REFUNDs get this VAT-inclusive `ReturnCredit.amount`. This is a genuine partial fix to the old "no VAT reversal" gap (see §8 #2) — the _reported sales deduction_ is now VAT-correct, even though there is still no formal Output-Tax-report exclusion entry or GL posting.

**Partial-quantity validation for Spare Parts — `isFullyReturned()`, `creditNoteController.ts:20-47`:**

```ts
private async isFullyReturned(manager, creditNote): Promise<boolean> {
  const items = await manager.find(InvoiceItem, {
    where: { invoice: { id: creditNote.invoiceId }, sparePartId: creditNote.sparePartId },
  });
  const totalSoldQty = items.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
  if (totalSoldQty <= 0) return true;

  const priorReturns = await manager.find(CreditNote, {
    where: {
      invoiceId: creditNote.invoiceId,
      sparePartId: creditNote.sparePartId,
      type: CreditNoteType.DIRECT_REFUND,
      status: CreditNoteStatus.COMPLETED,
    },
  });
  const priorReturnedQty = priorReturns
    .filter((cn) => cn.id !== creditNote.id)
    .reduce((sum, cn) => sum + (cn.quantity ?? 0), 0);
  const totalReturnedQty = priorReturnedQty + (creditNote.quantity ?? 1);

  return totalReturnedQty >= totalSoldQty;
}
```

**What this does and does not do — read carefully:**

- It sums the quantity across all prior **COMPLETED DIRECT_REFUND** credit notes against the same `invoiceId` + `sparePartId`, plus the current one, and compares against the original `InvoiceItem.quantity`.
- It is used for **exactly one decision**: whether to flip `Invoice.status` to `REFUNDED` (`creditNoteController.ts:380-388`) — a partial return (e.g. 2 of 5 units) correctly leaves the invoice alone; a return that reaches or exceeds the original quantity closes it.
- **It is not a validation gate.** It never blocks, rejects, or caps a credit note's `quantity`. `create()` performs no check against `InvoiceItem.quantity` or against the sum of prior returns before accepting a new credit note. A customer's 5-unit purchase can still be "returned" via credit notes totaling far more than 5 units — `isFullyReturned()` will simply (and incorrectly) report the invoice as fully covered once the miscounted total crosses 5, closing an invoice that was actually over-returned. See §6 Example 1b for the exact numeric failure mode, and §8 #S2 for the discrepancy status.
- PRODUCT credit notes always pass `invoiceFullyCovered = true` unconditionally (`creditNoteController.ts:381-382`) — a PRODUCT DIRECT_REFUND is always for the one unit the invoice line covers, so `isFullyReturned()` is never even called for PRODUCT.

#### Accounting Impact

| What                   | Product                                                                                                                                                                                                                                   | Spare Part                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `return_credits` row   | `amount = productAmount + taxAmount`, `returnedItemType='PRODUCT'`                                                                                                                                                                        | Same formula, `returnedItemType='SPARE_PART'`    |
| `invoices.status`      | Always → `REFUNDED`                                                                                                                                                                                                                       | → `REFUNDED` only if `isFullyReturned()` is true |
| Chart of Accounts / GL | None for either category — no journal entries                                                                                                                                                                                             |                                                  |
| Cashbook               | None for either — `paymentMode` is persisted on the credit note but never posts a cashbook entry                                                                                                                                          |                                                  |
| Sales reports          | `BillingReportService` sums `return_credits` and subtracts from `totalSales`, matched against sale-type categories `['SALE', 'PRODUCT_SALE', 'SPAREPART_SALE']` (`billingReportService.ts:161-163`) — same query, no `itemCategory` split |                                                  |

#### Inventory Impact

|                  | Product                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Spare Part                                                                                                                                                                                                                                                                       |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mechanism        | RabbitMQ event, exchange `domain_events`, routing key `inventory.product.status.update`                                                                                                                                                                                                                                                                                                                                                                                                         | Synchronous REST, `POST /inventory/returns/process`                                                                                                                                                                                                                              |
| Effect           | Old unit's `product_status` → `AVAILABLE` (the consumer, `InventoryReturnService.processReturn()`, unconditionally sets it back to `AVAILABLE` regardless of the `DAMAGED`/`RETURNED` billType the event carries — see below)                                                                                                                                                                                                                                                                   | `sparePart.quantity += quantity`                                                                                                                                                                                                                                                 |
| Damage routing   | The `billType` sent is `'DAMAGED'` or `'RETURNED'` depending on `damageReason` — but the ven_inv_service consumer for the _return-credit_ REST path (`InventoryReturnService.processReturn`, PRODUCT branch) sets `product_status = AVAILABLE` regardless of which billType string was received; the RabbitMQ consumer path used for the credit-note event is separate infrastructure not covered by this document's source read — the REST-based legacy path (§8 #8) is confirmed to ignore it | **Never receives a damage flag at all** — `damageReason`/`inventoryStatus` is computed in the controller but only used in the PRODUCT branch's payload; the SPARE_PART REST payload has no such field (confirmed in both `approve()` line 348-353 and `complete()` line 615-619) |
| Failure handling | Logged only, never throws, never rolls back the DB transaction (`callInventoryService`, `creditNoteController.ts:50-72`)                                                                                                                                                                                                                                                                                                                                                                        | Same                                                                                                                                                                                                                                                                             |

---

### 2.2 REPLACEMENT

**Definition:** The returned item is swapped for a same-value replacement. No money changes hands — the replacement always carries forward the _original_ amount, regardless of what the replacement unit/SKU is actually worth.

**Product scenario:** Customer's printer is defective; swap for an identical unit from stock.
**Spare Part scenario:** One of 3 purchased fuser units is defective; swap it 1-for-1.

#### Status Flow (identical for both categories)

```
DRAFT  →  PENDING_APPROVAL  →  APPROVED  →  PRODUCT_REPLACED
  (Sales)      (Sales)         (Finance)       (Sales)
```

#### Step-by-Step Workflow

| Step | Actor                | Action                                                                                          | Product                                                                                                                                                                   | Spare Part                                                                                                                                                                                           |
| ---- | -------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1-4  | Sales → Finance      | Same as DIRECT_REFUND steps 1-5, type=REPLACEMENT                                               |                                                                                                                                                                           |                                                                                                                                                                                                      |
| 5    | Backend `approve()`  | Status → `APPROVED`; **no** `ReturnCredit`, **no** inventory call yet                           |                                                                                                                                                                           |                                                                                                                                                                                                      |
| 6    | EMPLOYEE/MANAGER     | Clicks "Complete"                                                                               | `CompletionModal` fetches products where `product_status=AVAILABLE`, `serial ≠ returned serial`, `model.id = original model` (same-model restriction, correctly enforced) | `CompletionModal` fetches spare parts where `quantity > 0`, `id ≠ record.sparePartId` — **no same-SKU restriction is actually enforced despite a comment claiming there should be one** (see §8 #S3) |
| 7    | EMPLOYEE/MANAGER     | Selects replacement; **if stock list is empty**                                                 | Free-text serial entry always available — completion proceeds unblocked                                                                                                   | **No manual-entry fallback exists.** Completion is a dead end if `availableSpareParts.length === 0` (see §8 #S4)                                                                                     |
| 8    | EMPLOYEE/MANAGER     | Confirms                                                                                        | `POST /credit-notes/:id/complete`                                                                                                                                         | same                                                                                                                                                                                                 |
| 9    | Backend `complete()` | Status → `PRODUCT_REPLACED` (unconditional set, no dead branch — `creditNoteController.ts:557`) |                                                                                                                                                                           |                                                                                                                                                                                                      |
| 10   | Backend `complete()` | Inventory update                                                                                | RabbitMQ: old unit → `DAMAGED`/`RETURNED`; new unit → `SALE`                                                                                                              | REST: old SKU `POST /inventory/returns/process` (restock, no damage routing); new SKU `POST /inventory/spare-parts/:id/allocate` (decrement, server-validated)                                       |

#### Calculation Logic

```
PRODUCT:      replacementAmount   = record.productAmount   (original amount carried forward, unchanged)
              replacementDiscount = 0                        (frontend hardcodes 0 for REPLACEMENT)

SPARE_PART:   replacementAmount   = record.productAmount   (same non-recalculation pattern)
              replacementDiscount = 0
              replacementQuantity = user-entered qty (defaults to record.quantity)
```

Even though the replacement SKU/unit may have a different `base_price`/`sale_price` in inventory, neither category recomputes the amount — it is always the original purchase value.

#### Accounting Impact

Identical for both categories: **no** `ReturnCredit`, **no** invoice status change, **no** GL entries, **no** cashbook entries, **not** counted in sales reports.

#### Inventory Impact

|          | Product                                  | Spare Part                                                                                                                                     |
| -------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Old item | RabbitMQ → `DAMAGED`/`RETURNED`          | REST restock (no damage routing)                                                                                                               |
| New item | RabbitMQ → `SALE` (hardcoded; see §8 #4) | REST `/inventory/spare-parts/:id/allocate` — server-side stock guard: `if (part.quantity < quantity) throw 400 'Insufficient available stock'` |

---

### 2.3 CREDIT_EXCHANGE

**Definition:** Customer returns an item and picks a _different_ model/SKU. If more expensive, they pay the difference; if cheaper, they're owed a refund. An optional extra discount can be applied. The variance is shown on screen as a guide — it is **never recorded as a formal accounting entry**; cash is settled manually outside the system for both categories.

**Product scenario:** Customer upgrades from a 1,050 QAR printer to a 1,400 QAR printer, pays the 350 QAR gap (minus any extra discount).
**Spare Part scenario:** Customer exchanges 2 units of an 80 QAR/unit generic toner for 2 units of a 110 QAR/unit OEM toner.

#### Status Flow

Identical to REPLACEMENT: `DRAFT → PENDING_APPROVAL → APPROVED → PRODUCT_REPLACED`. No separate terminal status for exchanges.

#### Calculation Logic — this is where the two categories genuinely diverge in sophistication

```
PRODUCT (CompletionModal.tsx):
  originalValue = record.productAmount           // always a single unit's price
  newValue      = selectedProduct.sale_price      // always a single unit's price
  discount      = user-entered extra discount
  variation     = newValue - originalValue - discount

SPARE_PART (CompletionModal.tsx:174-179):
  originalValue = record.productAmount            // already unitPrice × originalQty from creation
  newValue      = selectedSparePart.base_price × replacementQty   // scales with quantity
  discount      = user-entered extra discount
  variation     = newValue - originalValue - discount
```

**Spare Parts correctly factors in quantity; Product structurally cannot, because a Product credit note is always exactly one unit.** This is a genuine improvement in the Spare Parts path, not an inconsistency — confirmed by direct comparison of the two code branches (`CompletionModal.tsx` lines 174-179, `newValue` ternary).

```
if variation >= 0: display "Payable Gap: QAR {variation}"
else:              display "Refundable Balance: QAR {|variation|}"
```

**What is persisted** (`CompletionModal.tsx` `handleSubmit`):

```
PRODUCT:      replacementAmount = selectedProduct.sale_price          (single unit)
              replacementDiscount = discount

SPARE_PART:   replacementAmount = selectedSparePart.base_price × replacementQty
              replacementDiscount = discount
              replacementQuantity = replacementQty
```

#### Accounting Impact

No `ReturnCredit`, no invoice update, no GL/cashbook entries for either category. **Sales report impact — shared query, formula now fixed:**

```ts
// billingReportService.ts — getBranchSalesTotals() AND getGlobalSalesTotals(), byte-identical formula in both
adjustment =
  Number(cn.replacementAmount) - Number(cn.productAmount) - Number(cn.replacementDiscount);
sales.totalSales += adjustment;
```

The query filters `cn.type = 'CREDIT_EXCHANGE'` and `cn.status = 'PRODUCT_REPLACED'` with **no `itemCategory` filter** — Product and Spare Part exchanges are summed together into one adjustment figure, using the same corrected (discount-subtracting) formula for both. This confirms §8 #3 is fixed and the fix was not accidentally scoped to one category.

#### Inventory Impact

Same as REPLACEMENT: old item restocked/marked (no damage bucket for spare parts), new item allocated/marked SALE.

---

## 3. Data Model

### 3.1 `credit_notes` — full current column list

**Entity:** `backend/billing_service/src/entities/creditNoteEntity.ts` (166 lines). Table created/altered idempotently at boot by `runPreMigrations()` in `backend/billing_service/src/config/dataSource.ts` — **this is the authoritative schema source**; a standalone file `migrations/1752000000000-AddCreditNoteSparePartAndFixColumns.sql` also exists in the repo but uses incorrect camelCase quoted column names inconsistent with the entity and is not what actually provisions the database (see §9 #N6).

| Column                             | DB Type       | Nullable              | Applies To           | Notes                                                                                                   |
| ---------------------------------- | ------------- | --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| `id`                               | UUID          | No                    | Both                 | PK                                                                                                      |
| `creditNoteNo`                     | VARCHAR       | No, unique            | Both                 | `CN-{year}-{5-digit}`, atomic via Postgres sequence (see §4)                                            |
| `invoiceId` / `invoice` (relation) | UUID          | No                    | Both                 | FK → `invoices.id`                                                                                      |
| `invoiceNumber`                    | VARCHAR       | Yes                   | Both                 | Denormalized                                                                                            |
| `customerId`                       | UUID          | No                    | Both                 |                                                                                                         |
| `customerName`                     | VARCHAR       | Yes                   | Both                 | Denormalized                                                                                            |
| `branchId`                         | UUID          | No                    | Both                 | Body value first, falls back to `req.user.branchId`                                                     |
| `itemCategory`                     | VARCHAR(20)   | No, default `PRODUCT` | Both                 | Discriminator: `'PRODUCT' \| 'SPARE_PART'`. DB column: `item_category`                                  |
| `productId`                        | UUID          | Yes                   | **PRODUCT only**     | Required at create() if itemCategory=PRODUCT                                                            |
| `productName`                      | VARCHAR       | Yes                   | Both                 | Set for spare parts too (holds part name)                                                               |
| `modelName`                        | VARCHAR       | Yes                   | **PRODUCT only**     |                                                                                                         |
| `brand`                            | VARCHAR       | Yes                   | **PRODUCT only**     |                                                                                                         |
| `serialNumber`                     | VARCHAR       | Yes                   | **PRODUCT only**     |                                                                                                         |
| `sparePartId`                      | UUID          | Yes                   | **SPARE_PART only**  | Required at create() if itemCategory=SPARE_PART; no cross-service DB-level FK                           |
| `sku`                              | VARCHAR       | Yes                   | **SPARE_PART only**  |                                                                                                         |
| `quantity`                         | INT           | Yes                   | **SPARE_PART only**  | Always NULL for PRODUCT (implicit qty=1 via serial number)                                              |
| `productAmount`                    | DECIMAL(12,2) | No                    | Both                 | PRODUCT: unit price as entered. SPARE_PART: `unitPrice × quantity`, client-computed                     |
| `taxName`                          | VARCHAR(50)   | Yes                   | Both                 | DB column `tax_name`. Snapshot from invoice at creation                                                 |
| `taxPercent`                       | DECIMAL(5,2)  | Yes                   | Both                 | DB column `tax_percent`                                                                                 |
| `taxAmount`                        | DECIMAL(12,2) | Yes                   | Both                 | DB column `tax_amount`. **Now consumed** — added into `ReturnCredit.amount` on DIRECT_REFUND (see §2.1) |
| `type`                             | ENUM          | No                    | Both                 | `DIRECT_REFUND \| REPLACEMENT \| CREDIT_EXCHANGE`                                                       |
| `status`                           | ENUM          | No, default `DRAFT`   | Both                 | See §1                                                                                                  |
| `sellerEmployeeId`                 | UUID          | No                    | Both                 |                                                                                                         |
| `notes`                            | TEXT          | Yes                   | Both                 | Sales notes                                                                                             |
| `financeNote`                      | TEXT          | Yes                   | Both                 | Set at approval                                                                                         |
| `damageReason`                     | ENUM          | Yes                   | Both                 | Set at approval; drives PRODUCT inventory routing only (never reaches the SPARE_PART inventory call)    |
| `paymentMode`                      | VARCHAR       | Yes                   | Both                 | Set at approval; persisted but never posts a cashbook entry for either category                         |
| `rejectionReason`                  | TEXT          | Yes                   | Both                 | Set on reject                                                                                           |
| `replacementProductId`             | UUID          | Yes                   | **PRODUCT only**     | Set at complete()                                                                                       |
| `replacementProductName`           | VARCHAR       | Yes                   | **PRODUCT only**     |                                                                                                         |
| `replacementSerialNumber`          | VARCHAR       | Yes                   | **PRODUCT only**     |                                                                                                         |
| `replacementSparePartId`           | UUID          | Yes                   | **SPARE_PART only**  | Set at complete()                                                                                       |
| `replacementSparePartName`         | VARCHAR       | Yes                   | **SPARE_PART only**  |                                                                                                         |
| `replacementSparePartSku`          | VARCHAR       | Yes                   | **SPARE_PART only**  |                                                                                                         |
| `replacementQuantity`              | INT           | Yes                   | **SPARE_PART only**  | Defaults to `record.quantity` if omitted                                                                |
| `replacementAmount`                | DECIMAL(12,2) | Yes                   | Both (shared column) | See §2.2/§2.3 per-type formula                                                                          |
| `replacementDiscount`              | DECIMAL(12,2) | No, default 0         | Both (shared column) | Meaningful only for CREDIT_EXCHANGE                                                                     |
| `createdAt` / `updatedAt`          | TIMESTAMP     | No                    | Both                 |                                                                                                         |

**No separate spare-part-return table exists.** All status/audit/finance columns (`type`, `status`, `financeNote`, `damageReason`, `rejectionReason`, `paymentMode`, timestamps) are shared, unmodified, category-agnostic.

### 3.2 `return_credits`

**Entity:** `backend/billing_service/src/entities/returnCreditEntity.ts` (46 lines). Created only for `DIRECT_REFUND`, only inside `approve()`, via `ReturnCreditRepository.createReturnCredit()` — the single consistent path for the credit-note flow (there is a second, separate writer to this same table — the legacy `billingService.processReturn()`, see §8 #8/§9).

| Column                             | DB Type       | Nullable | Notes                                                                       |
| ---------------------------------- | ------------- | -------- | --------------------------------------------------------------------------- |
| `id`                               | UUID          | No       | PK                                                                          |
| `invoiceId` / `invoice` (relation) | UUID          | No       | FK → `invoices.id`, `onDelete: CASCADE`                                     |
| `branchId`                         | VARCHAR       | No       |                                                                             |
| `createdBy`                        | VARCHAR       | No       | Employee ID of the approver                                                 |
| `amount`                           | DECIMAL(12,2) | No       | `productAmount + taxAmount` for the credit-note path (see §2.1)             |
| `note`                             | TEXT          | Yes      | Free-text, e.g. `"Refund for Credit Note CN-2026-00042. Finance Note: ..."` |
| `returnedItemId`                   | UUID          | Yes      | `productId` or `sparePartId` depending on category                          |
| `returnedItemType`                 | VARCHAR(50)   | Yes      | `'PRODUCT' \| 'SPARE_PART'`                                                 |
| `createdAt`                        | TIMESTAMP     | No       | Insert-only, no `updatedAt`                                                 |

**No column distinguishes rows written by the credit-note flow from rows written by the legacy `billingService.processReturn()` path** — `BillingReportService`'s totals sum every row in this table uniformly regardless of source (see §8 #8).

### 3.3 `SparePart` entity (ven_inv_service) — relevant stock columns

**Entity:** `backend/ven_inv_service/src/entities/sparePartEntity.ts`

| Column              | Notes                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quantity`          | Sellable stock. Incremented by every credit-note spare-part return, regardless of damage reason.                                                                                      |
| `reserved_quantity` | Not touched by either return flow.                                                                                                                                                    |
| `consumed_quantity` | Not touched by either return flow.                                                                                                                                                    |
| `damaged_quantity`  | **Exists, actively used elsewhere** (`serviceController.markSparePartDamaged()`: `part.quantity -= qty; part.damaged_quantity += qty`) — but neither return flow ever routes into it. |
| `base_price`        | Used as the replacement/exchange unit price in `CompletionModal`.                                                                                                                     |

### 3.4 Enums — exact current values

```ts
// entities/enums/creditNoteType.ts
DIRECT_REFUND | REPLACEMENT | CREDIT_EXCHANGE;

// entities/enums/creditNoteStatus.ts
DRAFT | PENDING_APPROVAL | APPROVED | REJECTED | COMPLETED | PRODUCT_REPLACED;

// entities/enums/damageReason.ts
DAMAGED_PRODUCT = 'Damaged Product';
INCOMPLETE_PARTS = 'Incomplete Parts';
DEFECTIVE = 'Defective';
WRONG_ITEM_DELIVERED = 'Wrong Item Delivered';
OTHER = 'Other';
```

Only `'Damaged Product'` maps to inventoryStatus `DAMAGED`; every other value maps to `RETURNED` — and, as noted throughout, this distinction never reaches the SPARE_PART inventory call at all.

### 3.5 Credit Note Numbering — now atomic (fixed)

```ts
// creditNoteController.ts:74-88, generateCreditNoteNo()
const count = /* COUNT(*) WHERE creditNoteNo LIKE 'CN-{year}-%' */;
await Source.query(`CREATE SEQUENCE IF NOT EXISTS cn_seq_${year} START WITH ${count + 1} INCREMENT BY 1`);
const result = await Source.query(`SELECT nextval('cn_seq_${year}') AS n`);
creditNoteNo = `CN-${year}-${String(result[0].n).padStart(5, '0')}`;
```

`COUNT()` only seeds the sequence's starting value the first time it's created each year (`START WITH` is a no-op once the sequence exists); every actual number is minted by `nextval()`, which is atomic under concurrent writers. **One shared sequence per year across both categories** — a Product and a Spare Part credit note created back-to-back draw consecutive numbers.

---

## 4. API Reference

**Base path:** `/credit-notes` (mounted `app.ts:48`; gateway-prefixed as `/b/credit-notes` from the frontend). **Auth:** every route requires `authMiddleware` (JWT).

### 4.1 Route Table — and a role-inheritance caveat that changes who can actually call what

| Method | Path            | Route-Declared Roles | Handler         |
| ------ | --------------- | -------------------- | --------------- |
| GET    | `/stats`        | Any authenticated    | `getStats`      |
| GET    | `/`             | Any authenticated    | `list`          |
| POST   | `/`             | EMPLOYEE, MANAGER    | `create`        |
| PUT    | `/:id`          | EMPLOYEE, MANAGER    | `update`        |
| DELETE | `/:id`          | EMPLOYEE, MANAGER    | `delete`        |
| POST   | `/:id/send`     | EMPLOYEE, MANAGER    | `sendToFinance` |
| POST   | `/:id/approve`  | FINANCE, ADMIN       | `approve`       |
| POST   | `/:id/reject`   | FINANCE, ADMIN       | `reject`        |
| POST   | `/:id/complete` | EMPLOYEE, MANAGER    | `complete`      |

**The route table above is not the effective access story.** `middlewares/roleMiddleware.ts`'s `requireRole()` has two behaviors not visible from the route declarations:

```ts
const MANAGER_INHERITED_ROLES = ['MANAGER', 'HR', 'FINANCE', 'EMPLOYEE'];

// 1. ADMIN always passes, regardless of the route's declared role list:
if (userRole === 'ADMIN') return next();

// 2. MANAGER inherits any route that lists a role in MANAGER_INHERITED_ROLES —
//    including FINANCE:
if (userRole === 'MANAGER' && allowedRoles.some((r) => MANAGER_INHERITED_ROLES.includes(r)))
  return next();
```

**Consequence: a MANAGER can call `/approve` and `/reject`**, even though those routes are declared `requireRole(FINANCE, ADMIN)` — because `FINANCE` is in `MANAGER_INHERITED_ROLES`. This is real, current, load-bearing behavior — not a hypothetical — and neither prior documentation pass mentioned it. Whether this is intentional branch-manager authority or an oversight is a product decision, not something inferable from the code alone; it is flagged here so the design intent can be confirmed. See §9 #N4.

### 4.2 Role-Based Data Visibility in `list()` — confirmed discrepancy, not as previously documented

```ts
// creditNoteController.ts:193-214
if (role === 'FINANCE') {
  query = query.where('cn.status != :draft', { draft: CreditNoteStatus.DRAFT });
} else {
  if (role === 'EMPLOYEE') query = query.where('cn.sellerEmployeeId = :userId', { userId });
  else if (role === 'MANAGER') query = query.where('cn.branchId = :branchId', { branchId });
}
```

| Role     | Actual current behavior                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EMPLOYEE | Own credit notes only (`sellerEmployeeId = userId`), any status                                                                                          |
| MANAGER  | Whole branch (`branchId = branchId`), any status **including DRAFT** — no draft exclusion for MANAGER                                                    |
| FINANCE  | All branches, all employees, **excluding DRAFT**                                                                                                         |
| ADMIN    | **Matches neither branch of the if/else — no `where` clause is added at all. ADMIN sees every credit note from every branch/employee, including DRAFT.** |

This contradicts the "FINANCE/ADMIN sees all except DRAFT" assumption stated in the prior Product documentation. `getStats()` (a separate function) gets this right — its base `where('cn.status != :draft', ...)` applies unconditionally before any role branching, so ADMIN correctly excludes drafts there. Only `list()` has the gap. See §9 #N1.

### 4.3 POST `/credit-notes` — Create

**Required (both categories):** `invoiceId`, `invoiceNumber`, `customerId`, `customerName`, `type`. **Additionally required by category:** `productId` if `itemCategory='PRODUCT'` (400 `productId is required for PRODUCT returns` if missing); `sparePartId` if `itemCategory='SPARE_PART'` (400 `sparePartId is required for SPARE_PART returns` if missing).

**Product example:**

```json
{
  "invoiceId": "uuid",
  "invoiceNumber": "INV-2026-00042",
  "customerId": "uuid",
  "customerName": "Al Noor Trading LLC",
  "branchId": "uuid",
  "itemCategory": "PRODUCT",
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

**Spare Parts example:**

```json
{
  "invoiceId": "uuid",
  "invoiceNumber": "INV-2026-00088",
  "customerId": "uuid",
  "customerName": "Doha Print Solutions",
  "branchId": "uuid",
  "itemCategory": "SPARE_PART",
  "sparePartId": "uuid",
  "sku": "FSR-KM-2554",
  "quantity": 2,
  "productAmount": 200.0,
  "type": "DIRECT_REFUND",
  "notes": "2 of 5 fuser units DOA on arrival",
  "sellerEmployeeId": "uuid"
}
```

**Not validated:** `productAmount` is taken verbatim from the body for both categories — never recomputed or cross-checked against `InvoiceItem` unit price. `quantity` for Spare Parts is never checked against `InvoiceItem.quantity` or prior returns (see §8 #S2).

**Response (201):** `{ success: true, data: <full CreditNote>, message: 'Credit Note created as Draft' }`.

### 4.4 POST `/:id/send` — no body, `status → PENDING_APPROVAL`.

### 4.5 POST `/:id/approve`

```json
{
  "financeNote": "Confirmed 2 units DOA by warehouse inspection",
  "damageReason": "Defective",
  "paymentMode": "BANK_TRANSFER"
}
```

Identical shape for both categories — quantity/SKU/serial were already fixed at creation, nothing category-specific is sent here. `financeNote` and `damageReason` are required server-side (400 if either missing); `paymentMode` is optional and now persisted (`paymentMode` column).

**Response for DIRECT_REFUND:** `status: COMPLETED`, `message: 'Refund Completed'`.
**Response for REPLACEMENT/CREDIT_EXCHANGE:** `status: APPROVED`, `message: 'Credit Note Approved'`.

### 4.6 POST `/:id/reject`

```json
{ "rejectionReason": "Product shows physical damage not covered by return policy" }
```

**No status-precondition check exists on this endpoint** (unlike `approve()`, which explicitly requires `PENDING_APPROVAL`) — see §9 #N3.

### 4.7 POST `/:id/complete` — only valid when `status = APPROVED`, only for REPLACEMENT/CREDIT_EXCHANGE

**Product — REPLACEMENT:**

```json
{
  "replacementSerialNumber": "SN-HP-0099",
  "replacementProductId": "uuid-of-new-unit",
  "replacementProductName": "HP LaserJet Pro M404dn",
  "replacementAmount": 1050.0,
  "replacementDiscount": 0
}
```

**Spare Parts — REPLACEMENT:**

```json
{
  "replacementSparePartId": "uuid-of-new-sku",
  "replacementSparePartName": "Fuser Unit (Compatible)",
  "replacementSparePartSku": "FSR-COMP-2554",
  "replacementQuantity": 1,
  "replacementAmount": 150.0,
  "replacementDiscount": 0
}
```

**Spare Parts — CREDIT_EXCHANGE, partial-quantity example** (2 units returned, exchanged for 3 units of a different SKU):

```json
{
  "replacementSparePartId": "uuid-of-part-b",
  "replacementSparePartName": "OEM Drum Unit",
  "replacementSparePartSku": "DRM-OEM-441",
  "replacementQuantity": 3,
  "replacementAmount": 210.0,
  "replacementDiscount": 0
}
```

**The backend does not validate that the sent field-shape matches `creditNote.itemCategory`.** `complete()` branches purely on `creditNote.itemCategory` (the stored value, not anything in the request) to decide which fields to read (`creditNoteController.ts:562-628`) — it never checks that the caller actually sent the matching set, and it doesn't guard `replacementProductId`/`replacementSparePartId` truthiness before use in most paths. Sending the wrong category's fields (or omitting the right ones) is not rejected — it silently produces a `PRODUCT_REPLACED` credit note with `undefined` replacement details and, for PRODUCT, a RabbitMQ event carrying `productId: undefined`. See §8 #S8/§9 #N8.

**Response:** `status: PRODUCT_REPLACED`, `message: 'Return Process Completed'`.

### 4.8 GET `/stats`

```json
{
  "success": true,
  "data": { "total": 12, "directRefund": 5, "replacement": 4, "creditExchange": 3 }
}
```

Grouped **only by `type`**, excludes DRAFT for every role. **No `itemCategory` breakdown exists anywhere in this endpoint** — a Product DIRECT_REFUND and a Spare Part DIRECT_REFUND both increment the same `directRefund` counter (§8 #S7).

---

## 5. Frontend

### 5.1 Category Selector — `CreditNoteFormModal.tsx`

Two-button toggle (Product/Spare Part), first field in the form. Both buttons `disabled={!!record}` (lines 529, 545) — category is locked once an existing record is being edited.

### 5.2 Selection Flow Differences

|                             | Product                                                                                                                                                         | Spare Part                                                                                                                                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Item list source            | `productInvoiceItems` — filters invoice items to PRODUCT type                                                                                                   | `sparePartInvoiceItems` — filters to SPAREPART type, plain `.filter().map()`, no extra logic                                                                                                                                                               |
| Prior-replacement injection | **Yes** — if the invoice has a `PRODUCT_REPLACED` credit note, its replacement product is injected into the selectable list (`CreditNoteFormModal.tsx:388-406`) | **No equivalent exists.** Confirmed by direct inspection: `sparePartInvoiceItems` (lines 419-424) has no `creditNotes` lookup at all — a previously-replaced spare-part SKU is never surfaced for a follow-up return                                       |
| Quantity input              | N/A (implicit 1)                                                                                                                                                | `min=1`, `max={selectedSparePart.quantity}` on the `<Input>`, but `onChange` only does `Math.max(1, Number(e.target.value))` (line 746-748) — **the upper bound is never enforced**, only the lower bound. A user can type any number above the visual max |
| `productAmount` computed    | Unit price as selected/entered                                                                                                                                  | `unitPrice × returnQuantity`, client-side (line 360-368)                                                                                                                                                                                                   |

### 5.3 `CompletionModal.tsx` — Stock Filter Logic (exact current predicates)

```
PRODUCT REPLACEMENT:      product_status=AVAILABLE AND serial≠returned AND model.id = original model
PRODUCT CREDIT_EXCHANGE:  product_status=AVAILABLE AND serial≠returned AND model.id ≠ original model
                           ↑ correctly enforced, confirmed by direct code read

SPARE_PART REPLACEMENT:      quantity>0 AND id ≠ record.sparePartId
SPARE_PART CREDIT_EXCHANGE:  quantity>0 AND id ≠ record.sparePartId
                           ↑ BYTE-IDENTICAL condition for both branches (lines 86-89):
                             // REPLACEMENT: same spare part SKU (or any with stock if no SKU match — allow manual)
                             // CREDIT_EXCHANGE: different SKU than the returned one
                             if (isExchange) return p.id !== record.sparePartId;
                             return p.id !== record.sparePartId;
                           The comment claims a same-vs-different-SKU distinction; the code does not implement one.
```

**Manual/out-of-stock entry:**

- **Product**: a free-text serial `<Input>` is always rendered (`CompletionModal.tsx:328-343`), regardless of stock; `handleSubmit` only requires the serial field to be non-empty, not `selectedProduct` — completion proceeds even with zero matching stock.
- **Spare Part**: the SKU selector is only rendered `{isSpare && availableSpareParts.length > 0 && (...)}` (line 232) — there is no text-input fallback anywhere in the spare-part branch. `handleSubmit`'s spare-part guard clauses (lines 128-143) all require `selectedSparePart` truthy — if the list is empty, `selectedSparePart` can never be set, and completion cannot proceed at all.

**`handleSubmit` payload per combination** (all four, confirmed exact):

```
PRODUCT+REPLACEMENT:      replacementAmount = record.productAmount
PRODUCT+CREDIT_EXCHANGE:  replacementAmount = selectedProduct.sale_price
SPARE_PART+REPLACEMENT:      replacementAmount = record.productAmount
SPARE_PART+CREDIT_EXCHANGE:  replacementAmount = selectedSparePart.base_price × replacementQty
```

### 5.4 `FinanceApprovalModal.tsx`

- **Currency**: now `formatCurrency(record?.productAmount ?? 0, currency)` with `currency` from `useBranchCurrency()` — no hardcoded symbol anywhere in the file. Fixed, category-agnostic (the modal doesn't branch on `itemCategory` at all).
- **Does not show `quantity` or `sku`** for a Spare Part record — the only item summary shown is `record.productName` / `record.modelName` (a PRODUCT-only field, blank for spare parts) / `record.productAmount`. Finance approving a multi-unit spare-part return sees the total amount but not how many units or which SKU, without opening the full `CreditNoteViewModal`.
- Submit-guard (`disabled={!financeNote || !damageReason || !paymentMode}`) and the actual payload sent are identical field sets — no mismatch here.

### 5.5 `CreditNoteViewModal.tsx`

Correctly branches on `itemCategory` — shows SKU + Return Qty for SPARE_PART, Model/Brand/Serial for PRODUCT (lines 210-231). No gap found here.

### 5.6 `ReturnsTable.tsx` — Actions by Role/Status

```ts
isSales = role === 'EMPLOYEE' || role === 'MANAGER';
isFinance = role === 'FINANCE' || role === 'ADMIN';
```

| Status                                  | Sales roles                                       | Finance roles         |
| --------------------------------------- | ------------------------------------------------- | --------------------- |
| DRAFT                                   | Edit, Delete, Send, View                          | —                     |
| PENDING_APPROVAL                        | View                                              | Approve, Reject, View |
| APPROVED                                | Complete (REPLACEMENT/CREDIT_EXCHANGE only), View | View                  |
| COMPLETED / PRODUCT_REPLACED / REJECTED | View                                              | View                  |

### 5.7 API Client — `frontend/services/creditNoteService.ts`

9 thin wrapper functions over the shared `api` client (`getCreditNoteStats`, `getCreditNotes`, `createCreditNote`, `updateCreditNote`, `deleteCreditNote`, `sendToFinance`, `approveCreditNote`, `rejectCreditNote`, `completeCreditNote`) — no client-side validation or payload transformation happens in this layer; everything built in the modals passes straight through.

### 5.8 Pages

| Role     | Path                                              | Notes                                                                                                                        |
| -------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| EMPLOYEE | `app/employee/(dashboard)/sales/returns/page.tsx` | Full CRUD: create/edit/delete/send/complete                                                                                  |
| MANAGER  | `app/manager/(dashboard)/sales/returns/page.tsx`  | Create only (no edit wired); delete via native `confirm()`                                                                   |
| ADMIN    | `app/admin/(dashboard)/sales/returns/page.tsx`    | Approve/Reject only; **passes `role="FINANCE"` to `ReturnsTable`, not `"ADMIN"`** (see §9 #N7); reject via native `prompt()` |
| FINANCE  | `app/finance/(dashboard)/returns/page.tsx`        | Approve/Reject only; also resolves `customerName` via a separate `getCustomers()` call                                       |

### 5.9 The Orphaned Legacy Path — `ReturnsManagement.tsx`

`frontend/components/invoice/ReturnsManagement.tsx` is a self-contained, older "Process Returns" screen that lists PAID/INVOICED/ISSUED invoices and lets a user pick one item + enter a free-form return amount, calling `processReturn(invoiceId, {...})` — a completely separate mechanism from `creditNoteService.ts`, with no `itemCategory` concept. Confirmed by repo-wide grep: **it is not imported or rendered by any other file** — unreachable from any page/route today.

---

## 6. Worked Numeric Examples

### Example 1a — DIRECT_REFUND, Spare Part, Partial Quantity (correct path)

**Scenario:** Customer bought 5 units of Toner Cartridge X at QAR 100/unit on an invoice with 5% VAT. Returns 2 units, confirmed defective.

| Field                   | Value                   |
| ----------------------- | ----------------------- |
| `itemCategory`          | `SPARE_PART`            |
| `quantity`              | 2                       |
| `productAmount`         | `100 × 2 = 200.00`      |
| `taxPercent` (snapshot) | 5                       |
| `taxAmount` (snapshot)  | `200 × 5 / 100 = 10.00` |
| `damageReason`          | `Defective`             |

**On approval:**

- `status → COMPLETED`
- REST: `sparePart.quantity += 2` (restocked as sellable — "Defective" reason ignored by the restock call)
- `return_credits` row: `amount = 200 + 10 = 210.00` (VAT-inclusive, per the current formula)
- `isFullyReturned()`: `totalSoldQty = 5`, `priorReturnedQty = 0`, `totalReturnedQty = 0 + 2 = 2`. `2 ≥ 5`? No → **invoice stays as-is, not marked REFUNDED** (correct — 3 units remain validly sold)

**Sales report:** total reduced by QAR 210.00 (previously would have been understated at QAR 200.00 before the tax-inclusion fix).

### Example 1b — Same line item, second and third credit notes: the over-return gap in numbers

**Second credit note**, same SKU/invoice, another 2 units returned:

- `isFullyReturned()`: `priorReturnedQty = 2` (from the first COMPLETED DIRECT_REFUND), `totalReturnedQty = 2 + 2 = 4`. `4 ≥ 5`? No → invoice still not closed. Correct so far — only 1 unit remains un-returned.

**Third credit note**, same SKU/invoice — nothing in `create()` prevents entering a `quantity` larger than what's left. Say the user (in error, or maliciously) enters `quantity = 3`:

- `create()` accepts it with no check against `InvoiceItem.quantity` (5) or the sum of prior returns (4) — no validation exists anywhere in the stack for this.
- On approval: `sparePart.quantity += 3` — 1 more unit than actually remained is added back to sellable stock.
- `isFullyReturned()`: `totalReturnedQty = 4 + 3 = 7 ≥ 5` → **true** → invoice is marked `REFUNDED`, which happens to be the "right" terminal state here only by coincidence of crossing the threshold, not because the return was legitimate. `return_credits.amount` for this third note is still `100×3 + tax = 315.00`, financially crediting 1 unit that was never validly outstanding.

This demonstrates §8 #S2 concretely: `isFullyReturned()` closes the invoice correctly in the _first two_ (legitimate) steps, but has no mechanism to reject the third (illegitimate) one — it only ever asks "have we reached or exceeded the original quantity," never "did this specific request stay within what's left."

### Example 2 — REPLACEMENT, Spare Part

**Scenario:** 3 units of Drum Unit Y at QAR 150/unit purchased; 1 defective, swapped 1-for-1 from stock (replacement SKU `base_price` = QAR 160).

```
productAmount = 150 × 1 = 150.00
replacementAmount = 150.00        (original amount, NOT the new unit's 160)
replacementDiscount = 0
replacementQuantity = 1
```

Old SKU: `quantity += 1` (restocked, damage reason ignored). New SKU: `quantity -= 1` (server-validated). No cash, no accounting entries, no report impact.

### Example 3 — CREDIT_EXCHANGE, Spare Part, Multi-Unit Upgrade

**Scenario:** Returns 2 units of Generic Toner (QAR 80/unit, `productAmount` = 160.00), exchanges for 2 units of OEM Toner at QAR 110/unit, with a QAR 10 extra discount.

```
originalValue = 160.00
newValue      = 110 × 2 = 220.00
discount      = 10.00
variation     = 220 - 160 - 10 = 50.00  →  "Payable Gap: QAR 50.00"

Persisted:  replacementAmount = 220.00, replacementDiscount = 10.00, replacementQuantity = 2
Inventory:  old SKU quantity += 2, new SKU quantity -= 2
Sales report adjustment: 220 - 160 - 10 = 50.00  (fixed formula, discount correctly subtracted)
```

Customer pays QAR 50.00 manually — no system record of the cash movement.

### Example 4 — DIRECT_REFUND, Product

**Scenario:** HP LaserJet Pro, QAR 1,050, defective, 5% VAT invoice.

```
productAmount = 1,050.00
taxAmount (snapshot) = 1,050 × 5 / 100 = 52.50
```

On approval: `status → COMPLETED`; RabbitMQ old unit → `RETURNED`; `return_credits.amount = 1,050 + 52.50 = 1,102.50`; `invoices.status → REFUNDED` (always, for PRODUCT — `isFullyReturned()` is never consulted). Sales total reduced by QAR 1,102.50.

### Example 5 — CREDIT_EXCHANGE, Product (Downgrade)

**Scenario:** Returns a Kyocera ECOSYS P2235dn (`productAmount` = 1,400.00), exchanges for an HP LaserJet Pro (`sale_price` = 1,050.00), no extra discount.

```
originalValue = 1,400.00
newValue      = 1,050.00
variation     = 1,050 - 1,400 - 0 = -350.00  →  "Refundable Balance: QAR 350.00"
Sales report adjustment: -350.00
```

Customer receives QAR 350.00 manually — no system record.

---

## 7. Edge Cases Handled

### 7.1 Invoice with Prior `PRODUCT_REPLACED` Credit Note

**Product**: handled — the replacement product is injected into the selectable item list for a follow-up credit note (`CreditNoteFormModal.tsx:388-406`).
**Spare Part**: **not handled** — `sparePartInvoiceItems` has no equivalent lookup; a previously-replaced spare-part SKU is never surfaced.

### 7.2 Out-of-Stock for Replacement/Exchange

**Product**: handled — free-text serial entry always available, completion proceeds regardless of stock.
**Spare Part**: **not handled** — no manual entry path; completion is a dead end when the filtered stock list is empty.

### 7.3 Multiple Credit Notes / Partial Quantity Against the Same Line Item (Spare Parts)

**Partially handled.** `isFullyReturned()` correctly tracks cumulative _completed_ DIRECT_REFUND quantity for the single purpose of deciding whether to close the invoice (see §2.1, §6 Examples 1a/1b) — but nothing at any layer (frontend `max` attribute is cosmetic only; no backend check in `create()`) prevents a credit note's `quantity` from exceeding what's actually left on the line, whether via one oversized credit note or several smaller ones summing past the original purchase quantity.

### 7.4 REPLACEMENT vs CREDIT_EXCHANGE SKU Restriction (Spare Parts)

**Not handled as the code comments claim it should be.** Product enforces same-model-for-REPLACEMENT / different-model-for-CREDIT_EXCHANGE correctly; Spare Parts' stock filter is byte-identical for both types, so a "REPLACEMENT" can select an entirely different SKU with no extra-discount prompt (since that panel is gated on `isExchange`, not on whether the selected SKU actually differs) — the only thing distinguishing a same-value swap from a value-different swap is which button was clicked at creation, not anything enforced at completion time.

### 7.5 User Overrides Auto-Selected Serial (Product only)

If a user clicks a stock unit (auto-filling the serial) then manually edits the serial text, `selectedProduct` is cleared but the typed serial is kept — `replacementProductId`/`replacementProductName` will be `undefined` in the submitted payload. Not applicable to Spare Parts (no free-text equivalent exists at all, see §7.2).

### 7.6 FINANCE Cannot See Drafts / MANAGER and ADMIN Visibility

FINANCE correctly excludes DRAFT. MANAGER does **not** exclude DRAFT (sees their whole branch's drafts too). ADMIN has **no filter applied at all** in `list()` (see §4.2, §9 #N1) — this is a newly-confirmed gap, not previously documented.

### 7.7 Status Guards on Mutations

`create`, `update`, `delete`, `sendToFinance`, `approve`, and `complete` all check the current status before proceeding and 400 on an invalid transition. **`reject` is the one exception** — it has no status-precondition check at all (§9 #N3).

---

## 8. Consolidated Discrepancy / Limitation Status

Every issue found across both prior documentation passes, re-verified against current source in this pass. "Product Status" and "Spare Parts Status" are independently confirmed, not assumed inherited from one another.

| #      | Discrepancy                                                                    | Product Status                                                                                                                                                                                                                                                                                                                                                                        | Spare Parts Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | `paymentMode` collected but never stored                                       | **Fixed.** Column exists (`creditNoteEntity.ts:115-116`); `approve()` persists it (`:326`).                                                                                                                                                                                                                                                                                           | **Fixed** — same shared code path, category-agnostic.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **2**  | No VAT/tax reversal on refunds                                                 | **Partially fixed.** Tax snapshot (`taxName`/`taxPercent`/`taxAmount`) now captured at creation, and — new since the last pass — `ReturnCredit.amount` now includes `taxAmount` (`productAmount + taxAmount`), so the _reported sales deduction_ is VAT-correct. Still **no** formal Output-Tax-report exclusion entry, VAT-return reversal, or GL posting.                           | **Same** — identical shared code path; the fix and the remaining gap apply equally.                                                                                                                                                                                                                                                                                                                                                                                                             |
| **3**  | Report formula ignored `replacementDiscount`                                   | **Fixed.** Formula is now `replacementAmount − productAmount − replacementDiscount` in both `getBranchSalesTotals` and `getGlobalSalesTotals`.                                                                                                                                                                                                                                        | **Fixed, same query** — no `itemCategory` filter, so the fix covers both categories via one shared query.                                                                                                                                                                                                                                                                                                                                                                                       |
| **4**  | New product's `billType` hardcoded to `'SALE'` in `complete()`                 | **Unchanged behavior, but resolved by design reconsideration** — the code comment now reads _"'SALE' is correct here; the replacement is a sale allocation"_, i.e. it was judged not to be a bug rather than patched to be dynamic.                                                                                                                                                   | **N/A** — Spare Parts never uses `emitProductStatusUpdate`/`billType` at all; it uses REST `/allocate`, which has no such concept.                                                                                                                                                                                                                                                                                                                                                              |
| **5**  | Currency symbol `₹` in `FinanceApprovalModal`                                  | **Fixed.** Now `formatCurrency(..., useBranchCurrency())`, no hardcoded symbol anywhere in the file.                                                                                                                                                                                                                                                                                  | **Fixed, same modal** — category-agnostic, doesn't branch on `itemCategory`.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **6**  | Dead `else` branch in `complete()`                                             | **Fixed.** `complete()` now sets `PRODUCT_REPLACED` unconditionally (no if/else); the function already throws earlier if `type` isn't REPLACEMENT/CREDIT_EXCHANGE.                                                                                                                                                                                                                    | **Fixed, same code** — applies before the category branch.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **7**  | `branchId` empty string in RabbitMQ product-status events                      | **Fixed for the credit-note flow specifically** — both `approve()` and `complete()` now pass `creditNote.branchId` explicitly. The publisher's own default (`payload.branchId ?? ''`) is unchanged and still bites _other, unrelated_ callers elsewhere in the codebase that omit it.                                                                                                 | **N/A** — Spare Parts never emits this event; uses REST calls instead.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **8**  | `billingService.processReturn()` — parallel, unused implementation             | **Not fixed, still present, and confirmed live-reachable.** Now uses the repository pattern (`returnCreditRepo.createReturnCredit()`), wired to a real route (`POST /invoices/:id/returns`, open to ADMIN/MANAGER/FINANCE/EMPLOYEE), but its only frontend consumer (`ReturnsManagement.tsx`) is unreachable from any page — so it's a live API endpoint with no UI path to it today. | **Same code path, same gap** — `quantity` is hardcoded to `1` regardless of `itemType` ('PRODUCT' or 'SPARE_PART'); if ever wired into a UI, any spare-part return through it would always restock exactly 1 unit no matter how many were actually returned.                                                                                                                                                                                                                                    |
| **9**  | Single item per credit note (no bulk return)                                   | **Unchanged.** One product per credit note.                                                                                                                                                                                                                                                                                                                                           | **Unchanged, with a real improvement underneath.** Still one SKU per credit note, but a single Spare Parts credit note can now cover _N units of that one SKU_ — a genuine quantity dimension Product structurally lacks.                                                                                                                                                                                                                                                                       |
| **10** | Non-atomic `COUNT + 1` numbering                                               | **Fixed.** Real Postgres `SEQUENCE` (`cn_seq_{year}`), `COUNT` only seeds the first-ever value.                                                                                                                                                                                                                                                                                       | **Fixed, same shared sequence** — Product and Spare Part notes draw from one counter.                                                                                                                                                                                                                                                                                                                                                                                                           |
| **S1** | Damaged spare parts never routed to `damaged_quantity`                         | N/A (Product uses a different, unrelated status field: `product_status`)                                                                                                                                                                                                                                                                                                              | **Still present, confirmed independently twice** (controller-level and inventory-service-level). `inventoryStatus`/`damageReason` is computed but never included in the SPARE_PART REST payload, in either `approve()` or `complete()`. `InventoryReturnService.processReturn()` has no damage branch — `sparePart.quantity += quantity` unconditionally. The `damaged_quantity` bucket exists and has an established pattern elsewhere (`markSparePartDamaged`) that simply isn't reused here. |
| **S2** | No cumulative quantity validation across credit notes on the same line item    | N/A (Product is always qty=1)                                                                                                                                                                                                                                                                                                                                                         | **Still present as a validation gap**, though a related tracking mechanism (`isFullyReturned()`) now exists for the narrower purpose of deciding invoice-closure — it does not block or cap over-returning. See §6 Example 1b for the exact numeric failure mode. Confirmed at all three layers: frontend `max` is cosmetic only, no cross-check query exists, `create()` performs no server-side check.                                                                                        |
| **S3** | REPLACEMENT/CREDIT_EXCHANGE use an identical, non-differentiating stock filter | N/A (Product correctly differentiates via `model.id`)                                                                                                                                                                                                                                                                                                                                 | **Still present**, confirmed byte-identical (`p.id !== record.sparePartId` in both branches) despite a code comment claiming the two should differ.                                                                                                                                                                                                                                                                                                                                             |
| **S4** | No manual/out-of-stock entry path                                              | N/A (Product has a free-text fallback)                                                                                                                                                                                                                                                                                                                                                | **Still present.** Completion is a dead end if the stock list is empty — no equivalent to Product's serial-entry fallback exists.                                                                                                                                                                                                                                                                                                                                                               |
| **S6** | `FinanceApprovalModal` doesn't surface quantity/SKU                            | N/A (not meaningful for a single serialized unit)                                                                                                                                                                                                                                                                                                                                     | **Still present.** Finance sees `productName`/`productAmount` only; must open the full view modal to see quantity or SKU.                                                                                                                                                                                                                                                                                                                                                                       |
| **S7** | `getStats()` doesn't break out by `itemCategory`                               | Same gap, symmetric                                                                                                                                                                                                                                                                                                                                                                   | **Still present.** Counts are `type`-only; no way to see "how many spare-part returns" from this endpoint alone.                                                                                                                                                                                                                                                                                                                                                                                |
| **S8** | `complete()` doesn't validate request-body shape matches `itemCategory`        | **Confirmed to affect Product too** — `replacementProductId` truthiness is never checked before use; an omitted value still results in a `PRODUCT_REPLACED` status with `productId: undefined` sent to inventory.                                                                                                                                                                     | **Still present**, same root cause — the branch is chosen from the stored `itemCategory`, never cross-checked against what the caller actually sent.                                                                                                                                                                                                                                                                                                                                            |

---

## 9. Newly Found Issues

Found during this consolidation pass; not present in either prior document.

### N1 — `list()` gives ADMIN zero filtering (not "all except draft" as previously assumed)

**Severity: Medium.** Only `role === 'FINANCE'` gets the `status != DRAFT` exclusion (`creditNoteController.ts:198-199`). `role === 'ADMIN'` matches neither that branch nor the inner EMPLOYEE/MANAGER checks, so **no `where` clause is added at all for ADMIN** — every credit note from every branch and employee, including DRAFT, is returned. This contradicts both prior docs' stated assumption and is inconsistent with `getStats()`, which does exclude DRAFT correctly for every role. See §4.2.

### N2 — `update()`/`delete()`/`sendToFinance()` have no ownership or branch check, and `update()` mass-assigns

**Severity: Medium-High.** All three endpoints look up the credit note by `id` alone and check only its `status` — none verify `req.user.userId === creditNote.sellerEmployeeId` or that the caller's branch matches `creditNote.branchId`. Any authenticated EMPLOYEE/MANAGER can edit or delete any other user's/branch's DRAFT credit note if they know or guess its ID. `update()` additionally does `this.repository.merge(creditNote, req.body)` with no field whitelist — a caller could smuggle `status`, `sellerEmployeeId`, `branchId`, or `creditNoteNo` into the merge as long as the record is currently DRAFT.

### N3 — `reject()` has no status-precondition guard

**Severity: Low-Medium.** Unlike `approve()` (explicit `PENDING_APPROVAL` check, `creditNoteController.ts:320-322`), `reject()` will force-set `status = REJECTED` on a credit note in _any_ current status, with no guard at all. In practice other endpoints' own guards make this hard to reach in a harmful way today, but the asymmetry is real and unexplained.

### N4 — `roleMiddleware`'s inheritance model lets MANAGER approve/reject credit notes

**Severity: Medium (design-clarity issue).** See §4.1. `MANAGER_INHERITED_ROLES` includes `FINANCE`, and `/approve`/`/reject` are declared `requireRole(FINANCE, ADMIN)` — so a MANAGER passes that gate. Neither prior doc's "Finance approves, Sales completes" framing accounted for this. Worth an explicit product decision on whether this is intended branch-manager authority.

### N5 — `ReturnCredit.amount` now includes `taxAmount` (a positive change since the last pass)

**Severity: Informational.** The 2026-07-17 documentation stated the tax snapshot fields were "never read anywhere downstream." That's no longer fully true: `approve()` now computes `amount: Number(creditNote.productAmount) + Number(creditNote.taxAmount || 0)` when creating the `ReturnCredit` row (`creditNoteController.ts:364`), so the VAT portion of a refund is now correctly included in the sales-report deduction, for both categories. The remaining gap (§8 #2) — no formal Output-Tax-report exclusion or GL posting — still stands, but the impact is narrower than previously documented.

### N6 — Stale, inconsistent standalone migration file

**Severity: Low (maintainability).** `migrations/1752000000000-AddCreditNoteSparePartAndFixColumns.sql` creates columns with incorrect camelCase double-quoted names (`"itemCategory"`, `"taxName"`, `"taxPercent"`, `"taxAmount"`) that don't match the entity's snake_case mappings. The database is actually and correctly provisioned by an in-code idempotent function, `runPreMigrations()` in `config/dataSource.ts`, which uses the correct snake_case names. The `.sql` file is misleading if consulted as if it were authoritative — it is not what runs.

### N7 — Admin returns page passes `role="FINANCE"` to `ReturnsTable`, not `"ADMIN"`

**Severity: Low.** `app/admin/(dashboard)/sales/returns/page.tsx` hardcodes `<ReturnsTable role="FINANCE" ... />`. Currently harmless because `ReturnsTable`'s `isFinance` grouping treats `FINANCE` and `ADMIN` identically — but it's a latent inconsistency that would silently mis-render if that grouping is ever split.

### N8 — `complete()`'s missing field-shape validation affects Product too, not just Spare Parts

**Severity: Low-Medium.** The prior Spare Parts doc flagged this as discrepancy #S8 without confirming the Product side. Direct code read confirms it's symmetric: in the PRODUCT branch, `replacementProductId` is used directly with no truthiness check (`creditNoteController.ts:579,589`) — an omitted value still results in `emitProductStatusUpdate({ productId: undefined, ... })` and a `PRODUCT_REPLACED` status with no real replacement recorded.

---

_Document generated from direct source inspection on 2026-08-01, using three independent research passes across backend (`billing_service`), cross-service (`billing_service` ↔ `ven_inv_service`), and frontend. Every discrepancy carried over from the two prior documents was independently re-verified against current code, not assumed. Authoritative source files: `backend/billing_service/src/entities/creditNoteEntity.ts`, `returnCreditEntity.ts`, `entities/enums/{creditNoteType,creditNoteStatus,damageReason}.ts`, `controllers/creditNoteController.ts`, `routes/creditNoteRoutes.ts`, `repositories/returnCreditRepository.ts`, `middlewares/roleMiddleware.ts`, `services/billingReportService.ts`, `services/billingService.ts` (`processReturn`), `controllers/invoiceController.ts` (`processReturn`), `routes/invoiceRoutes.ts`, `events/publisher/productStatusEvent.ts`, `config/dataSource.ts`; `backend/ven_inv_service/src/controllers/inventoryReturnController.ts`, `services/inventoryReturnService.ts`, `routes/inventoryRoutes.ts`, `entities/sparePartEntity.ts`, `controllers/serviceController.ts` (`markSparePartDamaged`); `frontend/components/returns/{CreditNoteFormModal,CompletionModal,FinanceApprovalModal,CreditNoteViewModal,ReturnsTable,ReturnsStatCards}.tsx`, `frontend/services/creditNoteService.ts`, `frontend/components/invoice/ReturnsManagement.tsx`, `frontend/app/{employee,manager,admin,finance}/(dashboard)/{sales/returns,returns}/page.tsx`._
