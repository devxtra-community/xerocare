"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const employeeRepository_1 = require("../repositories/employeeRepository");
const employeeRole_1 = require("../constants/employeeRole");
const passwordGenerator_1 = require("../utlis/passwordGenerator");
const mailer_1 = require("../utlis/mailer");
class EmployeeService {
    constructor() {
        this.employeeRepo = new employeeRepository_1.EmployeeRepository();
    }
    async addEmployee(payload) {
        const { first_name, last_name, email, role, expireDate } = payload;
        const existing = await this.employeeRepo.findByEmail(email);
        if (existing) {
            throw new Error("Employee already Exist");
        }
        if (role === employeeRole_1.EmployeeRole.ADMIN) {
            throw new Error("You cannot create another admin");
        }
        if (payload.role && !Object.values(employeeRole_1.EmployeeRole).includes(payload.role)) {
            throw new Error("Invalid role");
        }
        const roleEnum = payload.role;
        const plainPassword = (0, passwordGenerator_1.generateRandomPassword)();
        const passwordHash = await bcrypt_1.default.hash(plainPassword, 10);
        const employee = this.employeeRepo.createEmployee({
            first_name,
            last_name,
            email,
            password_hash: passwordHash,
            role: roleEnum,
            expire_date: expireDate ?? null,
        });
        await (0, mailer_1.sendEmployeeWelcomeMail)(email, plainPassword);
        return employee;
    }
}
exports.EmployeeService = EmployeeService;
