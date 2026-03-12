import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { resolveAuditActorId } from "@/lib/auditActor";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const expiredQuotes = await prisma.quote.findMany({
    where: {
      status: { in: ["SENT", "CLIENT_PROPOSED_CHANGES"] },
      expiresAt: { lt: now },
    },
    select: { id: true, clientId: true },
  });

  if (expiredQuotes.length === 0) {
    return NextResponse.json({ expired: 0, quoteIds: [] });
  }

  const ids = expiredQuotes.map((q) => q.id);
  await prisma.quote.updateMany({
    where: { id: { in: ids } },
    data: { status: "EXPIRED" },
  });

  for (const quote of expiredQuotes) {
    const auditUserId = await resolveAuditActorId(quote.clientId);
    if (!auditUserId) continue;

    await logAudit({
      userId: auditUserId,
      action: "QUOTE_EXPIRED",
      entity: "Quote",
      entityId: quote.id,
      metadata: { expiredAt: now.toISOString() },
    });
  }

  return NextResponse.json({ expired: ids.length, quoteIds: ids });
}
