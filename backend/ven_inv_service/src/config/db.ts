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
