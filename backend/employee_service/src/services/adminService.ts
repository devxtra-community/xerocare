import bcrypt from "bcrypt";
import { AdminRepository } from "../repositories/adminRepository";
import { AppError } from "../errors/appError";

export class AdminService {

  private adminRepo = new AdminRepository();

  async login(payload: { email: string; password: string }) {
    const { email, password } = payload;

    const admin = await this.adminRepo.findByEmail(email);
    if (!admin)
    {
        throw new AppError("Admin not found",404);
    }    

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid)
    {    
        throw new AppError("Invalid password",401);
    }
    
    return admin;
  }
}
