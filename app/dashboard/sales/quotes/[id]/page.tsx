import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SalesQuoteClient } from "../_components/SalesQuoteClient";

type PageProps = { params: Promise<{ id: string }> };

export default async function QuoteReviewPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!["MASTER", "ADMIN", "SALES"].includes(session.user.role)) redirect("/dashboard");

  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { revisions: { orderBy: { revisionNumber: "desc" } } },
  });
  if (!quote) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted">Quote not found</p>
      </div>
    );
  }

  const createdOrder = quote.orderId
    ? await prisma.order.findUnique({
        where: { id: quote.orderId },
        select: { id: true, orderNumber: true, priceSnapshot: true, pricingLockedAt: true, items: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/sales/quotes" className="text-terracotta hover:underline text-sm">
          ← Back to Quotes
        </Link>
      </div>

      <h1 className="font-display text-2xl text-dark">
        {quote.quoteNumber}
      </h1>

      <SalesQuoteClient
        quote={{
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          clientName: quote.clientName,
          clientEmail: quote.clientEmail,
          clientPhone: quote.clientPhone,
          deliveryAddress: quote.deliveryAddress,
          eventDate: quote.eventDate.toISOString().slice(0, 10),
          guestCount: quote.guestCount,
          budget: quote.budget,
          typeOfService: quote.typeOfService,
          eventDetails: quote.eventDetails,
          status: quote.status,
          expiresAt: quote.expiresAt?.toISOString() ?? null,
          activeSalesRevisionNumber: quote.activeSalesRevisionNumber,
          approvedSalesRevisionNumber: quote.approvedSalesRevisionNumber,
          orderId: quote.orderId,
          orderNumber: createdOrder?.orderNumber ?? null,
          orderPriceSnapshot: createdOrder?.priceSnapshot ?? null,
          orderPricingLockedAt: createdOrder?.pricingLockedAt?.toISOString() ?? null,
          orderItems:
            createdOrder?.items.map((item) => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })) ?? [],
        }}
        revisions={quote.revisions.map((r) => ({
          revisionNumber: r.revisionNumber,
          createdByRole: r.createdByRole,
          note: r.note,
          itemsJson: r.itemsJson,
          subtotal: r.subtotal,
          taxRate: r.taxRate,
          taxAmount: r.taxAmount,
          total: r.total,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}