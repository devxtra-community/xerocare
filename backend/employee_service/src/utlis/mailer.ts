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

export async function sendMagicLinkMail(
  to: string,
  link: string
) {
  await mailer.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: "Login to your account",
    html: `
      <h2>Passwordless Login</h2>
      <p>Click the link below to log in:</p>
      <a href="${link}">${link}</a>
      <p>This link expires in 10 minutes.</p>
    `,
  });
}

export async function sendVendorWelcomeMail(
  to: string,
  vendorName: string
) {
  await mailer.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: "Welcome to XeroCare – Vendor Registration Successful",
    html: `
      <h2>Welcome, ${vendorName} </h2>

      <p>
        We are pleased to inform you that your vendor profile has been
        successfully created in the <strong>XeroCare system</strong>.
      </p>

      <p>
        Our procurement and operations team will contact you whenever
        there are requirements related to inventory or supplies.
      </p>

      <p>
        <b>Note:</b> This is an informational email only.
        Vendors do not have direct login access to the system.
      </p>

      <br/>
      <p>— Team XeroCare</p>
    `,
  });
}

