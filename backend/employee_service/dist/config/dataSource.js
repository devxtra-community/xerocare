"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Source = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
require("./env");
const adminEntities_1 = require("../entities/adminEntities");
const employeeEntities_1 = require("../entities/employeeEntities");
const authEntities_1 = require("../entities/authEntities");
const otpEntities_1 = require("../entities/otpEntities");
exports.Source = new typeorm_1.DataSource({
    type: "postgres",
    url: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
    synchronize: true,
    entities: [adminEntities_1.Admin, employeeEntities_1.Employee, authEntities_1.Auth, otpEntities_1.Otp],
});
