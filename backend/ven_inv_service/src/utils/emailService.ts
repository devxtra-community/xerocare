import nodemailer from 'nodemailer';

// Same transport pattern as employee_service/src/utils/mailer.ts — the one
// actually wired to working credentials in every .env in this repo
// (MAIL_USER/MAIL_PASS, a Gmail account + app password). This file used to
// read SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS, which are never set anywhere
// — every send silently failed (caught by the caller, logged, never thrown
// to the user), so no service-ticket/quotation/completion-bill email has
// ever actually gone out.
function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

export async function sendServicePdfEmail(
  toEmail: string,
  subject: string,
  bodyText: string,
  pdfBuffer: Buffer,
  filename: string,
): Promise<void> {
  await getTransporter().sendMail({
    from: `Xerocare Technical Services <${process.env.MAIL_USER}>`,
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

/** Plain-text email, no attachment — e.g. the ticket-creation confirmation. */
export async function sendServiceEmail(
  toEmail: string,
  subject: string,
  bodyText: string,
): Promise<void> {
  await getTransporter().sendMail({
    from: `Xerocare Technical Services <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject,
    text: bodyText,
  });
}
