# Machine Replacement — RENT & LEASE (Flow A)

> **Scope:** Finance/Admin direct replacement on active RENT and LEASE contracts.  
> **Updated:** 2026-08-11

---

## Table of Contents

1. [Overview](#overview)
2. [Who Can Use It](#who-can-use-it)
3. [How to Trigger](#how-to-trigger)
4. [Form Fields](#form-fields)
5. [Validation](#validation)
6. [What Happens (Backend)](#what-happens-backend)
7. [Data Changes](#data-changes)
8. [Next Billing Cycle](#next-billing-cycle)
9. [API Reference](#api-reference)
10. [Known Gaps](#known-gaps)

---

## Overview

Machine replacement lets Finance (or Admin) swap out a malfunctioning or defective device allocated to an active RENT or LEASE contract **without closing the contract, generating an invoice, or interrupting the billing cycle.**

The old machine's allocation is closed (status `REPLACED`), its final meter reading is recorded, and a new allocation is opened for the replacement machine — all in a single atomic database transaction. The contract continues as-is; only the physical device changes.

**When to use:** device malfunction, hardware fault, or a scheduled upgrade where the customer stays on the same contract and same model machine.

> **Note:** There is a separate Technician → Manager approval flow (`machine-swaps/page.tsx`) for technician-initiated swaps. That is out of scope for this document. This document covers Finance/Admin direct replacement only.

---

## Who Can Use It

| Role        | Can Replace? | Notes                                                 |
| ----------- | ------------ | ----------------------------------------------------- |
| **Finance** | ✅ Yes       | Backend role guard + frontend `mode="FINANCE"`        |
| **Admin**   | ✅ Yes       | Backend role guard                                    |
| Employee    | ❌ No        | Replace button hidden; uses Technician flow instead   |
| Technician  | ❌ No        | Uses separate swap-request flow                       |
| Manager     | ❌ No        | Can only approve/reject Technician-initiated requests |

**Backend guard:** `requireRole(EmployeeRole.ADMIN, EmployeeRole.FINANCE)` on the route.  
**Frontend guard:** Replace button rendered only when `mode === 'FINANCE' && alloc.status === 'ALLOCATED'` inside `InvoiceDetailsDialog`.

---

## How to Trigger

**Path:** Finance → Rent (or Lease) → open an active contract → allocations table → Replace

### Step-by-step

1. **Open the contract** — Go to **Finance → Rent** or **Finance → Lease**. Find an active contract (status `ACTIVE_CONTRACT`) and click to open its detail view (`InvoiceDetailsDialog`).

2. **Locate the allocated device** — Scroll to the **Product Allocations** table inside the dialog. Each row is a machine currently allocated to the contract. Only devices with status `ALLOCATED` show the Replace button.

3. **Click "Replace"** — The blue **Replace** button appears in the rightmost column (Finance mode only). Clicking it opens `ReplaceDeviceModal` pre-loaded with the current serial number and model.

4. **Fill the form and confirm** — Complete the required fields and click **Replace Device**. On success the dialog refreshes — the old serial moves to `REPLACED` and the new serial appears as `ALLOCATED`.

> The Replace button is also accessible from **Finance → Collections** (Monthly Collection table), which renders the same `InvoiceDetailsDialog` with `mode="FINANCE"`.

---

## Form Fields

| Field               | UI Label          | Type             | Required     | Description                                                                                                                    |
| ------------------- | ----------------- | ---------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `newSerialNumber`   | New Serial Number | SearchableSelect | **Required** | Dropdown from `getAvailableProductsByModel(modelId)` — same model as old machine.                                              |
| `replacementDate`   | Replacement Time  | `datetime-local` | **Required** | Date and time of the physical swap. Defaults to now. Used as `endTimestamp` on old allocation and `startTimestamp` on new one. |
| `currentBwA4`       | B&W A4            | number           | Optional     | Final B&W A4 meter reading of the **old machine** at swap time. Must be ≥ last billed reading.                                 |
| `currentBwA3`       | B&W A3            | number           | Optional     | Final B&W A3 meter reading of the old machine.                                                                                 |
| `currentColorA4`    | Color A4          | number           | Optional     | Final Color A4 meter reading of the old machine.                                                                               |
| `currentColorA3`    | Color A3          | number           | Optional     | Final Color A3 meter reading of the old machine.                                                                               |
| `newInitialBwA4`    | B&W A4 (New)      | number           | Optional     | Starting B&W A4 meter of the **new machine** at swap time.                                                                     |
| `newInitialBwA3`    | B&W A3 (New)      | number           | Optional     | Starting B&W A3 meter of the new machine.                                                                                      |
| `newInitialColorA4` | Color A4 (New)    | number           | Optional     | Starting Color A4 meter of the new machine.                                                                                    |
| `newInitialColorA3` | Color A3 (New)    | number           | Optional     | Starting Color A3 meter of the new machine.                                                                                    |
| `replacementReason` | Reason            | Textarea         | Optional     | Free-text reason. Defaults to `"Device malfunction / Needs replacement"`. Stored on old allocation's `replacementReason`.      |

---

## Validation

### Frontend (soft — runs before submit)

- **New serial required:** Blocks submission if `newSerialNumber` is empty.
- **Old meter ≥ last billed:** On modal open, fetches the most recent `UsageRecord` via `getUsageHistory(contractId)`. If the entered final reading is `> 0 AND < lastBilled`, an inline toast blocks submission.

> **Known gap:** A value of `0` bypasses the frontend warning. The backend will still reject it with a 400, but the user sees a generic error instead of an inline message. See [Known Gaps](#known-gaps).

### Backend (strict — authoritative)

Fetches the latest `UsageRecord` for the contract. Throws **400** if any submitted `oldMeter` value is defined and numerically less than the last billed count — including the zero-entry case the frontend misses.

```
if (oldMeter.bwA4 !== undefined && oldMeter.bwA4 < lastBilled.bwA4Count) → 400
```

Same check applied for `bwA3`, `colorA4`, `colorA3`.

---

## What Happens (Backend)

`billingService.replaceDeviceAllocation()` — all writes inside a single `QueryRunner` transaction.

```
┌─────────────────────────── TRANSACTION ───────────────────────────┐
│                                                                   │
│  1. Find old ProductAllocation (must be status ALLOCATED)         │
│     → 404 if not found                                            │
│                                                                   │
│  2. Validate old meter readings against latest UsageRecord        │
│     → 400 if any counter is below last billed                     │
│                                                                   │
│  3. Close old allocation                                          │
│     status → REPLACED                                             │
│     endTimestamp → swapTime                                       │
│     currentBwA4/A3, currentColorA4/A3 → final readings           │
│     replacementReason → reason text                               │
│                                                                   │
│  4. Insert DeviceMeterReading for old machine                     │
│     serialNumber = old serial, timestamp = swapTime               │
│     source = MANUAL, all four counter values                      │
│                                                                   │
│  5. Create new ProductAllocation                                  │
│     contractId = same, modelId = same                             │
│     productId = new product, serialNumber = new serial            │
│     status = ALLOCATED, startTimestamp = swapTime                 │
│     initialBwA4/A3, initialColorA4/A3 → new initial readings     │
│     replacementOfAllocationId → old allocation id                 │
│                                                                   │
│  6. Insert DeviceMeterReading for new machine                     │
│     serialNumber = new serial, timestamp = swapTime               │
│     source = MANUAL, initial counter values                       │
│                                                                   │
│  7. Update InvoiceItem                                            │
│     productId → new product id                                    │
│     description: replace old serial string with new serial        │
│                                                                   │
│  ✓ COMMIT                                                         │
└───────────────────────────────────────────────────────────────────┘

After commit (non-blocking, best-effort):
  - emitProductStatusUpdate(old product) → RETURNED
  - emitProductStatusUpdate(new product) → RENT or LEASE
```

On any failure at any step, the entire transaction rolls back. No partial state is possible.

---

## Data Changes

### ProductAllocation (old) — updated

| Field               | New Value     |
| ------------------- | ------------- |
| `status`            | `REPLACED`    |
| `endTimestamp`      | swap datetime |
| `currentBwA4`       | final reading |
| `currentBwA3`       | final reading |
| `currentColorA4`    | final reading |
| `currentColorA3`    | final reading |
| `replacementReason` | reason text   |

### ProductAllocation (new) — created

| Field                       | Value                     |
| --------------------------- | ------------------------- |
| `contractId`                | same contract             |
| `modelId`                   | same model                |
| `productId`                 | new product               |
| `serialNumber`              | new serial                |
| `status`                    | `ALLOCATED`               |
| `startTimestamp`            | swap datetime             |
| `initialBwA4/A3`            | new machine initial meter |
| `initialColorA4/A3`         | new machine initial meter |
| `currentBwA4/A3`            | same as initial           |
| `replacementOfAllocationId` | old allocation id         |

### DeviceMeterReading — 2 records created

**Old machine (final reading)**

| Field                | Value              |
| -------------------- | ------------------ |
| `serialNumber`       | old serial         |
| `timestamp`          | swap datetime      |
| `bwA4/A3/colorA4/A3` | final meter values |
| `source`             | `MANUAL`           |
| `invoiceId`          | contractId         |

**New machine (initial reading)**

| Field                | Value                |
| -------------------- | -------------------- |
| `serialNumber`       | new serial           |
| `timestamp`          | swap datetime        |
| `bwA4/A3/colorA4/A3` | initial meter values |
| `source`             | `MANUAL`             |
| `invoiceId`          | contractId           |

### InvoiceItem — updated

The contract's `InvoiceItem` entry matching the old `productId` is updated: `productId` → new product id. If the `description` field contains the old serial number string, it is replaced with the new serial. `modelId` is preserved.

---

## Next Billing Cycle

The replacement generates **no invoice** and records **no charge** at the moment of the swap.

At the next billing entry (`updateInvoiceUsage`), Finance enters the **combined total usage** for the period:

```
Combined total = (old machine copies from period start → swap time)
              + (new machine copies from swap time → period end)
```

**The system does not auto-compute this.** Finance must calculate and enter the combined total manually. Both `DeviceMeterReading` records (old machine's final + new machine's initial) are stored and visible in usage history to support this calculation.

> ⚠️ This is a known gap. See [Known Gaps](#known-gaps).

---

## API Reference

### `POST /b/invoices/allocations/replace`

**Auth:** `Authorization: Bearer <JWT>`  
**Roles:** `ADMIN`, `FINANCE`  
**Service:** `billing_service`

#### Request body

```json
{
  "contractId": "uuid",
  "allocationId": "uuid",
  "newProductId": "uuid",
  "newSerialNumber": "SN-NEW-001",
  "replacementTimestamp": "2026-08-11T10:30",
  "reason": "Device malfunction",
  "oldMeter": {
    "bwA4": 12500,
    "bwA3": 200,
    "colorA4": 3400,
    "colorA3": 0
  },
  "newInitialMeter": {
    "bwA4": 0,
    "bwA3": 0,
    "colorA4": 0,
    "colorA3": 0
  }
}
```

| Field                                | Type                  | Required | Notes                                    |
| ------------------------------------ | --------------------- | -------- | ---------------------------------------- |
| `contractId`                         | string (uuid)         | Yes      | The PROFORMA contract id                 |
| `allocationId`                       | string (uuid)         | Yes      | The `ALLOCATED` allocation to replace    |
| `newProductId`                       | string (uuid)         | No       | Product id of new machine                |
| `newSerialNumber`                    | string                | Yes      | Serial number of new machine             |
| `replacementTimestamp`               | string (ISO datetime) | Yes      | When the swap happened                   |
| `reason`                             | string                | No       | Replacement reason                       |
| `oldMeter.bwA4/A3/colorA4/A3`        | number                | No       | Final counter readings of old machine    |
| `newInitialMeter.bwA4/A3/colorA4/A3` | number                | No       | Starting counter readings of new machine |

#### Success response — 200

```json
{
  "success": true,
  "data": {
    /* new ProductAllocation object */
  }
}
```

#### Error responses

| Code  | Message                                                         |
| ----- | --------------------------------------------------------------- |
| `404` | Active product allocation not found                             |
| `400` | Old B&W A4 meter (N) cannot be lower than previously billed (M) |
| `400` | Old B&W A3 / Color A4 / Color A3 (same pattern per counter)     |
| `403` | Insufficient role                                               |
| `401` | Missing or invalid token                                        |

#### Frontend helper

```ts
// frontend/lib/invoice.ts:483
export const replaceDeviceAllocation = async (payload: {
  contractId: string;
  allocationId: string;
  newProductId?: string;
  newSerialNumber: string;
  replacementTimestamp: string;
  reason: string;
  oldMeter: { bwA4?: number; bwA3?: number; colorA4?: number; colorA3?: number };
  newInitialMeter: { bwA4?: number; bwA3?: number; colorA4?: number; colorA3?: number };
}): Promise<void> => {
  const response = await api.post(`/b/invoices/allocations/replace`, payload);
  return response.data.data;
};
```

---

## Known Gaps

### Minor — Product status filter includes LEASE + DAMAGED

**File:** `frontend/lib/product.ts:130`

The dropdown for new machine selection allows products with status `LEASE` (already allocated to another contract) and `DAMAGED`. Only `AVAILABLE` and `RETURNED` are genuinely free units.

**Fix:** Remove `LEASE` and `DAMAGED` from the `allowed` array:

```ts
// current
const allowed = [
  ProductStatus.AVAILABLE,
  ProductStatus.LEASE,
  ProductStatus.RETURNED,
  ProductStatus.DAMAGED,
];

// fix
const allowed = [ProductStatus.AVAILABLE, ProductStatus.RETURNED];
```

---

### Minor — Frontend counter validation bypassed when value is 0

**File:** `frontend/components/Finance/ReplaceDeviceModal.tsx:145`

The soft check only fires when `oldBwA4 > 0`, so entering `0` skips the inline warning. The backend correctly catches this and returns a 400, but the user sees a generic failure message instead of an early inline warning.

**Fix:** Drop the `> 0` guard:

```ts
// current
if (oldBwA4 > 0 && oldBwA4 < prevUsage.bwA4Count) { ... }

// fix
if (oldBwA4 < prevUsage.bwA4Count) { ... }
```

---

### Major — No auto-combined billing when swap occurs mid-period

**File:** `backend/billing_service/src/services/billingService.ts:72` (`updateInvoiceUsage`)

`updateInvoiceUsage` accepts a flat counter total with no swap-period awareness. If a machine was replaced mid-billing-cycle, Finance must manually add the old machine's partial usage and the new machine's partial usage before entering the combined total.

The `replacementOfAllocationId` field (linking allocations) and both `DeviceMeterReading` records exist in the database but no billing code reads them to auto-compute a combined total.

**Fix needed:** When Finance opens the billing form for a period in which a swap occurred, detect REPLACED allocations within that period and pre-populate a combined hint in the usage entry UI (or auto-compute and pre-fill the counters).
