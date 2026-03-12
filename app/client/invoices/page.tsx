"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Invoice = {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  total: number;
  adjustedTotal: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  receiptUrl: string | null;
  createdAt: string;
};

const STATUS_BADGES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SENT: "bg-gray-100 text-gray-800",
  DELIVERED: "bg-gray-100 text-gray-800",
  ADJUSTED: "bg-blue-100 text-blue-800",
  PAID: "bg-emerald-100 text-emerald-800",
  OVERDUE: "bg-red-100 text-red-800",
  VOID: "bg-gray-200 text-gray-700",
  REFUNDED: "bg-gray-200 text-gray-700",
};

const PAYABLE_STATUSES = ["SENT", "DELIVERED", "ADJUSTED", "OVERDUE"];

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/client/invoices");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al cargar facturas");
        if (active) setInvoices(data.invoices || []);
      } catch (err) {
        if (active)
          setError(err instanceof Error ? err.message : "Error de red");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-2xl text-dark">Mis facturas</h1>
        <p className="text-sm text-muted">
          Historial y estado de tus facturas. Paga en línea cuando esté disponible.
        </p>
      </div>

      {loading && (
        <div className="text-muted py-8">Cargando facturas...</div>
      )}
      {!loading && error && (
        <div className="text-red-700 bg-red-50 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      {!loading && !error && invoices.length === 0 && (
        <div className="bg-white border border-stone/30 rounded-lg p-6 text-muted">
          Aún no tienes facturas.
        </div>
      )}

      {!loading && !error && invoices.length > 0 && (
        <div className="bg-white border border-stone/30 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone/10 text-left">
                <th className="px-4 py-3 font-medium text-dark">Número</th>
                <th className="px-4 py-3 font-medium text-dark">Orden</th>
                <th className="px-4 py-3 font-medium text-dark">Total</th>
                <th className="px-4 py-3 font-medium text-dark">Estado</th>
                <th className="px-4 py-3 font-medium text-dark">Vencimiento</th>
                <th className="px-4 py-3 font-medium text-dark">Acción</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-stone/20">
                  <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">{inv.orderNumber}</td>
                  <td className="px-4 py-3">
                    ${inv.adjustedTotal.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        STATUS_BADGES[inv.status] ?? "bg-stone/20 text-muted"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.dueDate
                      ? new Date(inv.dueDate).toLocaleDateString("es-ES")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {PAYABLE_STATUSES.includes(inv.status) && (
                      <Link
                        href={`/client/invoices/${inv.id}`}
                        className="text-terracotta hover:underline font-medium"
                      >
                        Pagar
                      </Link>
                    )}
                    {inv.status === "PAID" && (
                      <Link
                        href={`/client/invoices/${inv.id}`}
                        className="text-olive hover:underline"
                      >
                        Ver
                      </Link>
                    )}
                    {!PAYABLE_STATUSES.includes(inv.status) &&
                      inv.status !== "PAID" && (
                        <Link
                          href={`/client/invoices/${inv.id}`}
                          className="text-muted hover:underline"
                        >
                          Ver
                        </Link>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
