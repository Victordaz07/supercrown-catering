import type { PriceSnapshot } from "@/lib/pricing/lockPrice";

type LiveItem = { name: string; quantity: number; unitPrice: number };

type Props = {
  order: {
    pricingLockedAt: Date | string | null;
    pricingLockedBy?: string | null;
    priceSnapshot: unknown;
    items?: LiveItem[];
  };
};

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function isSnapshot(value: unknown): value is PriceSnapshot {
  if (!value || typeof value !== "object") return false;
  return "items" in value && "total" in value;
}

export default function PricingDisplay({ order }: Props) {
  const lockedAt =
    typeof order.pricingLockedAt === "string"
      ? new Date(order.pricingLockedAt)
      : order.pricingLockedAt;
  const snapshot = isSnapshot(order.priceSnapshot) ? order.priceSnapshot : null;

  if (lockedAt && snapshot) {
    return (
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="mb-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
          🔒 Precios fijados el {lockedAt.toLocaleDateString()}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-2 pr-4">Producto</th>
                <th className="py-2 pr-4">Cant.</th>
                <th className="py-2 pr-4">Precio unit.</th>
                <th className="py-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.items.map((item) => (
                <tr key={item.orderItemId} className="border-t border-emerald-100 text-dark">
                  <td className="py-2 pr-4">{item.name}</td>
                  <td className="py-2 pr-4">{item.quantity}</td>
                  <td className="py-2 pr-4">{money(item.unitPriceAtOrder)}</td>
                  <td className="py-2">{money(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span className="text-dark">{money(snapshot.subtotal)}</span>
          </div>
          {snapshot.discountAmount ? (
            <div className="flex justify-between">
              <span className="text-muted">Descuento</span>
              <span className="text-dark">- {money(snapshot.discountAmount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted">Impuesto</span>
            <span className="text-dark">{money(snapshot.taxAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span className="text-dark">Total</span>
            <span className="text-dark">{money(snapshot.total)}</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
        ⚠️ Los precios pueden cambiar hasta que la orden sea confirmada
      </div>
      <div className="space-y-2">
        {(order.items ?? []).map((item) => (
          <div key={`${item.name}-${item.quantity}`} className="flex justify-between text-sm">
            <span className="text-dark">
              {item.name} (x{item.quantity})
            </span>
            <span className="text-dark">{money(item.unitPrice)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
