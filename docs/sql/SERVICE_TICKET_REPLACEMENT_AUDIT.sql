-- Read-only diagnostics for Neon/PostgreSQL. Replace the serial below with the
-- affected machine's serial number. This script performs no data changes.

-- 1) Trace the replacement request to the live allocation and contract.
SELECT
  rr."requestNo",
  rr.status AS replacement_status,
  rr."contractId" AS expected_contract_id,
  rr."oldSerialNumber",
  rr."newProductId",
  rr."newSerialNumber",
  rr."newAllocationId",
  pa.id AS active_allocation_id,
  pa.status AS allocation_status,
  pa."contractId" AS allocated_contract_id,
  pa."productId" AS allocated_product_id,
  pa."serialNumber" AS allocated_serial_number,
  pa."startTimestamp",
  pa."endTimestamp",
  i."billType",
  i."saleType",
  i."contractStatus"
FROM replacement_requests rr
LEFT JOIN product_allocations pa
  ON pa.status = 'ALLOCATED'
 AND (pa."productId" = rr."newProductId" OR pa."serialNumber" = rr."newSerialNumber")
LEFT JOIN invoices i ON i.id = pa."contractId"
WHERE rr."newSerialNumber" = 'REPLACE_WITH_SERIAL'
ORDER BY pa."startTimestamp" DESC NULLS LAST;

-- 2a) Check whether any physical serial has more than one active allocation.
SELECT
  "serialNumber",
  COUNT(*) AS active_allocation_count,
  ARRAY_AGG(id ORDER BY "startTimestamp" DESC) AS allocation_ids,
  ARRAY_AGG("contractId" ORDER BY "startTimestamp" DESC) AS contract_ids
FROM product_allocations
WHERE status = 'ALLOCATED'
GROUP BY "serialNumber"
HAVING COUNT(*) > 1
ORDER BY active_allocation_count DESC;

-- 2b) Check product IDs independently, including rows with inconsistent serials.
SELECT
  "productId",
  COUNT(*) AS active_allocation_count,
  ARRAY_AGG(id ORDER BY "startTimestamp" DESC) AS allocation_ids,
  ARRAY_AGG("contractId" ORDER BY "startTimestamp" DESC) AS contract_ids
FROM product_allocations
WHERE status = 'ALLOCATED' AND "productId" IS NOT NULL
GROUP BY "productId"
HAVING COUNT(*) > 1
ORDER BY active_allocation_count DESC;

-- 3) Find installed replacement requests whose new machine has no active
-- allocation on the same contract. This is diagnostic only; do not auto-repair.
SELECT
  rr."requestNo",
  rr."contractId",
  rr."newProductId",
  rr."newSerialNumber",
  rr."newAllocationId",
  rr."installedAt"
FROM replacement_requests rr
WHERE rr.status = 'INSTALLED'
  AND NOT EXISTS (
    SELECT 1
    FROM product_allocations pa
    WHERE pa.status = 'ALLOCATED'
      AND pa."contractId" = rr."contractId"
      AND pa."productId" = rr."newProductId"
      AND pa."serialNumber" = rr."newSerialNumber"
  )
ORDER BY rr."installedAt" DESC;
