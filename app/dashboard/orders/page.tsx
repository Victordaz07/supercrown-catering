import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { OrderStatusQuickEdit } from "./OrderStatusQuickEdit";

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role || "";
  const canAuthorizeStatus = role === "MASTER" || role === "ADMIN";

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
            <div
              key={order.id}
              className="bg-white border border-stone/30 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <Link href={`/dashboard/orders/${order.id}`} className="flex-1 min-w-0">
                  <span className="font-medium text-dark">{order.orderNumber}</span>
                  <span className="text-muted text-sm ml-2">
                    {order.customerName} · {order.totalItems} items
                  </span>
                  <p className="text-sm text-muted mt-1">
                    {new Date(order.eventDate).toLocaleDateString()} ·{" "}
                    {order.deliveryAddress}
                  </p>
                </Link>

                <div className="ml-3 flex-shrink-0">
                  <OrderStatusQuickEdit
                    orderId={order.id}
                    currentStatus={order.status}
                    canAuthorize={canAuthorizeStatus}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
