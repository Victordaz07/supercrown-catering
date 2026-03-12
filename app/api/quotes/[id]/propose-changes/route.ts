import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateQuoteToken, consumeQuoteToken } from "@/lib/quoteAuth";
import { logAudit } from "@/lib/audit";
import { resolveAuditActorId } from "@/lib/auditActor";

type RouteContext = { params: Promise<{ id: string }> };

type ClientItem = {
  itemId: string;
  name: string;
  category?: string;
  quantity: number;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    t?: string;
    items?: ClientItem[];
    note?: string;
  };

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Items are required" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const isClientSession = session?.user?.role === "CLIENT";
  if (!body.t && !isClientSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (body.t) {
    const validated = await validateQuoteToken({
      quoteId: id,
      rawToken: body.t,
      requiredScope: "PROPOSE_CHANGES",
    });
    if (!validated.ok) {
      return NextResponse.json({ error: `Invalid token (${validated.reason})` }, { status: 400 });
    }

    const revNo = await nextRevisionNumber(id);
    const updated = await prisma.quote.update({
      where: { id },
      data: {
        status: "CLIENT_PROPOSED_CHANGES",
        revisions: {
          create: {
            revisionNumber: revNo,
            createdByRole: "CLIENT",
            note: body.note?.toString().trim() || null,
            itemsJson: JSON.stringify(
              items.map((i) => ({
                itemId: i.itemId,
                name: i.name,
                category: i.category ?? "",
                quantity: i.quantity,
              }))
            ),
          },
        },
      },
    });
    const auditUserId = await resolveAuditActorId(updated.clientId);
    if (auditUserId) {
      await logAudit({
        userId: auditUserId,
        action: "QUOTE_CHANGES_PROPOSED",
        entity: "Quote",
        entityId: updated.id,
        metadata: { itemCount: items.length, via: "token" },
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

  const revNo = await nextRevisionNumber(id);
  const updated = await prisma.quote.update({
    where: { id },
    data: {
      status: "CLIENT_PROPOSED_CHANGES",
      revisions: {
        create: {
          revisionNumber: revNo,
          createdByRole: "CLIENT",
          note: body.note?.toString().trim() || null,
          itemsJson: JSON.stringify(
            items.map((i) => ({
              itemId: i.itemId,
              name: i.name,
              category: i.category ?? "",
              quantity: i.quantity,
            }))
          ),
        },
      },
    },
  });
  const auditUserId = await resolveAuditActorId(session?.user?.id ?? updated.clientId);
  if (auditUserId) {
    await logAudit({
      userId: auditUserId,
      action: "QUOTE_CHANGES_PROPOSED",
      entity: "Quote",
      entityId: updated.id,
      metadata: { itemCount: items.length, via: "session" },
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

