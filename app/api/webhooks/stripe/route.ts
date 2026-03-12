import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/stripeClient";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  const invoice = await prisma.invoice.findUnique({
    where: { stripePaymentIntentId: intent.id },
    include: { order: true },
  });

  if (!invoice) {
    console.error("[Webhook] Invoice no encontrada para intent:", intent.id);
    return;
  }

  if (invoice.status === "PAID") {
    console.log("[Webhook] Invoice ya estaba pagada:", invoice.id);
    return;
  }

  let receiptUrl: string | null = null;
  if (intent.latest_charge && stripe) {
    const charge =
      typeof intent.latest_charge === "string"
        ? await stripe.charges.retrieve(intent.latest_charge)
        : intent.latest_charge;
    receiptUrl = charge.receipt_url ?? null;
  }

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      paidAmount: intent.amount_received / 100,
      paymentMethod: "CARD",
      paymentRef: intent.id,
      receiptUrl,
    },
  });

  await logAudit({
    userId: "stripe_webhook",
    action: "INVOICE_PAID_STRIPE",
    entity: "Invoice",
    entityId: invoice.id,
    metadata: {
      amount: intent.amount_received / 100,
      intentId: intent.id,
      orderId: invoice.orderId,
    },
  }).catch((err) =>
    console.error("[AuditLog] INVOICE_PAID_STRIPE failed:", err),
  );

  const { sendInvoiceNotification } = await import(
    "@/lib/email/notificationService"
  );
  sendInvoiceNotification(invoice.id, "invoicePaid").catch((err) =>
    console.error("[Notification] invoicePaid failed:", err),
  );

  const { attemptOrderClosure } = await import("@/lib/orders/closeOrder");
  attemptOrderClosure(invoice.orderId).catch((err) =>
    console.error("[AutoClose] Failed for order:", invoice.orderId, err),
  );
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature" },
      { status: 400 },
    );
  }

  if (!stripe) {
    console.error("[Webhook] Stripe no configurado");
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[Webhook] STRIPE_WEBHOOK_SECRET no configurada");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[Webhook] Firma inválida:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;
      await handlePaymentSucceeded(intent);
      break;
    }
    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.warn(
        "[Webhook] Pago fallido:",
        intent.id,
        intent.last_payment_error,
      );
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
