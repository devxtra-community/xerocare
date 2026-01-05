import 'reflect-metadata';
import { DataSource } from 'typeorm';
import './env';

import { Vendor } from '../entities/vendorEntity';
import { Branch } from '../entities/branchEntity';
import { EmployeeManager } from '../entities/employeeManagerEntity';

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  synchronize: true,
  entities: [Vendor, Branch, EmployeeManager],
});
