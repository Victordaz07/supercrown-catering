"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type ClosureCheck = {
  key: string;
  passed: boolean;
  label: string;
};

type ClosureStatus = {
  canClose: boolean;
  blockers: string[];
  checks: ClosureCheck[];
};

type Props = {
  orderId: string;
  orderStatus: string;
  userRole: string;
  onOrderClosed?: () => void;
};

export function OrderClosureChecklist({
  orderId,
  orderStatus,
  userRole,
  onOrderClosed,
}: Props) {
  const router = useRouter();
  const [data, setData] = useState<ClosureStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}/closure-status`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData(null);
      }
    } catch (err) {
      setError("Error al cargar estado de cierre");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleClose = async () => {
    if (!confirm("¿Cerrar esta orden manualmente? Todos los requisitos están cumplidos.")) {
      return;
    }
    setClosing(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/close`, {
        method: "POST",
      });
      if (res.ok) {
        onOrderClosed?.();
        router.refresh();
        await fetchStatus();
      } else {
        const json = await res.json();
        setError(json.error || json.reason || "Error al cerrar");
      }
    } catch (err) {
      setError("Error al cerrar la orden");
    } finally {
      setClosing(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="mb-6 p-4 bg-stone/5 rounded border border-stone/20">
        <h3 className="text-muted text-xs uppercase tracking-wider mb-2">
          Estado de Cierre
        </h3>
        <p className="text-sm text-muted">
          {loading ? "Cargando..." : error || "No se pudo cargar el estado"}
        </p>
      </div>
    );
  }

  if (orderStatus === "COMPLETED") {
    return (
      <div className="mb-6 p-4 bg-olive/10 rounded border border-olive/30">
        <h3 className="text-muted text-xs uppercase tracking-wider mb-2">
          Estado de Cierre
        </h3>
        <p className="text-olive font-medium">Orden cerrada</p>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-stone/5 rounded border border-stone/20">
      <h3 className="text-muted text-xs uppercase tracking-wider mb-3">
        Estado de Cierre
      </h3>

      <ul className="space-y-2 mb-4">
        {data.checks.map((check) => (
          <li key={check.key} className="flex items-center gap-2 text-sm">
            {check.passed ? (
              <span className="text-olive" aria-hidden>✓</span>
            ) : (
              <span className="text-stone/30" aria-hidden>○</span>
            )}
            <span
              className={
                check.passed ? "text-dark" : "text-muted"
              }
            >
              {check.label}
            </span>
          </li>
        ))}
      </ul>

      {error && (
        <p className="text-red-600 text-sm mb-3">{error}</p>
      )}

      {data.canClose && userRole === "MASTER" && (
        <button
          type="button"
          onClick={handleClose}
          disabled={closing}
          className="px-4 py-2 bg-olive text-cream rounded hover:bg-olive/90 disabled:opacity-50 text-sm"
        >
          {closing ? "Cerrando..." : "Cerrar Orden Manualmente"}
        </button>
      )}

      {!data.canClose && data.blockers.length > 0 && (
        <p className="text-sm text-muted">
          {data.blockers.length} requisito(s) pendiente(s) para cerrar esta orden
        </p>
      )}
    </div>
  );
}
