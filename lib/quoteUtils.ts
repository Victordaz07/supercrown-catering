import { prisma } from "./db";

export async function generateQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `Q-${year}-`;
  const last = await prisma.quote.findFirst({
    where: { quoteNumber: { startsWith: prefix } },
    orderBy: { quoteNumber: "desc" },
  });
  const num = last ? parseInt(last.quoteNumber.replace(prefix, ""), 10) + 1 : 1;
  return `${prefix}${String(num).padStart(4, "0")}`;
}

