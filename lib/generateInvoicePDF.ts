import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { InvoicePDF } from "./InvoicePDF";

type OrderItem = { id: string; name: string; category: string; quantity: number };

export async function generateInvoicePDFBuffer(
  data: {
    invoiceNumber: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    deliveryAddress: string;
    eventDate: Date;
    items: OrderItem[];
    totalItems: number;
  }
): Promise<Buffer> {
  const doc = React.createElement(InvoicePDF, data) as React.ReactElement;
  const buf = await renderToBuffer(doc);
  return Buffer.from(buf);
}
