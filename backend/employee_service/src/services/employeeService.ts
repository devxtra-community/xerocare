import bcrypt from "bcrypt";
import { EmployeeRepository } from "../repositories/employeeRepository";
import { EmployeeRole } from "../constants/employeeRole";
import { generateRandomPassword } from "../utlis/passwordGenerator";
import { sendEmployeeWelcomeMail } from "../utlis/mailer";

export class EmployeeService {
    private employeeRepo = new EmployeeRepository();

    async addEmployee(payload: {
        first_name:string,
        last_name:string,
        email: string;
        role?: string;
        expireDate?: Date;
    }) {
        const { first_name,last_name, email, role, expireDate } = payload;

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

        const plainPassword = generateRandomPassword();

        const passwordHash = await bcrypt.hash(plainPassword, 10);

        const employee= this.employeeRepo.createEmployee({
            first_name,
            last_name,
            email,
            password_hash: passwordHash,
            role: roleEnum,
            expire_date:expireDate ?? null,
        });

        await sendEmployeeWelcomeMail(email, plainPassword);

        return employee;
    }
}