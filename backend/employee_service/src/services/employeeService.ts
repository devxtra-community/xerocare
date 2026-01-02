import bcrypt from "bcrypt";
import { EmployeeRepository } from "../repositories/employeeRepository";
import { EmployeeRole } from "../constants/employeeRole";
import { generateRandomPassword } from "../utlis/passwordGenerator";
import { getSignedIdProofUrl } from "../utlis/r2SignedUrl";
import { publishEmailJob } from "../queues/emailProducer";
import { AppError } from "../errors/appError";
import { EmployeeStatus } from "../entities/employeeEntities";

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
      throw new AppError("Employee already Exist", 409);
    }

    if (role === EmployeeRole.ADMIN) {
      throw new AppError("You cannot create another admin", 403);
    }

    if (
      payload.role &&
      !Object.values(EmployeeRole).includes(payload.role as EmployeeRole)
    ) {
      throw new AppError("Invalid role", 400);
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
      throw new AppError("Employee not found", 404);
    }

    if (!employee.id_proof_key) {
      throw new AppError("No ID proof uploaded", 404);
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
      throw new AppError("Employee not found", 404);
    }

    return employee;
  }                                 
  
  async deleteEmployee(id:string) {
    const employee = await this.employeeRepo.findById(id);

    if(!employee)
    {
      throw new AppError("Employee not exist", 404)
    }

    if(employee.status === EmployeeStatus.DELETED)
    {
      throw new AppError("Employee Already deleted", 400)
    }

    employee.status = EmployeeStatus.DELETED;

    await this.employeeRepo.save(employee);

    return true;
  }
}
