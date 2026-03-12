"use client";

import { useState, useEffect, useCallback } from "react";

const ADJUSTMENT_TYPES = [
  { value: "ITEM_SHORTAGE", label: "Falta de producto" },
  { value: "ITEM_DAMAGE", label: "Producto dañado" },
  { value: "PRICE_ERROR", label: "Error de precio" },
  { value: "LATE_DELIVERY", label: "Entrega tardía" },
  { value: "OTHER", label: "Otro" },
] as const;

type AdjustmentStatus =
  | "PENDING"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "APPLIED";

type AdjustmentRequest = {
  id: string;
  type: string;
  description: string;
  originalAmount: number;
  requestedAmount: number;
  delta: number;
  status: AdjustmentStatus;
  requestedAt: string;
  requestedByUser?: { name: string };
  reviewNotes?: string | null;
};

type ApprovalInfo = {
  requiredApprovers: string[];
  autoApprove: boolean;
};

type Props = {
  orderId: string;
  invoiceId?: string;
  deliveryReportId?: string;
  userRole: string;
  onAdjustmentCreated?: () => void;
};

const STATUS_COLORS: Record<AdjustmentStatus, string> = {
  PENDING: "bg-gray-100 text-gray-800",
  UNDER_REVIEW: "bg-blue-100 text-blue-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  APPLIED: "bg-emerald-200 text-emerald-900",
};

export function AdjustmentRequestPanel({
  orderId,
  invoiceId,
  deliveryReportId,
  userRole,
  onAdjustmentCreated,
}: Props) {
  const [requests, setRequests] = useState<AdjustmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [form, setForm] = useState({
    type: "ITEM_SHORTAGE",
    description: "",
    originalAmount: "",
    requestedAmount: "",
  });
  const [approvalInfo, setApprovalInfo] = useState<ApprovalInfo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/adjustments?orderId=${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {
      setError("Error al cargar solicitudes");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const delta =
    form.originalAmount && form.requestedAmount
      ? parseFloat(form.originalAmount) - parseFloat(form.requestedAmount)
      : 0;

  useEffect(() => {
    if (delta > 0) {
      fetch(`/api/adjustments/approval-info?delta=${delta}`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => data && setApprovalInfo(data))
        .catch(() => setApprovalInfo(null));
    } else {
      setApprovalInfo(null);
    }
  }, [delta]);

  const canRequest = ["SALES", "ADMIN", "MASTER"].includes(userRole);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || form.description.length < 10) {
      setError("La descripción debe tener al menos 10 caracteres");
      return;
    }
    const orig = parseFloat(form.originalAmount);
    const req = parseFloat(form.requestedAmount);
    if (Number.isNaN(orig) || Number.isNaN(req) || orig <= req) {
      setError("El monto ajustado debe ser menor al original");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          invoiceId: invoiceId || undefined,
          deliveryReportId: deliveryReportId || undefined,
          type: form.type,
          description: form.description.trim(),
          originalAmount: orig,
          requestedAmount: req,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear solicitud");
        return;
      }
      setModalOpen(false);
      setForm({ type: "ITEM_SHORTAGE", description: "", originalAmount: "", requestedAmount: "" });
      await fetchRequests();
      onAdjustmentCreated?.();
    } catch {
      setError("Error de red");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/adjustments/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) await fetchRequests();
    } catch {
      setError("Error al aprobar");
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectNotes.trim() || rejectNotes.length < 5) return;
    try {
      const res = await fetch(`/api/adjustments/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNotes: rejectNotes.trim() }),
      });
      if (res.ok) {
        setRejectModal(null);
        setRejectNotes("");
        await fetchRequests();
      }
    } catch {
      setError("Error al rechazar");
    }
  };

  const canApprove = (req: AdjustmentRequest) => {
    if (req.status !== "PENDING" && req.status !== "UNDER_REVIEW") return false;
    return ["ADMIN", "MASTER"].includes(userRole);
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-stone/20 bg-stone/5 p-4">
        <p className="text-sm text-muted">Cargando ajustes…</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-stone/20 bg-stone/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-muted text-xs uppercase tracking-wider">Ajustes</h3>
        {canRequest && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded bg-terracotta px-3 py-1.5 text-sm text-cream hover:bg-terracotta/90"
          >
            Solicitar ajuste
          </button>
        )}
      </div>

      {error && (
        <p className="mb-3 text-sm text-red-600">{error}</p>
      )}

      {requests.length === 0 ? (
        <p className="text-sm text-muted">No hay solicitudes de ajuste.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((req) => (
            <li
              key={req.id}
              className="rounded border border-stone/20 bg-white p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[req.status]}`}
                >
                  {req.status}
                </span>
                <span className="text-sm text-muted">
                  {req.requestedByUser?.name ?? "—"} · ${req.delta.toFixed(2)}
                </span>
              </div>
              <p className="mt-2 text-sm text-dark">{req.description}</p>
              <p className="mt-1 text-xs text-muted">
                Original: ${req.originalAmount.toFixed(2)} → Ajustado: $
                {req.requestedAmount.toFixed(2)}
              </p>
              {canApprove(req) && (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(req.id)}
                    className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700"
                  >
                    Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectModal({ id: req.id })}
                    className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                  >
                    Rechazar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => !submitting && setModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="mb-4 font-display text-lg">Solicitar ajuste</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-muted">
                  Tipo de ajuste
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, type: e.target.value }))
                  }
                  className="w-full rounded border border-stone/30 px-3 py-2 text-sm"
                >
                  {ADJUSTMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted">
                  Descripción (mín. 10 caracteres)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded border border-stone/30 px-3 py-2 text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-muted">
                    Monto original
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.originalAmount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, originalAmount: e.target.value }))
                    }
                    className="w-full rounded border border-stone/30 px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted">
                    Monto ajustado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.requestedAmount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        requestedAmount: e.target.value,
                      }))
                    }
                    className="w-full rounded border border-stone/30 px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              {delta > 0 && (
                <p className="text-xs text-muted">
                  Delta: ${delta.toFixed(2)}
                  {approvalInfo?.autoApprove
                    ? " — Este ajuste será aprobado automáticamente."
                    : approvalInfo?.requiredApprovers?.length
                    ? ` — Requiere aprobación de: ${approvalInfo.requiredApprovers.join(" o ")}.`
                    : ""}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="rounded border border-stone/30 px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded bg-terracotta px-4 py-2 text-sm text-cream hover:bg-terracotta/90 disabled:opacity-50"
                >
                  {submitting ? "Enviando…" : "Enviar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setRejectModal(null)}
        >
          <div
            className="max-w-md rounded-lg bg-white p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="mb-3 font-display text-lg">Rechazar ajuste</h4>
            <p className="mb-3 text-sm text-muted">
              La razón de rechazo es obligatoria (mínimo 5 caracteres).
            </p>
            <textarea
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              rows={3}
              placeholder="Motivo del rechazo…"
              className="mb-4 w-full rounded border border-stone/30 px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="rounded border border-stone/30 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleReject(rejectModal.id)}
                disabled={rejectNotes.trim().length < 5}
                className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
