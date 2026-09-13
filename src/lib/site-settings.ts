import { prisma } from "@/lib/prisma";

const SETTINGS_ID = "singleton";

export async function getSiteSettings() {
  const existing = await prisma.siteSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  if (existing) return existing;

  return prisma.siteSettings.create({
    data: { id: SETTINGS_ID },
  });
}
