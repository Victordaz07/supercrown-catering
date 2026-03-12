import { prisma } from "@/lib/db";

export async function resolveAuditActorId(preferredId?: string | null): Promise<string | null> {
  if (preferredId) return preferredId;

  const fallback = await prisma.user.findFirst({
    where: { role: { in: ["MASTER", "ADMIN", "SALES"] } },
    select: { id: true },
  });

  return fallback?.id ?? null;
}
