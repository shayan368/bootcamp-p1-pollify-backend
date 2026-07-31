import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST || "smtp.gmail.com";
const isGmail = host.includes("gmail");

// Nodemailer SMTP fallback (for local development or providers allowing SMTP)
const transporter = nodemailer.createTransport(
  isGmail
    ? {
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS?.replace(/\s+/g, ""),
        },
        family: 4,
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      }
    : {
        host: host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        family: 4,
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
        tls: {
          rejectUnauthorized: false,
        },
      }
);

if (!process.env.RESEND_API_KEY && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter.verify((error) => {
    if (error) {
      console.warn("⚠️ SMTP Mailer notice:", error.message);
    } else {
      console.log("✅ Mailer SMTP connection verified successfully.");
    }
  });
}

// Send 6 digit OTP via email (Supports Resend HTTP API on port 443 and Nodemailer SMTP)
export const sendOtpEmail = async (to, otp, reason = "verify your email") => {
  const htmlContent = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:440px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px">
      <h2 style="color:#4f46e5;margin:0 0 8px">Pollify</h2>
      <p style="color:#475569">Use this code to ${reason}:</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#0f172a;margin:16px 0">${otp}</div>
      <p style="color:#94a3b8;font-size:13px">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
    </div>`;

  // 1. Preferred for Cloud Hosts (Railway/Vercel): Resend HTTPS API (Port 443 - Never blocked)
  if (process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || "Pollify <onboarding@resend.dev>",
        to: [to],
        subject: `${otp} is your Pollify code`,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Resend API returned status ${response.status}`);
    }

    console.log(`✉️ OTP Email sent successfully via Resend API to ${to}`);
    return;
  }

  // 2. Fallback: Nodemailer SMTP
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("Neither RESEND_API_KEY nor SMTP_USER/SMTP_PASS are configured in environment variables.");
  }

  await transporter.sendMail({
    from: `"Pollify" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to,
    subject: `${otp} is your Pollify code`,
    html: htmlContent,
  });

  console.log(`✉️ OTP Email sent successfully via SMTP to ${to}`);
};


