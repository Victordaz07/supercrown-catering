"use client";

import { useCallback, useEffect, useState } from "react";

type Req = {
  id: string;
  orderId: string;
  currentStatus: string;
  requestedStatus: string;
  reason: string | null;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  order: { id: string; orderNumber: string; customerName: string; status: string };
  requestedBy: { id: string; name: string | null; email: string };
  reviewedBy?: { id: string; name: string | null; email: string } | null;
};

function statusBadge(status: string) {
  if (status === "PENDING") return "bg-amber-100 text-amber-800";
  if (status === "APPROVED") return "bg-olive/20 text-olive";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  if (status === "CANCELLED") return "bg-stone/20 text-muted";
  return "bg-stone/20 text-muted";
}

export function StatusRequestsBoard({ role }: { role: string }) {
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const isAdmin = role === "MASTER" || role === "ADMIN";

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const query = filter ? `?status=${encodeURIComponent(filter)}` : "";
      const res = await fetch(`/api/order-status-requests${query}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load requests");
      setItems(data);
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Error loading requests" });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const runAction = async (id: string, action: "approve" | "reject" | "cancel") => {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await fetch(`/api/order-status-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reviewNote: noteMap[id] || "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to process request");
      setMsg({ type: "ok", text: `Request ${action}d successfully.` });
      await load();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Action failed" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {["PENDING", "APPROVED", "REJECTED", "CANCELLED", ""].map((f) => (
          <button
            key={f || "ALL"}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm border ${
              filter === f ? "bg-dark text-cream border-dark" : "bg-white text-muted border-stone/30 hover:text-dark"
            }`}
          >
            {f || "ALL"}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`px-3 py-2 rounded text-sm ${msg.type === "ok" ? "bg-olive/10 text-olive" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted">Loading requests...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted">No requests found.</p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="bg-white border border-stone/30 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-dark">
                    {r.order.orderNumber} · {r.order.customerName}
                  </p>
                  <p className="text-sm text-muted mt-1">
                    {r.currentStatus} → <span className="text-dark font-medium">{r.requestedStatus}</span>
                  </p>
                  {r.reason && <p className="text-xs text-muted mt-2">Reason: {r.reason}</p>}
                  <p className="text-xs text-muted mt-1">
                    Requested by {r.requestedBy.name || r.requestedBy.email} · {new Date(r.createdAt).toLocaleString("en-US")}
                  </p>
                  {r.reviewedBy && (
                    <p className="text-xs text-muted mt-1">
                      Reviewed by {r.reviewedBy.name || r.reviewedBy.email}
                      {r.reviewedAt ? ` · ${new Date(r.reviewedAt).toLocaleString("en-US")}` : ""}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded ${statusBadge(r.status)}`}>{r.status}</span>
              </div>

              {r.status === "PENDING" && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={noteMap[r.id] || ""}
                    onChange={(e) => setNoteMap((p) => ({ ...p, [r.id]: e.target.value }))}
                    placeholder="Review note (optional)"
                    className="w-full bg-cream border border-stone/30 rounded px-3 py-2 text-sm focus:outline-none"
                  />
                  <div className="flex gap-2">
                    {isAdmin && (
                      <>
                        <button
                          disabled={busyId === r.id}
                          onClick={() => runAction(r.id, "approve")}
                          className="px-3 py-1.5 bg-olive text-cream rounded text-sm hover:bg-olive/90 disabled:opacity-50"
                        >
                          {busyId === r.id ? "Processing..." : "Approve"}
                        </button>
                        <button
                          disabled={busyId === r.id}
                          onClick={() => runAction(r.id, "reject")}
                          className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      disabled={busyId === r.id}
                      onClick={() => runAction(r.id, "cancel")}
                      className="px-3 py-1.5 bg-stone text-cream rounded text-sm hover:bg-stone/90 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
