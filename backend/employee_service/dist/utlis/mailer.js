"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mailer = void 0;
exports.sendEmployeeWelcomeMail = sendEmployeeWelcomeMail;
exports.sendOtpMail = sendOtpMail;
const nodemailer_1 = __importDefault(require("nodemailer"));
exports.mailer = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});
async function sendEmployeeWelcomeMail(to, password) {
    await exports.mailer.sendMail({
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
async function sendOtpMail(to, otp, purpose) {
    await exports.mailer.sendMail({
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
