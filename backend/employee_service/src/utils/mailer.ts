import nodemailer from 'nodemailer';
import * as XLSX from 'xlsx';

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
  // Parse the productList string into an array of objects for the Excel sheet
  const products = productList
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((item) => ({ 'Requested Product': item }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(products);

  // Auto-size the column width
  const max_width = products.reduce((w, r) => Math.max(w, r['Requested Product'].length), 10);
  ws['!cols'] = [{ wch: max_width + 5 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Products');

  // Write workbook to buffer
  const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // Modern HTML redesign
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f3f4f6;
          margin: 0;
          padding: 0;
          color: #374151;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .header {
          background-color: #004a8d;
          padding: 30px 20px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 20px;
        }
        .body-text {
          font-size: 15px;
          line-height: 1.6;
          color: #4b5563;
          margin-bottom: 25px;
        }
        .highlight-box {
          background-color: #f8fafc;
          border-left: 4px solid #3b82f6;
          padding: 15px 20px;
          border-radius: 4px;
          margin-bottom: 25px;
        }
        .message-box {
          background-color: #fffbeb;
          border: 1px solid #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 20px;
          border-radius: 6px;
          margin-bottom: 30px;
        }
        .message-title {
          font-size: 14px;
          font-weight: 700;
          color: #d97706;
          margin-top: 0;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        .message-content {
          margin: 0;
          font-size: 15px;
          color: #92400e;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .attachment-notice {
          display: flex;
          align-items: center;
          gap: 12px;
          background-color: #eff6ff;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .attachment-icon {
          font-size: 24px;
        }
        .attachment-text {
          font-size: 14px;
          color: #1e3a8a;
          margin: 0;
        }
        .footer {
          background-color: #f9fafb;
          padding: 20px 30px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
        }
        .logo {
          font-weight: 800;
          color: #1f2937;
          font-size: 16px;
          margin-top: 10px;
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Product Request</h1>
        </div>
        <div class="content">
          <div class="greeting">Hello ${vendorName},</div>
          
          <div class="body-text">
            We hope this email finds you well. XeroCare would like to request a new supply of products for our upcoming inventory needs.
          </div>

          <div class="attachment-notice">
            <span class="attachment-icon">📊</span>
            <p class="attachment-text">
              <strong>Action Required:</strong> Please find the detailed list of requested items attached as an Excel document (<code>Requested_Products.xlsx</code>). Let us know the availability and estimated delivery timeline.
            </p>
          </div>

          ${
            message
              ? `
          <div class="message-box">
            <h4 class="message-title">Special Instructions</h4>
            <p class="message-content">${message}</p>
          </div>
          `
              : ''
          }

          <div class="body-text">
            For any clarifications or updates, please reply directly to this email or contact your procurement representative. We appreciate your continued partnership.
          </div>
        </div>
        <div class="footer">
          <p>Thank you for doing business with us.</p>
          <span class="logo">Team XeroCare</span>
        </div>
      </div>
    </body>
    </html>
  `;

  await mailer.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: 'New Product Request from XeroCare',
    html: htmlContent,
    attachments: [
      {
        filename: 'Requested_Products.xlsx',
        content: excelBuffer,
      },
    ],
  });
}

export async function sendEmail(to: string, subject: string, html: string) {
  await mailer.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject,
    html,
  });
}
