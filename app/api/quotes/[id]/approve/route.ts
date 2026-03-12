import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateQuoteToken, consumeQuoteToken } from "@/lib/quoteAuth";
import { logAudit } from "@/lib/audit";
import { resolveAuditActorId } from "@/lib/auditActor";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const { t } = (await request.json().catch(() => ({}))) as { t?: string };

  const session = await getServerSession(authOptions);
  const isClientSession = session?.user?.role === "CLIENT";

  if (!t && !isClientSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (t) {
    const validated = await validateQuoteToken({ quoteId: id, rawToken: t, requiredScope: "APPROVE" });
    if (!validated.ok) {
      return NextResponse.json({ error: `Invalid token (${validated.reason})` }, { status: 400 });
    }
    const updated = await prisma.quote.update({
      where: { id },
      data: {
        status: "CLIENT_APPROVED",
        approvedSalesRevisionNumber: validated.token.salesRevisionNumber,
      },
    });
    const auditUserId = await resolveAuditActorId(updated.clientId);
    if (auditUserId) {
      await logAudit({
        userId: auditUserId,
        action: "QUOTE_APPROVED",
        entity: "Quote",
        entityId: updated.id,
        metadata: { approvedRevision: updated.approvedSalesRevisionNumber, via: "token" },
      });
    }
    await consumeQuoteToken(t);
    return NextResponse.json({ success: true });
  }

  // Authenticated client path
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (!quote.clientId || quote.clientId !== session!.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!quote.activeSalesRevisionNumber) {
    return NextResponse.json({ error: "Quote not ready" }, { status: 400 });
  }
  const updated = await prisma.quote.update({
    where: { id },
    data: {
      status: "CLIENT_APPROVED",
      approvedSalesRevisionNumber: quote.activeSalesRevisionNumber,
    },
  });
  const auditUserId = await resolveAuditActorId(session?.user?.id ?? updated.clientId);
  if (auditUserId) {
    await logAudit({
      userId: auditUserId,
      action: "QUOTE_APPROVED",
      entity: "Quote",
      entityId: updated.id,
      metadata: { approvedRevision: updated.approvedSalesRevisionNumber, via: "session" },
    });
  }
  return NextResponse.json({ success: true });
}

