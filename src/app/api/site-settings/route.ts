import { NextResponse } from "next/server";
import { z } from "zod";
import { getSiteSettings } from "@/lib/site-settings";
import { requireSuperAdmin } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  siteName: z.string().trim().min(1).max(60).optional(),
  footerText: z.string().trim().max(500).optional(),
});

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  const admin = await requireSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  await getSiteSettings();
  const updated = await prisma.siteSettings.update({
    where: { id: "singleton" },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}
