import { prisma } from "./db";

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SC-${year}-`;
  const last = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
  });
  const num = last
    ? parseInt(last.orderNumber.replace(prefix, ""), 10) + 1
    : 1;
  return `${prefix}${String(num).padStart(4, "0")}`;
}

export function buildMapsUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}
