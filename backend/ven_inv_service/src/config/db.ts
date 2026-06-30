import './env';

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Vendor } from '../entities/vendorEntity';
import { Model } from '../entities/modelEntity';
import { Product } from '../entities/productEntity';
import { Branch } from '../entities/branchEntity';
import { EmployeeManager } from '../entities/employeeManagerEntity';

import { Warehouse } from '../entities/warehouseEntity';
import { SparePart } from '../entities/sparePartEntity';

import { VendorRequest } from '../entities/vendorRequestEntity';
import { Brand } from '../entities/brandEntity';
import { Lot } from '../entities/lotEntity';
import { LotItem } from '../entities/lotItemEntity';

import { logger } from './logger';

import { Rfq } from '../entities/rfqEntity';
import { RfqItem } from '../entities/rfqItemEntity';
import { RfqVendor } from '../entities/rfqVendorEntity';
import { RfqVendorItem } from '../entities/rfqVendorItemEntity';
import { Purchase } from '../entities/purchaseEntity';
import { PurchaseCost } from '../entities/purchaseCostEntity';
import { PurchasePayment } from '../entities/purchasePaymentEntity';
import { SparePartInventory } from '../entities/sparePartInventoryEntity';
import { ProcessedInvoiceItem } from '../entities/processedInvoiceItemEntity';
import { ServiceTicket } from '../entities/serviceTicketEntity';
import { ServiceTicketItem } from '../entities/serviceTicketItemEntity';
import { ServiceDiagnosis } from '../entities/serviceDiagnosisEntity';
import { ServiceEstimate } from '../entities/serviceEstimateEntity';
import { ServiceEstimateRevision } from '../entities/serviceEstimateRevisionEntity';
import { ServiceEstimateItem } from '../entities/serviceEstimateItemEntity';
import { ServiceReport } from '../entities/serviceReportEntity';
import { MachineServiceHistory } from '../entities/machineServiceHistoryEntity';
import { ConsumableYieldHistory } from '../entities/consumableYieldHistoryEntity';
import { InventoryReservation } from '../entities/inventoryReservationEntity';
import { ServicePartUsageLog } from '../entities/servicePartUsageLogEntity';
import { ServiceTicketActivity } from '../entities/serviceTicketActivityEntity';
import { ServiceContract } from '../entities/serviceContractEntity';
import { StockTransfer } from '../entities/stockTransferEntity';
import { StockTransferItem } from '../entities/stockTransferItemEntity';

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.VENDOR_DATABASE_URL,
  ssl: process.env.VENDOR_DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
  synchronize: false,
  entities: [
    Vendor,
    Model,
    Product,
    Branch,
    EmployeeManager,
    Warehouse,
    SparePart,
    VendorRequest,
    Brand,
    Lot,
    LotItem,
    Rfq,
    RfqItem,
    RfqVendor,
    RfqVendorItem,
    Purchase,
    PurchaseCost,
    PurchasePayment,
    SparePartInventory,
    ProcessedInvoiceItem,
    ServiceTicket,
    ServiceTicketItem,
    ServiceDiagnosis,
    ServiceEstimate,
    ServiceEstimateRevision,
    ServiceEstimateItem,
    ServiceReport,
    MachineServiceHistory,
    ConsumableYieldHistory,
    InventoryReservation,
    ServicePartUsageLog,
    ServiceTicketActivity,
    ServiceContract,
    StockTransfer,
    StockTransferItem,
  ],
  poolSize: 1,
  extra: {
    max: 20,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
    min: 0,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
  },
});

