"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const employeeRepository_1 = require("../repositories/employeeRepository");
const jwt_1 = require("../utlis/jwt");
const authRepository_1 = require("../repositories/authRepository");
class AuthService {
    constructor() {
        this.employeeRepo = new employeeRepository_1.EmployeeRepository();
        this.authRepo = new authRepository_1.AuthRepository();
    }
    async login(payload) {
        const { email, password } = payload;
        const user = await this.employeeRepo.findByEmail(email);
        if (!user) {
            throw new Error("User not found");
        }
        const isValid = await bcrypt_1.default.compare(password, user.password_hash);
        if (!isValid) {
            throw new Error("Invalid password");
        }
        return { user };
    }
    async refresh(refreshToken) {
        const payload = (0, jwt_1.verifyRefreshToken)(refreshToken);
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
    async logout(refreshToken) {
        await this.authRepo.deleteToken(refreshToken);
        return true;
    }
    async changePassword(payload) {
        const { userId, currentPassword, newPassword } = payload;
        const user = await this.employeeRepo.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        const isMatch = await bcrypt_1.default.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            throw new Error("Current password is incorrect");
        }
        const newHash = await bcrypt_1.default.hash(newPassword, 10);
        await this.employeeRepo.updatePassword(user.id, newHash);
        return true;
    }
    async findUserByEmail(email) {
        const user = await this.employeeRepo.findByEmail(email.toLowerCase().trim());
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    }
    async resetPassword(userId, newPassword) {
        const hash = await bcrypt_1.default.hash(newPassword, 10);
        await this.employeeRepo.updatePassword(userId, hash);
    }
}
exports.AuthService = AuthService;
