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

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  synchronize: false, // Enabled to fix missing columns (lots.branch_id)
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
  ],
  extra: { max: 2 },
});
