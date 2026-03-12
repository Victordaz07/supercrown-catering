import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { stripe } from "@/lib/stripe/stripeClient";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: invoiceId } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { order: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }

  if (invoice.status === "PAID") {
    return NextResponse.json(
      { error: "Esta factura ya está pagada" },
      { status: 409 },
    );
  }

  if (invoice.status === "VOID") {
    return NextResponse.json(
      { error: "Esta factura fue anulada" },
      { status: 409 },
    );
  }

  const isClient = session.user.role === "CLIENT";
  const isStaff = ["ADMIN", "MASTER"].includes(session.user.role);
  const isOwnOrder = invoice.order.customerEmail === session.user.email;

  if (!isStaff && !(isClient && isOwnOrder)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (invoice.stripePaymentIntentId && stripe) {
    try {
      const existing = await stripe.paymentIntents.retrieve(
        invoice.stripePaymentIntentId,
      );
      if (existing.status === "succeeded") {
        return NextResponse.json(
          { error: "Esta factura ya fue pagada vía Stripe" },
          { status: 409 },
        );
      }
      if (
        existing.status === "requires_payment_method" ||
        existing.status === "requires_confirmation"
      ) {
        return NextResponse.json({
          clientSecret: existing.client_secret,
          invoiceId: invoice.id,
        });
      }
    } catch {
      // Intent inválido o expirado, crear uno nuevo
    }
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "Pagos online no disponibles en este momento" },
      { status: 503 },
    );
  }

  const amount = Math.round(invoice.total * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "usd",
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      orderId: invoice.orderId,
      orderNumber: invoice.order.orderNumber,
      customerEmail: invoice.order.customerEmail,
    },
    receipt_email: invoice.order.customerEmail,
    description: `Factura ${invoice.invoiceNumber} — Super Crown Catering`,
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { stripePaymentIntentId: paymentIntent.id },
  });

  logAudit({
    userId: session.user.id,
    action: "PAYMENT_INTENT_CREATED",
    entity: "Invoice",
    entityId: invoiceId,
    metadata: {
      paymentIntentId: paymentIntent.id,
      amount: invoice.total,
    },
  }).catch((err) =>
    console.error("[AuditLog] PAYMENT_INTENT_CREATED failed:", err),
  );

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    invoiceId: invoice.id,
  });
}
