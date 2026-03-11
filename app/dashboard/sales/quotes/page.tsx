"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  reviewing: "bg-blue-100 text-blue-800",
  approved: "bg-olive/30 text-olive",
  rejected: "bg-red-100 text-red-800",
  invoiced: "bg-purple-100 text-purple-800",
};

type QuoteDoc = {
  id: string;
  clientName: string;
  clientEmail: string;
  eventDate: string | null;
  createdAt: { seconds?: number } | null;
  status: string;
  itemCount: number;
};

export default function QuotesListPage() {
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [search, setSearch] = useState("");
  const [quotes, setQuotes] = useState<QuoteDoc[]>([]);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const firestore = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase/client");

      const q =
        filter === "all"
          ? firestore.query(
              firestore.collection(db, "quotes"),
              firestore.orderBy("createdAt", "desc")
            )
          : firestore.query(
              firestore.collection(db, "quotes"),
              firestore.where("status", "==", filter),
              firestore.orderBy("createdAt", "desc")
            );

      unsub = firestore.onSnapshot(q, async (snap) => {
        const list: QuoteDoc[] = [];
        for (const doc of snap.docs) {
          const itemsSnap = await firestore.getDocs(
            firestore.collection(db, "quotes", doc.id, "items")
          );
          const itemCount = itemsSnap.docs.reduce(
            (s, d) => s + (d.data().quantity ?? 0),
            0
          );
          const data = doc.data();
          list.push({
            id: doc.id,
            clientName: data.clientName ?? "—",
            clientEmail: data.clientEmail ?? "",
            eventDate: data.eventDate ?? null,
            createdAt: data.createdAt ?? null,
            status: data.status ?? "pending",
            itemCount,
          });
        }
        setQuotes(list);
      });
    })();

    return () => unsub();
  }, [filter]);

  const filtered = quotes.filter(
    (q) =>
      !search ||
      q.clientName.toLowerCase().includes(search.toLowerCase()) ||
      q.clientEmail.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-dark">Quotes</h1>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-sm text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-terracotta text-cream"
                  : "bg-warm border border-stone/40 text-muted hover:text-dark"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-64 bg-cream border border-stone rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-terracotta"
        />
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="bg-warm border border-stone/40 rounded-sm p-12 text-center text-muted">
            No quotes found
          </div>
        ) : (
          filtered.map((q) => (
            <Link
              key={q.id}
              href={`/dashboard/sales/quotes/${q.id}`}
              className="block bg-warm border border-stone/40 rounded-sm p-4 hover:border-terracotta/50 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-dark">{q.clientName}</p>
                  <p className="text-sm text-muted">{q.clientEmail}</p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted">Event: {q.eventDate || "TBD"}</span>
                  <span className="text-muted">{q.itemCount} items</span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      statusColors[q.status] ?? "bg-stone/30 text-muted"
                    }`}
                  >
                    {q.status}
                  </span>
                  <span className="text-terracotta font-medium">Review →</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}