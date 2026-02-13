import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
dotenv.config();

import { Invoice } from '../entities/invoiceEntity';
import { InvoiceItem } from '../entities/invoiceItemEntity';
import { UsageRecord } from '../entities/usageRecordEntity';

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false, // TEMPORARY FIX: Disable sync to stop TypeORM from trying to drop non-existent columns
  logging: false,
  entities: [Invoice, InvoiceItem, UsageRecord],
});
