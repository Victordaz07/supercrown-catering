"use client";

import { useEffect, useState } from "react";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      const firestore = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase/client");
      unsub = firestore.onSnapshot(
        firestore.collection(db, "invoices"),
        (snap) => {
          setInvoices(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          );
        }
      );
    })();
    return () => unsub();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-dark">Invoices</h1>
      <div className="bg-warm border border-stone/40 rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone/20">
                <th className="text-left px-4 py-2 font-medium text-dark">Invoice #</th>
                <th className="text-left px-4 py-2 font-medium text-dark">Client</th>
                <th className="text-left px-4 py-2 font-medium text-dark">Total</th>
                <th className="text-left px-4 py-2 font-medium text-dark">PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted">
                    No invoices yet
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={String(inv.id)} className="border-t border-stone/20">
                    <td className="px-4 py-2 font-medium text-dark">
                      {String(inv.invoiceNumber ?? "—")}
                    </td>
                    <td className="px-4 py-2 text-muted">{String(inv.clientEmail ?? "—")}</td>
                    <td className="px-4 py-2 text-terracotta font-medium">
                      ${typeof inv.total === "number" ? inv.total.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2">
                      {inv.pdfUrl ? (
                        <a
                          href={String(inv.pdfUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-terracotta hover:underline"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
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
