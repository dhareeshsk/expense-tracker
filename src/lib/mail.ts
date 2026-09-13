import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  if (!resend) {
    console.warn(
      "RESEND_API_KEY not set - skipping password reset email. Reset URL:",
      resetUrl,
    );
    return;
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev",
    to: email,
    subject: "Reset your password",
    html: `
      <p>Someone requested a password reset for this account.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}
