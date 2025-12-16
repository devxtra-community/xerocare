import "reflect-metadata";
import { DataSource } from "typeorm";
import "./env";

import { Admin } from "../entities/adminEntities";
import { Employee } from "../entities/employeeEntities";
import { Auth } from "../entities/authEntities";
import { Otp } from "../entities/otpEntities";
import { Branch } from "../entities/branchEntities";

export const Source = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: true,
  entities: [Admin,Employee,Auth,Otp,Branch],
});
