"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const otpRepository_1 = require("../repositories/otpRepository");
const mailer_1 = require("../utlis/mailer");
class OtpService {
    constructor() {
        this.otpRepo = new otpRepository_1.OtpRepository();
    }
    generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async sendOtp(email, purpose) {
        const otp = this.generateOtp();
        const otpHash = await bcrypt_1.default.hash(otp, 10);
        await this.otpRepo.createOtp({
            email,
            otp_hash: otpHash,
            purpose,
            expires_at: new Date(Date.now() + 5 * 60 * 1000),
        });
        await (0, mailer_1.sendOtpMail)(email, otp, purpose);
    }
    async verifyOtp(email, otp, purpose) {
        const record = await this.otpRepo.findLatest(email, purpose);
        if (!record)
            throw new Error("OTP not found");
        if (record.is_used)
            throw new Error("OTP already used");
        if (record.expires_at < new Date())
            throw new Error("OTP expired");
        const valid = await bcrypt_1.default.compare(otp, record.otp_hash);
        if (!valid)
            throw new Error("Invalid OTP");
        await this.otpRepo.markUsed(record.id);
        return true;
    }
}
exports.OtpService = OtpService;
