import bcrypt from "bcrypt";
import { EmployeeRepository } from "../repositories/employeeRepository";
import { EmployeeRole } from "../constants/employeeRole";
import { Source } from "../config/dataSource";

export class AdminService {
    private employeeRepo = new EmployeeRepository();

    async addEmployee(payload: {
        email: string;
        password: string;
        role?: string;
        branchId?: string;
        expireDate?: Date;
    }) {
        const { email, password, role, branchId, expireDate } = payload;

        const existing = await this.employeeRepo.findByEmail(email);
        if (existing) {
            throw new Error("Employee already Exist");
        }

        if (payload.role && !Object.values(EmployeeRole).includes(payload.role as EmployeeRole)) {
            throw new Error("Invalid role");
        }

        const roleEnum = payload.role as EmployeeRole;

        const passwordHash = await bcrypt.hash(password, 10);

        return this.employeeRepo.createEmployee({
            email,
            password_hash: passwordHash,
            role: roleEnum,
            expire_date:expireDate ?? null,
        });
    }

}