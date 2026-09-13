import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Re-checks the role against the database rather than trusting the session
 * JWT, which can be stale if a role was changed after the token was issued.
 */
export async function requireSuperAdmin(): Promise<{ id: string } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "SUPER_ADMIN") return null;

  return { id: user.id };
}

export async function requireUser(): Promise<{
  id: string;
  email: string;
} | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;
  return { id: session.user.id, email: session.user.email };
}
