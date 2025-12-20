import bcrypt from "bcrypt";
import { AdminRepository } from "../repositories/adminRepository";
import { signAccesstoken, signRefreshtoken } from "../utlis/jwt";
import { AuthRepository } from "../repositories/authRepository";

export class AdminService {

  private adminRepo = new AdminRepository();
  private authRepo = new AuthRepository();

  async login(payload: { email: string; password: string }) {
    const { email, password } = payload;

    const admin = await this.adminRepo.findByEmail(email);
    if (!admin)
    {
        throw new Error("Admin not found");
    }    

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid)
    {    
        throw new Error("Invalid password");
    }
    
    return admin;
  }
}
