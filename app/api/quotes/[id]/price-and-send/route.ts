import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createRawToken, hashToken, addHours, type QuoteTokenScope } from "@/lib/quoteTokens";
import { resend } from "@/lib/email/resendClient";
import { generateQuoteReadyEmail } from "@/lib/email/templates/legacyTemplates";
import { logAudit } from "@/lib/audit";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const EXPIRES_HOURS = 72;

type RouteContext = { params: Promise<{ id: string }> };

type PriceItem = {
  itemId: string;
  name: string;
  category?: string;
  quantity: number;
  unitPrice: number;
};

function isSalesRole(role?: string) {
  return role === "MASTER" || role === "ADMIN" || role === "SALES";
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isSalesRole(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
    });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    const body = (await request.json()) as {
      items: PriceItem[];
      taxRate?: number;
      note?: string;
    };

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Items are required" }, { status: 400 });
    }

    const taxRate = typeof body.taxRate === "number" ? body.taxRate : 0.08;
    const subtotal = body.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    const lastRev = await prisma.quoteRevision.findFirst({
      where: { quoteId: quote.id },
      orderBy: { revisionNumber: "desc" },
    });
    const nextRevisionNumber = (lastRev?.revisionNumber ?? 0) + 1;

    const salesItemsSnapshot = body.items.map((i) => ({
      itemId: i.itemId,
      name: i.name,
      category: i.category ?? "",
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.unitPrice * i.quantity,
    }));

    const expiresAt = addHours(new Date(), EXPIRES_HOURS);
    const scopes: QuoteTokenScope[] = ["VIEW", "APPROVE", "REJECT", "PROPOSE_CHANGES"];

    const rawTokens: Record<QuoteTokenScope, string> = {
      VIEW: createRawToken(),
      APPROVE: createRawToken(),
      REJECT: createRawToken(),
      PROPOSE_CHANGES: createRawToken(),
    };

    await prisma.$transaction(async (tx) => {
      await tx.quoteRevision.create({
        data: {
          quoteId: quote.id,
          revisionNumber: nextRevisionNumber,
          createdByRole: "SALES",
          note: body.note?.trim() || null,
          itemsJson: JSON.stringify(salesItemsSnapshot),
          subtotal,
          taxRate,
          taxAmount,
          total,
        },
      });

      await tx.quote.update({
        where: { id: quote.id },
        data: {
          status: "SENT",
          activeSalesRevisionNumber: nextRevisionNumber,
        },
      });

      await tx.quoteActionToken.createMany({
        data: scopes.map((scope) => ({
          quoteId: quote.id,
          salesRevisionNumber: nextRevisionNumber,
          scope,
          tokenHash: hashToken(rawTokens[scope]),
          expiresAt,
        })),
      });
    });

    await logAudit({
      userId: session.user.id,
      action: "QUOTE_SENT",
      entity: "Quote",
      entityId: quote.id,
      metadata: { revisionNumber: nextRevisionNumber, clientEmail: quote.clientEmail },
    });

    const quoteUrl = `${SITE_URL}/q/${quote.id}?t=${rawTokens.VIEW}`;
    const approveUrl = `${SITE_URL}/q/${quote.id}?t=${rawTokens.APPROVE}`;
    const proposeChangesUrl = `${SITE_URL}/q/${quote.id}?t=${rawTokens.PROPOSE_CHANGES}`;
    const rejectUrl = `${SITE_URL}/q/${quote.id}?t=${rawTokens.REJECT}`;

    const itemsHtml = salesItemsSnapshot
      .map((i) => `${escapeHtml(i.name)} (×${i.quantity}) — ${money(i.unitPrice)} each`)
      .join("<br>");

    if (!resend) {
      return NextResponse.json({
        success: true,
        simulated: true,
        quoteUrl,
        approveUrl,
        proposeChangesUrl,
        rejectUrl,
      });
    }

    await resend.emails.send({
      from: "hello@supercrowncatering.com",
      to: quote.clientEmail,
      subject: `Your quote is ready — ${quote.quoteNumber}`,
      html: generateQuoteReadyEmail({
        customerName: quote.clientName,
        customerEmail: quote.clientEmail,
        quoteNumber: quote.quoteNumber,
        quoteTotal: money(total),
        quoteUrl,
        approveUrl,
        proposeChangesUrl,
        rejectUrl,
        itemsHtml,
        expiresInHours: EXPIRES_HOURS,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/quotes/[id]/price-and-send:", err);
    return NextResponse.json({ error: "Failed to price and send quote" }, { status: 500 });
  }
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

