"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
};

export function OrderActions({ order }: { order: Order }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const updateStatus = async (status: string) => {
    setLoading(true);
    try {
      await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/invoice`, {
        method: "POST",
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-stone/20 pt-6 space-y-4">
      <div>
        <label className="block text-muted text-xs uppercase tracking-wider mb-2">
          Internal notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes for this order..."
          className="w-full bg-cream border border-stone rounded-sm px-4 py-3 min-h-[80px] focus:outline-none focus:border-terracotta"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        {order.status === "PENDING" && (
          <button
            onClick={() => updateStatus("CONFIRMED")}
            disabled={loading}
            className="px-4 py-2 bg-olive text-cream rounded hover:bg-olive/90 disabled:opacity-50"
          >
            Confirm Order
          </button>
        )}
        {order.status === "CONFIRMED" && (
          <>
            <button
              onClick={generateInvoice}
              disabled={loading}
              className="px-4 py-2 bg-terracotta text-cream rounded hover:bg-terracotta/90 disabled:opacity-50"
            >
              Generate Invoice
            </button>
            <button
              onClick={() => updateStatus("READY")}
              disabled={loading}
              className="px-4 py-2 bg-stone text-cream rounded hover:bg-stone/90 disabled:opacity-50"
            >
              Mark Ready for Delivery
            </button>
          </>
        )}
        {order.status === "READY" && (
          <p className="text-sm text-muted">Order is ready. Delivery person can pick it up.</p>
        )}
        {order.status === "DELIVERED" && (
          <p className="text-sm text-olive">✓ Delivered</p>
        )}
      </div>
    </div>
  );
}
