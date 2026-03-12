import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN", "SALES"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { note?: string };
  const note = body.note?.trim() || null;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
  });
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
  if (quote.status === "CONVERTED") {
    return NextResponse.json({ error: "Esta cotizacion ya fue convertida a orden" }, { status: 409 });
  }

  const lastRevision = quote.revisions[0];
  if (!lastRevision) {
    return NextResponse.json({ error: "No se encontro una revision base" }, { status: 400 });
  }

  const nextRevisionNumber = lastRevision.revisionNumber + 1;
  const created = await prisma.$transaction(async (tx) => {
    const newRevision = await tx.quoteRevision.create({
      data: {
        quoteId: quote.id,
        revisionNumber: nextRevisionNumber,
        createdByRole: session.user.role,
        itemsJson: lastRevision.itemsJson,
        subtotal: null,
        taxRate: null,
        taxAmount: null,
        total: null,
        note,
      },
    });

    const updatedQuote = await tx.quote.update({
      where: { id: quote.id },
      data: {
        activeSalesRevisionNumber: nextRevisionNumber,
        ...(quote.status === "CLIENT_REJECTED" || quote.status === "CLIENT_PROPOSED_CHANGES"
          ? { status: "PRICING" }
          : {}),
      },
    });

    return { quote: updatedQuote, newRevision };
  });

  await logAudit({
    userId: session.user.id,
    action: "QUOTE_NEW_REVISION",
    entity: "Quote",
    entityId: quote.id,
    metadata: { revisionNumber: created.newRevision.revisionNumber, note },
  });

  return NextResponse.json(created);
}
