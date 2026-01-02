import "reflect-metadata";
import { DataSource } from "typeorm";
import "./env";

import { Vendor } from "../entities/vendorEntity";

export const Source = new DataSource({
  type: "postgres",
  url:process.env.DATABASE_URL,
  ssl:{
    rejectUnauthorized:false,
  },
  synchronize: true,
  entities: [Vendor],
});
