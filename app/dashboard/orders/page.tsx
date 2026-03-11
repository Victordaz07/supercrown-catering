import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="max-w-5xl">
      <h1 className="font-display text-2xl text-dark mb-6">Orders</h1>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <p className="text-muted">No orders yet.</p>
        ) : (
          orders.map((order) => (
            <Link
              key={order.id}
              href={`/dashboard/orders/${order.id}`}
              className="block bg-white border border-stone/30 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium text-dark">{order.orderNumber}</span>
                  <span className="text-muted text-sm ml-2">
                    {order.customerName} · {order.totalItems} items
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    order.status === "PENDING"
                      ? "bg-amber-100 text-amber-800"
                      : order.status === "CONFIRMED"
                      ? "bg-olive/20 text-olive"
                      : order.status === "READY"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-stone/20 text-muted"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-sm text-muted mt-1">
                {new Date(order.eventDate).toLocaleDateString()} ·{" "}
                {order.deliveryAddress}
              </p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
