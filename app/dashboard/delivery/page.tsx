import { prisma } from "@/lib/db";
import { buildMapsUrl } from "@/lib/orderUtils";
import { MapPin, Phone, ChevronRight } from "lucide-react";
import { MarkDeliveredButton } from "@/components/dashboard/MarkDeliveredButton";

export default async function DeliveryPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["READY", "DELIVERED"] },
      eventDate: {
        gte: today,
        lt: tomorrow,
      },
    },
    orderBy: { eventDate: "asc" },
    include: { items: true },
  });

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-2xl text-dark mb-2">Today&apos;s Deliveries</h1>
      <p className="text-muted text-sm mb-6">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </p>

      {orders.length === 0 ? (
        <div className="bg-warm border border-dashed border-stone rounded-lg p-12 text-center">
          <p className="text-muted">No deliveries scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const mapsUrl = buildMapsUrl(order.deliveryAddress);
            return (
              <div
                key={order.id}
                className="bg-white border border-stone/30 rounded-lg overflow-hidden shadow-sm"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-display font-semibold text-dark">
                      {order.orderNumber}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        order.status === "DELIVERED"
                          ? "bg-olive/20 text-olive"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <p className="text-dark font-medium">{order.customerName}</p>
                  <p className="text-sm text-muted">{order.totalItems} items</p>
                </div>
                <div className="border-t border-stone/20 p-4 bg-cream/30">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-stone/30 hover:border-terracotta transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-terracotta/20 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-terracotta" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark truncate">
                        {order.deliveryAddress}
                      </p>
                      <p className="text-xs text-terracotta">Open in Google Maps →</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted flex-shrink-0" />
                  </a>
                  {order.customerPhone && (
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="flex items-center gap-2 mt-3 text-sm text-muted hover:text-terracotta"
                    >
                      <Phone className="w-4 h-4" />
                      {order.customerPhone}
                    </a>
                  )}
                </div>
                <details className="group">
                  <summary className="p-3 text-sm text-muted cursor-pointer list-none flex justify-between items-center hover:bg-cream/50">
                    View items
                    <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-3 pb-3 pt-0">
                    <ul className="text-sm text-dark space-y-1">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          {item.name} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
                {order.status === "READY" && (
                  <MarkDeliveredButton orderId={order.id} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
