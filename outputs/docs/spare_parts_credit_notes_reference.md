# Spare Parts Credit Notes & Returns — Technical Reference

**Xerocare Billing Service**
**Date:** 2026-07-17
**Status:** Authoritative as-built documentation derived from source code
**Companion document to:** `product_sale_credit_notes_reference.md`

---

## Table of Contents

1. [Overview](#1-overview)
2. [The Three Return Types (Spare Parts)](#2-the-three-return-types-spare-parts)
   - 2.1 [DIRECT_REFUND](#21-direct_refund)
   - 2.2 [REPLACEMENT](#22-replacement)
   - 2.3 [CREDIT_EXCHANGE](#23-credit_exchange)
3. [Data Model](#3-data-model)
4. [API Reference](#4-api-reference)
5. [Frontend](#5-frontend)
6. [Inventory Impact](#6-inventory-impact)
7. [Reporting / Accounting Impact](#7-reporting--accounting-impact)
8. [Worked Numeric Examples](#8-worked-numeric-examples)
9. [Edge Cases Handled (and Not Handled)](#9-edge-cases-handled-and-not-handled)
10. [Comparison to the Product Sale Credit Note Discrepancies](#10-comparison-to-the-product-sale-credit-note-discrepancies)
11. [Known Limitations and Discrepancies Found in the Spare Parts Implementation](#11-known-limitations-and-discrepancies-found-in-the-spare-parts-implementation)

---

## 1. Overview

Spare Parts Credit Notes are **not a separate feature** — they are a second `itemCategory` value on the exact same `credit_notes` table, the exact same `CreditNoteController`, the exact same status enum, and the exact same three `CreditNoteType` values as Product Sale Credit Notes. There is no separate "spare parts returns" route, table, or controller.

**When Spare Parts vs. Product is used:** a single toggle at the top of `CreditNoteFormModal` (Product / Spare Part) sets `itemCategory` at creation time and cannot be changed afterward (the toggle is `disabled` once a record exists). Product credit notes track one **serialized unit** (a specific product with a serial number); Spare Parts credit notes track a **quantity of a SKU** (no serialization) — this is the fundamental schema/behavior split, and it is implemented consistently: every field that differs between the two categories is either `PRODUCT`-prefixed/named or `sparePart`/`replacementSparePart`-prefixed on the same table.

**Confirmed against the original plan:** all three return types (`DIRECT_REFUND`, `REPLACEMENT`, `CREDIT_EXCHANGE`) were built for Spare Parts — none were scoped down. The status flow is **identical** to Product (same `CreditNoteStatus` enum, same transitions, same role gates). What differs is entirely inside the calculation/inventory logic for each type, documented below.

**What changed since the Product doc was written:** the Product reference document (dated the same day as this one) describes several discrepancies found in an earlier pass. The current codebase contains inline comments tagged `B.1` through `B.10` that correspond to a subsequent fix round. This document independently re-verifies, against the current source, which of those fixes landed and whether the Spare Parts path inherited them, has its own version of the same bug, or the item doesn't apply — see §10.

---

## 2. The Three Return Types (Spare Parts)

### 2.1 DIRECT_REFUND

**Definition:** The returned quantity of a spare part SKU is accepted back, the customer receives a cash/transfer refund, and the invoice is closed as refunded — same semantics as Product DIRECT_REFUND, but quantity-based instead of unit-based.

**Typical scenario:** Customer bought 5 toner cartridges, 2 turned out to be the wrong model; they return the 2 for a refund.

#### Status Flow

```
DRAFT  →  PENDING_APPROVAL  →  COMPLETED
  (Sales)      (Sales)           (Finance)
```

Identical to Product — DIRECT_REFUND skips `APPROVED` entirely, same as the Product path. No divergence.

#### Step-by-Step Workflow

| Step | Actor              | Action                                                             | System Result                                                     |
| ---- | ------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 1    | EMPLOYEE / MANAGER | Toggles "Spare Part" category, selects SKU from invoice line       | `itemCategory = SPARE_PART`                                       |
| 2    | EMPLOYEE / MANAGER | Enters return quantity (input capped visually at purchased qty)    | `quantity` set                                                    |
| 3    | EMPLOYEE / MANAGER | Selects DIRECT_REFUND, submits                                     | Status = `DRAFT`, `creditNoteNo` generated                        |
| 4    | EMPLOYEE / MANAGER | Sends to Finance                                                   | Status = `PENDING_APPROVAL`                                       |
| 5    | FINANCE / ADMIN    | Approves with damage reason, payment mode, finance note            | `POST /b/credit-notes/:id/approve`                                |
| 6    | Backend            | Sets `status = COMPLETED`                                          | —                                                                 |
| 7    | Backend            | `itemCategory === 'SPARE_PART'` branch: REST call to inventory     | `POST {inventory}/inventory/returns/process`                      |
| 8    | Backend            | Creates `ReturnCredit` via `returnCreditRepo.createReturnCredit()` | `returnedItemType = 'SPARE_PART'`, `returnedItemId = sparePartId` |
| 9    | Backend            | Updates originating invoice `status = REFUNDED`                    | Invoice is now terminal                                           |

#### Calculation Logic

Same as Product — no server-side recalculation. But unlike Product (which is always qty=1), `productAmount` is computed **client-side** as `unitPrice × returnQuantity` at creation time (`CreditNoteFormModal.tsx` line 367):

```
productAmount = unitPrice × returnQuantity
             // unitPrice = selectedSparePart.unitPrice ?? sparePartMeta.base_price
```

This is exactly the formula the user brief asked to confirm — it **is** implemented correctly as unit price × quantity, not a flat amount. The backend `create()` endpoint does not recompute or verify this; it stores whatever `productAmount` the frontend sent, same trust model as Product.

**Tax:** Unlike Product, the backend `create()` endpoint now copies a tax snapshot from the originating invoice (applies to both categories identically — this is not itemCategory-specific code):

```typescript
if (invoice?.taxPercent) {
  taxName = invoice.taxName;
  taxPercent = Number(invoice.taxPercent);
  taxAmount = (Number(productAmount) * taxPercent) / 100;
}
```

This is stored on the credit note (`taxName`, `taxPercent`, `taxAmount` columns) but — confirmed by grepping the entire backend — **is never read anywhere downstream**. No VAT reversal entry, no Output Tax report exclusion, no GL posting consumes these fields. See §10, Discrepancy #2.

#### Accounting Impact

| What                   | How                                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `return_credits` table | Row inserted via `ReturnCreditRepository.createReturnCredit()`, `amount = creditNote.productAmount`, `returnedItemType = 'SPARE_PART'`, `returnedItemId = sparePartId`         |
| `invoices` table       | `status` → `REFUNDED`                                                                                                                                                          |
| Chart of Accounts / GL | **None.** Same gap as Product — no journal entries.                                                                                                                            |
| Cashbook               | **None.** `paymentMode` is now persisted on the credit note (B.1 fix, applies to both categories — see §10 #1) but still does not post a cashbook entry.                       |
| Sales reports          | Deducted from `totalSales`; target category search now explicitly includes `SPAREPART_SALE` (`billingReportService.ts` line 144: `['SALE', 'PRODUCT_SALE', 'SPAREPART_SALE']`) |

#### Inventory Impact

**Mechanism differs from Product.** Product DIRECT_REFUND uses a RabbitMQ event (`emitProductStatusUpdate`). Spare Parts DIRECT_REFUND uses a synchronous REST call:

```typescript
await this.callInventoryService('/inventory/returns/process', {
  itemType: 'SPARE_PART',
  itemId: creditNote.sparePartId,
  quantity: creditNote.quantity || 1,
});
```

This hits `InventoryReturnService.processReturn()` in `ven_inv_service`, which does:

```typescript
sparePart.quantity += quantity;
```

**There is no damage-status distinction.** The controller computes `inventoryStatus` (`'DAMAGED'` vs `'RETURNED'`, based on `damageReason`) for the PRODUCT branch's RabbitMQ payload — but this value is **never passed** to the SPARE_PART REST call. Every returned spare part — including ones with `damageReason = "Damaged Product"` — is added back to the sellable `quantity` bucket. See §11 for why this is a confirmed, not assumed, gap.

---

### 2.2 REPLACEMENT

**Definition:** The returned spare part quantity is swapped for stock of (nominally) the same or a different SKU with stock, at no charge — same-value swap, mirroring Product REPLACEMENT.

**Typical scenario:** Customer bought 3 units of a fuser unit, one was defective; swap it 1-for-1 from stock.

#### Status Flow

```
DRAFT  →  PENDING_APPROVAL  →  APPROVED  →  PRODUCT_REPLACED
```

Identical enum, identical transitions to Product. No divergence in status flow.

#### Step-by-Step Workflow

| Step | Actor              | Action                                                                                                                                | System Result                               |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1–4  | EMPLOYEE → FINANCE | Same as DIRECT_REFUND steps 1–5, type = REPLACEMENT                                                                                   | Status = `APPROVED`; no inventory event yet |
| 5    | EMPLOYEE / MANAGER | Sees `APPROVED`, clicks "Complete"                                                                                                    | Opens `CompletionModal` (spare-part mode)   |
| 6    | EMPLOYEE / MANAGER | System fetches available spare parts (`quantity > 0`, excludes the exact same `sparePartId`)                                          | List of SKUs with stock counts shown        |
| 7    | EMPLOYEE / MANAGER | Selects replacement SKU, enters quantity to replace (soft-capped at `record.quantity`)                                                | —                                           |
| 8    | EMPLOYEE / MANAGER | Confirms                                                                                                                              | `POST /b/credit-notes/:id/complete`         |
| 9    | Backend            | Sets `status = PRODUCT_REPLACED` (unconditional — see §10 #6)                                                                         | —                                           |
| 10   | Backend            | Saves `replacementSparePartId/Name/Sku`, `replacementQuantity`, `replacementAmount = record.productAmount`, `replacementDiscount = 0` | —                                           |
| 11   | Backend            | REST call: old SKU restocked (`+= creditNote.quantity`)                                                                               | `POST /inventory/returns/process`           |
| 12   | Backend            | REST call: new SKU allocated (`-= replacementQuantity`)                                                                               | `POST /inventory/spare-parts/:id/allocate`  |

#### Calculation Logic

```
replacementAmount = creditNote.productAmount   // original value carried forward, unchanged
replacementDiscount = 0                        // frontend hardcodes 0 for REPLACEMENT
replacementQuantity = user-entered quantity     // defaults to record.quantity
```

Same non-recalculation pattern as Product: even if the replacement SKU has a different `base_price`, the amount recorded is the original purchase amount.

**Confirmed divergence from the code's own stated intent:** `CompletionModal.tsx` contains this comment directly above the stock filter:

```typescript
// REPLACEMENT: same spare part SKU (or any with stock if no SKU match — allow manual)
// CREDIT_EXCHANGE: different SKU than the returned one
if (isExchange) return p.id !== record.sparePartId;
return p.id !== record.sparePartId; // For replacement: different unit of any spare part with stock
```

Both branches evaluate to the exact same condition (`p.id !== record.sparePartId`). The comment states REPLACEMENT should be restricted to the _same_ SKU and CREDIT_EXCHANGE to a _different_ SKU — matching how Product enforces `model.id = original` for REPLACEMENT and `model.id ≠ original` for CREDIT_EXCHANGE. For Spare Parts, **neither restriction is actually applied** — REPLACEMENT can select any SKU with stock, including a different part entirely, indistinguishable from an exchange at the stock-filter level. See §11.

**No manual/out-of-stock entry path.** Product's `CompletionModal` always shows a free-text serial number field, even with zero available units, allowing an externally-sourced unit to be entered manually. Spare Parts has no equivalent — the SKU selector list only renders `{isSpare && availableSpareParts.length > 0 && (...)}`, and `handleSubmit` requires `selectedSparePart` to be set, which can only happen by clicking a list entry. If `availableSpareParts.length === 0`, there is no way to complete the credit note. See §9.2 and §11.

#### Accounting Impact

Identical to Product REPLACEMENT: no `ReturnCredit`, no invoice status change, no GL entries, no cashbook entries, not counted in sales reports.

#### Inventory Impact

Two sequential REST calls (not RabbitMQ):

- Old SKU → `POST /inventory/returns/process` (`quantity += creditNote.quantity`) — same no-damage-bucket gap as DIRECT_REFUND
- New SKU → `POST /inventory/spare-parts/:id/allocate` (`quantity -= replacementQuantity`) — this endpoint **does** validate stock server-side: `if (part.quantity < quantity) throw new AppError('Insufficient available stock', 400)`

---

### 2.3 CREDIT_EXCHANGE

**Definition:** Customer returns a spare part quantity and selects a different SKU (and/or quantity) as replacement. If more expensive, they pay the difference; if cheaper, they're owed a refund. An optional extra discount can be applied.

**Typical scenario:** Customer returns 2 units of a generic toner (QAR 80 each = QAR 160) and exchanges for 2 units of an OEM toner (QAR 110 each = QAR 220); pays the QAR 60 gap.

#### Status Flow

Identical to REPLACEMENT: `DRAFT → PENDING_APPROVAL → APPROVED → PRODUCT_REPLACED`. No separate terminal status, same as Product.

#### Step-by-Step Workflow

Same steps 1–8 as REPLACEMENT, with these differences at step 7:

| Step | Actor              | Action                                                                                                                                              |
| ---- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7    | EMPLOYEE / MANAGER | Selects a different SKU, enters replacement quantity, optionally an extra discount. Variance panel (Payable Gap / Refundable Balance) updates live. |

#### Calculation Logic

**This is where Spare Parts genuinely improves on Product**, because it correctly factors in quantity — Product CREDIT_EXCHANGE only ever compares single-unit prices since a product credit note is always qty=1.

```
originalValue = creditNote.productAmount                       // original return value (already unitPrice × returnQty)
newValue      = selectedSparePart.base_price × replacementQty   // scales with quantity, unlike Product
discount      = user-entered extra discount                    // defaults to 0

variation = newValue - originalValue - discount

if variation >= 0: "Payable Gap: QAR {variation}"
else:              "Refundable Balance: QAR {|variation|}"
```

What is persisted (`CompletionModal.tsx` `handleSubmit`):

```typescript
const newUnitPrice = selectedSparePart.base_price || 0;
const replacementAmount = isExchange ? newUnitPrice * replacementQty : record?.productAmount;
// replacementDiscount = discount (user input)
```

Same as REPLACEMENT — not recorded as a formal accounting entry; the variance is a screen-only guide, cash settled manually.

#### Accounting Impact

| What                   | How                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `return_credits` table | **None created.**                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `invoices` table       | **Not updated.**                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Chart of Accounts / GL | **None.**                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Cashbook               | **None.**                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Sales reports          | `billingReportService.getBranchSalesTotals()` / `getGlobalSalesTotals()` query **all** `status = PRODUCT_REPLACED AND type = CREDIT_EXCHANGE` credit notes with no `itemCategory` filter — Product and Spare Part exchanges are aggregated together using the same formula: `adjustment = replacementAmount − productAmount − replacementDiscount`. This is the **fixed** formula (`replacementDiscount` now subtracted) — see §10, Discrepancy #3. |

#### Inventory Impact

Same two REST calls as REPLACEMENT: old SKU restocked (no damage bucket), new SKU allocated (with server-side stock guard).

---

## 3. Data Model

### 3.1 `credit_notes` Table — Spare Parts Columns

**Entity file:** `backend/billing_service/src/entities/creditNoteEntity.ts`

The table is fully shared with Product. `itemCategory` is the discriminator; PRODUCT-only and SPARE_PART-only columns are simply left `NULL` for the other category.

| Column                                 | DB Type                                | Nullable | Default   | Notes                                                                                                                                                         |
| -------------------------------------- | -------------------------------------- | -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `item_category`                        | VARCHAR(20)                            | No       | `PRODUCT` | Discriminator: `'PRODUCT' \| 'SPARE_PART'`                                                                                                                    |
| `sparePartId`                          | UUID                                   | Yes      | NULL      | Indexed; FK-like reference to `ven_inv_service.spare_parts`, no DB-level FK across services                                                                   |
| `sku`                                  | VARCHAR                                | Yes      | NULL      |                                                                                                                                                               |
| `quantity`                             | INT                                    | Yes      | NULL      | Number of units returned. Always populated for SPARE_PART, always `NULL` for PRODUCT (Product returns are implicitly qty=1 via serial number, not this field) |
| `productAmount`                        | DECIMAL(12,2)                          | No       | —         | For SPARE_PART: `unitPrice × quantity`, computed client-side                                                                                                  |
| `taxName` / `taxPercent` / `taxAmount` | VARCHAR / DECIMAL(5,2) / DECIMAL(12,2) | Yes      | NULL      | Snapshot copied from originating invoice at creation — category-agnostic, but unused downstream (§10 #2)                                                      |
| `paymentMode`                          | VARCHAR                                | Yes      | NULL      | Set at Finance approval — category-agnostic (§10 #1)                                                                                                          |
| `replacementSparePartId`               | UUID                                   | Yes      | NULL      | Set at `complete()`                                                                                                                                           |
| `replacementSparePartName`             | VARCHAR                                | Yes      | NULL      | Set at `complete()`                                                                                                                                           |
| `replacementSparePartSku`              | VARCHAR                                | Yes      | NULL      | Set at `complete()`                                                                                                                                           |
| `replacementQuantity`                  | INT                                    | Yes      | NULL      | Set at `complete()`; defaults to `record.quantity` if not provided in payload                                                                                 |
| `replacementAmount`                    | DECIMAL(12,2)                          | Yes      | NULL      | Shared column with Product — REPLACEMENT: original amount unchanged; CREDIT_EXCHANGE: `base_price × replacementQuantity`                                      |
| `replacementDiscount`                  | DECIMAL(12,2)                          | No       | `0`       | Shared column with Product                                                                                                                                    |

**No separate "spare part return" table.** Unlike a hypothetical dedicated schema, Spare Parts credit notes reuse every shared column (`type`, `status`, `financeNote`, `damageReason`, `rejectionReason`, timestamps) unmodified.

### 3.2 `return_credits` Table

Unchanged schema from the Product doc. The `returnedItemType` column (`VARCHAR(50)`, nullable) is what distinguishes a Spare Part return credit row from a Product one: `'PRODUCT'` or `'SPARE_PART'`, set from `creditNote.itemCategory` at creation. Reporting queries (`ReturnCreditRepository`) do not filter or branch by this column — they aggregate `amount` uniformly regardless of item type.

### 3.3 `SparePart` Entity (Inventory Service) — Relevant Columns

**Entity file:** `backend/ven_inv_service/src/entities/sparePartEntity.ts`

| Column              | DB Type       | Notes                                                                                                                                                                                                           |
| ------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quantity`          | INT           | Sellable/available stock. Incremented by credit note returns.                                                                                                                                                   |
| `reserved_quantity` | INT           | Not touched by the credit note return flow.                                                                                                                                                                     |
| `consumed_quantity` | INT           | Not touched by the credit note return flow.                                                                                                                                                                     |
| `damaged_quantity`  | INT           | **Exists and is actively used elsewhere** (`serviceController.markSparePartDamaged()` correctly moves stock from `quantity` to `damaged_quantity`), but the credit note return flow never touches it — see §11. |
| `base_price`        | DECIMAL(12,2) | Used as the replacement/exchange unit price in `CompletionModal`                                                                                                                                                |

This confirms, against the real schema (not an assumption): a "damaged" bucket **does exist** for spare parts, with an established usage pattern elsewhere in the codebase — the credit note flow simply doesn't route into it.

### 3.4 `CreditNoteStatus` / `CreditNoteType` / `DamageReason` Enums

Byte-for-byte identical to the Product doc — no new enum values, no Spare-Part-specific states. Confirmed by reading `entities/enums/creditNoteStatus.ts`, `creditNoteType.ts`, `damageReason.ts` directly; these files contain no `itemCategory`-conditional logic (they are plain string enums shared across both categories).

### 3.5 Credit Note Number Generation

Shared, category-agnostic sequence — a Spare Part credit note and a Product credit note draw from the **same** `CN-{year}-{sequence}` counter. See §10 #10 for the fix status (now atomic via a PostgreSQL sequence).

---

## 4. API Reference

**Base path:** `/b/credit-notes` (identical routes to Product — there is no `/b/credit-notes/spare-parts` sub-path). `itemCategory` in the request body is what routes internal controller logic, not the URL.

### 4.1 Route Table

Identical to the Product doc's §4.1 — same routes, same role requirements, same handlers. No new routes were added for Spare Parts.

### 4.2 POST `/b/credit-notes` — Create (Spare Part example)

```json
{
  "invoiceId": "b3f1a2c4-...",
  "invoiceNumber": "INV-2026-00088",
  "customerId": "c1a2...",
  "customerName": "Doha Print Solutions",
  "branchId": "179809e6-...",
  "itemCategory": "SPARE_PART",
  "sparePartId": "sp-uuid-fuser-001",
  "sku": "FSR-KM-2554",
  "quantity": 2,
  "productAmount": 200.0,
  "type": "DIRECT_REFUND",
  "notes": "2 of 5 fuser units DOA on arrival",
  "sellerEmployeeId": "emp-uuid-1"
}
```

**Required fields (backend-enforced):** `invoiceId`, `invoiceNumber`, `customerId`, `customerName`, `type`, and — because `itemCategory = 'SPARE_PART'` — `sparePartId` (throws 400 `sparePartId is required for SPARE_PART returns` if missing). `productId` is **not** required in this branch (and is explicitly stored as `undefined` even if sent).

**Response (201):** same envelope shape as Product, full `CreditNote` object including the tax snapshot fields.

### 4.3 POST `/b/credit-notes/:id/approve` — DIRECT_REFUND (Spare Part)

**Request body:** identical shape to Product — `financeNote`, `damageReason`, `paymentMode`. No spare-part-specific fields at this step (quantity/SKU were already fixed at creation).

```json
{
  "financeNote": "Confirmed 2 units DOA by warehouse inspection",
  "damageReason": "Defective",
  "paymentMode": "BANK_TRANSFER"
}
```

**Response (200):** `status: COMPLETED`, message `"Refund Completed"` — identical to Product.

### 4.4 POST `/b/credit-notes/:id/complete` — REPLACEMENT (Spare Part)

```json
{
  "replacementSparePartId": "sp-uuid-fuser-002",
  "replacementSparePartName": "Fuser Unit (Compatible)",
  "replacementSparePartSku": "FSR-COMP-2554",
  "replacementQuantity": 2,
  "replacementAmount": 200.0,
  "replacementDiscount": 0
}
```

Note: unlike PRODUCT completion (`replacementProductId`, `replacementSerialNumber`), the SPARE_PART branch of `complete()` reads a **completely different field set** from `req.body` — sending PRODUCT-shaped fields to a SPARE_PART credit note (or vice versa) is silently ignored (the wrong branch's fields are just left `undefined`); there is no server-side check that the payload shape matches `creditNote.itemCategory`.

### 4.5 POST `/b/credit-notes/:id/complete` — CREDIT_EXCHANGE (Spare Part, partial quantity)

**Scenario:** original return was 2 units of Part A (QAR 160 total); exchanging for 3 units of Part B at QAR 70 each (QAR 210), no extra discount.

```json
{
  "replacementSparePartId": "sp-uuid-partB",
  "replacementSparePartName": "OEM Drum Unit",
  "replacementSparePartSku": "DRM-OEM-441",
  "replacementQuantity": 3,
  "replacementAmount": 210.0,
  "replacementDiscount": 0
}
```

**Response (200):** `status: PRODUCT_REPLACED`, `message: "Return Process Completed"`.

### 4.6 GET `/b/credit-notes/stats`

Identical response shape to Product — `directRefund` / `replacement` / `creditExchange` counts are **not broken out by `itemCategory`**; a Product DIRECT_REFUND and a Spare Part DIRECT_REFUND both increment the same `directRefund` counter. There is no `itemCategory` grouping anywhere in `getStats()`.

---

## 5. Frontend

### 5.1 Category Selector — `CreditNoteFormModal.tsx`

A two-button toggle (`Product` / `Spare Part`, icons `Box` / `Wrench`) is the **first** field in the form, before customer selection. Selecting a category:

- Sets `itemCategory` state
- Calls `resetItemSelection()` (clears any partially-selected product/spare-part state)
- Is **disabled** once editing an existing record (`disabled={!!record}`) — the category cannot be changed after a credit note exists, only chosen fresh.

### 5.2 Spare Part Selection Flow (vs. Product)

| Step             | Product                                                                        | Spare Part                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Item list source | Invoice items where `itemType='PRODUCT'` or has `productId` (no `sparePartId`) | Invoice items where `itemType='SPAREPART'` or has `sparePartId`                                                                     |
| Filter applied   | `(quantity                                                                     |                                                                                                                                     | 0) > 0`, plus prior-replacement injection | No filter beyond category match — **no quantity/remaining check** (see §9.4 and §11) |
| Selection UI     | Single dropdown, one unit                                                      | Dropdown of SKUs, **plus** a quantity input (`min=1`, `max={selectedSparePart.quantity}` — visual only, not enforced in `onChange`) |
| Amount computed  | `unitPrice` (as entered/looked up)                                             | `unitPrice × returnQuantity`                                                                                                        |

### 5.3 CompletionModal — Spare Part Mode

Driven by `isSpare = record?.itemCategory === 'SPARE_PART'`. Key differences from Product mode:

```
Stock fetch (both REPLACEMENT and CREDIT_EXCHANGE):
  filter: quantity > 0 AND id ≠ record.sparePartId
  // Same filter for both types — comment in code says REPLACEMENT should be
  // same-SKU-only and CREDIT_EXCHANGE different-SKU-only, but the code doesn't
  // implement that distinction (see §11)

Quantity input:
  min=1, max={record.quantity} (soft cap, no onChange clamp)

Out-of-stock:
  No manual entry fallback for Spare Parts — the SKU list is the ONLY way
  to set selectedSparePart, and the list is only rendered when non-empty.
  Product mode always shows a free-text serial field, spare parts do not
  have an equivalent field.
```

### 5.4 FinanceApprovalModal

Category-agnostic — displays `record.productName` / `record.modelName` / `record.productAmount` regardless of category. Does **not** display `quantity` or `sku` for a Spare Part record, so Finance approving a Spare Part return sees the total refund amount but not directly how many units or which SKU without opening the full view modal. Currency now correctly uses `useBranchCurrency()` (§10 #5).

### 5.5 CreditNoteViewModal / ReturnsTable

Both branch on `record.itemCategory === 'SPARE_PART'` to show SKU + quantity instead of serial number, confirmed by direct inspection — no missing display logic found here.

---

## 6. Inventory Impact

**This is the single largest mechanism divergence from the Product flow.** Product credit notes update inventory via a RabbitMQ event (`emitProductStatusUpdate`, exchange `domain_events`, routing key `inventory.product.status.update`). Spare Parts credit notes update inventory via **synchronous REST calls** from billing_service directly to ven_inv_service:

| Call                                       | When                                                                     | Effect                                                                   |
| ------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `POST /inventory/returns/process`          | DIRECT_REFUND approval; REPLACEMENT/CREDIT_EXCHANGE completion (old SKU) | `sparePart.quantity += quantity` — no damage-status distinction          |
| `POST /inventory/spare-parts/:id/allocate` | REPLACEMENT/CREDIT_EXCHANGE completion (new SKU)                         | `sparePart.quantity -= quantity`, rejects with 400 if insufficient stock |

Both calls are wrapped in `callInventoryService()`, which catches and **logs but does not throw** on failure — same non-fatal, best-effort pattern as the Product path's RabbitMQ publish. If the REST call fails (network error, inventory service down), the credit note's status transition still commits; inventory silently does not update. There is no retry, no reconciliation job, and no compensating transaction.

---

## 7. Reporting / Accounting Impact

Same `BillingReportService` as Product — no separate reporting path exists for Spare Parts.

### 7.1 DIRECT_REFUND

`return_credits` rows (any `returnedItemType`) are summed and subtracted from `totalSales`. The target-category fallback list explicitly includes `SPAREPART_SALE`:

```typescript
const targetTypes = ['SALE', 'PRODUCT_SALE', 'SPAREPART_SALE'];
```

### 7.2 CREDIT_EXCHANGE

Queried without an `itemCategory` filter — Product and Spare Part exchanges are combined in one query (`status = PRODUCT_REPLACED AND type = CREDIT_EXCHANGE`), using the corrected formula:

```typescript
adjustment =
  Number(cn.replacementAmount) - Number(cn.productAmount) - Number(cn.replacementDiscount);
```

`replacementDiscount` **is** subtracted (see §10 #3 — this was fixed, and the fix covers Spare Parts automatically since there's no category branching in this query).

### 7.3 REPLACEMENT

None — same as Product, no report impact.

### 7.4 What Is NOT Done

Same gaps as Product: no GL/Chart-of-Accounts journal entries, no AR adjustments, no VAT/Output Tax reversal (despite the tax snapshot now existing on the row — see §10 #2), no formal cashbook entries, no AP entries for exchange cash settlements.

---

## 8. Worked Numeric Examples

### Example 1 — DIRECT_REFUND, Spare Part, Partial Quantity

**Scenario:** Customer bought 5 units of Toner Cartridge X at QAR 100 each (invoice line total QAR 500). Returns 2 units — wrong compatibility, confirmed defective.

| Field           | Value                                     |
| --------------- | ----------------------------------------- |
| `itemCategory`  | `SPARE_PART`                              |
| `sku`           | `TNR-X-100`                               |
| `quantity`      | 2                                         |
| `productAmount` | `100 × 2 = 200.00` (computed client-side) |
| `type`          | `DIRECT_REFUND`                           |
| `damageReason`  | `Defective`                               |

**On Finance approval:**

- `credit_notes.status` → `COMPLETED`
- REST call: `sparePart.quantity += 2` (no damage-bucket routing — restocked as sellable regardless of "Defective" reason)
- `return_credits` row: `amount = 200.00`, `returnedItemType = 'SPARE_PART'`
- `invoices.status` → `REFUNDED`

**Accounting effect on reports:** Sales total reduced by QAR 200.00.

**Remaining balance on the invoice line:** the system has **no record** that 3 of the original 5 units remain un-returned — `InvoiceItem.quantity` is never decremented, and no other table tracks "already returned" cumulative quantity. If a second credit note is later raised against the same line for up to 5 units, nothing blocks it. See §11.

---

### Example 2 — REPLACEMENT, Spare Part

**Scenario:** Customer bought 3 units of Drum Unit Y at QAR 150 each (QAR 450 total on that line). One unit is defective; swap 1 unit for 1 identical unit from stock.

| Field           | Value              |
| --------------- | ------------------ |
| `quantity`      | 1                  |
| `productAmount` | `150 × 1 = 150.00` |
| `type`          | `REPLACEMENT`      |
| `damageReason`  | `Damaged Product`  |

**At Finance approval:** `status → APPROVED`, no inventory event yet.

**At Sales completion** (replacement SKU selected: same Drum Unit Y, `base_price` in inventory: QAR 160):

```
replacementAmount   = 150.00   // original amount carried forward, NOT the new unit's base_price
replacementDiscount = 0
replacementQuantity = 1
```

- `status → PRODUCT_REPLACED`
- Old SKU: `quantity += 1` (restocked as sellable, damage reason "Damaged Product" ignored by the restock call)
- New SKU: `quantity -= 1` (server-validates sufficient stock)

**No cash changes hands. No accounting entries. Sales reports unchanged.**

---

### Example 3 — CREDIT_EXCHANGE, Spare Part, Multi-Unit (Upgrade)

**Scenario:** Customer returns 2 units of Generic Toner (QAR 80 each = QAR 160 `productAmount`), exchanges for 2 units of OEM Toner at QAR 110 each. Finance gives a QAR 10 extra discount.

**CompletionModal variance calculation:**

```
originalValue = 160.00                     // record.productAmount
newValue      = 110 × 2 = 220.00           // base_price × replacementQty
discount      = 10.00

variation = 220 - 160 - 10 = 50.00
→ display: "Payable Gap: QAR 50.00"
```

**Saved to credit_notes:**

```
replacementAmount   = 220.00
replacementDiscount = 10.00
replacementQuantity = 2
status              = PRODUCT_REPLACED
```

**Inventory:**

- Old SKU (Generic Toner): `quantity += 2`
- New SKU (OEM Toner): `quantity -= 2`

**Sales report adjustment (fixed formula, discount subtracted):**

```
adjustment = 220 - 160 - 10 = 50.00
Sales total increased by QAR 50.00
```

**Customer pays QAR 50.00 manually — no system record.**

This example specifically demonstrates that, unlike Product CREDIT_EXCHANGE (always 1 unit vs. 1 unit), the Spare Parts variance formula correctly scales `newValue` by `replacementQty` — a genuine improvement over the Product flow's implicit single-unit assumption.

---

### Example 4 — CREDIT_EXCHANGE, Spare Part (Downgrade / Refundable Balance)

**Scenario:** Customer returns 1 unit of a premium fuser (QAR 300 `productAmount`), exchanges for 1 compatible fuser at QAR 210. No extra discount.

```
originalValue = 300.00
newValue      = 210 × 1 = 210.00
discount      = 0

variation = 210 - 300 - 0 = -90.00
→ display: "Refundable Balance: QAR 90.00"
```

**Customer receives QAR 90.00 refund manually — no system record.**

**Sales report adjustment:** `210 - 300 - 0 = -90.00` — sales total reduced by QAR 90.00.

---

## 9. Edge Cases Handled (and Not Handled)

### 9.1 Invoice with Prior PRODUCT_REPLACED Credit Note

Same mechanism as Product (`selectedInvoice.creditNotes?.find(cn => cn.status === 'PRODUCT_REPLACED')`), but this lookup is only wired into the **Product** invoice-item list (`productInvoiceItems`) in `CreditNoteFormModal.tsx`. The Spare Part invoice-item list (`sparePartInvoiceItems`) does **not** perform an equivalent lookup — a previously-replaced spare part SKU is not injected into the selectable list the way a replaced product is. This is a genuine asymmetry, not a smoothed-over assumption: the code for this specific convenience exists only in the PRODUCT branch.

### 9.2 Out-of-Stock for Replacement/Exchange

**Product:** handled — orange warning banner, manual serial entry always available, completion proceeds unblocked.

**Spare Part:** **not handled the same way.** The warning banner renders (`isSpare ? 'No Replacement Stock Available' : ...`), but there is no manual-entry input for spare parts. `handleSubmit` requires `selectedSparePart` to be non-null, which is only settable via the (now-empty) stock list. The credit note cannot be completed if no SKU has stock — a functional dead end that Product does not have.

### 9.3 User Overrides Auto-Selected Serial

N/A for Spare Parts — there is no serial number involved; selection is purely list-driven with no free-text override path (see 9.2).

### 9.4 Partial-Quantity / Multiple Credit Notes Against the Same Line Item

**Not handled.** Verified across three layers:

- **Frontend cap:** `max={selectedSparePart.quantity}` on the return-quantity `<Input>` is a static HTML attribute computed once from the raw invoice line quantity; `onChange` does `Math.max(1, Number(e.target.value))` with no upper bound, so it does not actually block over-entry.
- **Frontend cross-check:** no query sums prior credit notes' `quantity` against the same `sparePartId`/invoice before rendering the cap or before submit.
- **Backend `create()`:** accepts `quantity` from the request body with no validation against `InvoiceItem.quantity` or against the sum of prior credit notes on the same line.

A customer's 5-unit purchase can have 5 units "returned" via one credit note, then another 5 "returned" via a second credit note against the same line, with no rejection at any layer.

### 9.5 FINANCE Role Cannot See DRAFTs / Status Guards on Mutations

Both unchanged and category-agnostic — identical to the Product doc's §9.4/§9.5.

---

## 10. Comparison to the Product Sale Credit Note Discrepancies

Each of the 10 items from the Product doc, re-verified against current source — not assumed inherited.

| #      | Product Discrepancy                                                          | Spare Parts Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Evidence                                                                                             |
| ------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **1**  | `paymentMode` collected but never stored                                     | **Fixed, and shared.** `CreditNote.paymentMode` column now exists; `approve()` reads `req.body.paymentMode` and saves it (`// B.1: paymentMode now persisted`). Category-agnostic — the same code path handles both.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `creditNoteEntity.ts` line 126-127; `creditNoteController.ts` line 264, 278                          |
| **2**  | No VAT/tax reversal on refunds                                               | **Partially fixed, shared, but incomplete.** `taxName`/`taxPercent`/`taxAmount` are now snapshotted from the invoice at creation for both categories (`// B.2`). However, these fields are **never read anywhere downstream** — no VAT reversal entry, no Output Tax report exclusion. The data now exists but has no consumer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `creditNoteController.ts` lines 98-111; confirmed via repo-wide grep, zero downstream references     |
| **3**  | `billingReportService` CREDIT_EXCHANGE formula ignores `replacementDiscount` | **Fixed, and shared.** Formula is now `replacementAmount − productAmount − replacementDiscount`. The query has no `itemCategory` filter, so Product and Spare Part exchanges are aggregated together with the same corrected formula — the fix was not accidentally scoped to Product only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `billingReportService.ts` lines 119-123, 226-229                                                     |
| **4**  | New product's `billType` hardcoded to `'SALE'` in `complete()`               | **N/A for Spare Parts** (different mechanism). Spare Parts never call `emitProductStatusUpdate` at all — they use REST calls with no `billType` concept. For PRODUCT credit notes, the code comment now reads `// Mark NEW product as SALE — 'SALE' is correct here; the replacement is a sale allocation`, i.e. it was reconsidered as _not_ a bug rather than patched to fetch from the invoice.                                                                                                                                                                                                                                                                                                                                                                                                  | `creditNoteController.ts` lines 415-423                                                              |
| **5**  | Currency symbol `₹` in FinanceApprovalModal                                  | **Fixed, and shared.** Now uses `formatCurrency(record?.productAmount, currency)` with `useBranchCurrency()` — applies identically regardless of `itemCategory` since the modal doesn't branch on it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `FinanceApprovalModal.tsx` lines 34, 58                                                              |
| **6**  | Dead `else` branch in `complete()` for DIRECT_REFUND                         | **Fixed, and shared.** `complete()` now sets `creditNote.status = CreditNoteStatus.PRODUCT_REPLACED` unconditionally (no if/else), because the function already throws earlier if `type` isn't REPLACEMENT/CREDIT_EXCHANGE. Applies to both categories since it's before the `itemCategory` branch.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `creditNoteController.ts` lines 378-385                                                              |
| **7**  | `branchId` empty string in RabbitMQ events                                   | **Fixed for Product; N/A for Spare Parts.** `emitProductStatusUpdate` now accepts and forwards `branchId` (defaults to `''` only if omitted), and the controller now passes `creditNote.branchId` on every call (`// B.7`). This only matters for the PRODUCT branch — Spare Parts never emits this event, so the fix (and the original bug) simply don't apply to the Spare Parts path.                                                                                                                                                                                                                                                                                                                                                                                                            | `productStatusEvent.ts` line 27; `creditNoteController.ts` lines 287-295, 405-413                    |
| **8**  | `billingService.processReturn()` parallel, unused implementation             | **Not fixed — still present, and now demonstrably reachable (not dead).** The method still exists, now uses `returnCreditRepo.createReturnCredit()` (consistent with the repository pattern), but hardcodes `quantity: 1` — it has no spare-part quantity support at all. It is called from `invoiceController.processReturn()`, wired to a real route, and invoked from `frontend/components/invoice/ReturnsManagement.tsx`. That component is not imported or rendered by any page in the app (verified — the only match for `ReturnsManagement` repo-wide is its own file), so it is currently unreachable in the UI, but it is a live, working, parallel code path, not inert dead code. If it were ever wired into a page, it would silently mishandle any spare-part quantity greater than 1. | `billingService.ts` lines 3014-3071; `invoiceController.ts` lines 1048-1074; `ReturnsManagement.tsx` |
| **9**  | Single product per credit note only (no bulk return)                         | **Same limitation, but a real quantity dimension was added.** A single Spare Parts credit note can now cover _N units of one SKU_ (not just 1), which is a genuine improvement over Product's fixed qty=1 — but it is still **one SKU per credit note**. Returning 3 different spare part SKUs from one invoice still requires 3 separate credit notes, identical to Product's one-item limitation.                                                                                                                                                                                                                                                                                                                                                                                                 | `creditNoteController.ts` `create()` — one `sparePartId` per row, no line-items array                |
| **10** | Non-atomic `COUNT + 1` credit note numbering                                 | **Fixed, and shared.** Numbering now uses a PostgreSQL sequence (`CREATE SEQUENCE IF NOT EXISTS cn_seq_{year} ... ; SELECT nextval(...)`), seeded from the existing count so historical numbers aren't disturbed. This is one shared counter for both categories — a Product and a Spare Part credit note created back-to-back draw sequential numbers from the same sequence.                                                                                                                                                                                                                                                                                                                                                                                                                      | `creditNoteController.ts` lines 41-55, `// B.10`                                                     |

**Summary:** 6 of 10 fixes are confirmed applied and correctly shared across both categories (#1, #3, #5, #6, #10, and #7 to the extent it's applicable). #2 is a partial fix (data captured, not consumed). #4 was resolved by design reconsideration rather than a code fix, and doesn't apply to Spare Parts' REST-based mechanism at all. #8 is not fixed — the parallel path persists and has gained a spare-parts-specific blind spot (hardcoded qty=1) on top of the original architectural duplication. #9's underlying limitation (one item per credit note) is unchanged, though quantity-within-that-one-item is now supported for Spare Parts.

---

## 11. Known Limitations and Discrepancies Found in the Spare Parts Implementation

These are specific to the Spare Parts path — found during this documentation pass, not carried over from the Product doc.

---

### Discrepancy #S1 — Returned spare parts are never routed to the `damaged_quantity` bucket

**Severity: High**

The `SparePart` entity has a dedicated `damaged_quantity` column with an established, actively-used pattern elsewhere in the codebase (`serviceController.markSparePartDamaged()`: `part.quantity -= qty; part.damaged_quantity += qty;`). The credit note return flow computes `inventoryStatus` (`'DAMAGED'` vs `'RETURNED'`) from `damageReason` — the exact same computation used for the PRODUCT branch — but for SPARE_PART, this value is discarded; `InventoryReturnService.processReturn()` unconditionally does `sparePart.quantity += quantity` regardless of why the part was returned.

**Impact:** a spare part returned with `damageReason = "Damaged Product"` is put back into sellable stock exactly like a part returned for "Wrong Item Delivered." A technician or the next customer could receive genuinely defective stock. This is a confirmed gap against the real schema, not a hypothetical — the fix pattern already exists in the codebase for a different flow and simply wasn't reused here.

---

### Discrepancy #S2 — No cumulative quantity validation across credit notes on the same line item

**Severity: High**

Confirmed at all three layers (frontend cap, frontend cross-check, backend `create()`) — see §9.4. The visual `max` on the quantity input is not enforced by its own `onChange` handler, there is no query that sums quantities already returned via prior credit notes against the same invoice/`sparePartId`, and `create()` performs no server-side check against `InvoiceItem.quantity`. A line item can be over-returned an arbitrary number of times.

---

### Discrepancy #S3 — REPLACEMENT and CREDIT_EXCHANGE use an identical, non-differentiating stock filter

**Severity: Medium**

Documented in §2.2 and §5.3. The code comment states the intended behavior (REPLACEMENT = same SKU, CREDIT_EXCHANGE = different SKU) but both branches execute `p.id !== record.sparePartId`. In practice, a "REPLACEMENT" can select a completely different spare part with no `replacementDiscount` prompt (since the discount/variance UI is gated by `isExchange`, not by whether the SKU actually differs), meaning a like-for-like swap and a value-different swap are only distinguished by which `type` button was clicked at creation, not enforced by the completion-time stock logic.

---

### Discrepancy #S4 — No manual/out-of-stock entry path for Spare Part replacement or exchange

**Severity: Medium**

Documented in §9.2. Unlike Product (always has a free-text serial fallback), a Spare Parts REPLACEMENT or CREDIT_EXCHANGE cannot be completed at all if the filtered stock list is empty. This blocks legitimate scenarios like sourcing a replacement part externally before it's received into inventory — something Product explicitly supports.

---

### Discrepancy #S5 — `billingService.processReturn()` hardcodes `quantity: 1`, silently wrong for spare parts if ever reached

**Severity: Low (currently unreachable, but latent)**

Extends Product Discrepancy #8 (§10 #8). The parallel `processReturn()` path builds its inventory REST payload with `quantity: 1` unconditionally (`// Currently assumed 1 for sales returns per item`), with no `quantity` parameter accepted from its caller at all. If `ReturnsManagement.tsx` were ever linked into a page, any spare-part return processed through it would always restock exactly 1 unit regardless of how many were actually returned.

---

### Discrepancy #S6 — FinanceApprovalModal doesn't surface quantity or SKU for Spare Part records

**Severity: Low (UX)**

Noted in §5.4. Finance sees `productName` and the total `productAmount` but not `quantity` or `sku` in the approval modal itself — they'd need to cross-reference the view modal or trust the total amount alone when approving a multi-unit spare part return.

---

### Discrepancy #S7 — `getStats()` does not break results out by `itemCategory`

**Severity: Low**

The stats endpoint (`GET /b/credit-notes/stats`) groups only by `type`, not by `itemCategory`. `directRefund`, `replacement`, and `creditExchange` counts blend Product and Spare Part records together. There is no way to answer "how many spare part returns this month" from this endpoint alone — a full `list()` fetch with client-side filtering would be needed.

---

### Discrepancy #S8 — `complete()` does not validate that the request body shape matches `creditNote.itemCategory`

**Severity: Low**

Confirmed in §4.4. The backend branches on `creditNote.itemCategory` to decide which fields to read from `req.body`, but never checks that the caller actually sent the matching field set. Sending PRODUCT-shaped completion data against a SPARE_PART credit note (or vice versa) doesn't error — it just silently populates the wrong branch's fields as `undefined`, producing a credit note with a `PRODUCT_REPLACED` status but no replacement details recorded at all.

---

_Document generated from source code inspection on 2026-07-17. Authoritative source files: `backend/billing_service/src/controllers/creditNoteController.ts`, `backend/billing_service/src/entities/creditNoteEntity.ts`, `backend/billing_service/src/entities/returnCreditEntity.ts`, `backend/billing_service/src/repositories/returnCreditRepository.ts`, `backend/billing_service/src/routes/creditNoteRoutes.ts`, `backend/billing_service/src/services/billingReportService.ts`, `backend/billing_service/src/services/billingService.ts` (`processReturn`), `backend/billing_service/src/events/publisher/productStatusEvent.ts`, `backend/billing_service/src/controllers/invoiceController.ts` (`processReturn`), `backend/ven_inv_service/src/controllers/inventoryReturnController.ts`, `backend/ven_inv_service/src/services/inventoryReturnService.ts`, `backend/ven_inv_service/src/entities/sparePartEntity.ts`, `backend/ven_inv_service/src/controllers/serviceController.ts` (`markSparePartDamaged`), `frontend/components/returns/CreditNoteFormModal.tsx`, `frontend/components/returns/CompletionModal.tsx`, `frontend/components/returns/FinanceApprovalModal.tsx`, `frontend/components/returns/CreditNoteViewModal.tsx`, `frontend/components/returns/ReturnsTable.tsx`, `frontend/components/invoice/ReturnsManagement.tsx`, `frontend/lib/invoice.ts`._
