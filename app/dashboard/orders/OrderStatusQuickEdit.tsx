"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["PENDING", "CONFIRMED", "READY", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as const;

function badgeClass(status: string) {
  if (status === "PENDING") return "bg-amber-100 text-amber-800";
  if (status === "CONFIRMED") return "bg-olive/20 text-olive";
  if (status === "READY") return "bg-blue-100 text-blue-800";
  if (status === "IN_TRANSIT") return "bg-indigo-100 text-indigo-800";
  if (status === "DELIVERED") return "bg-green-100 text-green-800";
  if (status === "CANCELLED") return "bg-red-100 text-red-700";
  return "bg-stone/20 text-muted";
}

export function OrderStatusQuickEdit({
  orderId,
  currentStatus,
  canAuthorize,
}: {
  orderId: string;
  currentStatus: string;
  canAuthorize: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const submit = async () => {
    if (!status || status === currentStatus) {
      setOpen(false);
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const res = canAuthorize
        ? await fetch(`/api/orders/${orderId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        : await fetch("/api/order-status-requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, requestedStatus: status, reason }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit request");
      if (canAuthorize) {
        setOpen(false);
        router.refresh();
      } else {
        setOk("Request submitted. Admin will review it from Status Requests panel.");
        setReason("");
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error updating status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`text-xs px-2 py-1 rounded ${badgeClass(currentStatus)} hover:opacity-80`}
        title={canAuthorize ? "Edit status" : "Requires admin authorization"}
      >
        {currentStatus}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-lg border border-stone/30 shadow-xl">
            <div className="p-4 border-b border-stone/20">
              <h3 className="font-display text-lg text-dark">Update Order Status</h3>
              <p className="text-xs text-muted mt-1">
                {canAuthorize
                  ? "Confirm the new status. This change is logged in the audit trail."
                  : "Submit a status-change request for admin approval. This request is logged."}
              </p>
            </div>
            <div className="p-4 space-y-3">
              <label className="text-xs text-muted uppercase tracking-wider">New status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-cream border border-stone/40 rounded px-3 py-2 text-sm focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {!canAuthorize && (
                <div>
                  <label className="text-xs text-muted uppercase tracking-wider">Reason (optional)</label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full mt-1 bg-cream border border-stone/40 rounded px-3 py-2 text-sm focus:outline-none"
                    placeholder="Why should this status be changed?"
                  />
                  <p className="text-[11px] text-muted mt-1">
                    Admin or Master must approve this request before the order status changes.
                  </p>
                </div>
              )}
              {err && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                  {err}
                </p>
              )}
              {ok && (
                <p className="text-xs text-olive bg-olive/10 border border-olive/30 rounded px-2 py-1.5">
                  {ok}
                </p>
              )}
            </div>
            <div className="p-4 border-t border-stone/20 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-sm text-muted hover:text-dark"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={loading || status === currentStatus}
                className="px-3 py-1.5 text-sm bg-dark text-cream rounded hover:bg-dark/90 disabled:opacity-50"
              >
                {loading ? "Saving..." : canAuthorize ? "Confirm Change" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
