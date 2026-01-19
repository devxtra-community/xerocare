import 'reflect-metadata';
import { DataSource } from 'typeorm';
import './env';
import { Vendor } from '../entities/vendorEntity';
import { Model } from '../entities/modelEntity';
import { Product } from '../entities/productEntity';
import { Branch } from '../entities/branchEntity';
import { EmployeeManager } from '../entities/employeeManagerEntity';

import { Warehouse } from '../entities/warehouseEntity';

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  synchronize: true,
  entities: [Vendor, Model, Product, Branch, EmployeeManager, Warehouse],
});
