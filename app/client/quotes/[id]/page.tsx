import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ClientQuoteActions } from "./quote-actions";

type PageProps = { params: Promise<{ id: string }> };

function money(n: number | null | undefined) {
  if (typeof n !== "number") return "—";
  return `$${n.toFixed(2)}`;
}

type SalesItem = {
  itemId: string;
  name: string;
  category?: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
};

function safeParseSalesItems(json: string): SalesItem[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => ({
      itemId: String(x.itemId ?? ""),
      name: String(x.name ?? ""),
      category: String(x.category ?? ""),
      quantity: Number(x.quantity ?? 0),
      unitPrice: x.unitPrice == null ? undefined : Number(x.unitPrice),
      lineTotal: x.lineTotal == null ? undefined : Number(x.lineTotal),
    })).filter((x) => x.itemId && x.name && x.quantity > 0);
  } catch {
    return [];
  }
}

export default async function ClientQuoteDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/dashboard");

  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { revisions: { orderBy: { revisionNumber: "asc" } } },
  });
  if (!quote) redirect("/client/quotes");

  const isOwner =
    quote.clientId === session.user.id ||
    quote.clientEmail.toLowerCase() === session.user.email.toLowerCase();
  if (!isOwner) redirect("/client/quotes");

  const activeRev = quote.activeSalesRevisionNumber
    ? await prisma.quoteRevision.findUnique({
        where: {
          quoteId_revisionNumber: {
            quoteId: quote.id,
            revisionNumber: quote.activeSalesRevisionNumber,
          },
        },
      })
    : null;

  const items = activeRev ? safeParseSalesItems(activeRev.itemsJson) : [];
  const isExpired = quote.status === "EXPIRED" || (quote.expiresAt ? quote.expiresAt < new Date() : false);

  return (
    <div className="space-y-5">
      <Link href="/client/quotes" className="text-terracotta hover:underline text-sm">
        ← Back to quotes
      </Link>

      <header className="bg-white border border-stone/30 rounded-2xl p-6">
        <p className="text-xs uppercase tracking-widest text-muted">Quote</p>
        <h1 className="font-display text-3xl text-dark mt-1">{quote.quoteNumber}</h1>
        <p className="text-muted text-sm mt-2">
          Status: <span className="text-dark font-medium">{quote.status}</span>
        </p>
      </header>

      <section className="bg-white border border-stone/30 rounded-2xl p-6">
        <h2 className="font-display text-xl text-dark mb-4">Pricing</h2>
        {!activeRev ? (
          <p className="text-muted text-sm">
            Pricing is not ready yet. Our sales team will send you a quote soon.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((i) => (
                <div key={i.itemId} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-dark font-medium truncate">{i.name}</p>
                    <p className="text-muted text-xs">Qty: {i.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-dark text-sm">{money(i.unitPrice ?? null)}</p>
                    <p className="text-muted text-xs">{money(i.lineTotal ?? null)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-stone/20 mt-5 pt-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="text-dark">{money(activeRev.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Tax</span><span className="text-dark">{money(activeRev.taxAmount)}</span></div>
              <div className="flex justify-between font-medium"><span className="text-dark">Total</span><span className="text-dark">{money(activeRev.total)}</span></div>
            </div>
          </>
        )}
      </section>

      <section className="bg-white border border-stone/30 rounded-2xl p-6">
        <h2 className="font-display text-xl text-dark mb-4">Timeline de revisiones</h2>
        <div className="space-y-3">
          {quote.revisions.map((revision) => (
            <div key={revision.id} className="rounded-lg border border-stone/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-dark">Revision #{revision.revisionNumber}</p>
                <p className="text-xs text-muted">{new Date(revision.createdAt).toLocaleString()}</p>
              </div>
              <p className="mt-1 text-xs text-muted">Creada por: {revision.createdByRole}</p>
              <p className="mt-1 text-sm text-dark">Total: {money(revision.total)}</p>
              {revision.note ? <p className="mt-1 text-sm text-muted">{revision.note}</p> : null}
            </div>
          ))}
        </div>
      </section>

      {isExpired ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          Esta cotizacion ha expirado. Contacta a nuestro equipo para una nueva propuesta.
        </section>
      ) : null}

      <ClientQuoteActions quoteId={quote.id} quoteStatus={quote.status} itemsJson={activeRev?.itemsJson ?? null} />
    </div>
  );
}

