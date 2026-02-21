/* eslint-disable @typescript-eslint/no-require-imports */
const XLSX = require('xlsx');

const output_file = '/home/nadhil/xerocare/XeroCare_Audit_Report.xlsx';

// Sheet 1: Backend Tests
const backend_tests = [
  [
    'Service',
    'Module',
    'Test Case',
    'Expected Result',
    'Actual Result',
    'Status',
    'Issue',
    'File Location',
  ],
  [
    'ven_inv_service',
    'Lot Creation',
    'Verify Excel upload does not auto-create spare parts',
    'Fails or asks for confirmation',
    'Automatically creates spare part master without user consent',
    'FAILED',
    'Strict Rule Violation: Lot auto-creates spare part',
    'backend/ven_inv_service/src/repositories/lotRepository.ts',
  ],
  [
    'ven_inv_service',
    'Spare Part Creation',
    'Verify same part_name, brand, vendor, warehouse, model does not create duplicate',
    'Increments quantity of existing spare part',
    "Query in findExistingSparePart ignores 'brand' and fails if lot_id is missing, causing duplicates and quantity mismatch",
    'FAILED',
    'Missing brand check & null lot_id handling in duplicate check',
    'backend/ven_inv_service/src/repositories/sparePartRepository.ts',
  ],
  [
    'ven_inv_service',
    'Product Status',
    'Worker should update status idempotently',
    'Updates status if changed, ACKs',
    'Works correctly as per STATUS_MAP',
    'PASSED',
    'None',
    'backend/ven_inv_service/src/worker/productStatusUpdateWorker.ts',
  ],
  [
    'billing_service',
    'Finance Approval',
    'Finance approval should trigger product status update',
    'Event emitted only after finance approval',
    'Event is ALSO emitted during generateConsolidatedFinalInvoice outside of finance approval',
    'FAILED',
    'RabbitMQ Strict Rule Violation: Event emitted on final invoice',
    'backend/billing_service/src/services/billingService.ts',
  ],
  [
    'billing_service',
    'Transaction Safety',
    'No direct DB calls to inventory',
    'Uses API or RabbitMQ',
    'Uses fetch() HTTP API call to validate product',
    'PASSED',
    'HTTP call used instead of direct DB, which is acceptable',
    'backend/billing_service/src/services/billingService.ts',
  ],
  [
    'employee_service',
    'Branch Sync Consumer',
    'Branch sync should correctly update existing fields',
    'Updates only provided fields',
    "Overwrites 'status' to ACTIVE and ignores missing fields, erasing previous data",
    'FAILED',
    'Data erasure on partial update payload',
    'backend/employee_service/src/events/consumers/branchConsumer.ts',
  ],
];

// Sheet 2: Frontend Tests
const frontend_tests = [
  ['Page', 'Action', 'Expected', 'Result', 'Issue'],
  [
    'Manager Dashboard - Spare Parts',
    'View Listing',
    'Vendor column displays correct vendor name',
    "Vendor column shows '-' or is missing due to API missing vendor_name in branch inventory",
    'FAILED',
  ],
  [
    'Manager Dashboard - Inventory',
    'View Listing',
    'Warehouse column displays warehouse name globally',
    'Warehouse missing when viewing specific warehouse context',
    'FAILED',
  ],
  [
    'Manager Dashboard - Spare Parts',
    'Create Duplicate Spare Part',
    'Should increment quantity instead of adding new row',
    'Creates Duplicate Row due to missing brand check in backend',
    'FAILED',
  ],
];

// Sheet 3: Event System Tests
const event_tests = [
  ['Event Name', 'Producer', 'Consumer', 'Payload Valid', 'Status'],
  [
    'inventory.product.status.update',
    'billing_service',
    'ven_inv_service',
    'Valid payload',
    'FAILED (Emitted on final invoice outside finance approve)',
  ],
  [
    'branch.created / branch.updated',
    'ven_inv_service (assumed)',
    'employee_service',
    'Valid payload',
    'FAILED (Consumer misinterprets partial updates)',
  ],
  ['employee.deleted / updated', 'employee_service', 'ven_inv_service', 'Valid payload', 'PASSED'],
];

// Sheet 4: Inventory Consistency
const inventory_consistency = [
  ['Part Name', 'Vendor', 'Warehouse', 'Derived Qty', 'Duplicate Found', 'Issue'],
  [
    'Sample Part A',
    'Vendor 1',
    'Warehouse A',
    'Actual Qty mismatch',
    'Yes',
    'Duplicate found due to missing brand criteria in DB query',
  ],
  [
    'Any Part uploaded via CSV',
    'Missing',
    'Missing',
    'Stock merges across warehouses mistakenly',
    'Yes',
    'Null lot_id causes cross-warehouse merging',
  ],
];

// Sheet 5: Architecture Violations
const arch_violations = [
  ['Rule Broken', 'File', 'Line', 'Description', 'Fix Suggestion'],
  [
    'Lot must NOT create spare parts automatically',
    'backend/ven_inv_service/src/repositories/lotRepository.ts',
    '139',
    'Lot creation explicitly instances `new SparePart()` if part is not found, violating the strict business rule.',
    'Remove auto-creation logic and throw an AppError prompting user to register the part first.',
  ],
  [
    'Event must emit ONLY on finance approval',
    'backend/billing_service/src/services/billingService.ts',
    '228',
    'productStatusEvent emitted during generateConsolidatedFinalInvoice.',
    "Remove emission from generateConsolidatedFinalInvoice or wrap in strict conditional logic checking if it's a finance approval action.",
  ],
  [
    'If spare part exists with same part_name, brand, vendor, warehouse, model DO NOT create new',
    'backend/ven_inv_service/src/repositories/sparePartRepository.ts',
    '111',
    'Brand is missing from the queryBuilder in `findExistingSparePart`. Furthermore, undefined warehouseId/vendorId drops the constraint entirely.',
    "Add `qb.andWhere('LOWER(sp.brand) = LOWER(:brand)', { brand });` and explicitly check for NOT NULL on vendor/warehouse before bypassing constraints.",
  ],
];

const wb = XLSX.utils.book_new();

const ws1 = XLSX.utils.aoa_to_sheet(backend_tests);
XLSX.utils.book_append_sheet(wb, ws1, 'Backend Tests');

const ws2 = XLSX.utils.aoa_to_sheet(frontend_tests);
XLSX.utils.book_append_sheet(wb, ws2, 'Frontend Tests');

const ws3 = XLSX.utils.aoa_to_sheet(event_tests);
XLSX.utils.book_append_sheet(wb, ws3, 'Event System Tests');

const ws4 = XLSX.utils.aoa_to_sheet(inventory_consistency);
XLSX.utils.book_append_sheet(wb, ws4, 'Inventory Consistency');

const ws5 = XLSX.utils.aoa_to_sheet(arch_violations);
XLSX.utils.book_append_sheet(wb, ws5, 'Architecture Violations');

XLSX.writeFile(wb, output_file);
console.log(`Excel report successfully generated at ${output_file}`);
