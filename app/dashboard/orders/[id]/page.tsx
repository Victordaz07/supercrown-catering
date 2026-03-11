import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { OrderActions } from "./OrderActions";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, invoices: true, driver: { select: { id: true, name: true } } },
  });
  if (!order) notFound();

  const serialized = {
    ...order,
    eventDate: order.eventDate.toISOString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    driverId: order.driverId || null,
    driverName: order.driver?.name || null,
    invoices: order.invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      pdfPathDriver: inv.pdfPathDriver,
      pdfPathClient: inv.pdfPathClient,
    })),
  };

  return (
    <div className="max-w-4xl">
      <Link href="/dashboard/orders" className="text-terracotta hover:underline text-sm mb-4 inline-block">
        &larr; Back to orders
      </Link>
      <div className="bg-white border border-stone/30 rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="font-display text-2xl text-dark">{order.orderNumber}</h1>
            <p className="text-muted text-sm">
              {new Date(order.createdAt).toLocaleString("en-US")}
            </p>
          </div>
          <span
            className={`text-sm px-3 py-1 rounded ${
              order.status === "PENDING"
                ? "bg-amber-100 text-amber-800"
                : order.status === "CONFIRMED"
                ? "bg-olive/20 text-olive"
                : order.status === "READY"
                ? "bg-blue-100 text-blue-800"
                : order.status === "DELIVERED"
                ? "bg-olive/15 text-olive"
                : "bg-stone/20 text-muted"
            }`}
          >
            {order.status}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-muted text-xs uppercase tracking-wider mb-2">Customer</h3>
            <p className="font-medium text-dark">{order.customerName}</p>
            <p className="text-sm text-muted">{order.customerEmail}</p>
            {order.customerPhone && (
              <p className="text-sm text-muted">{order.customerPhone}</p>
            )}
          </div>
          <div>
            <h3 className="text-muted text-xs uppercase tracking-wider mb-2">Delivery</h3>
            <p className="text-dark">{order.deliveryAddress}</p>
            <p className="text-sm text-muted mt-1">
              {new Date(order.eventDate).toLocaleDateString("en-US")}
              {order.guestCount && ` · ${order.guestCount} guests`}
            </p>
          </div>
        </div>

        {order.invoices.length > 0 && (
          <div className="mb-6">
            <h3 className="text-muted text-xs uppercase tracking-wider mb-2">Invoices</h3>
            <div className="flex flex-wrap gap-2">
              {order.invoices.map((inv) => (
                <div key={inv.id} className="flex gap-2">
                  {inv.pdfPathDriver && (
                    <a href={inv.pdfPathDriver} target="_blank" rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-terracotta text-cream rounded hover:bg-terracotta/90 text-sm">
                      {inv.invoiceNumber} (Driver)
                    </a>
                  )}
                  {inv.pdfPathClient && (
                    <a href={inv.pdfPathClient} target="_blank" rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-olive text-cream rounded hover:bg-olive/90 text-sm">
                      {inv.invoiceNumber} (Client)
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {order.eventDetails && (
          <div className="mb-6 p-4 bg-warm rounded border-l-4 border-terracotta">
            <h3 className="text-muted text-xs uppercase tracking-wider mb-2">Event Details</h3>
            <p className="text-dark whitespace-pre-wrap">{order.eventDetails}</p>
          </div>
        )}

        <OrderActions order={serialized} />
      </div>
    </div>
  );
}
