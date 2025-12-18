import bcrypt from "bcrypt";
import { OtpRepository } from "../repositories/otpRepository";
import { sendOtpMail } from "../utlis/mailer";
import { OtpPurpose } from "../constants/otpPurpose";

export class OtpService {
  private otpRepo = new OtpRepository();

  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(email: string, purpose :OtpPurpose) {
    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await this.otpRepo.createOtp({
      email,
      otp_hash: otpHash,
      purpose,
      expires_at: new Date(Date.now() + 5 * 60 * 1000), 
    });

    await sendOtpMail(email, otp, purpose);
  }

  async verifyOtp(email: string, otp: string, purpose : OtpPurpose) {
    const record = await this.otpRepo.findLatest(email,purpose);

    if (!record) throw new Error("OTP not found");
    if (record.is_used) throw new Error("OTP already used");
    if (record.expires_at < new Date()) throw new Error("OTP expired");

    const valid = await bcrypt.compare(otp, record.otp_hash);
    if (!valid) throw new Error("Invalid OTP");

    await this.otpRepo.markUsed(record.id);
    return true;
  }
}
