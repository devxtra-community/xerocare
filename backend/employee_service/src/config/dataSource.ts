import "reflect-metadata";
import { DataSource } from "typeorm";
import "./env";

import { Admin } from "../entities/adminEntities";
import { Employee } from "../entities/employeeEntities";
import { Auth } from "../entities/authEntities";
import { Otp } from "../entities/otpEntities";

export const Source = new DataSource({
  type: "postgres",
  url:process.env.DATABASE_URL,
  ssl:{
    rejectUnauthorized:false,
  },
  synchronize: true,
  entities: [Admin,Employee,Auth,Otp],
});
