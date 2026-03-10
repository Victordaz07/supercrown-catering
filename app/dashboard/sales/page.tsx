"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  reviewing: "bg-blue-100 text-blue-800",
  approved: "bg-olive/30 text-olive",
  rejected: "bg-red-100 text-red-800",
  invoiced: "bg-purple-100 text-purple-800",
};

export default function SalesOverviewPage() {
  const [pendingCount, setPendingCount] = useState(0);
  const [ordersToday, setOrdersToday] = useState(0);
  const [deliveredToday, setDeliveredToday] = useState(0);
  const [revenueMonth, setRevenueMonth] = useState(0);
  const [recentQuotes, setRecentQuotes] = useState<Array<{
    id: string;
    clientName: string;
    createdAt: { seconds?: number } | null;
    itemCount?: number;
    status: string;
  }>>([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    const unsubQuotes = onSnapshot(
      query(
        collection(db, "quotes"),
        where("status", "==", "pending")
      ),
      (snap) => setPendingCount(snap.size)
    );

    const unsubOrders = onSnapshot(
      query(
        collection(db, "orders"),
        where("deliveryDate", "==", today)
      ),
      (snap) => setOrdersToday(snap.size)
    );

    const unsubDeliveries = onSnapshot(
      query(
        collection(db, "deliveries"),
        where("deliveryDate", "==", today),
        where("status", "==", "delivered")
      ),
      (snap) => setDeliveredToday(snap.size)
    );

    const unsubInvoices = onSnapshot(
      collection(db, "invoices"),
      (snap) => {
        let total = 0;
        snap.docs.forEach((d) => {
          const data = d.data();
          if (typeof data.total === "number") total += data.total;
        });
        setRevenueMonth(total);
      }
    );

    const unsubRecent = onSnapshot(
      query(
        collection(db, "quotes"),
        orderBy("createdAt", "desc"),
        limit(5)
      ),
      async (snap) => {
        const quotes: typeof recentQuotes = [];
        for (const doc of snap.docs) {
          const itemsSnap = await getDocs(
            collection(db, "quotes", doc.id, "items")
          );
          const itemCount = itemsSnap.docs.reduce(
            (s, d) => s + (d.data().quantity ?? 0),
            0
          );
          quotes.push({
            id: doc.id,
            clientName: doc.data().clientName ?? "—",
            createdAt: doc.data().createdAt ?? null,
            itemCount,
            status: doc.data().status ?? "pending",
          });
        }
        setRecentQuotes(quotes);
      }
    );

    return () => {
      unsubQuotes();
      unsubOrders();
      unsubDeliveries();
      unsubInvoices();
      unsubRecent();
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-dark">Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-warm border border-stone/40 rounded-sm p-4">
          <p className="text-muted text-sm">Pending quotes</p>
          <p className="font-display text-2xl text-dark mt-1">{pendingCount}</p>
        </div>
        <div className="bg-warm border border-stone/40 rounded-sm p-4">
          <p className="text-muted text-sm">Orders today</p>
          <p className="font-display text-2xl text-dark mt-1">{ordersToday}</p>
        </div>
        <div className="bg-warm border border-stone/40 rounded-sm p-4">
          <p className="text-muted text-sm">Delivered today</p>
          <p className="font-display text-2xl text-dark mt-1">{deliveredToday}</p>
        </div>
        <div className="bg-warm border border-stone/40 rounded-sm p-4">
          <p className="text-muted text-sm">Revenue this month</p>
          <p className="font-display text-2xl text-terracotta mt-1">
            ${revenueMonth.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-warm border border-stone/40 rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-stone/40 flex items-center justify-between">
          <h2 className="font-display text-lg text-dark">Recent Quotes</h2>
          <Link
            href="/dashboard/sales/quotes"
            className="text-terracotta hover:underline text-sm"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone/20">
                <th className="text-left px-4 py-2 font-medium text-dark">Client</th>
                <th className="text-left px-4 py-2 font-medium text-dark">Date</th>
                <th className="text-left px-4 py-2 font-medium text-dark">Items</th>
                <th className="text-left px-4 py-2 font-medium text-dark">Status</th>
                <th className="text-left px-4 py-2 font-medium text-dark">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentQuotes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted">
                    No quotes yet
                  </td>
                </tr>
              ) : (
                recentQuotes.map((q) => (
                  <tr key={q.id} className="border-t border-stone/20 hover:bg-stone/10">
                    <td className="px-4 py-2 text-dark">{q.clientName}</td>
                    <td className="px-4 py-2 text-muted">
                      {q.createdAt?.seconds
                        ? new Date(q.createdAt.seconds * 1000).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-muted">{q.itemCount ?? 0}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          statusColors[q.status] ?? "bg-stone/30 text-muted"
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/dashboard/sales/quotes/${q.id}`}
                        className="text-terracotta hover:underline"
                      >
                        Review
                      </Link>
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
