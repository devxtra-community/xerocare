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
            END
            $$;
          `);
          logger.info('Guaranteed service module enums exist.');
        } catch (err) {
          logger.warn('Could not create service enums:', err);
        }

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
