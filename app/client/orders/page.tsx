"use client";

import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  category: string;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  eventDate: string;
  deliveryAddress: string;
  totalItems: number;
  items: OrderItem[];
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    total: number;
    dueDate: string | null;
  }>;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  READY: "Listo",
  IN_TRANSIT: "En camino",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export default function ClientOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const query = filter === "ALL" ? "" : `?status=${encodeURIComponent(filter)}`;
        const res = await fetch(`/api/client/orders${query}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudieron cargar los pedidos");
        if (active) setOrders(data.orders || []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Error de red");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [filter]);

  const orderStats = useMemo(
    () => ({
      total: orders.length,
      delivered: orders.filter((o) => o.status === "DELIVERED").length,
      open: orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status)).length,
    }),
    [orders],
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl text-dark">Mis pedidos</h1>
          <p className="text-sm text-muted">Historial y estado actual de tus ordenes.</p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white border border-stone/30 rounded-md px-3 py-2 text-sm"
        >
          <option value="ALL">Todos</option>
          <option value="PENDING">Pendiente</option>
          <option value="CONFIRMED">Confirmado</option>
          <option value="READY">Listo</option>
          <option value="IN_TRANSIT">En camino</option>
          <option value="DELIVERED">Entregado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-stone/30 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Total</p>
          <p className="text-2xl font-display text-dark">{orderStats.total}</p>
        </div>
        <div className="bg-white border border-stone/30 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Abiertos</p>
          <p className="text-2xl font-display text-dark">{orderStats.open}</p>
        </div>
        <div className="bg-white border border-stone/30 rounded-lg p-4">
          <p className="text-xs uppercase tracking-wider text-muted">Entregados</p>
          <p className="text-2xl font-display text-dark">{orderStats.delivered}</p>
        </div>
      </div>

      {loading && <div className="text-muted py-8">Cargando pedidos...</div>}
      {!loading && error && <div className="text-red-700 bg-red-50 px-4 py-3 rounded-md">{error}</div>}
      {!loading && !error && orders.length === 0 && (
        <div className="bg-white border border-stone/30 rounded-lg p-6 text-muted">
          Aun no tienes pedidos para este filtro.
        </div>
      )}

      {!loading &&
        !error &&
        orders.map((order) => (
          <article key={order.id} className="bg-white border border-stone/30 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-display text-xl text-dark">#{order.orderNumber}</p>
                <p className="text-sm text-muted">
                  Fecha evento: {new Date(order.eventDate).toLocaleDateString("es-ES")}
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-warm text-dark">
                {STATUS_LABELS[order.status] || order.status}
              </span>
            </div>

            <p className="text-sm text-muted">{order.deliveryAddress}</p>

            <div>
              <p className="text-sm font-medium text-dark mb-1">Items ({order.totalItems})</p>
              <ul className="text-sm text-muted space-y-1">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.quantity} x {item.name}
                  </li>
                ))}
              </ul>
            </div>

            {order.invoices.length > 0 && (
              <div className="pt-2 border-t border-stone/20">
                <p className="text-sm font-medium text-dark mb-1">Facturas</p>
                <ul className="text-sm text-muted space-y-1">
                  {order.invoices.map((inv) => (
                    <li key={inv.id}>
                      {inv.invoiceNumber} - {inv.status} - ${inv.total.toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        ))}
    </section>
  );
}
