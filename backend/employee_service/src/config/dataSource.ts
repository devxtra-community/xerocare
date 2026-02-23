import 'reflect-metadata';
import { DataSource } from 'typeorm';
import './env';

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
  url: process.env.EMPLOYEE_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  synchronize: true,
  entities: [Admin, Employee, Auth, Branch, LeaveApplication, Payroll, Notification],
});
