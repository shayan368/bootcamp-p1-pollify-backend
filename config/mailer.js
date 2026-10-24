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

// Only verify SMTP connection during local development (avoid blocking serverless cold starts)
if (
  !process.env.VERCEL &&
  process.env.NODE_ENV !== "production" &&
  !process.env.RESEND_API_KEY &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
) {
  transporter.verify((error) => {
    if (error) {
      console.warn("⚠️ SMTP Mailer notice:", error.message);
    } else {
      console.log("✅ Mailer SMTP connection verified successfully.");
    }
  });
}

// Generic email sender supporting Brevo HTTP API, Resend HTTP API, and Nodemailer SMTP fallback
const sendMailMessage = async ({ to, subject, htmlContent }) => {
  // 1. Brevo HTTP API over Port 443 (HTTPS - Never blocked by Railway/Vercel)
  const brevoApiKey = process.env.BREVO_API_KEY || (process.env.SMTP_HOST?.includes("brevo") ? process.env.SMTP_PASS : null);
  if (brevoApiKey) {
    try {
      const senderEmail = process.env.EMAIL_FROM || "shayanahmad368@gmail.com";
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
        },
        body: JSON.stringify({
          sender: { name: "Pollify", email: senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent,
        }),
      });

      if (response.ok) {
        console.log(`✉️ Email ("${subject}") sent successfully via Brevo HTTP API to ${to}`);
        return;
      }
      const errData = await response.json().catch(() => ({}));
      console.warn("⚠️ Brevo HTTP API attempt notice:", errData.message || response.statusText);
    } catch (e) {
      console.warn("⚠️ Brevo HTTP API failed:", e.message);
    }
  }

  // 2. Resend HTTPS API (Port 443)
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
        subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Resend API returned status ${response.status}`);
    }

    console.log(`✉️ Email ("${subject}") sent successfully via Resend API to ${to}`);
    return;
  }

  // 3. Fallback: Nodemailer SMTP (Port 587 / 465)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("No valid email provider (Brevo API, Resend, or SMTP) configured.");
  }

  await transporter.sendMail({
    from: `"Pollify" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html: htmlContent,
  });

  console.log(`✉️ Email ("${subject}") sent successfully via SMTP to ${to}`);
};

// Send 6 digit OTP via email
export const sendOtpEmail = async (to, otp, reason = "verify your email") => {
  const htmlContent = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:440px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background-color:#ffffff">
      <h2 style="color:#10b981;margin:0 0 8px">Pollify</h2>
      <p style="color:#475569">Use this code to ${reason}:</p>
      <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#0f172a;margin:16px 0">${otp}</div>
      <p style="color:#94a3b8;font-size:13px">This code expires in 10 minutes. If you didn't request it, ignore this email.</p>
    </div>`;

  await sendMailMessage({
    to,
    subject: `${otp} is your Pollify code`,
    htmlContent,
  });
};

// Send Password Reset Link email
export const sendResetPasswordEmail = async (to, resetLink, resetToken) => {
  const htmlContent = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e2e8f0;border-radius:16px;background-color:#ffffff">
      <h2 style="color:#10b981;margin:0 0 12px;font-size:24px;font-weight:800">Pollify</h2>
      <h3 style="color:#0f172a;margin:0 0 12px;font-size:18px">Reset your password</h3>
      <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px">
        We received a request to reset the password for your Pollify account. Click the button below to choose a new password. The link will open in a new tab:
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${resetLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#10b981;color:#000000;font-weight:700;font-size:15px;padding:12px 28px;border-radius:8px;text-decoration:none">
          Create New Password →
        </a>
      </div>
      <p style="color:#64748b;font-size:13px;line-height:1.5;margin:20px 0 8px">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="word-break:break-all;font-size:12px;margin:0 0 20px">
        <a href="${resetLink}" target="_blank" rel="noopener noreferrer" style="color:#10b981;text-decoration:underline">
          ${resetLink}
        </a>
      </p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0" />
      <p style="color:#94a3b8;font-size:12px;line-height:1.4;margin:0">
        This password reset link will expire in 15 minutes. If you did not request a password reset, you can safely ignore this email — your account remains secure.
      </p>
    </div>`;

  await sendMailMessage({
    to,
    subject: "Reset your Pollify password",
    htmlContent,
  });
};


