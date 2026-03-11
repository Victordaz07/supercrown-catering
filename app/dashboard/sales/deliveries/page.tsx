"use client";

import { useEffect, useState } from "react";

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const firestore = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase/client");
      unsub = firestore.onSnapshot(
        firestore.query(
          firestore.collection(db, "deliveries"),
          firestore.orderBy("deliveryDate", "desc")
        ),
        (snap) => {
          setDeliveries(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          );
        }
      );
    })();
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-dark">Deliveries</h1>
      <div className="bg-warm border border-stone/40 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone/20">
                <th className="text-left px-4 py-2 font-medium text-dark">Delivery Date</th>
                <th className="text-left px-4 py-2 font-medium text-dark">Driver ID</th>
                <th className="text-left px-4 py-2 font-medium text-dark">Vehicle</th>
                <th className="text-left px-4 py-2 font-medium text-dark">Route</th>
                <th className="text-left px-4 py-2 font-medium text-dark">Status</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    No deliveries yet
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={String(d.id)} className="border-t border-stone/20">
                    <td className="px-4 py-2 text-dark">{String(d.deliveryDate ?? "—")}</td>
                    <td className="px-4 py-2 text-muted font-mono text-xs">
                      {String(d.driverId ?? "—").slice(0, 8)}...
                    </td>
                    <td className="px-4 py-2 text-muted">{String(d.vehicleId ?? "—")}</td>
                    <td className="px-4 py-2 text-muted text-xs">
                      {String(d.routeZoneLabel ?? "—")} / {String(d.routeMilesEstimated ?? "—")} mi
                    </td>
                    <td className="px-4 py-2 text-muted">{String(d.status ?? "—")}</td>
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
