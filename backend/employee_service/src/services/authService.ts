import bcrypt from "bcrypt";
import { EmployeeRepository } from "../repositories/employeeRepository";
import { signAccesstoken,signRefreshtoken,verifyRefreshToken } from "../utlis/jwt";
import { AuthRepository } from "../repositories/authRepository";

export class AuthService {
  private employeeRepo = new EmployeeRepository();
  private authRepo = new AuthRepository();

  async login(payload:{email:string,password:string}) {

    const{email,password}=payload

    const user = await this.employeeRepo.findByEmail(email);
    if(!user)
    {
      throw new Error("User not found");
    }

    const isValid = await bcrypt.compare(password,user.password_hash);
    if(!isValid)
    {
      throw new Error("Invalid password");
    }

    const accessToken = signAccesstoken({
      id:user.id,
      email:user.email,
      role:user.role
    });

    const refreshToken = signRefreshtoken({id:user.id})

    await this.authRepo.saveRefreshToken(user,refreshToken);

    return {user,accessToken,refreshToken};
  }

  async refresh(refreshToken:string){

    const payload = verifyRefreshToken<{id:string}>(refreshToken);
    if(!payload)
    {
      throw new Error("Invalid refresh token");
    }

    const storedToken = await this.authRepo.findByToken(refreshToken);
    if(!storedToken)
    {
      throw new Error("Token not found");
    }

    const user = storedToken.employee;
    if (!user) throw new Error("User not found for this token");

    const newRefreshToken = signRefreshtoken({id:user?.id});
    await this.authRepo.deleteToken(refreshToken)
    await this.authRepo.saveRefreshToken(user, newRefreshToken)

    const newAccessToken = signAccesstoken({
      id:user?.id,
      email:user?.email,
      role:user?.role
    })

    return{ accessToken : newAccessToken , refreshToken : newRefreshToken};

  } 

  async logout(refreshToken:string){
    await this.authRepo.deleteToken(refreshToken);
    return true;
  }
}
