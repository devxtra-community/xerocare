import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
dotenv.config();

import { Invoice } from '../entities/invoiceEntity';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { UsageRecord } from '../entities/usageRecordEntity';

import { ProductAllocation } from '../entities/productAllocationEntity';

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true, // TEMPORARY FIX: Enable sync to add missing columns
  logging: false,
  entities: [Invoice, InvoiceItem, UsageRecord, ProductAllocation],
});
