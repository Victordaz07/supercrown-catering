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
  const body = (await request.json().catch(() => ({}))) as { t?: string; reason?: string };
  const reason = (body.reason ?? "").toString().trim();

  const session = await getServerSession(authOptions);
  const isClientSession = session?.user?.role === "CLIENT";

  if (!body.t && !isClientSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!reason) {
    return NextResponse.json({ error: "Reason is required" }, { status: 400 });
  }

  if (body.t) {
    const validated = await validateQuoteToken({ quoteId: id, rawToken: body.t, requiredScope: "REJECT" });
    if (!validated.ok) {
      return NextResponse.json({ error: `Invalid token (${validated.reason})` }, { status: 400 });
    }
    const updated = await prisma.quote.update({
      where: { id },
      data: {
        status: "CLIENT_REJECTED",
        revisions: {
          create: {
            revisionNumber: (await nextRevisionNumber(id)),
            createdByRole: "CLIENT",
            note: `Rejected: ${reason}`,
            itemsJson: "[]",
          },
        },
      },
    });
    const auditUserId = await resolveAuditActorId(updated.clientId);
    if (auditUserId) {
      await logAudit({
        userId: auditUserId,
        action: "QUOTE_REJECTED",
        entity: "Quote",
        entityId: updated.id,
        metadata: { reason, via: "token" },
      });
    }
    await consumeQuoteToken(body.t);
    return NextResponse.json({ success: true });
  }

  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  if (!quote.clientId || quote.clientId !== session!.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.quote.update({
    where: { id },
    data: {
      status: "CLIENT_REJECTED",
      revisions: {
        create: {
          revisionNumber: (await nextRevisionNumber(id)),
          createdByRole: "CLIENT",
          note: `Rejected: ${reason}`,
          itemsJson: "[]",
        },
      },
    },
  });
  const auditUserId = await resolveAuditActorId(session?.user?.id ?? updated.clientId);
  if (auditUserId) {
    await logAudit({
      userId: auditUserId,
      action: "QUOTE_REJECTED",
      entity: "Quote",
      entityId: updated.id,
      metadata: { reason, via: "session" },
    });
  }
  return NextResponse.json({ success: true });
}

async function nextRevisionNumber(quoteId: string) {
  const last = await prisma.quoteRevision.findFirst({
    where: { quoteId },
    orderBy: { revisionNumber: "desc" },
    select: { revisionNumber: true },
  });
  return (last?.revisionNumber ?? 0) + 1;
}

