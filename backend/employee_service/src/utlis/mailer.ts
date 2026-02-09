import nodemailer from 'nodemailer';

export const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendEmployeeWelcomeMail(to: string, password: string) {
  await mailer.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: 'Welcome to XeroCare – Your Login Details',
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

export async function sendOtpMail(to: string, otp: string) {
  await mailer.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: 'Your Login OTP',
    html: `
      <h2>OTP Verification</h2>
      <p>Your OTP is:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for 5 minutes.</p>
    `,
  });
}

export async function sendMagicLinkMail(to: string, link: string) {
  await mailer.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: 'Login to your account',
    html: `
      <h2>Passwordless Login</h2>
      <p>Click the link below to log in:</p>
      <a href="${link}">${link}</a>
      <p>This link expires in 10 minutes.</p>
    `,
  });
}

export async function sendVendorWelcomeMail(to: string, vendorName: string) {
  await mailer.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: 'Welcome to XeroCare – Vendor Registration Successful',
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

export async function sendLoginAlertMail(
  to: string,
  details: { device: string; browser: string; os: string; ip: string; time: string },
) {
  await mailer.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: 'Security Alert: New Login Detected',
    html: `
      <h2>New Login Alert</h2>
      <p>Hello,</p>
      <p>Your XeroCare account was just logged into from a new device.</p>
      <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px;">
        <p><b>Device:</b> ${details.device}</p>
        <p><b>Browser:</b> ${details.browser}</p>
        <p><b>OS:</b> ${details.os}</p>
        <p><b>IP Address:</b> ${details.ip}</p>
        <p><b>Time:</b> ${details.time}</p>
      </div>
      <p>If this was you, you can ignore this email. If you don't recognize this activity, please change your password immediately.</p>
      <br/>
      <p>— Team XeroCare</p>
    `,
  });
}

export async function sendProductRequestMail(
  to: string,
  vendorName: string,
  productList: string,
  message: string,
) {
  await mailer.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: 'New Product Request from XeroCare',
    html: `
      <h2>Product Request</h2>
      <p>Hello ${vendorName},</p>
      <p>We have a new product request for you.</p>

      <h3>Requested Products:</h3>
      <div style="background-color: #f4f4f4; padding: 15px; border-radius: 5px; white-space: pre-wrap;">
        ${productList}
      </div>

      ${
        message
          ? `
        <h3>Message:</h3>
        <p style="background-color: #fff3cd; padding: 10px; border-radius: 5px;">
          ${message}
        </p>
      `
          : ''
      }

      <br/>
      <p>Please review and confirm availability.</p>
      <p>— Team XeroCare</p>
    `,
  });
}
