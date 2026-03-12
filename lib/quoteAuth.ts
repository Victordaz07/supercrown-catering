import { prisma } from "@/lib/db";
import { hashToken, type QuoteTokenScope } from "@/lib/quoteTokens";

export async function validateQuoteToken(args: {
  quoteId: string;
  rawToken: string;
  requiredScope?: QuoteTokenScope;
}) {
  const { quoteId, rawToken, requiredScope } = args;
  const tokenHash = hashToken(rawToken);

  const token = await prisma.quoteActionToken.findUnique({ where: { tokenHash } });
  if (!token || token.quoteId !== quoteId) return { ok: false as const, reason: "invalid" as const };
  if (token.usedAt) return { ok: false as const, reason: "used" as const };
  if (token.expiresAt.getTime() < Date.now()) return { ok: false as const, reason: "expired" as const };
  if (requiredScope && token.scope !== requiredScope) return { ok: false as const, reason: "scope" as const };

  const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return { ok: false as const, reason: "missing_quote" as const };
  if (token.salesRevisionNumber !== quote.activeSalesRevisionNumber) {
    return { ok: false as const, reason: "stale_revision" as const };
  }

  return { ok: true as const, token, quote };
}

export async function consumeQuoteToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await prisma.quoteActionToken.update({
    where: { tokenHash },
    data: { usedAt: new Date() },
  });
}

