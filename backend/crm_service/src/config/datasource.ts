import 'reflect-metadata';
import { DataSource } from 'typeorm';
import './env';
import { Customer } from '../entities/customerEntity';

export const Source = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: true,
  logging: false,
  entities: [Customer],
});
