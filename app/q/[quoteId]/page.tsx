import Link from "next/link";
import { prisma } from "@/lib/db";
import { validateQuoteToken } from "@/lib/quoteAuth";

type PageProps = {
  params: Promise<{ quoteId: string }>;
  searchParams: Promise<{ t?: string }>;
};

function money(n: number | null | undefined) {
  if (typeof n !== "number") return "—";
  return `$${n.toFixed(2)}`;
}

export default async function QuoteTokenPage({ params, searchParams }: PageProps) {
  const { quoteId } = await params;
  const { t } = await searchParams;

  if (!t) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-cream border border-stone/30 rounded-2xl p-6">
          <h1 className="font-display text-2xl text-dark mb-2">Missing link token</h1>
          <p className="text-muted text-sm">Please use the link from your email.</p>
        </div>
      </div>
    );
  }

  const validated = await validateQuoteToken({ quoteId, rawToken: t });
  if (!validated.ok) {
    const title =
      validated.reason === "expired"
        ? "This link expired"
        : validated.reason === "used"
          ? "This link was already used"
          : validated.reason === "stale_revision"
            ? "A newer quote version is available"
            : "Invalid link";
    const hint =
      validated.reason === "stale_revision"
        ? "Please use the most recent email from Super Crown Catering."
        : "Please contact our team to receive a new link.";

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-cream border border-stone/30 rounded-2xl p-6">
          <h1 className="font-display text-2xl text-dark mb-2">{title}</h1>
          <p className="text-muted text-sm">{hint}</p>
        </div>
      </div>
    );
  }

  const quote = validated.quote;

  const activeRev = await prisma.quoteRevision.findUnique({
    where: { quoteId_revisionNumber: { quoteId: quote.id, revisionNumber: quote.activeSalesRevisionNumber } },
  });

  if (!activeRev) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-cream border border-stone/30 rounded-2xl p-6">
          <h1 className="font-display text-2xl text-dark mb-2">Quote not ready</h1>
          <p className="text-muted text-sm">This quote is not ready for approval yet.</p>
        </div>
      </div>
    );
  }

  const items = safeParseItems(activeRev.itemsJson);

  return (
    <div className="min-h-screen bg-cream">
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <header className="bg-white border border-stone/30 rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-muted">Quote</p>
          <h1 className="font-display text-3xl text-dark mt-1">{quote.quoteNumber}</h1>
          <p className="text-muted mt-2 text-sm">
            Hi <span className="text-dark font-medium">{quote.clientName}</span>, please review and respond.
          </p>
        </header>

        <section className="bg-white border border-stone/30 rounded-2xl p-6">
          <h2 className="font-display text-xl text-dark mb-4">Items</h2>
          <div className="space-y-3">
            {items.map((i) => (
              <div key={i.itemId} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-dark font-medium truncate">{i.name}</p>
                  <p className="text-muted text-xs">Qty: {i.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-dark text-sm">{money(i.unitPrice)}</p>
                  <p className="text-muted text-xs">{money(i.lineTotal)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-stone/20 mt-5 pt-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="text-dark">{money(activeRev.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Tax</span><span className="text-dark">{money(activeRev.taxAmount)}</span></div>
            <div className="flex justify-between font-medium"><span className="text-dark">Total</span><span className="text-dark">{money(activeRev.total)}</span></div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href={`/q/${quote.id}/approve?t=${encodeURIComponent(t)}`}
            className="text-center rounded-xl bg-olive text-cream px-4 py-3 font-medium hover:opacity-90"
          >
            Approve
          </Link>
          <Link
            href={`/q/${quote.id}/edit?t=${encodeURIComponent(t)}`}
            className="text-center rounded-xl bg-terracotta text-cream px-4 py-3 font-medium hover:opacity-90"
          >
            Edit items
          </Link>
          <Link
            href={`/q/${quote.id}/reject?t=${encodeURIComponent(t)}`}
            className="text-center rounded-xl bg-dark text-cream px-4 py-3 font-medium hover:opacity-90"
          >
            Reject
          </Link>
        </section>

        <p className="text-xs text-muted text-center">
          If you have questions, reply to the email from Super Crown Catering.
        </p>
      </main>
    </div>
  );
}

type SalesItemSnapshot = {
  itemId: string;
  name: string;
  category?: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
};

function safeParseItems(itemsJson: string): SalesItemSnapshot[] {
  try {
    const parsed = JSON.parse(itemsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as SalesItemSnapshot[];
  } catch {
    return [];
  }
}

