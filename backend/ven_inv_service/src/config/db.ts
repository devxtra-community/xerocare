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
import { ServiceTicketActivity } from '../entities/serviceTicketActivityEntity';
import { ServiceContract } from '../entities/serviceContractEntity';

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
    ServiceTicketActivity,
    ServiceContract,
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
        // Ensure tax_rate and max_discount_amount exist on spare_parts table
        await Source.query(`
          ALTER TABLE spare_parts 
          ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC(12,2) DEFAULT 0
        `);
        logger.info('Guaranteed tax_rate and max_discount_amount exist on spare_parts table.');
        // Ensure warranty column exists on products table
        await Source.query(`
          ALTER TABLE products 
          ADD COLUMN IF NOT EXISTS warranty VARCHAR(255),
          ADD COLUMN IF NOT EXISTS consumables JSONB
        `);
        logger.info('Guaranteed warranty and consumables columns exist on products table.');

        // Ensure products_product_status_enum contains RETURNED status
        try {
          await Source.query(
            `ALTER TYPE products_product_status_enum ADD VALUE IF NOT EXISTS 'RETURNED'`,
          );
          logger.info('Guaranteed RETURNED status exists in products_product_status_enum.');
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

        await Source.query(`
          CREATE TABLE IF NOT EXISTS service_estimate_revisions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "estimateId" UUID NOT NULL REFERENCES service_estimates(id) ON DELETE CASCADE,
            "ticketId" UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
            version INTEGER NOT NULL,
            "labourCost" NUMERIC(10,2) NOT NULL DEFAULT 0,
            "totalCost" NUMERIC(10,2) NOT NULL DEFAULT 0,
            status VARCHAR(50) NOT NULL,
            reason TEXT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
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

        await Source.query(`
          CREATE TABLE IF NOT EXISTS machine_service_history (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "productId" UUID NULL,
            "serialNumber" VARCHAR(255) NOT NULL,
            "ticketId" UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
            "serviceDate" TIMESTAMP NOT NULL,
            "serviceContext" VARCHAR(255) NOT NULL,
            "meterReading" INTEGER NOT NULL DEFAULT 0,
            "partsUsed" JSONB NULL,
            "totalCost" NUMERIC(10,2) NOT NULL DEFAULT 0,
            "customerCharge" NUMERIC(10,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        logger.info('Guaranteed machine_service_history table exists.');

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
          CREATE TABLE IF NOT EXISTS inventory_reservations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "ticketId" UUID NOT NULL REFERENCES service_tickets(id) ON DELETE CASCADE,
            "sparePartId" UUID NOT NULL REFERENCES spare_parts(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 1,
            status VARCHAR(50) NOT NULL DEFAULT 'RESERVED',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          );
        `);
        logger.info('Guaranteed inventory_reservations table exists.');

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
