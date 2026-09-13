import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateResetToken } from "@/lib/reset-token";
import { sendPasswordResetEmail } from "@/lib/mail";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(
    `forgot-password:${clientIp(request)}`,
    RATE_LIMIT,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) },
      },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond the same way, whether or not the account exists,
  // so this endpoint can't be used to enumerate registered emails.
  if (user) {
    const { rawToken, hashedToken } = generateResetToken();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const origin = new URL(request.url).origin;
    const resetUrl = `${origin}/reset-password/${rawToken}`;
    await sendPasswordResetEmail(email, resetUrl);
  }

  return NextResponse.json({
    ok: true,
    message: "If that email has an account, a reset link has been sent.",
  });
}
