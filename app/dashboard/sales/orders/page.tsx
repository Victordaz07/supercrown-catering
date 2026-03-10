"use client";

import { useEffect, useState } from "react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "orders"), orderBy("deliveryDate", "desc")),
      (snap) => {
        setOrders(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
      }
    );
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-dark">Orders</h1>
      <div className="bg-warm border border-stone/40 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone/20">
                <th className="text-left px-4 py-2 font-medium text-dark">ID</th>
                <th className="text-left px-4 py-2 font-medium text-dark">Client</th>
                <th className="text-left px-4 py-2 font-medium text-dark">Delivery Date</th>
                <th className="text-left px-4 py-2 font-medium text-dark">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    No orders yet
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={String(o.id)} className="border-t border-stone/20">
                    <td className="px-4 py-2 text-muted font-mono text-xs">
                      {String(o.id).slice(-8)}
                    </td>
                    <td className="px-4 py-2 text-dark">{String(o.clientEmail ?? "—")}</td>
                    <td className="px-4 py-2 text-muted">{String(o.deliveryDate ?? "—")}</td>
                    <td className="px-4 py-2">
                      <span className="text-muted">{String(o.status ?? "—")}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
