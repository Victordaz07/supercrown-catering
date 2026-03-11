"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";

type Offer = {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrder: number | null;
  maxUses: number | null;
  validUntil: string | null;
};

export default function ClientOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch("/api/client/offers");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudieron cargar las ofertas");
        if (active) setOffers(data.offers || []);
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
  }, []);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(""), 1500);
  };

  return (
    <section className="space-y-4">
      <div>
        <h1 className="font-display text-2xl text-dark">Ofertas y cupones</h1>
        <p className="text-sm text-muted">Codigos disponibles para aplicar en tus proximos pedidos.</p>
      </div>

      {loading && <div className="text-muted py-8">Cargando ofertas...</div>}
      {!loading && error && <div className="text-red-700 bg-red-50 px-4 py-3 rounded-md">{error}</div>}
      {!loading && !error && offers.length === 0 && (
        <div className="bg-white border border-stone/30 rounded-lg p-6 text-muted">
          No hay ofertas activas por el momento.
        </div>
      )}

      {!loading &&
        !error &&
        offers.map((offer) => (
          <article key={offer.id} className="bg-white border border-stone/30 rounded-lg p-5 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-xl text-dark">{offer.code}</p>
                <p className="text-sm text-muted">
                  {offer.type === "PERCENTAGE" ? `${offer.value}% de descuento` : `$${offer.value.toFixed(2)} de descuento`}
                </p>
              </div>
              <button
                onClick={() => copyCode(offer.code)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-dark text-cream text-sm hover:bg-dark/90"
              >
                {copiedCode === offer.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedCode === offer.code ? "Copiado" : "Copiar"}
              </button>
            </div>

            {offer.description && <p className="text-sm text-dark">{offer.description}</p>}
            {offer.minOrder !== null && (
              <p className="text-sm text-muted">Pedido minimo: ${offer.minOrder.toFixed(2)}</p>
            )}
            {offer.validUntil && (
              <p className="text-sm text-muted">
                Vence: {new Date(offer.validUntil).toLocaleDateString("es-ES")}
              </p>
            )}
          </article>
        ))}
    </section>
  );
}
