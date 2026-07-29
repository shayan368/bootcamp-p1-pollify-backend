import nodemailer from "nodemailer";

// transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

// send 6 digit otp via email
export const sendOtpEmail = async (to, otp, reason = "verify your email") => {
  await transporter.sendMail({
    from: `"Pollify" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to,
    subject: `${otp} is your Pollify code`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:440px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px">
        <h2 style="color:#4f46e5;margin:0 0 8px">Pollify</h2>
        <p style="color:#475569">Use this code to ${reason}:</p>
        <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#0f172a;margin:16px 0">${otp}</div>
        <p style="color:#94a3b8;font-size:13px">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
      </div>`,
  });
};
