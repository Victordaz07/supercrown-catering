"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function MarkDeliveredButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await fetch(`/api/orders/${orderId}/delivered`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 border-t border-stone/20">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full py-2 bg-olive text-cream text-sm font-medium rounded hover:bg-olive/90 disabled:opacity-50"
      >
        {loading ? "..." : "Mark as Delivered"}
      </button>
    </div>
  );
}
