# XeroCare ERP Codebase Audit Findings

Here is the structured breakdown of the end-to-end testing and issue audit across the backend, frontend, event system, and database consistency mechanisms.

---

## 1. Critical Business Rule Violations (Backend Architecture)

These violations relate directly to core application invariants and must be mitigated immediately.

### 🔴 Violation 1: Lot Processing Auto-Creates Spare Parts

- **Rule:** `Lot must NOT create spare parts automatically if it doesn't exist. SparePart is master data.`
- **Location:** `backend/ven_inv_service/src/repositories/lotRepository.ts` (lines 139-159)
- **Issue:** When handling `LotItemType.SPARE_PART`, if `findExistingSparePart` returns `null`, the code forcibly instantiates `sparePart = new SparePart()` and overrides it with a newly generated `SP-{TIMESTAMP}` code.
- **Impact:** Any typo in the uploaded Excel file or manual creation bypasses master data governance, flooding the database with duplicate unlinked spare parts.

### 🔴 Violation 2: Duplicate Spare Part Creation Bypasses

- **Rule:** `If a spare part exists (same name, brand, vendor, warehouse, model), DO NOT create a new master. Increment quantity.`
- **Location:** `backend/ven_inv_service/src/repositories/sparePartRepository.ts` (line 111)
- **Issue:** `findExistingSparePart` fails to include the `brand` constraint (`qb.andWhere('LOWER(sp.brand) = ...')` is completely missing). Furthermore, if `vendorId` or `warehouseId` is null (which is entirely possible if `lot_id` isn't processed correctly), the backend bypasses the duplication check entirely and creates a new master item.
- **Impact:** Same parts from the same warehouse under the same vendor are split into multiple rows.

### 🔴 Violation 3: RabbitMQ Event Emission Outside Finance Approval

- **Rule:** `Event must emit ONLY on finance approval.`
- **Location:** `backend/billing_service/src/services/billingService.ts`
- **Issue:** While `financeApprove` properly triggers `emitProductStatusUpdates`, this function is _also_ invoked inappropriately by `generateConsolidatedFinalInvoice()` (line 228) independently of the strict Finance Approval gateway.
- **Impact:** Inventory status transitions mistakenly occur if a final invoice is generated, decoupling the state machine from the authoritative financial approval.

---

## 2. Event System & Message Queue Issues

- **Employee Branch Sync (`backend/employee_service...branchConsumer.ts`)**: The consumer processes `branch.updated` payload. Because the upstream event from `ven_inv_service` might only send `updatedFields`, relying rigidly on `event.name` to overwrite `repo.save({ name: event.name })` will set active fields to `NULL` (data erasure risk).
- **Inventory Inter-Service Dependency (`billing_service`)**: Found `fetch(${inventoryServiceUrl})` internally inside `billingService.ts`. While this doesn't strictly violate the "direct DB connection" rule, synchronous external HTTP calls inside core domain logic (billing) increase cascading failure risks compared to relying fully on the RabbitMQ Event bus.

---

## 3. UI and Display Discrepancies (Frontend)

The frontend Next.js manager dashboard was audited for visual bugs mapping back to data integrity.

- **Bug 1: Vendor Column Missing (`app/manager/(dashboard)/spare-parts/page.tsx`)**: Missing Vendor rendering. Root cause stems from `backend/ven_inv_service/src/repositories/inventoryRepository.ts` inside `getBranchInventory()` which completely omits joining and mapping the `vendor_id`/`vendor_name`.
- **Bug 2: Warehouse Column Missing (`InventoryTable.tsx`)**: The UI relies on `item.warehouse_name`, but the backend API `getWarehouseInventory()` omits `warehouse.warehouseName` from its TypeORM `select()` projection, causing the UI to render blanks or "N/A" depending on context.
- **Bug 3: Duplicate Spare Part Rows**: Visual consequence of **Violation 2**, resulting in the frontend `SparePartTable` aggregating identically named items separately instead of accurately deriving sum totals.

---

## 4. Test Report Generation

A `.xlsx` file summarizing exactly what API endpoints, Integration tests, UI behaviours, RabbitMQ event payloads, and DB consistencies must be built has been generated and saved locally to the machine.

**File Output:** `XeroCare_Audit_Report.xlsx`

See the provided Excel file for the categorized line-by-line test cases mapping to these structured findings.
