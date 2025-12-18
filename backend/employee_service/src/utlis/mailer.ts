import nodemailer from "nodemailer";
import { OtpPurpose } from "../constants/otpPurpose";

export const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendEmployeeWelcomeMail(
  to: string,
  password: string
) {
  await mailer.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: "Welcome to XeroCare – Your Login Details",
    html: `
      <h2>Welcome to XeroCare</h2>
      <p>Your account has been created.</p>

      <p><b>Email:</b> ${to}</p>
      <p><b>Temporary Password:</b> ${password}</p>

      <p>You can login using this password and change it anytime later.</p>

      <br/>
      <p>— Team XeroCare </p>
    `,
  });
}

export async function sendOtpMail(to: string, otp: string ,purpose: OtpPurpose) {
  await mailer.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: "Your Login OTP",
    html: `
      <h2>OTP Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for 5 minutes.</p>
    `,
  });
}