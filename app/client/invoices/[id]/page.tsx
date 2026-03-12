"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type InvoiceDetail = {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  adjustmentSum: number;
  adjustedTotal: number;
  dueDate: string | null;
  paidAt: string | null;
  receiptUrl: string | null;
  order: {
    orderNumber: string;
    items: Array<{ name: string; quantity: number; unitPrice: number }>;
  };
  adjustments: Array<{ amount: number }>;
};

function PaymentForm({
  invoiceId,
  onSuccess,
}: {
  invoiceId: string;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/payment/intent`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al iniciar el pago");
        setLoading(false);
        return;
      }

      const { clientSecret } = data;
      if (!clientSecret) {
        setError("No se pudo obtener el método de pago");
        setLoading(false);
        return;
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        setError("Elemento de tarjeta no encontrado");
        setLoading(false);
        return;
      }

      const { error: stripeError } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        },
      );

      if (stripeError) {
        setError(stripeError.message || "El pago falló");
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-stone/5 rounded border border-stone/20">
        <label className="block text-sm font-medium text-dark mb-2">
          Datos de la tarjeta
        </label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#1a1a1a",
                "::placeholder": { color: "#9ca3af" },
              },
            },
          }}
        />
      </div>
      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="px-6 py-2 bg-terracotta text-cream rounded hover:bg-terracotta/90 disabled:opacity-50 font-medium"
      >
        {loading ? "Procesando..." : "Pagar con tarjeta"}
      </button>
    </form>
  );
}

export default function ClientInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paidSuccess, setPaidSuccess] = useState(false);

  useEffect(() => {
    Promise.resolve(params).then((p: { id: string }) => setInvoiceId(p.id));
  }, [params]);

  useEffect(() => {
    if (!invoiceId) return;
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/client/invoices/${invoiceId}`);
        const data = await res.json();
        if (!res.ok)
          throw new Error(data.error || "Error al cargar la factura");
        if (active) setInvoice(data);
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
  }, [invoiceId]);

  const refreshInvoice = () => {
    if (!invoiceId) return;
    fetch(`/api/client/invoices/${invoiceId}`)
      .then((r) => r.json())
      .then((data) => setInvoice(data))
      .catch(() => {});
  };

  if (loading || !invoice) {
    return (
      <div className="py-8 text-muted">
        {loading ? "Cargando factura..." : error || "Factura no encontrada"}
      </div>
    );
  }

  const canPay =
    invoice.status !== "PAID" &&
    invoice.status !== "VOID" &&
    ["SENT", "DELIVERED", "ADJUSTED", "OVERDUE"].includes(invoice.status);

  const stripeAvailable = !!stripePromise && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <section className="space-y-6">
      <Link
        href="/client/invoices"
        className="text-terracotta hover:underline text-sm inline-block"
      >
        &larr; Volver a facturas
      </Link>

      <div className="bg-white border border-stone/30 rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="font-display text-2xl text-dark">
              Factura {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-muted">
              Orden #{invoice.order.orderNumber}
            </p>
          </div>
          <span
            className={`text-sm px-3 py-1 rounded ${
              invoice.status === "PAID"
                ? "bg-emerald-100 text-emerald-800"
                : invoice.status === "VOID" || invoice.status === "REFUNDED"
                ? "bg-gray-200 text-gray-700"
                : "bg-stone/20 text-muted"
            }`}
          >
            {invoice.status}
          </span>
        </div>

        <div className="mb-6">
          <h3 className="text-muted text-xs uppercase tracking-wider mb-2">
            Items
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-stone/20">
                <th className="py-2 font-medium">Producto</th>
                <th className="py-2 font-medium text-right">Cant.</th>
                <th className="py-2 font-medium text-right">Precio</th>
                <th className="py-2 font-medium text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {invoice.order.items.map((item) => (
                <tr key={item.name} className="border-b border-stone/10">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-right">{item.quantity}</td>
                  <td className="py-2 text-right">
                    ${item.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-2 text-right">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-6 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>${invoice.subtotal.toFixed(2)}</span>
          </div>
          {invoice.adjustmentSum !== 0 && (
            <div className="flex justify-between">
              <span className="text-muted">Ajustes</span>
              <span>${invoice.adjustmentSum.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted">Impuesto ({invoice.taxRate}%)</span>
            <span>${invoice.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-medium text-lg pt-2 border-t border-stone/20">
            <span>Total</span>
            <span>${invoice.adjustedTotal.toFixed(2)}</span>
          </div>
        </div>

        {invoice.status === "PAID" && (
          <div className="mb-6 p-4 bg-olive/10 rounded border border-olive/30">
            <p className="text-olive font-medium">
              Pagada el{" "}
              {invoice.paidAt
                ? new Date(invoice.paidAt).toLocaleDateString("es-ES")
                : "—"}
            </p>
            {invoice.receiptUrl && (
              <a
                href={invoice.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terracotta hover:underline text-sm mt-1 inline-block"
              >
                Ver recibo
              </a>
            )}
          </div>
        )}

        {canPay && (
          <div className="pt-6 border-t border-stone/20">
            <h3 className="text-muted text-xs uppercase tracking-wider mb-3">
              Pagar factura
            </h3>
            {paidSuccess ? (
              <p className="text-olive font-medium">
                Pago procesado correctamente. Recarga la página para ver el estado actualizado.
              </p>
            ) : stripeAvailable ? (
              <Elements stripe={stripePromise}>
                <PaymentForm
                  invoiceId={invoice.id}
                  onSuccess={() => {
                    setPaidSuccess(true);
                    refreshInvoice();
                  }}
                />
              </Elements>
            ) : (
              <p className="text-muted">
                Pagos online no disponibles en este momento. Contacta al equipo para pagar por otros medios.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
