"use client";

import { useMemo, useState } from "react";
import { TRANSITIONS } from "@/lib/orders/stateMachine";

type OrderLike = { id: string; status: string; [key: string]: unknown };

type Props = {
  order: OrderLike;
  userRole: string;
  onTransitionSuccess: (updatedOrder: unknown) => void;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmado",
  IN_PREPARATION: "En preparacion",
  READY_FOR_PICKUP: "Listo para recoger",
  READY: "Listo (legacy)",
  IN_TRANSIT: "En camino",
  DELIVERED: "Entregado",
  UNDER_REVIEW: "En revision",
  COMPLETED: "Completado",
  DISPUTED: "En disputa",
  CANCELLED: "Cancelado",
  QUOTE_PENDING: "Cotizacion pendiente",
};

function buttonColor(status: string): string {
  if (status === "CANCELLED") return "bg-red-600 hover:bg-red-700";
  if (status === "COMPLETED") return "bg-emerald-600 hover:bg-emerald-700";
  if (status === "UNDER_REVIEW" || status === "DISPUTED") return "bg-orange-500 hover:bg-orange-600";
  if (status === "IN_TRANSIT" || status === "DELIVERED") return "bg-blue-900 hover:bg-blue-950";
  return "bg-blue-600 hover:bg-blue-700";
}

function badgeColor(status: string): string {
  if (status === "CANCELLED") return "bg-red-100 text-red-700";
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700";
  if (status === "UNDER_REVIEW" || status === "DISPUTED") return "bg-orange-100 text-orange-700";
  if (status === "IN_TRANSIT" || status === "DELIVERED") return "bg-blue-100 text-blue-700";
  return "bg-slate-100 text-slate-700";
}

export default function StatusTransitionPanel({ order, userRole, onTransitionSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reasonTarget, setReasonTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const currentRule = TRANSITIONS[order.status];
  const availableTransitions = useMemo(() => {
    if (!currentRule) return [];
    if (!currentRule.requiredRoles.includes(userRole)) return [];
    return currentRule.to;
  }, [currentRule, userRole]);

  const requiresReason = Boolean(currentRule?.requiresReason);

  const submitTransition = async (targetStatus: string, transitionReason?: string) => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, reason: transitionReason }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data?.error ?? "No fue posible realizar la transicion");
        return;
      }

      if (response.status === 202 || data?.approvalRequestId) {
        setMessage("Solicitud enviada - pendiente de aprobacion");
        return;
      }

      setMessage("Estado actualizado correctamente");
      onTransitionSuccess(data);
    } catch {
      setMessage("Error de red al intentar cambiar el estado");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">Estado actual</span>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeColor(order.status)}`}>
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {availableTransitions.map((nextStatus) => (
          <button
            key={nextStatus}
            type="button"
            disabled={isLoading}
            onClick={() => {
              if (requiresReason) {
                setReasonTarget(nextStatus);
                return;
              }
              void submitTransition(nextStatus);
            }}
            className={`rounded px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${buttonColor(nextStatus)}`}
          >
            {STATUS_LABELS[nextStatus] ?? nextStatus}
          </button>
        ))}
      </div>

      {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}

      {reasonTarget ? (
        <div className="mt-4 rounded-md border border-slate-200 p-3">
          <p className="mb-2 text-sm font-medium text-slate-700">
            Este cambio requiere razon: {STATUS_LABELS[reasonTarget] ?? reasonTarget}
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded border border-slate-300 p-2 text-sm"
            rows={3}
            placeholder="Escribe la razon del cambio"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={isLoading || !reason.trim()}
              onClick={() => {
                void submitTransition(reasonTarget, reason.trim());
                setReason("");
                setReasonTarget(null);
              }}
              className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Confirmar
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => {
                setReason("");
                setReasonTarget(null);
              }}
              className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
