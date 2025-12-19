import crypto from "crypto";
import bcrypt from "bcrypt";
import { MagicLinkRepository } from "../repositories/magicLinkRepository";
import { sendMagicLinkMail } from "../utlis/mailer";

export class MagicLinkService {
  private repo = new MagicLinkRepository();

  private generateToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  async sendMagicLink(email: string) {
    const token = this.generateToken();
    const tokenHash = await bcrypt.hash(token, 10);

    await this.repo.create({
      email,
      token_hash: tokenHash,
      expires_at: new Date(Date.now() + 10 * 60 * 1000), 
    });

    const link = `${process.env.CLIENT_URL}/magic-login?email=${encodeURIComponent(
      email
    )}&token=${token}`;

    await sendMagicLinkMail(email, link);
  }

  async verifyMagicLink(email: string, token: string) {
    const record = await this.repo.findValidByEmail(email);

    if (!record) throw new Error("Invalid or expired link");
    if (record.expires_at < new Date())
      throw new Error("Link expired");

    const valid = await bcrypt.compare(token, record.token_hash);
    if (!valid) throw new Error("Invalid link");

    await this.repo.markUsed(record.id);
    return true;
  }
}
