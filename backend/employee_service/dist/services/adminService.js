"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const adminRepository_1 = require("../repositories/adminRepository");
const jwt_1 = require("../utlis/jwt");
const authRepository_1 = require("../repositories/authRepository");
class AdminService {
    constructor() {
        this.adminRepo = new adminRepository_1.AdminRepository();
        this.authRepo = new authRepository_1.AuthRepository();
    }
    async login(payload) {
        const { email, password } = payload;
        const admin = await this.adminRepo.findByEmail(email);
        if (!admin) {
            throw new Error("Admin not found");
        }
        const isValid = await bcrypt_1.default.compare(password, admin.password_hash);
        if (!isValid) {
            throw new Error("Invalid password");
        }
        const accessToken = (0, jwt_1.signAccesstoken)({
            id: admin.id,
            email: admin.email,
            role: "ADMIN"
        });
        const refreshToken = (0, jwt_1.signRefreshtoken)({ id: admin.id });
        await this.authRepo.saveRefreshToken(admin, refreshToken);
        return { admin, accessToken, refreshToken };
    }
}
exports.AdminService = AdminService;
