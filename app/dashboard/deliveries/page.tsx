"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Loader2,
  ChevronDown,
  ChevronUp,
  Camera,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

type ReportItem = {
  id: string;
  expectedQty: number;
  deliveredQty: number;
  issue: string | null;
  issueNotes: string | null;
  orderItem: { name: string; category: string };
};

type Photo = {
  id: string;
  photoUrl: string;
  photoType: string;
  caption: string | null;
};

type Report = {
  id: string;
  orderId: string;
  receiverName: string;
  status: string;
  hasIssues: boolean;
  notes: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  driver: { name: string };
  reviewedBy: { name: string } | null;
  order: { orderNumber: string; customerName: string; invoices?: { id: string; invoiceNumber: string }[] };
  items: ReportItem[];
  photos: Photo[];
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Pendiente", APPROVED: "Aprobado", REJECTED: "Rechazado", ESCALATED: "Escalado",
};
const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-100 text-amber-700", APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700", ESCALATED: "bg-purple-100 text-purple-700",
};

export default function DeliveriesPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [adjustForm, setAdjustForm] = useState(false);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filter) p.set("status", filter);
    const res = await fetch(`/api/deliveries?${p}`);
    if (res.ok) setReports(await res.json());
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  async function handleReview(reportId: string, status: string) {
    setSaving(true);
    await fetch(`/api/deliveries/${reportId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNotes: reviewNotes || undefined }),
    });

    if (status === "APPROVED" && adjustForm && adjustReason.length >= 10) {
      const report = reports.find((r) => r.id === reportId);
      const invoiceId = report?.order?.invoices?.[0]?.id;
      if (invoiceId) {
        await fetch(`/api/invoices/${invoiceId}/adjust`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "CREDIT",
            reason: adjustReason,
            amount: -(Math.abs(parseFloat(adjustAmount) || 0)),
            deliveryReportId: reportId,
          }),
        });
      }
    }

    setSaving(false);
    setExpandedId(null);
    setAdjustForm(false);
    setAdjustReason("");
    setAdjustAmount("");
    setReviewNotes("");
    fetchReports();
  }

  const filters = ["", "PENDING_REVIEW", "APPROVED", "REJECTED", "ESCALATED"];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Truck className="w-6 h-6 text-terracotta" />
        <h1 className="font-display text-3xl text-dark">Reportes de Entrega</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button key={f || "all"} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm transition-all ${filter === f ? "bg-dark text-cream" : "bg-warm text-muted hover:text-dark"}`}>
            {f ? STATUS_LABELS[f] : "Todos"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>
      ) : reports.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <Truck className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hay reportes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => {
            const isExpanded = expandedId === r.id;
            return (
              <div key={r.id} className="bg-white border border-stone/20 rounded-xl shadow-sm overflow-hidden">
                <button onClick={() => { setExpandedId(isExpanded ? null : r.id); setReviewNotes(""); setAdjustForm(false); }}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-warm/30 transition-colors">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-medium text-dark">{r.order.orderNumber}</span>
                    <span className="text-sm text-muted">{r.driver.name} → {r.receiverName}</span>
                    <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</span>
                    {r.hasIssues ? (
                      <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-lg">
                        <AlertCircle className="w-3 h-3" /> Con incidencias
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg">
                        <CheckCircle2 className="w-3 h-3" /> Sin problemas
                      </span>
                    )}
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                      {STATUS_LABELS[r.status]}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-muted" /> : <ChevronDown className="w-5 h-5 text-muted" />}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-stone/10 space-y-4">
                    {/* Items table */}
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-warm/40">
                            <th className="text-left px-3 py-2 font-medium text-muted">Producto</th>
                            <th className="text-center px-3 py-2 font-medium text-muted">Esperado</th>
                            <th className="text-center px-3 py-2 font-medium text-muted">Entregado</th>
                            <th className="text-left px-3 py-2 font-medium text-muted">Estado</th>
                            <th className="text-left px-3 py-2 font-medium text-muted">Notas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r.items.map((item) => {
                            const bad = item.deliveredQty < item.expectedQty || item.issue;
                            return (
                              <tr key={item.id} className={bad ? "bg-red-50" : ""}>
                                <td className="px-3 py-2">{item.orderItem.name}</td>
                                <td className="px-3 py-2 text-center">{item.expectedQty}</td>
                                <td className={`px-3 py-2 text-center font-medium ${bad ? "text-red-600" : "text-dark"}`}>{item.deliveredQty}</td>
                                <td className="px-3 py-2 text-xs">{item.issue ?? "OK"}</td>
                                <td className="px-3 py-2 text-xs text-muted">{item.issueNotes ?? "—"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {r.notes && (
                      <div className="p-3 bg-warm rounded-xl text-sm">
                        <span className="text-xs uppercase text-muted block mb-1">Notas del conductor</span>
                        {r.notes}
                      </div>
                    )}

                    {/* Photos */}
                    {r.photos.length > 0 && (
                      <div>
                        <span className="text-xs uppercase text-muted block mb-2">Evidencia fotográfica</span>
                        <div className="flex gap-2 flex-wrap">
                          {r.photos.map((p) => (
                            <button key={p.id} onClick={() => setLightbox(p.photoUrl)}
                              className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone/20 hover:border-terracotta transition-colors">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.photoUrl} alt={p.photoType} className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 left-0 right-0 bg-dark/60 text-cream text-[9px] px-1 py-0.5 truncate">
                                {p.photoType.replace(/_/g, " ")}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Review section */}
                    {r.status === "PENDING_REVIEW" && (
                      <div className="border-t border-stone/10 pt-4 space-y-3">
                        <span className="text-xs uppercase text-muted block">Revisión</span>
                        <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)}
                          placeholder="Notas de revisión (opcional)..."
                          className="w-full px-3 py-2 bg-cream border border-stone/40 rounded-xl text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-terracotta/30" />

                        {r.hasIssues && (
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={adjustForm} onChange={(e) => setAdjustForm(e.target.checked)} className="rounded" />
                            Aprobar con ajuste de factura (nota de crédito)
                          </label>
                        )}

                        {adjustForm && (
                          <div className="bg-white border border-stone/20 rounded-xl p-3 space-y-2">
                            <input value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}
                              placeholder="Razón del ajuste (mín. 10 caracteres)..."
                              className="w-full px-3 py-2 border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
                            <input type="number" step="0.01" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)}
                              placeholder="Monto a descontar (ej: 25.50)"
                              className="w-full px-3 py-2 border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          <button onClick={() => handleReview(r.id, "APPROVED")} disabled={saving}
                            className="bg-olive text-cream px-4 py-2 rounded-xl text-sm hover:bg-olive/90 disabled:opacity-50 transition-all">
                            {adjustForm ? "Aprobar con ajuste" : "Aprobar"}
                          </button>
                          <button onClick={() => handleReview(r.id, "REJECTED")} disabled={saving}
                            className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-red-700 disabled:opacity-50 transition-all">
                            Rechazar
                          </button>
                          <button onClick={() => handleReview(r.id, "ESCALATED")} disabled={saving}
                            className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50 transition-all">
                            Escalar a Master
                          </button>
                        </div>
                      </div>
                    )}

                    {r.reviewedBy && (
                      <div className="p-3 bg-warm rounded-xl text-sm">
                        <span className="text-xs uppercase text-muted block mb-1">Revisado por {r.reviewedBy.name}</span>
                        {r.reviewNotes ?? "Sin notas"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-dark/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-cream"><X className="w-8 h-8" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="Evidencia" className="max-w-full max-h-[90vh] rounded-xl" />
        </div>
      )}
    </div>
  );
}
