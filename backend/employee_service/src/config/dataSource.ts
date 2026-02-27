import './env';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { Admin } from '../entities/adminEntities';
import { Employee } from '../entities/employeeEntities';
import { Auth } from '../entities/authEntities';

import { Branch } from '../entities/branchEntity';
import { LeaveApplication } from '../entities/leaveApplicationEntity';
import { Payroll } from '../entities/payrollEntity'; // [x] Define `Payroll` entity
import { Notification } from '../entities/notificationEntity';

export const Source = new DataSource({
  // [/] Update `DataSource` configuration
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  synchronize: false,
  entities: [Admin, Employee, Auth, Branch, LeaveApplication, Payroll, Notification],
  extra: { max: 2 },
});
