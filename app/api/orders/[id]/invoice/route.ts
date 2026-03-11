import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateInvoiceNumber } from "@/lib/invoiceUtils";
import { generateInvoicePDFBuffer } from "@/lib/generateInvoicePDF";
import { logAudit } from "@/lib/audit";
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

  const existingInvoice = await prisma.invoice.findFirst({
    where: { orderId: id },
  });
  if (existingInvoice) {
    return NextResponse.json(
      { error: "Invoice already exists", invoiceId: existingInvoice.id },
      { status: 400 },
    );
  }

  let itemPrices: Record<string, number> = {};
  try {
    const body = await request.json();
    itemPrices = body.itemPrices ?? {};
  } catch {
    // no body is fine - prices will be 0
  }

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

  const subtotal = updatedItems.reduce(
    (sum, it) => sum + it.unitPrice * it.quantity,
    0,
  );
  const taxRate = 0;
  const taxAmount = subtotal * taxRate;
  const total = subtotal + taxAmount;

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
    items: updatedItems,
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
