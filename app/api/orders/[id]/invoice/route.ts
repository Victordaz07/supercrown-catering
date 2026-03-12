import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateInvoiceNumber } from "@/lib/invoiceUtils";
import { generateInvoicePDFBuffer } from "@/lib/generateInvoicePDF";
import { logAudit } from "@/lib/audit";
import { checkPriceLock } from "@/lib/pricing/enforcePriceLock";
import type { PriceSnapshot } from "@/lib/pricing/lockPrice";
import path from "path";
import fs from "fs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["MASTER", "ADMIN", "SALES"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  let body: { itemPrices?: Record<string, number> } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const lockCheck = checkPriceLock(order, body as Record<string, unknown>);
  if (lockCheck.blocked) {
    return NextResponse.json({ error: lockCheck.message }, { status: 409 });
  }

  const existingInvoice = await prisma.invoice.findFirst({
    where: { orderId: id },
  });
  if (existingInvoice) {
    return NextResponse.json(
      { error: "Invoice already exists", invoiceId: existingInvoice.id },
      { status: 400 },
    );
  }

  // EPIC2+EPIC6: Si la orden tiene priceSnapshot (pricingLockedAt),
  // la factura se genera desde el snapshot inmutable, no desde items live.
  // body.itemPrices es ignorado para órdenes con price lock.
  const useSnapshot = !!order.pricingLockedAt && !!order.priceSnapshot;

  let subtotal: number;
  let taxRate: number;
  let taxAmount: number;
  let total: number;
  let itemsForPdf: { id: string; name: string; category: string; quantity: number }[];

  if (useSnapshot) {
    if (Object.keys(body.itemPrices ?? {}).length > 0) {
      console.warn(`[Invoice] orderId=${id}: price lock activo, body.itemPrices ignorado`);
    }
    const snapshot = order.priceSnapshot as unknown as PriceSnapshot;
    subtotal = snapshot.subtotal;
    taxRate = snapshot.taxRate;
    taxAmount = snapshot.taxAmount;
    total = snapshot.total;
    itemsForPdf = snapshot.items.map((it) => ({
      id: it.orderItemId ?? (it as { productId?: string }).productId ?? "",
      name: it.name ?? (it as { productName?: string }).productName ?? "",
      category: it.category ?? "",
      quantity: it.quantity,
    }));
  } else {
    const itemPrices = body.itemPrices ?? {};
    if (Object.keys(itemPrices).length > 0) {
      for (const item of order.items) {
        const price = itemPrices[item.id];
        if (price !== undefined && price > 0) {
          await prisma.orderItem.update({
            where: { id: item.id },
            data: { unitPrice: price },
          });
        }
      }
    }
    const updatedItems = await prisma.orderItem.findMany({
      where: { orderId: id },
    });
    subtotal = updatedItems.reduce(
      (sum, it) => sum + it.unitPrice * it.quantity,
      0,
    );
    taxRate = Number.parseFloat(process.env.TAX_RATE ?? "0");
    taxAmount = subtotal * taxRate;
    total = subtotal + taxAmount;
    itemsForPdf = updatedItems.map((it) => ({
      id: it.id,
      name: it.name,
      category: it.category,
      quantity: it.quantity,
    }));
  }

  const invoiceNumber = await generateInvoiceNumber();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      orderId: id,
      subtotal,
      taxRate,
      taxAmount,
      total,
      status: "DRAFT",
      dueDate,
    },
  });

  const pdfDir = path.join(process.cwd(), "public", "invoices");
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir, { recursive: true });
  }

  const pdfData = {
    invoiceNumber,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    deliveryAddress: order.deliveryAddress,
    eventDate: order.eventDate,
    items: itemsForPdf,
    totalItems: order.totalItems,
  };

  const buffer = await generateInvoicePDFBuffer(pdfData);

  const driverPdfName = `${invoiceNumber}-DRIVER.pdf`;
  const clientPdfName = `${invoiceNumber}-CLIENT.pdf`;
  fs.writeFileSync(path.join(pdfDir, driverPdfName), buffer);
  fs.writeFileSync(path.join(pdfDir, clientPdfName), buffer);

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      pdfPathDriver: `/invoices/${driverPdfName}`,
      pdfPathClient: `/invoices/${clientPdfName}`,
    },
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "Invoice",
    entityId: invoice.id,
    newValue: invoiceNumber,
    metadata: { orderId: id, total, subtotal },
  });

  return NextResponse.json({
    success: true,
    invoiceId: invoice.id,
    invoiceNumber,
    pdfUrlDriver: `/invoices/${driverPdfName}`,
    pdfUrlClient: `/invoices/${clientPdfName}`,
    subtotal,
    taxAmount,
    total,
  });
}
