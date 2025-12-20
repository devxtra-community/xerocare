import { OtpPurpose } from "../constants/otpPurpose";
import { redis } from "../config/redis";
import { publishEmailJob } from "../queues/emailProducer";

export class OtpService {
  private generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private getKey(email: string, purpose: OtpPurpose) {
    return `otp:${purpose}:${email}`;
  }

  async sendOtp(email: string, purpose: OtpPurpose) {
    const otp = this.generateOtp();
    const key = this.getKey(email, purpose);

    await redis.set(key, otp, "EX", 300);

    publishEmailJob({
      type: "OTP",
      email,
      otp,
    }).catch((err) => {
      console.error("Failed to queue OTP email", err);
    });
  }

  async verifyOtp(email: string, otp: string, purpose: OtpPurpose) {
    const key = this.getKey(email, purpose);

    const storedOtp = await redis.get(key);
    if (!storedOtp) {
      throw new Error("OTP expired or not found");
    }

    if (storedOtp !== otp) {
      throw new Error("Invalid OTP");
    }

    await redis.del(key);
    return true;
  }
}
