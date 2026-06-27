import nodemailer from 'nodemailer';

export async function sendServicePdfEmail(
  toEmail: string,
  subject: string,
  bodyText: string,
  pdfBuffer: Buffer,
  filename: string,
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `Xerocare Technical Services <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject,
    text: bodyText,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
}
