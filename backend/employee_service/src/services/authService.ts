import bcrypt from "bcrypt";
import { EmployeeRepository } from "../repositories/employeeRepository";
import { verifyRefreshToken } from "../utlis/jwt";
import { AuthRepository } from "../repositories/authRepository";

export class AuthService {
  private employeeRepo = new EmployeeRepository();
  private authRepo = new AuthRepository();

  async login(payload: { email: string; password: string }) {
    const { email, password } = payload;

    const user = await this.employeeRepo.findByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error("Invalid password");
    }

    return { user };
  }

  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken<{ id: string }>(refreshToken);
    if (!payload) {
      throw new Error("Invalid refresh token");
    }

    const storedToken = await this.authRepo.findByToken(refreshToken);
    if (!storedToken) {
      throw new Error("Token not found");
    }

    const user = storedToken.employee;
    if (!user) {
      throw new Error("User not found for this token");
    }

    await this.authRepo.deleteToken(refreshToken);

    return user;
  }

  async logout(refreshToken: string) {
    await this.authRepo.deleteToken(refreshToken);
    return true;
  }

  async changePassword(payload: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }) {
    const { userId, currentPassword, newPassword } = payload;

    const user = await this.employeeRepo.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw new Error("Current password is incorrect");
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await this.employeeRepo.updatePassword(user.id, newHash);

    return true;
  }

  async findUserByEmail(email: string) {
    const user = await this.employeeRepo.findByEmail(
      email.toLowerCase().trim()
    );

    if (!user) {
      throw new Error("User not found");
    }

    return user;
  }

  async resetPassword(userId: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 10);
    await this.employeeRepo.updatePassword(userId, hash);
  }

  async logoutOtherDevices(userId: string, currentRefreshToken: string) {
    if (!currentRefreshToken) {
      throw new Error("No refresh token found");
    }

    await this.authRepo.deleteOtherTokens(userId, currentRefreshToken);

    return true;
  }

  async getSessions(userId: string, currentToken: string) {
    const sessions = await this.authRepo.getUserSessions(userId);

    return sessions.map((s) => ({
      id: s.id,
      ip: s.ip_address,
      userAgent: s.user_agent,
      createdAt: s.createdAt,
      isCurrent: s.refresh_token === currentToken,
    }));
  }

  async logoutSession(userId: string, sessionId: string) {
    await this.authRepo.deleteSessionById(sessionId, userId);
    return true;
  }

}
