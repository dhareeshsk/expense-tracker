import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/current-user";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: body?.isRead ?? true },
  });

  return NextResponse.json(updated);
}
