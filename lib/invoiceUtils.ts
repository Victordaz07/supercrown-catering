import { prisma } from "./db";

export async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const last = await prisma.invoice.findFirst({
    where: { invoiceNumber: { startsWith: prefix } },
    orderBy: { invoiceNumber: "desc" },
  });
  const num = last
    ? parseInt(last.invoiceNumber.replace(prefix, ""), 10) + 1
    : 1;
  return `${prefix}${String(num).padStart(4, "0")}`;
}