export const connectWithRetry = async (initialDelayMs = 2000): Promise<DataSource> => {
  let attempt = 1;
  let delay = initialDelayMs;

  while (true) {
    try {
      if (!Source.isInitialized) {
        logger.info(`Attempting database connection (Attempt ${attempt})...`);
        await Source.initialize();
        logger.info('Database connected successfully.');
        // Ensure processed_invoice_items table exists
        await Source.query(`
          CREATE TABLE IF NOT EXISTS processed_invoice_items (
            invoice_item_id UUID PRIMARY KEY,
            processed_at TIMESTAMP DEFAULT NOW()
          )
        `);
        logger.info('Guaranteed processed_invoice_items table exists.');

        // --- Multi-Currency & Tax: new branch columns ---
        await Source.query(`
          ALTER TABLE branches
          ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
          ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3),
          ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10),
          ADD COLUMN IF NOT EXISTS currency_name VARCHAR(100),
          ADD COLUMN IF NOT EXISTS has_tax BOOLEAN DEFAULT FALSE,
          ADD COLUMN IF NOT EXISTS tax_name VARCHAR(50),
          ADD COLUMN IF NOT EXISTS tax_percent DECIMAL(5,2),
          ADD COLUMN IF NOT EXISTS tax_registration_number VARCHAR(50),
          ADD COLUMN IF NOT EXISTS city VARCHAR(100),
          ADD COLUMN IF NOT EXISTS state VARCHAR(100),
          ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);
        `);
        logger.info('Guaranteed branch currency & tax columns exist.');

        // --- Exchange Rates table ---
        await Source.query(`
          CREATE TABLE IF NOT EXISTS exchange_rates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            from_currency VARCHAR(3) NOT NULL,
            to_currency VARCHAR(3) NOT NULL,
            rate DECIMAL(18,6) NOT NULL,
            fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE(from_currency, to_currency)
          );
        `);
        logger.info('Guaranteed exchange_rates table exists.');

        // --- Currency columns on lots ---
        await Source.query(`
          ALTER TABLE lots
          ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3),
          ADD COLUMN IF NOT EXISTS exchange_rate_snapshot DECIMAL(18,6);
        `);
        logger.info('Guaranteed lots currency columns exist.');

        // --- Currency columns on rfq_vendors ---
        await Source.query(`
          ALTER TABLE rfq_vendors
          ADD COLUMN IF NOT EXISTS vendor_currency_code VARCHAR(3),
          ADD COLUMN IF NOT EXISTS vendor_amount DECIMAL(15,2),
          ADD COLUMN IF NOT EXISTS branch_currency_code VARCHAR(3),
          ADD COLUMN IF NOT EXISTS branch_converted_amount DECIMAL(15,2),
          ADD COLUMN IF NOT EXISTS exchange_rate_snapshot DECIMAL(18,6),
          ADD COLUMN IF NOT EXISTS exchange_rate_fetched_at TIMESTAMP;
        `);
        logger.info('Guaranteed rfq_vendors currency columns exist.');

        // --- Vendor country, currency & bank accounts columns ---
        await Source.query(`
          ALTER TABLE vendors
          ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
          ADD COLUMN IF NOT EXISTS country_name VARCHAR(100),
          ADD COLUMN IF NOT EXISTS bank_accounts JSONB DEFAULT '[]'::jsonb;
        `);
        logger.info('Guaranteed vendor country, currency & bank accounts columns exist.');

        // --- Remove blank/zombie vendors (empty name or email) ---
        await Source.query(`
          DELETE FROM vendors WHERE TRIM(email) = '' OR TRIM(name) = '';
        `);
        logger.info('Cleaned up blank vendor records.');

        // --- Currency columns on service_estimates ---
        await Source.query(`
          ALTER TABLE service_estimates
          ADD COLUMN IF NOT EXISTS currency_code VARCHAR(3),
          ADD COLUMN IF NOT EXISTS exchange_rate_snapshot DECIMAL(18,6);
        `);
        logger.info('Guaranteed service_estimates currency columns exist.');
        // Ensure tax_rate and max_discount_amount exist on spare_parts table
        await Source.query(`
          ALTER TABLE spare_parts 
          ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC(12,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS max_discountable_amount DECIMAL(10,2) DEFAULT 0
        `);
        logger.info('Guaranteed tax_rate and max_discount_amount exist on spare_parts table.');
        // Ensure max_discountable_amount exists on model / models table
        try {
          await Source.query(`
            ALTER TABLE model 
            ADD COLUMN IF NOT EXISTS max_discountable_amount DECIMAL(10,2) DEFAULT 0
          `);
          logger.info('Guaranteed max_discountable_amount exists on model table.');
        } catch (err) {
          logger.warn('Could not add max_discountable_amount to model table:', err);
        }
        try {
          await Source.query(`
            ALTER TABLE models 
            ADD COLUMN IF NOT EXISTS max_discountable_amount DECIMAL(10,2) DEFAULT 0
          `);
        } catch {
          // ignore
        }
        // Ensure warranty column exists on products table
        await Source.query(`
          ALTER TABLE products 
          ADD COLUMN IF NOT EXISTS warranty VARCHAR(255),
          ADD COLUMN IF NOT EXISTS consumables JSONB
        `);
        logger.info('Guaranteed warranty and consumables columns exist on products table.');

        // Ensure products_product_status_enum contains RETURNED and DAMAGED statuses
        try {
          await Source.query(
            `ALTER TYPE products_product_status_enum ADD VALUE IF NOT EXISTS 'RETURNED'`,
          );
          await Source.query(
            `ALTER TYPE products_product_status_enum ADD VALUE IF NOT EXISTS 'DAMAGED'`,
          );
          logger.info(
            'Guaranteed RETURNED and DAMAGED statuses exist in products_product_status_enum.',
          );
        } catch (enumErr) {
          logger.warn(
            'Could not alter products_product_status_enum: ' + (enumErr as Error).message,
          );
        }

        try {
          await Source.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'products_ownership_enum') THEN
                CREATE TYPE products_ownership_enum AS ENUM ('RENT', 'LEASE', 'SALE', 'EXTERNAL');
              END IF;
            END
            $$;
          `);
        } catch (enumErr) {
          logger.warn('Could not create products_ownership_enum type:', enumErr);
        }
        await Source.query(`
          ALTER TABLE products 
          ADD COLUMN IF NOT EXISTS ownership products_ownership_enum DEFAULT 'SALE',
          ADD COLUMN IF NOT EXISTS warranty_start_date TIMESTAMP NULL,
          ADD COLUMN IF NOT EXISTS warranty_end_date TIMESTAMP NULL,
          ADD COLUMN IF NOT EXISTS warranty_max_pages INTEGER DEFAULT 200000,
          ADD COLUMN IF NOT EXISTS meter_reading INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS customer_id UUID NULL;
        `);

        // Ensure barcode_id column exists on products and spare_parts tables
        await Source.query(`
          ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode_id VARCHAR(255);
        `);
        await Source.query(`
          UPDATE products SET barcode_id = 'XC-P-' || serial_no WHERE barcode_id IS NULL;
        `);
        try {
          await Source.query(`
            ALTER TABLE products ADD CONSTRAINT products_barcode_id_unique UNIQUE (barcode_id);
          `);
        } catch {
          // Unique constraint already exists
        }

        await Source.query(`
          ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS barcode_id VARCHAR(255);
        `);
        await Source.query(`
          UPDATE spare_parts SET barcode_id = 'XC-S-' || item_code WHERE barcode_id IS NULL;
        `);
        try {
          await Source.query(`
            ALTER TABLE spare_parts ADD CONSTRAINT spare_parts_barcode_id_unique UNIQUE (barcode_id);
          `);
        } catch {
          // Unique constraint already exists
        }
        logger.info(
          'Guaranteed barcode_id column and constraints exist on products and spare_parts tables.',
        );

        // --- Service Module Schema DDL ---
        try {
          await Source.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_tickets_servicecontext_enum') THEN
                CREATE TYPE service_tickets_servicecontext_enum AS ENUM (
                  'RENT', 'LEASE_UNDER_WARRANTY', 'FSMA', 'SMA', 'AMC', 'CHARGEABLE', 'LEASE_EXPIRED'
                );
              END IF;
              
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_tickets_jobtype_enum') THEN
                CREATE TYPE service_tickets_jobtype_enum AS ENUM (
                  'ONSITE', 'BRING_TO_CENTRE'
                );
              END IF;

              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_tickets_status_enum') THEN
                CREATE TYPE service_tickets_status_enum AS ENUM (
                  'OPEN', 'ASSIGNED', 'DIAGNOSED', 'QUOTED', 'WAITING_FINANCE_APPROVAL',
                  'FINANCE_APPROVED', 'FINANCE_REJECTED', 'CUSTOMER_APPROVED', 'CUSTOMER_REJECTED',
                  'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FREE_SERVICE'
                );
              END IF;

              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_ticket_items_itemsource_enum') THEN
                CREATE TYPE service_ticket_items_itemsource_enum AS ENUM (
                  'SPARE_PART', 'CUSTOM'
                );
              END IF;

              BEGIN
                ALTER TYPE service_tickets_servicecontext_enum ADD VALUE 'WARRANTY';
              EXCEPTION
                WHEN duplicate_object THEN NULL;
              END;

              BEGIN
                ALTER TYPE service_tickets_servicecontext_enum ADD VALUE 'EXTERNAL_MACHINE';
              EXCEPTION
                WHEN duplicate_object THEN NULL;
              END;

              BEGIN
                ALTER TYPE service_tickets_jobtype_enum ADD VALUE 'WARRANTY_ONSITE';
              EXCEPTION
                WHEN duplicate_object THEN NULL;
              END;
            END
            $$;
          `);
          logger.info('Guaranteed service module enums exist.');
        } catch (err) {
          logger.warn('Could not create service enums:', err);
        }

        // Alter service_tickets table to add diagnosis and repair columns
        await Source.query(`
          ALTER TABLE service_tickets 
          ADD COLUMN IF NOT EXISTS "diagnosisStartedAt" TIMESTAMP NULL,
          ADD COLUMN IF NOT EXISTS "diagnosisCompletedAt" TIMESTAMP NULL,
          ADD COLUMN IF NOT EXISTS "repairStartedAt" TIMESTAMP NULL,
          ADD COLUMN IF NOT EXISTS "repairCompletedAt" TIMESTAMP NULL,
          ADD COLUMN IF NOT EXISTS "diagnosisDuration" INTEGER NULL,
          ADD COLUMN IF NOT EXISTS "repairDuration" INTEGER NULL;
        `);
        logger.info('Guaranteed service_tickets time tracking columns exist.');

        // Alter spare_parts table to add reservation columns
        await Source.query(`
          ALTER TABLE spare_parts 
          ADD COLUMN IF NOT EXISTS "reserved_quantity" INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS "consumed_quantity" INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS "damaged_quantity" INTEGER DEFAULT 0;
        `);
        logger.info('Guaranteed spare_parts reservation columns exist.');

        await Source.query(`
          CREATE TABLE IF NOT EXISTS service_tickets (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "ticketNumber" VARCHAR(255) NOT NULL UNIQUE,
            "customerId" UUID NULL,
            "leadId" VARCHAR(255) NULL,
            "productId" UUID NULL,
            "productBrand" VARCHAR(255) NOT NULL,
            "productModel" VARCHAR(255) NOT NULL,
            "productName" VARCHAR(255) NOT NULL,
            "serialNumber" VARCHAR(255) NOT NULL,
            "serviceContext" service_tickets_servicecontext_enum NOT NULL,
            "contractReferenceId" UUID NULL,
            "issueDescription" TEXT NOT NULL,
            "jobType" service_tickets_jobtype_enum NOT NULL,
            status service_tickets_status_enum NOT NULL DEFAULT 'OPEN',
            "assignedTechnicianId" UUID NULL,
            "createdBy" UUID NOT NULL,
            "branchId" UUID NOT NULL,
            "serviceQuotationId" UUID NULL,
            "diagnosisNotes" TEXT NULL,
            "scheduledVisitDate" TIMESTAMP NULL,
            "completedAt" TIMESTAMP NULL,
            "completionNotes" TEXT NULL,
            "diagnosisStartedAt" TIMESTAMP NULL,
            "diagnosisCompletedAt" TIMESTAMP NULL,
            "repairStartedAt" TIMESTAMP NULL,
            "repairCompletedAt" TIMESTAMP NULL,
            "diagnosisDuration" INTEGER NULL,
            "repairDuration" INTEGER NULL,
            "discount_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
            "technician_note_to_finance" TEXT NULL DEFAULT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        logger.info('Guaranteed service_tickets table exists.');

        await Source.query(`
          CREATE TABLE IF NOT EXISTS service_ticket_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "ticketId" UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
            "itemSource" service_ticket_items_itemsource_enum NOT NULL,
            "sparePartId" UUID NULL,
            sku VARCHAR(255) NULL,
            "barcodeId" VARCHAR(255) NULL,
            "customPartName" VARCHAR(255) NULL,
            "customPartBrand" VARCHAR(255) NULL,
            "customPartDescription" TEXT NULL,
            "partName" VARCHAR(255) NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            "unitPrice" NUMERIC(10,2) NULL,
            "totalPrice" NUMERIC(10,2) NULL,
            "isFree" BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        logger.info('Guaranteed service_ticket_items table exists.');

        await Source.query(`
          CREATE TABLE IF NOT EXISTS service_diagnoses (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "ticketId" UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
            "problemFound" TEXT NOT NULL,
            "rootCause" TEXT NOT NULL,
            "technicianNotes" TEXT NULL,
            "meterReading" INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        logger.info('Guaranteed service_diagnoses table exists.');

        await Source.query(`
          CREATE TABLE IF NOT EXISTS service_estimates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "ticketId" UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
            "labourCost" NUMERIC(10,2) NOT NULL DEFAULT 0,
            "totalCost" NUMERIC(10,2) NOT NULL DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
            version INTEGER NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        logger.info('Guaranteed service_estimates table exists.');

        // Check if old service_estimate_revisions table needs replacement
        const tableCheck = await Source.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'service_estimate_revisions' AND column_name = 'invoice_id'
        `);
        if (tableCheck.length === 0) {
          logger.info('Dropping old service_estimate_revisions table...');
          await Source.query(`DROP TABLE IF EXISTS service_estimate_revisions CASCADE;`);
        }

        await Source.query(`
          CREATE TABLE IF NOT EXISTS service_estimate_revisions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            invoice_id UUID NOT NULL,
            ticket_id UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
            revision_number INTEGER NOT NULL,
            revision_type VARCHAR(50) NOT NULL,
            items_snapshot JSONB NOT NULL,
            total_amount DECIMAL(10,2) NOT NULL,
            discount_applied DECIMAL(10,2) DEFAULT 0,
            visit_charge_amount DECIMAL(10,2) DEFAULT 0,
            technician_note_to_finance TEXT,
            submitted_by VARCHAR(255) NOT NULL,
            finance_decision VARCHAR(50) DEFAULT NULL,
            finance_decision_by VARCHAR(255) DEFAULT NULL,
            finance_decision_note TEXT DEFAULT NULL,
            finance_decision_at TIMESTAMP DEFAULT NULL,
            valid_until TIMESTAMP DEFAULT NULL,
            submitted_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        logger.info('Guaranteed service_estimate_revisions table exists.');

        await Source.query(`
          CREATE TABLE IF NOT EXISTS service_estimate_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "estimateId" UUID NULL REFERENCES service_estimates(id) ON DELETE CASCADE,
            "revisionId" UUID NULL REFERENCES service_estimate_revisions(id) ON DELETE CASCADE,
            "itemSource" VARCHAR(50) NOT NULL,
            "sparePartId" UUID NULL,
            sku VARCHAR(255) NULL,
            "partName" VARCHAR(255) NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            "unitPrice" NUMERIC(10,2) NULL,
            "totalPrice" NUMERIC(10,2) NULL,
            "isFree" BOOLEAN NOT NULL DEFAULT FALSE,
            "isApproved" BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        logger.info('Guaranteed service_estimate_items table exists.');

        await Source.query(`
          CREATE TABLE IF NOT EXISTS service_reports (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "ticketId" UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
            "workPerformed" TEXT NOT NULL,
            "resolutionDetails" TEXT NOT NULL,
            "meterReading" INTEGER NOT NULL DEFAULT 0,
            "startTime" TIMESTAMP NOT NULL,
            "endTime" TIMESTAMP NOT NULL,
            "totalTimeSpent" INTEGER NOT NULL,
            "customerRemarks" TEXT NULL,
            "technicianRemarks" TEXT NULL,
            "customerSignature" TEXT NULL,
            "technicianSignature" TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        logger.info('Guaranteed service_reports table exists.');

        // --- Migration Redesign Block ---
        // 1. Add status values to service_tickets_status_enum
        const newStatuses = [
          'ESTIMATE_RECORDED',
          'ADDITIONAL_ESTIMATE_PENDING',
          'WAITING_FINANCE_APPROVAL_2',
          'FINANCE_APPROVED_2',
        ];
        for (const statusVal of newStatuses) {
          try {
            await Source.query(
              `ALTER TYPE service_tickets_status_enum ADD VALUE IF NOT EXISTS '${statusVal}'`,
            );
          } catch {
            // Ignore if already exists
          }
        }

        // 2. Add columns to service_tickets
        await Source.query(`
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS track VARCHAR(1);
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(30) DEFAULT 'COMPLAINT';
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS estimate_sent_to_finance BOOLEAN DEFAULT FALSE;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS repair_started_at TIMESTAMP;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS problem_found TEXT;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS root_cause TEXT;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS work_performed TEXT;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS resolution_details TEXT;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS additional_estimate_count INT DEFAULT 0;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS linked_invoice_id UUID;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS meter_reading_at_service INT;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS report_url VARCHAR(500);
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS completion_bill_number VARCHAR(50);
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS visit_charge_amount DECIMAL(10,2) DEFAULT 0;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS visit_charge_method VARCHAR(30) DEFAULT NULL;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS visit_charge_collected BOOLEAN DEFAULT FALSE;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS visit_charge_collected_at TIMESTAMP DEFAULT NULL;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS visit_charge_informed BOOLEAN DEFAULT FALSE;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
          ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS technician_note_to_finance TEXT DEFAULT NULL;
        `);
        logger.info('Added columns to service_tickets for Redesign and Visit Charge.');

        // 3. Drop and recreate machine_service_history to support new redesign structure
        // We check if "totalPartsSpend" column exists; if not, we drop it.
        const checkHistoryCol = await Source.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name='machine_service_history' AND column_name='totalPartsSpend';
        `);
        if (checkHistoryCol.length === 0) {
          logger.info('Upgrading machine_service_history table to new design...');
          await Source.query(`DROP TABLE IF EXISTS machine_service_history CASCADE;`);
        }

        await Source.query(`
          CREATE TABLE IF NOT EXISTS machine_service_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "productId" UUID UNIQUE NOT NULL,
            "serialNumber" VARCHAR(255) NOT NULL,
            "totalServiceVisits" INT DEFAULT 0,
            "totalPreventativeVisits" INT DEFAULT 0,
            "lastServiceDate" TIMESTAMP,
            "nextScheduledMaintenanceDate" TIMESTAMP,
            "totalPartsSpend" DECIMAL(12,2) DEFAULT 0,
            "totalLabourSpend" DECIMAL(12,2) DEFAULT 0,
            "totalLifetimeCost" DECIMAL(12,2) DEFAULT 0,
            "updatedAt" TIMESTAMP DEFAULT NOW()
          );
        `);
        logger.info('Guaranteed machine_service_history table exists (new redesign).');

        // 4. Create service_part_usage_logs table
        await Source.query(`
          CREATE TABLE IF NOT EXISTS service_part_usage_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "productId" UUID NOT NULL,
            "ticketId" UUID NOT NULL,
            "sparePartId" UUID NULL,
            "partName" VARCHAR(255) NOT NULL,
            "sku" VARCHAR(255) NULL,
            "quantityUsed" INT NOT NULL,
            "unitCost" DECIMAL(12,2) NOT NULL,
            "totalCost" DECIMAL(12,2) NOT NULL,
            "isFree" BOOLEAN DEFAULT false,
            "isConsumable" BOOLEAN DEFAULT false,
            "meterReadingAtReplacement" INT NULL,
            "previousMeterReading" INT NULL,
            "calculatedYield" INT NULL,
            "linkedInvoiceId" VARCHAR(255) NULL,
            "replacedAt" TIMESTAMP DEFAULT NOW()
          );
        `);
        logger.info('Guaranteed service_part_usage_logs table exists.');

        // 5. Drop and recreate inventory_reservations to support new redesign structure
        const checkReservationCol = await Source.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name='inventory_reservations' AND column_name='reservedQuantity';
        `);
        if (checkReservationCol.length === 0) {
          logger.info('Upgrading inventory_reservations table to new design...');
          await Source.query(`DROP TABLE IF EXISTS inventory_reservations CASCADE;`);
        }

        await Source.query(`
          CREATE TABLE IF NOT EXISTS inventory_reservations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "ticketId" UUID NOT NULL,
            "sparePartId" UUID NOT NULL,
            "reservedQuantity" INT NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'RESERVED',
            "reservedAt" TIMESTAMP DEFAULT NOW(),
            "consumedAt" TIMESTAMP NULL
          );
        `);
        logger.info('Guaranteed inventory_reservations table exists (new redesign).');

        await Source.query(`
          CREATE TABLE IF NOT EXISTS consumable_yield_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "productId" UUID NULL,
            "serialNumber" VARCHAR(255) NOT NULL,
            "tonerSku" VARCHAR(255) NOT NULL,
            "installedDate" TIMESTAMP NOT NULL,
            "installedMeterReading" INTEGER NOT NULL,
            "replacedDate" TIMESTAMP NULL,
            "replacedMeterReading" INTEGER NULL,
            "yieldPages" INTEGER NULL,
            "ticketId" UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        logger.info('Guaranteed consumable_yield_history table exists.');

        await Source.query(`
          CREATE TABLE IF NOT EXISTS service_ticket_activities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "ticketId" UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
            "activityType" VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            "performedBy" UUID NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        logger.info('Guaranteed service_ticket_activities table exists.');

        // Service Contracts schema
        try {
          await Source.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_contracts_contracttype_enum') THEN
                CREATE TYPE service_contracts_contracttype_enum AS ENUM ('FSMA', 'SMA', 'AMC');
              END IF;
            END
            $$;
          `);
          await Source.query(`
            CREATE TABLE IF NOT EXISTS service_contracts (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              "productId" UUID NOT NULL,
              "customerId" UUID NOT NULL,
              "contractType" service_contracts_contracttype_enum NOT NULL,
              "startDate" TIMESTAMP NOT NULL,
              "endDate" TIMESTAMP NOT NULL,
              "contractValue" NUMERIC(12,2) NOT NULL DEFAULT 0,
              "coverageRules" JSONB NOT NULL,
              status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
              created_at TIMESTAMP NOT NULL DEFAULT NOW(),
              updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
          `);
          logger.info('Guaranteed service_contracts table and enum exist.');
        } catch (contractSchemaErr) {
          logger.error('Failed to create service_contracts schema:', contractSchemaErr);
        }

        // --- Stock Transfer Module Schema ---
        try {
          await Source.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_transfers_transfer_type_enum') THEN
                CREATE TYPE stock_transfers_transfer_type_enum AS ENUM ('INTRA_BRANCH', 'INTER_BRANCH');
              END IF;
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_transfers_status_enum') THEN
                CREATE TYPE stock_transfers_status_enum AS ENUM (
                  'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'IN_TRANSIT',
                  'RECEIVED', 'PARTIALLY_RECEIVED', 'COMPLETED', 'REJECTED', 'CANCELLED'
                );
              END IF;
              IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_transfer_items_item_type_enum') THEN
                CREATE TYPE stock_transfer_items_item_type_enum AS ENUM ('SPARE_PART', 'PRODUCT');
              END IF;
            END
            $$;
          `);
          await Source.query(`
            CREATE TABLE IF NOT EXISTS stock_transfers (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              transfer_number VARCHAR(50) NOT NULL UNIQUE,
              transfer_type stock_transfers_transfer_type_enum NOT NULL,
              status stock_transfers_status_enum NOT NULL DEFAULT 'DRAFT',
              source_branch_id UUID NOT NULL,
              source_warehouse_id UUID NOT NULL,
              destination_branch_id UUID NOT NULL,
              destination_warehouse_id UUID NOT NULL,
              requested_by_id UUID NOT NULL,
              approved_by_id UUID NULL,
              reason TEXT NOT NULL,
              notes TEXT NULL,
              rejection_reason TEXT NULL,
              dispatched_at TIMESTAMP NULL,
              received_at TIMESTAMP NULL,
              created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
          `);
          await Source.query(`
            CREATE TABLE IF NOT EXISTS stock_transfer_items (
              id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
              item_type stock_transfer_items_item_type_enum NOT NULL,
              spare_part_id UUID NULL,
              product_id UUID NULL,
              requested_qty INT NOT NULL DEFAULT 1,
              dispatched_qty INT NULL,
              received_qty INT NULL,
              unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
              created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
          `);
          await Source.query(`
            ALTER TABLE spare_part_inventories
            ADD COLUMN IF NOT EXISTS transfer_reserved_qty INT NOT NULL DEFAULT 0;
          `);
          await Source.query(`
            ALTER TABLE products
            ADD COLUMN IF NOT EXISTS transfer_status VARCHAR(20) DEFAULT 'NONE';
          `);
          logger.info('Guaranteed stock_transfers schema exists.');
        } catch (stockTransferErr) {
          logger.error('Failed to create stock_transfers schema:', stockTransferErr);
        }
      }
      return Source;
    } catch (error: unknown) {
      const err = error as Error & { code?: string };
      logger.error(`Database connection failed on attempt ${attempt}: ${err.code || err.message}`);
      logger.info(`Waiting ${delay / 1000} seconds before retrying...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt++;
      delay = Math.min(delay * 2, 30000);
    }
  }
};
