import bcrypt from "bcrypt";
import { EmployeeRepository } from "../repositories/employeeRepository";
import { EmployeeRole } from "../constants/employeeRole";

export class AdminService {
    private employeeRepo = new EmployeeRepository();

    async addEmployee(payload: {
        email: string;
        password: string;
        role?: string;
        expireDate?: Date;
    }) {
        const { email, password, role, expireDate } = payload;

        const existing = await this.employeeRepo.findByEmail(email);
        if (existing) {
            throw new Error("Employee already Exist");
        }

        if (role === EmployeeRole.ADMIN) {
            throw new Error("You cannot create another admin");
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