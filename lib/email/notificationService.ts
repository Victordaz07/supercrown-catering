import { prisma } from "@/lib/db";
import { resend, EMAIL_FROM_DEFAULT, CLIENT_PORTAL_URL } from "./resendClient";
import * as orderTemplates from "./templates/orderTemplates";
import * as invoiceTemplates from "./templates/invoiceTemplates";

export type OrderEventType =
  | "orderConfirmed"
  | "orderInPreparation"
  | "orderInTransit"
  | "orderDelivered"
  | "orderCompleted"
  | "orderDisputed"
  | "orderCancelled";

export type InvoiceEventType =
  | "invoiceSent"
  | "invoicePaid"
  | "adjustmentApplied";

export type NotificationEventType = OrderEventType | InvoiceEventType;

function isOrderEvent(e: NotificationEventType): e is OrderEventType {
  return [
    "orderConfirmed",
    "orderInPreparation",
    "orderInTransit",
    "orderDelivered",
    "orderCompleted",
    "orderDisputed",
    "orderCancelled",
  ].includes(e);
}

function isInvoiceEvent(e: NotificationEventType): e is InvoiceEventType {
  return ["invoiceSent", "invoicePaid", "adjustmentApplied"].includes(e);
}

export async function sendOrderNotification(
  orderId: string,
  eventType: NotificationEventType,
  additionalData?: Record<string, unknown>,
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 1 },
      driver: { select: { name: true } },
    },
  });

  if (!order) {
    console.warn(`[Notification] Orden no encontrada: ${orderId}`);
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: order.customerEmail },
  });

  const prefs = (user?.notificationPrefs as Record<string, boolean>) ?? {};
  const emailEnabled = prefs.email !== false;
  const statusEnabled = prefs.statusUpdates !== false;
  const invoicesEnabled = prefs.invoices !== false;

  if (!emailEnabled) return;
  if (isOrderEvent(eventType) && !statusEnabled) return;
  if (isInvoiceEvent(eventType) && !invoicesEnabled) return;

  const portalUrl = CLIENT_PORTAL_URL;
  const eventDateStr =
    order.eventDate instanceof Date
      ? order.eventDate.toLocaleDateString()
      : String(order.eventDate);

  let template: { subject: string; html: string };

  switch (eventType) {
    case "orderConfirmed":
      template = orderTemplates.orderConfirmed({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        eventDate: eventDateStr,
        portalUrl,
      });
      break;
    case "orderInPreparation":
      template = orderTemplates.orderInPreparation({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        eventDate: eventDateStr,
        portalUrl,
      });
      break;
    case "orderInTransit":
      template = orderTemplates.orderInTransit({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        driverName:
          (additionalData?.driverName as string) ?? order.driver?.name,
        portalUrl,
      });
      break;
    case "orderDelivered":
      template = orderTemplates.orderDelivered({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        portalUrl,
      });
      break;
    case "orderCompleted":
      template = orderTemplates.orderCompleted({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        portalUrl,
      });
      break;
    case "orderDisputed":
      template = orderTemplates.orderDisputed({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        portalUrl,
      });
      break;
    case "orderCancelled":
      template = orderTemplates.orderCancelled({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        reason: additionalData?.reason as string | undefined,
        portalUrl,
      });
      break;
    default:
      console.warn(`[Notification] Evento no manejado: ${eventType}`);
      return;
  }

  if (!resend) {
    console.warn("[Email] Resend no configurado — email no enviado:", eventType);
    return;
  }

  const result = await resend.emails.send({
    from: EMAIL_FROM_DEFAULT,
    to: order.customerEmail,
    subject: template.subject,
    html: template.html,
  });

  try {
    await prisma.emailLog.create({
      data: {
        orderId,
        eventType,
        recipient: order.customerEmail,
        subject: template.subject,
        status: result.error ? "failed" : "sent",
        errorMessage: result.error?.message ?? null,
        resendId: result.data?.id ?? null,
      },
    });
  } catch (logErr) {
    console.error("[EmailLog] Error registrando email:", logErr);
  }

  if (result.error) {
    console.error("[Email] Error enviando", eventType, ":", result.error);
  }
}

export async function sendInvoiceNotification(
  invoiceId: string,
  eventType: InvoiceEventType,
  additionalData?: Record<string, unknown>,
): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { order: true },
  });

  if (!invoice) {
    console.warn(`[Notification] Factura no encontrada: ${invoiceId}`);
    return;
  }

  const order = invoice.order;
  const user = await prisma.user.findFirst({
    where: { email: order.customerEmail },
  });

  const prefs = (user?.notificationPrefs as Record<string, boolean>) ?? {};
  const emailEnabled = prefs.email !== false;
  const invoicesEnabled = prefs.invoices !== false;

  if (!emailEnabled) return;
  if (!invoicesEnabled) return;

  const portalUrl = CLIENT_PORTAL_URL;

  let template: { subject: string; html: string };

  switch (eventType) {
    case "invoiceSent":
      template = invoiceTemplates.invoiceSent({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        dueDate: invoice.dueDate?.toLocaleDateString(),
        portalUrl,
      });
      break;
    case "invoicePaid":
      template = invoiceTemplates.invoicePaid({
        customerName: order.customerName,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        portalUrl,
      });
      break;
    case "adjustmentApplied": {
      const adjustmentAmount = (additionalData?.adjustmentAmount as number) ?? 0;
      const allAdjustments = await prisma.invoiceAdjustment.findMany({
        where: { invoiceId },
      });
      const adjustmentSum = allAdjustments.reduce((s, a) => s + a.amount, 0);
      const newTotal = invoice.subtotal + invoice.taxAmount + adjustmentSum;
      template = invoiceTemplates.adjustmentApplied({
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        invoiceNumber: invoice.invoiceNumber,
        adjustmentAmount,
        newTotal,
        portalUrl,
      });
      break;
    }
    default:
      console.warn(`[Notification] Evento factura no manejado: ${eventType}`);
      return;
  }

  if (!resend) {
    console.warn("[Email] Resend no configurado — email no enviado:", eventType);
    return;
  }

  const result = await resend.emails.send({
    from: EMAIL_FROM_DEFAULT,
    to: order.customerEmail,
    subject: template.subject,
    html: template.html,
  });

  try {
    await prisma.emailLog.create({
      data: {
        orderId: order.id,
        eventType,
        recipient: order.customerEmail,
        subject: template.subject,
        status: result.error ? "failed" : "sent",
        errorMessage: result.error?.message ?? null,
        resendId: result.data?.id ?? null,
      },
    });
  } catch (logErr) {
    console.error("[EmailLog] Error registrando email:", logErr);
  }

  if (result.error) {
    console.error("[Email] Error enviando", eventType, ":", result.error);
  }
}
