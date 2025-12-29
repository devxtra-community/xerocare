import bcrypt from "bcrypt";
import { EmployeeRepository } from "../repositories/employeeRepository";
import { EmployeeRole } from "../constants/employeeRole";
import { generateRandomPassword } from "../utlis/passwordGenerator";
import { getSignedIdProofUrl } from "../utlis/r2SignedUrl";
import { publishEmailJob } from "../queues/emailProducer";

export class EmployeeService {
  private employeeRepo = new EmployeeRepository();

  async addEmployee(payload: {
    first_name: string;
    last_name: string;
    email: string;
    role?: string;
    expireDate?: Date;
    salary?: number | null;
    profile_image_url?: string | null;
    id_proof_key?: string | null;
  }) {
    const {
      first_name,
      last_name,
      email,
      role,
      expireDate,
      salary,
      profile_image_url,
      id_proof_key,
    } = payload;

    const existing = await this.employeeRepo.findByEmail(email);
    if (existing) {
      throw new Error("Employee already Exist");
    }

    if (role === EmployeeRole.ADMIN) {
      throw new Error("You cannot create another admin");
    }

    if (
      payload.role &&
      !Object.values(EmployeeRole).includes(payload.role as EmployeeRole)
    ) {
      throw new Error("Invalid role");
    }

    const roleEnum = (role ?? EmployeeRole.EMPLOYEE) as EmployeeRole;

    const plainPassword = generateRandomPassword();

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const employee = await this.employeeRepo.createEmployee({
      first_name,
      last_name,
      email,
      password_hash: passwordHash,
      role: roleEnum,
      salary: salary ?? null,
      profile_image_url: profile_image_url ?? null,
      id_proof_key: id_proof_key ?? null,
      expire_date: expireDate ?? null,
    });

    publishEmailJob({
      type: "WELCOME",
      email,
      password: plainPassword,
    }).catch(console.error);

    return employee;
  }

  async getEmployeeIdProof(employeeId: string) {
    const employee = await this.employeeRepo.findById(employeeId);

    if (!employee) {
      throw new Error("Employee not found");
    }

    if (!employee.id_proof_key) {
      throw new Error("No ID proof uploaded");
    }

    const signedUrl = await getSignedIdProofUrl(employee.id_proof_key);

    return {
      url: signedUrl,
      expiresIn: "5 minutes",
    };
  }

  async getAllEmployees(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const { data, total } = await this.employeeRepo.findAll(skip, limit);

    return {
      employees: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEmployeeById(id: string) {
    const employee = await this.employeeRepo.findByIdSafe(id);

    if (!employee) {
      throw new Error("Employee not found");
    }

    return employee;
  }
}
