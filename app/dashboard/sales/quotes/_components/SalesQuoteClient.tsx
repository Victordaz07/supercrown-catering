"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import PricingDisplay from "@/components/orders/PricingDisplay";

type Quote = {
  id: string;
  quoteNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  deliveryAddress: string;
  eventDate: string;
  guestCount: string | null;
  budget: string | null;
  typeOfService: string | null;
  eventDetails: string | null;
  status: string;
  expiresAt: string | null;
  activeSalesRevisionNumber: number;
  approvedSalesRevisionNumber: number | null;
  orderId: string | null;
  orderNumber: string | null;
  orderPriceSnapshot: unknown;
  orderPricingLockedAt: string | null;
  orderItems: Array<{ name: string; quantity: number; unitPrice: number }>;
};

type Revision = {
  revisionNumber: number;
  createdByRole: string;
  note: string | null;
  itemsJson: string;
  subtotal: number | null;
  taxRate: number | null;
  taxAmount: number | null;
  total: number | null;
  createdAt: string;
};

type SalesItem = {
  itemId: string;
  name: string;
  category?: string;
  quantity: number;
  unitPrice?: number;
};

function safeParseItems(json: string): SalesItem[] {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => ({
      itemId: String(x.itemId ?? ""),
      name: String(x.name ?? ""),
      category: String(x.category ?? ""),
      quantity: Number(x.quantity ?? 0),
      unitPrice: x.unitPrice == null ? undefined : Number(x.unitPrice),
    }));
  } catch {
    return [];
  }
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

