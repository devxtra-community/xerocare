import 'reflect-metadata';
import { DataSource } from 'typeorm';
import './env';
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

import { Rfq } from '../entities/rfqEntity';
import { RfqItem } from '../entities/rfqItemEntity';
import { RfqVendor } from '../entities/rfqVendorEntity';
import { RfqVendorItem } from '../entities/rfqVendorItemEntity';

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.VENDOR_DATABASE_URL || process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  synchronize: true, // Enabled to fix missing columns (lots.branch_id)
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
  ],
  extra: { max: 2 },
});
