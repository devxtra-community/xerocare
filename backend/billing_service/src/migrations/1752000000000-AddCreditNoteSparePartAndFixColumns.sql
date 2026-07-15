-- Migration: Add spare part support, payment mode, tax, and branchId fix to credit_notes table
-- Run this once against the billing service database before deploying the updated code.

-- 1. Item category discriminator (default PRODUCT for existing rows)
ALTER TABLE credit_notes
  ADD COLUMN IF NOT EXISTS "itemCategory" VARCHAR(20) NOT NULL DEFAULT 'PRODUCT';

-- 2. Spare part fields
ALTER TABLE credit_notes
  ADD COLUMN IF NOT EXISTS "sparePartId" UUID,
  ADD COLUMN IF NOT EXISTS sku VARCHAR(100),
  ADD COLUMN IF NOT EXISTS quantity INTEGER;

-- 3. Allow productId / product name fields to be nullable (spare parts don't have them)
ALTER TABLE credit_notes
  ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE credit_notes
  ALTER COLUMN "productName" DROP NOT NULL;
ALTER TABLE credit_notes
  ALTER COLUMN "modelName" DROP NOT NULL;
ALTER TABLE credit_notes
  ALTER COLUMN brand DROP NOT NULL;

-- 4. Payment mode (B.1 fix — was collected but never stored)
ALTER TABLE credit_notes
  ADD COLUMN IF NOT EXISTS "paymentMode" VARCHAR(50);

-- 5. Tax fields (B.2 fix — auto-populated from invoice at creation)
ALTER TABLE credit_notes
  ADD COLUMN IF NOT EXISTS "taxName" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "taxPercent" DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "taxAmount" DECIMAL(12,2);

-- 6. Replacement spare part fields (for REPLACEMENT / CREDIT_EXCHANGE on spare parts)
ALTER TABLE credit_notes
  ADD COLUMN IF NOT EXISTS "replacementSparePartId" UUID,
  ADD COLUMN IF NOT EXISTS "replacementSparePartName" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "replacementSparePartSku" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "replacementQuantity" INTEGER;
