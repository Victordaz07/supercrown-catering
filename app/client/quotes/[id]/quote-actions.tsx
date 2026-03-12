"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

type Item = { itemId: string; name: string; category?: string; quantity: number };

function safeParse(json: string | null): Item[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((x) => ({
      itemId: String(x.itemId ?? ""),
      name: String(x.name ?? ""),
      category: String(x.category ?? ""),
      quantity: Number(x.quantity ?? 0),
    })).filter((x) => x.itemId && x.name && x.quantity > 0);
  } catch {
    return [];
  }
}

export function ClientQuoteActions({
  quoteId,
  quoteStatus,
  itemsJson,
}: {
  quoteId: string;
  quoteStatus: string;
  itemsJson: string | null;
}) {
  const canRespond = quoteStatus === "SENT";
  const base = useMemo(() => safeParse(itemsJson), [itemsJson]);
  const [items, setItems] = useState<Item[]>(base);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState<"approve" | "changes" | "reject" | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (!canRespond) {
    return null;
  }

  return (
    <section className="bg-warm border border-stone/30 rounded-2xl p-6 space-y-4">
      <h2 className="font-display text-xl text-dark">Your response</h2>
      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm ${msg.type === "ok" ? "bg-olive/20 text-olive" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div>
        <p className="text-sm text-muted mb-2">Edit quantities (optional)</p>
        <div className="space-y-2">
          {items.map((i, idx) => (
            <div key={i.itemId} className="flex items-center justify-between gap-3">
              <span className="text-sm text-dark">{i.name}</span>
              <input
                type="number"
                min={0}
                value={i.quantity}
                onChange={(e) => {
                  const q = Math.max(0, Number(e.target.value) || 0);
                  setItems((prev) => prev.map((p, j) => (j === idx ? { ...p, quantity: q } : p)));
                }}
                className="w-20 bg-cream border border-stone/40 rounded-lg px-2 py-1 text-sm text-right"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">Message to sales (optional)</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm min-h-[80px]"
          placeholder="Tell us what to change..."
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          disabled={loading !== null}
          onClick={async () => {
            setLoading("approve");
            setMsg(null);
            try {
              const res = await fetch(`/api/quotes/${quoteId}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.error || "Failed to approve");
              setMsg({ type: "ok", text: "Approved. Sales will convert this into an order." });
            } catch (e) {
              setMsg({ type: "err", text: e instanceof Error ? e.message : "Error" });
            } finally {
              setLoading(null);
            }
          }}
          className="flex-1 bg-olive text-cream rounded-xl px-4 py-3 font-medium hover:opacity-90 inline-flex items-center justify-center gap-2"
        >
          {loading === "approve" && <Loader2 className="w-4 h-4 animate-spin" />}
          Approve
        </button>

        <button
          disabled={loading !== null}
          onClick={async () => {
            setLoading("changes");
            setMsg(null);
            try {
              const res = await fetch(`/api/quotes/${quoteId}/propose-changes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  items: items.filter((i) => i.quantity > 0),
                  note,
                }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.error || "Failed to send changes");
              setMsg({ type: "ok", text: "Changes sent to sales. You’ll receive an updated quote." });
            } catch (e) {
              setMsg({ type: "err", text: e instanceof Error ? e.message : "Error" });
            } finally {
              setLoading(null);
            }
          }}
          className="flex-1 bg-terracotta text-cream rounded-xl px-4 py-3 font-medium hover:opacity-90 inline-flex items-center justify-center gap-2"
        >
          {loading === "changes" && <Loader2 className="w-4 h-4 animate-spin" />}
          Request changes
        </button>
      </div>

      <div className="border-t border-stone/30 pt-4 space-y-2">
        <label className="block text-sm text-muted">Reject reason</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm"
          placeholder="Tell us why you’re rejecting..."
        />
        <button
          disabled={loading !== null || !reason.trim()}
          onClick={async () => {
            setLoading("reject");
            setMsg(null);
            try {
              const res = await fetch(`/api/quotes/${quoteId}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.error || "Failed to reject");
              setMsg({ type: "ok", text: "Rejected. Thanks for the update." });
            } catch (e) {
              setMsg({ type: "err", text: e instanceof Error ? e.message : "Error" });
            } finally {
              setLoading(null);
            }
          }}
          className="w-full bg-dark text-cream rounded-xl px-4 py-3 font-medium hover:opacity-90 inline-flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading === "reject" && <Loader2 className="w-4 h-4 animate-spin" />}
          Reject
        </button>
      </div>
    </section>
  );
}

