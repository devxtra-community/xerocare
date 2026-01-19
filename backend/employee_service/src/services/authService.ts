import bcrypt from 'bcrypt';
import { EmployeeRepository } from '../repositories/employeeRepository';
import { verifyRefreshToken } from '../utlis/jwt';
import { AuthRepository } from '../repositories/authRepository';
import { AppError } from '../errors/appError';
import { AdminRepository } from '../repositories/adminRepository';

export class AuthService {
  private employeeRepo = new EmployeeRepository();
  private authRepo = new AuthRepository();
  private adminRepo = new AdminRepository();

  async login(payload: { email: string; password: string }) {
    // ... existing login code ...
    const { email, password } = payload;

    const user = await this.employeeRepo.findByEmail(email);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new AppError('Invalid password', 401);
    }

    return { user };
  }

  // ... existing refresh, logout, changePassword methods ...
  async refresh(refreshToken: string) {
    const payload = verifyRefreshToken<{ id: string }>(refreshToken);
    if (!payload) {
      throw new AppError('Invalid refresh token', 401);
    }

    const storedToken = await this.authRepo.findByToken(refreshToken);
    if (!storedToken) {
      throw new AppError('Token not found', 401);
    }

    const user = storedToken.employee || storedToken.admin;
    if (!user) {
      throw new AppError('User not found for this token', 404);
    }

    await this.authRepo.deleteToken(refreshToken);

    return user;
  }

  async logout(refreshToken: string) {
    await this.authRepo.deleteToken(refreshToken);
    return true;
  }

  async changePassword(payload: { userId: string; currentPassword: string; newPassword: string }) {
    const { userId, currentPassword, newPassword } = payload;

    const user = await this.employeeRepo.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect', 401);
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await this.employeeRepo.updatePassword(user.id, newHash);

    return true;
  }

  async findUserByEmail(email: string) {
    const user = await this.employeeRepo.findByEmail(email.toLowerCase().trim());

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async findUserById(id: string, role: string = 'EMPLOYEE') {
    let user;

    if (role === 'ADMIN') {
      user = await this.adminRepo.findById(id);
    } else {
      user = await this.employeeRepo.findById(id);
    }

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  async resetPassword(userId: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 10);
    await this.employeeRepo.updatePassword(userId, hash);
  }

  async logoutOtherDevices(userId: string, currentRefreshToken: string) {
    if (!currentRefreshToken) {
      throw new AppError('No refresh token found', 400);
    }

    await this.authRepo.deleteOtherTokens(userId, currentRefreshToken);

    return true;
  }

  async getSessions(userId: string, currentToken: string, is_admin: boolean = false) {
    const sessions = await this.authRepo.getUserSessions(userId, is_admin);

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
