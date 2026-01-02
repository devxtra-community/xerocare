import { redis } from "../config/redis";
import crypto from "crypto";
import { publishEmailJob } from "../queues/emailProducer";
import { AppError } from "../errors/appError";

export class MagicLinkService {

  async sendMagicLink(email: string) {
    const token = crypto.randomBytes(32).toString("hex");

    const key = `magic:login:${token}`;

    await redis.set(key, email, "EX", 600);

    const link = `${process.env.CLIENT_URL}/magic-login?token=${token}`;

    publishEmailJob({ type: "MAGIC", email, link }).catch(console.error);

  }

  async verifyMagicLink(token: string) {
    const key = `magic:login:${token}`;

    const email = await redis.get(key);
    if (!email) {
      throw new AppError("Invalid or expired magic link", 400);
    }

    await redis.del(key);

    return email;
  }
}
