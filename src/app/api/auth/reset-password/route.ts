import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashResetToken } from "@/lib/reset-token";

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { token, newPassword } = parsed.data;
  const hashedToken = hashResetToken(token);

  const user = await prisma.user.findUnique({ where: { resetToken: hashedToken } });
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 12),
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  return NextResponse.json({ ok: true });
}
