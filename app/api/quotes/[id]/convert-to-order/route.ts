import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateOrderNumber } from "@/lib/orderUtils";
import { logAudit } from "@/lib/audit";
import { lockOrderPricing } from "@/lib/pricing/lockPrice";

type RouteContext = { params: Promise<{ id: string }> };

function isSalesRole(role?: string) {
  return role === "MASTER" || role === "ADMIN" || role === "SALES";
}

type SalesItem = {
  itemId: string;
  name: string;
  category?: string;
  quantity: number;
  unitPrice: number;
};

export async function POST(_request: Request, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isSalesRole(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    if (quote.expiresAt && quote.expiresAt < new Date()) {
      return NextResponse.json(
        {
          error: `Esta cotizacion expiro el ${quote.expiresAt.toLocaleDateString()}. Crea una nueva version para continuar.`,
        },
        { status: 410 },
      );
    }
    if (quote.status !== "CLIENT_APPROVED") {
      return NextResponse.json({ error: "Quote is not approved" }, { status: 400 });
    }
    const approvedRev = quote.approvedSalesRevisionNumber;
    if (!approvedRev) {
      return NextResponse.json({ error: "Missing approved revision" }, { status: 400 });
    }

    const approvedRevision = await prisma.quoteRevision.findUnique({
      where: { quoteId_revisionNumber: { quoteId: quote.id, revisionNumber: approvedRev } },
    });
    if (!approvedRevision) return NextResponse.json({ error: "Approved revision not found" }, { status: 404 });

    const items = safeParseSalesItems(approvedRevision.itemsJson);
    if (items.length === 0) {
      return NextResponse.json({ error: "No items in approved revision" }, { status: 400 });
    }

    const orderNumber = await generateOrderNumber();
    const totalItems = items.reduce((s, i) => s + (i.quantity ?? 0), 0);

    const order = await prisma.$transaction(async (tx) => {
      // Crear orden SIN priceSnapshot — lockOrderPricing lo añadirá con orderItemIds reales
      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          customerName: quote.clientName,
          customerEmail: quote.clientEmail,
          customerPhone: quote.clientPhone,
          deliveryAddress: quote.deliveryAddress,
          eventDate: quote.eventDate,
          guestCount: quote.guestCount,
          budget: quote.budget,
          typeOfService: quote.typeOfService,
          eventDetails: quote.eventDetails,
          totalItems,
          status: "PENDING",
          sourceQuoteId: quote.id,
          stateMachineV: 2,
          items: {
            create: items.map((i) => ({
              itemId: i.itemId,
              name: i.name,
              category: i.category ?? "",
              quantity: i.quantity,
              unitPrice: i.unitPrice,
            })),
          },
        },
      });

      const lockResult = await lockOrderPricing(
        createdOrder.id,
        session.user.id,
        tx,
      );
      if (!lockResult.success) {
        throw new Error(`Price lock failed: ${lockResult.error}`);
      }

      await tx.quote.update({
        where: { id: quote.id },
        data: { status: "CONVERTED", orderId: createdOrder.id },
      });

      return createdOrder;
    });

    const snapshot = order.priceSnapshot as { total?: number } | null;
    const totalForAudit = snapshot?.total ?? 0;

    await logAudit({
      userId: session.user.id,
      action: "QUOTE_CONVERTED",
      entity: "Quote",
      entityId: quote.id,
      metadata: { orderId: order.id, total: totalForAudit },
    });

    return NextResponse.json({ success: true, orderId: order.id, orderNumber });
  } catch (err) {
    console.error("POST /api/quotes/[id]/convert-to-order:", err);
    return NextResponse.json({ error: "Failed to convert quote" }, { status: 500 });
  }
}

function safeParseSalesItems(itemsJson: string): SalesItem[] {
  try {
    const parsed = JSON.parse(itemsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x.quantity === "number" && typeof x.unitPrice === "number")
      .map((x) => ({
        itemId: String(x.itemId ?? ""),
        name: String(x.name ?? ""),
        category: String(x.category ?? ""),
        quantity: Number(x.quantity) || 0,
        unitPrice: Number(x.unitPrice) || 0,
      }))
      .filter((x) => x.itemId && x.name && x.quantity > 0);
  } catch {
    return [];
  }
}