export function SalesQuoteClient({ quote, revisions }: { quote: Quote; revisions: Revision[] }) {
  const latestClientRevision = useMemo(
    () => revisions.find((r) => r.createdByRole === "CLIENT") ?? null,
    [revisions],
  );
  const activeSalesRevision = useMemo(
    () => revisions.find((r) => r.createdByRole === "SALES" && r.revisionNumber === quote.activeSalesRevisionNumber) ?? null,
    [revisions, quote.activeSalesRevisionNumber],
  );

  const baseItems = safeParseItems((latestClientRevision ?? activeSalesRevision ?? revisions[0])?.itemsJson ?? "[]");
  const [taxRate, setTaxRate] = useState(activeSalesRevision?.taxRate ?? 0.08);
  const [items, setItems] = useState(
    baseItems.map((i) => ({
      ...i,
      unitPrice: i.unitPrice ?? 0,
    })),
  );
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [converting, setConverting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const now = new Date();
  const expiresAt = quote.expiresAt ? new Date(quote.expiresAt) : null;
  const isExpired = Boolean(expiresAt && expiresAt < now);

  const subtotal = items.reduce((s, i) => s + (Number(i.unitPrice) || 0) * (i.quantity || 0), 0);
  const taxAmount = subtotal * (Number(taxRate) || 0);
  const total = subtotal + taxAmount;

  const canSend = items.every((i) => i.unitPrice != null && Number(i.unitPrice) >= 0) && items.length > 0;

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="bg-warm border border-stone/40 rounded-sm p-4 space-y-2">
        <h2 className="font-display text-lg text-dark">Client Details</h2>
        <p><span className="text-muted text-sm">Name:</span> {quote.clientName}</p>
        <p><span className="text-muted text-sm">Email:</span> {quote.clientEmail}</p>
        <p><span className="text-muted text-sm">Phone:</span> {quote.clientPhone || "—"}</p>
        <p><span className="text-muted text-sm">Delivery:</span> {quote.deliveryAddress}</p>
        <p><span className="text-muted text-sm">Event date:</span> {quote.eventDate}</p>
        <p><span className="text-muted text-sm">Guests:</span> {quote.guestCount || "—"}</p>
        <p><span className="text-muted text-sm">Budget:</span> {quote.budget || "—"}</p>
        {quote.eventDetails ? (
          <div className="pt-2">
            <p className="text-muted text-sm">Event Details</p>
            <p className="text-dark whitespace-pre-wrap">{quote.eventDetails}</p>
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        {msg && (
          <div className={`px-4 py-3 rounded-sm text-sm ${msg.type === "ok" ? "bg-olive/20 text-olive" : "bg-red-50 text-red-700"}`}>
            {msg.text}
          </div>
        )}

        <div className="bg-warm border border-stone/40 rounded-sm p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-display text-lg text-dark">Items & Pricing</h2>
            <span className="text-xs text-muted">Status: {quote.status}</span>
          </div>

          {expiresAt ? (
            <div className={`mb-3 rounded px-3 py-2 text-xs font-medium ${isExpired ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
              {isExpired ? "Expirada" : `Expira el ${expiresAt.toLocaleDateString()}`}
            </div>
          ) : null}

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={`${item.itemId}-${idx}`} className="flex flex-wrap items-center gap-2">
                <span className="flex-1 min-w-0 text-sm text-dark truncate">
                  {item.name} (×{item.quantity})
                </span>
                <span className="text-muted text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={String(item.unitPrice ?? "")}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 0;
                    setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, unitPrice: v } : p)));
                  }}
                  className="w-24 bg-cream border border-stone rounded px-2 py-1 text-sm"
                />
                <span className="text-terracotta font-medium w-20 text-right">
                  {money((Number(item.unitPrice) || 0) * (item.quantity || 0))}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-stone/40 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted">Tax rate</span>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                className="w-24 bg-cream border border-stone rounded px-2 py-1 text-right"
              />
            </div>
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="text-dark">{money(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Tax</span><span className="text-dark">{money(taxAmount)}</span></div>
            <div className="flex justify-between font-medium"><span className="text-dark">Total</span><span className="text-dark">{money(total)}</span></div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-muted uppercase tracking-wider">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full mt-1 bg-cream border border-stone rounded px-3 py-2 text-sm min-h-[70px]"
              placeholder="Message to client..."
            />
          </div>

          <div className="flex gap-3 mt-4">
            <button
              disabled={!canSend || sending}
              onClick={async () => {
                setSending(true);
                setMsg(null);
                try {
                  const res = await fetch(`/api/quotes/${quote.id}/price-and-send`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ items, taxRate, note }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error || "Failed to send");
                  setMsg({ type: "ok", text: data.simulated ? "Simulated send (no RESEND_API_KEY)" : "Quote sent to client" });
                } catch (e) {
                  setMsg({ type: "err", text: e instanceof Error ? e.message : "Error" });
                } finally {
                  setSending(false);
                }
              }}
              className="flex-1 bg-terracotta text-cream py-2 px-4 rounded-sm font-medium hover:bg-terracotta/90 disabled:opacity-70 inline-flex items-center justify-center gap-2"
            >
              {sending && <Loader2 className="w-4 h-4 animate-spin" />}
              Send to client
            </button>

            <button
              disabled={quote.status !== "CLIENT_APPROVED" || converting || isExpired}
              onClick={async () => {
                setConverting(true);
                setMsg(null);
                try {
                  const res = await fetch(`/api/quotes/${quote.id}/convert-to-order`, { method: "POST" });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error || "Failed to convert");
                  setMsg({ type: "ok", text: `Converted to order ${data.orderNumber}` });
                } catch (e) {
                  setMsg({ type: "err", text: e instanceof Error ? e.message : "Error" });
                } finally {
                  setConverting(false);
                }
              }}
              className="px-4 py-2 bg-dark text-cream rounded-sm font-medium hover:bg-dark/90 disabled:opacity-70 inline-flex items-center justify-center gap-2"
            >
              {converting && <Loader2 className="w-4 h-4 animate-spin" />}
              Convert
            </button>
          </div>
        </div>

        {quote.status === "CONVERTED" && quote.orderId ? (
          <div className="bg-olive/10 border border-olive/30 rounded-sm p-4">
            <h3 className="font-display text-base text-dark mb-1">Orden creada</h3>
            <p className="text-sm text-muted mb-2">
              Orden {quote.orderNumber ?? quote.orderId} creada desde esta cotizacion.
            </p>
            <a
              href={`/dashboard/orders/${quote.orderId}`}
              className="inline-flex items-center rounded-sm bg-dark px-3 py-2 text-sm font-medium text-cream hover:bg-dark/90"
            >
              Ver orden
            </a>
            <div className="mt-3">
              <PricingDisplay
                order={{
                  pricingLockedAt: quote.orderPricingLockedAt,
                  priceSnapshot: quote.orderPriceSnapshot,
                  items: quote.orderItems,
                }}
              />
            </div>
          </div>
        ) : null}

        {latestClientRevision && quote.status === "CLIENT_PROPOSED_CHANGES" && (
          <div className="bg-cream border border-stone/40 rounded-sm p-4">
            <h3 className="font-display text-base text-dark mb-2">Client proposed changes</h3>
            <p className="text-sm text-muted mb-2">Revision #{latestClientRevision.revisionNumber}</p>
            <ul className="text-sm text-dark space-y-1">
              {safeParseItems(latestClientRevision.itemsJson).map((i) => (
                <li key={i.itemId}>- {i.name} × {i.quantity}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

