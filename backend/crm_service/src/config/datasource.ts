import 'reflect-metadata';
import { DataSource } from 'typeorm';
import './env';
import { Customer } from '../entities/customerEntity';

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.CRM_DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [Customer],
  extra: { max: 2 },
});
