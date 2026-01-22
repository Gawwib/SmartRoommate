const nodemailer = require('nodemailer');

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  SMTP_FROM
} = process.env;

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT ? Number(SMTP_PORT) : 587,
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

const fromAddress = SMTP_FROM || SMTP_USER || 'no-reply@smartroommate.local';

async function sendMail({ to, subject, text, html }) {
  if (!to) return;
  if (!transporter) {
    console.log('[MAIL NO-OP]', { to, subject, text, html });
    return;
  }
  await transporter.sendMail({
    from: fromAddress,
    to,
    subject,
    text,
    html
  });
}

module.exports = { sendMail };
