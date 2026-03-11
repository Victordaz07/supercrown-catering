"use client";

import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
  ImageIcon,
  Filter,
} from "lucide-react";

type ReportStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ESCALATED";

type ReportItem = {
  itemId: string;
  productName: string;
  expectedQty: number;
  deliveredQty: number;
  issueType: string;
  issueNotes: string;
};

type ReportPhoto = {
  id: string;
  url: string;
  photoType: string;
  caption: string;
};

type DeliveryReport = {
  id: string;
  orderId: string;
  orderNumber: string;
  driverName: string;
  receiverName: string;
  createdAt: string;
  status: ReportStatus;
  hasIssues: boolean;
  notes: string;
  items: ReportItem[];
  photos: ReportPhoto[];
  reviewNotes?: string;
  invoiceId?: string;
};

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; bg: string; text: string }
> = {
  PENDING_REVIEW: { label: "Pending", bg: "bg-yellow-100", text: "text-yellow-800" },
  APPROVED: { label: "Approved", bg: "bg-olive/20", text: "text-olive" },
  REJECTED: { label: "Rejected", bg: "bg-red-100", text: "text-red-700" },
  ESCALATED: { label: "Escalated", bg: "bg-blue-100", text: "text-blue-800" },
};

const FILTER_OPTIONS: { value: ReportStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING_REVIEW", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ESCALATED", label: "Escalated" },
];

export default function DeliveriesReviewPage() {
  const [reports, setReports] = useState<DeliveryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "ALL">("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<ReportPhoto | null>(null);

  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReportStatus>("APPROVED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const [showAdjustForm, setShowAdjustForm] = useState(false);
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustAmounts, setAdjustAmounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  async function fetchReports() {
    setLoading(true);
    try {
      const query = statusFilter === "ALL" ? "" : `?status=${statusFilter}`;
      const res = await fetch(`/api/deliveries${query}`);
      if (!res.ok) throw new Error("Error loading reports");
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setReviewingId(null);
      setShowAdjustForm(false);
    } else {
      setExpandedId(id);
      setReviewingId(null);
      setShowAdjustForm(false);
    }
  };

  const startReview = (report: DeliveryReport) => {
    setReviewingId(report.id);
    setReviewStatus("APPROVED");
    setReviewNotes("");
    setReviewError(null);
    setShowAdjustForm(false);
    setAdjustReason("");
    setAdjustAmounts({});
  };

  const handleReview = async (report: DeliveryReport, action: string) => {
    setSubmittingReview(true);
    setReviewError(null);

    try {
      const res = await fetch(`/api/deliveries/${report.id}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action === "APPROVE_ADJUST" ? "APPROVED" : action,
          reviewNotes: reviewNotes.trim(),
          hasAdjustment: action === "APPROVE_ADJUST",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error processing review");
      }

      if (action === "APPROVE_ADJUST" && report.invoiceId) {
        const adjustItems = Object.entries(adjustAmounts)
          .filter(([, amount]) => amount > 0)
          .map(([itemId, amount]) => ({ itemId, amount }));

        if (adjustItems.length > 0) {
          await fetch(`/api/invoices/${report.invoiceId}/adjust`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: adjustReason.trim(),
              items: adjustItems,
            }),
          });
        }
      }

      setReviewingId(null);
      setShowAdjustForm(false);
      fetchReports();
    } catch (err) {
      setReviewError(
        err instanceof Error ? err.message : "Error submitting review"
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const issueLabel = (type: string) => {
    const map: Record<string, string> = {
      SIN_PROBLEMA: "No issue",
      FALTANTE: "Missing",
      DANADO: "Damaged",
      PRODUCTO_EQUIVOCADO: "Wrong product",
      OTRO: "Other",
    };
    return map[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-dark">
            Delivery Reports
          </h1>
          <p className="text-muted text-sm mt-1">
            {reports.length} report{reports.length !== 1 && "s"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted" />
          <div className="flex flex-wrap gap-1">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? "bg-terracotta text-cream"
                    : "bg-warm border border-stone/40 text-muted hover:text-dark"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-muted animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-warm border border-stone/40 rounded-sm">
          <ClipboardCheck className="w-12 h-12 text-stone mx-auto mb-3" />
          <p className="font-display text-dark">No reports</p>
          <p className="text-muted text-sm mt-1">
            {statusFilter === "ALL"
              ? "No delivery reports have been submitted yet"
              : `No reports with status "${STATUS_CONFIG[statusFilter as ReportStatus]?.label}"`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.PENDING_REVIEW;
            const isExpanded = expandedId === report.id;

            return (
              <div
                key={report.id}
                className="bg-white border border-stone/40 rounded-sm shadow-sm overflow-hidden"
              >
                {/* Card Header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(report.id)}
                  className="w-full text-left p-4 hover:bg-warm/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-base text-dark">
                          Order #{report.orderNumber}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          {statusCfg.label}
                        </span>
                        {report.hasIssues ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            <AlertCircle className="w-3 h-3" />
                            Has issues
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-olive/20 text-olive">
                            <CheckCircle2 className="w-3 h-3" />
                            No issues
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted">
                        <span>Driver: {report.driverName}</span>
                        <span>Received by: {report.receiverName}</span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        {formatDate(report.createdAt)}
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted shrink-0" />
                    )}
                  </div>
                </button>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="border-t border-stone/20 p-4 space-y-5">
                    {/* Items Table */}
                    <div>
                      <h3 className="font-display text-base text-dark mb-2">
                        Product details
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-stone/10">
                              <th className="text-left px-3 py-2 font-medium text-dark">
                                Product
                              </th>
                              <th className="text-center px-3 py-2 font-medium text-dark">
                                Expected
                              </th>
                              <th className="text-center px-3 py-2 font-medium text-dark">
                                Delivered
                              </th>
                              <th className="text-left px-3 py-2 font-medium text-dark">
                                Status
                              </th>
                              <th className="text-left px-3 py-2 font-medium text-dark">
                                Notes
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {report.items.map((item, i) => {
                              const hasIssue = item.issueType !== "SIN_PROBLEMA";
                              const qtyMismatch = item.deliveredQty !== item.expectedQty;
                              return (
                                <tr
                                  key={i}
                                  className={`border-t border-stone/10 ${
                                    hasIssue ? "bg-red-50/40" : ""
                                  }`}
                                >
                                  <td className="px-3 py-2 text-dark">
                                    {item.productName}
                                  </td>
                                  <td className="px-3 py-2 text-center text-muted">
                                    {item.expectedQty}
                                  </td>
                                  <td
                                    className={`px-3 py-2 text-center font-medium ${
                                      qtyMismatch ? "text-red-600" : "text-olive"
                                    }`}
                                  >
                                    {item.deliveredQty}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={`text-xs font-medium ${
                                        hasIssue ? "text-red-600" : "text-olive"
                                      }`}
                                    >
                                      {issueLabel(item.issueType)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-muted">
                                    {item.issueNotes || "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Driver Notes */}
                    {report.notes && (
                      <div>
                        <h3 className="font-display text-base text-dark mb-1">
                          Driver notes
                        </h3>
                        <p className="text-sm text-muted bg-warm border border-stone/30 rounded-sm p-3">
                          {report.notes}
                        </p>
                      </div>
                    )}

                    {/* Photos Gallery */}
                    {report.photos && report.photos.length > 0 && (
                      <div>
                        <h3 className="font-display text-base text-dark mb-2">
                          Photo evidence
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {report.photos.map((photo) => (
                            <button
                              key={photo.id}
                              type="button"
                              onClick={() => setLightboxPhoto(photo)}
                              className="relative group aspect-square rounded-sm overflow-hidden border border-stone/40"
                            >
                              <img
                                src={photo.url}
                                alt={photo.caption}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-dark/70 to-transparent p-1.5">
                                <p className="text-[10px] text-cream truncate">
                                  {photo.caption}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {report.photos?.length === 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted py-2">
                        <ImageIcon className="w-4 h-4" />
                        <span>No photos attached</span>
                      </div>
                    )}

                    {/* Review Section */}
                    <div className="border-t border-stone/20 pt-4">
                      <h3 className="font-display text-base text-dark mb-3">
                        Review
                      </h3>

                      {report.status !== "PENDING_REVIEW" && report.reviewNotes && (
                        <div className="bg-warm border border-stone/30 rounded-sm p-3 mb-3">
                          <p className="text-xs text-muted mb-1">
                            Review notes:
                          </p>
                          <p className="text-sm text-dark">
                            {report.reviewNotes}
                          </p>
                        </div>
                      )}

                      {report.status === "PENDING_REVIEW" && (
                        <>
                          {reviewingId !== report.id ? (
                            <button
                              onClick={() => startReview(report)}
                              className="px-4 py-2 bg-terracotta text-cream rounded-sm text-sm font-medium hover:bg-terracotta/90"
                            >
                              Review report
                            </button>
                          ) : (
                            <div className="space-y-3">
                              {reviewError && (
                                <div className="bg-red-50 text-red-700 px-3 py-2 rounded-sm text-sm">
                                  {reviewError}
                                </div>
                              )}

                              <div>
                                <label className="block text-sm text-dark mb-1">
                                  Review notes
                                </label>
                                <textarea
                                  value={reviewNotes}
                                  onChange={(e) =>
                                    setReviewNotes(e.target.value)
                                  }
                                  placeholder="Comments about the review..."
                                  rows={2}
                                  className="w-full bg-cream border border-stone/40 rounded-sm px-3 py-2 text-sm resize-none focus:outline-none focus:border-terracotta"
                                />
                              </div>

                              {/* Adjust Form */}
                              {showAdjustForm && (
                                <div className="bg-warm border border-stone/40 rounded-sm p-3 space-y-3">
                                  <h4 className="text-sm font-medium text-dark">
                                    Credit note
                                  </h4>
                                  <div>
                                    <label className="block text-xs text-muted mb-1">
                                      Adjustment reason
                                    </label>
                                    <input
                                      type="text"
                                      value={adjustReason}
                                      onChange={(e) =>
                                        setAdjustReason(e.target.value)
                                      }
                                      placeholder="E.g.: Product damaged in transit"
                                      className="w-full bg-cream border border-stone/40 rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-terracotta"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    {report.items
                                      .filter(
                                        (item) =>
                                          item.issueType !== "SIN_PROBLEMA" ||
                                          item.deliveredQty !== item.expectedQty
                                      )
                                      .map((item) => (
                                        <div
                                          key={item.itemId}
                                          className="flex items-center justify-between gap-2"
                                        >
                                          <span className="text-sm text-dark truncate flex-1">
                                            {item.productName}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs text-muted">
                                              $
                                            </span>
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={
                                                adjustAmounts[item.itemId] || ""
                                              }
                                              onChange={(e) =>
                                                setAdjustAmounts((prev) => ({
                                                  ...prev,
                                                  [item.itemId]:
                                                    parseFloat(e.target.value) || 0,
                                                }))
                                              }
                                              placeholder="0.00"
                                              className="w-24 bg-cream border border-stone/40 rounded-sm px-2 py-1 text-sm text-right focus:outline-none focus:border-terracotta"
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    {report.items.every(
                                      (item) =>
                                        item.issueType === "SIN_PROBLEMA" &&
                                        item.deliveredQty === item.expectedQty
                                    ) && (
                                      <p className="text-sm text-muted">
                                        No products with issues
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() =>
                                    handleReview(report, "APPROVED")
                                  }
                                  disabled={submittingReview}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-olive text-cream rounded-sm text-sm font-medium hover:bg-olive/90 disabled:opacity-70"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    if (!showAdjustForm) {
                                      setShowAdjustForm(true);
                                    } else {
                                      handleReview(report, "APPROVE_ADJUST");
                                    }
                                  }}
                                  disabled={submittingReview}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-yellow-600 text-cream rounded-sm text-sm font-medium hover:bg-yellow-700 disabled:opacity-70"
                                >
                                  <AlertCircle className="w-4 h-4" />
                                  {showAdjustForm
                                    ? "Confirm adjustment"
                                    : "Approve with adjustment"}
                                </button>
                                <button
                                  onClick={() =>
                                    handleReview(report, "REJECTED")
                                  }
                                  disabled={submittingReview}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-300 text-red-700 rounded-sm text-sm font-medium hover:bg-red-50 disabled:opacity-70"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Reject
                                </button>
                                <button
                                  onClick={() =>
                                    handleReview(report, "ESCALATED")
                                  }
                                  disabled={submittingReview}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 border border-blue-300 text-blue-700 rounded-sm text-sm font-medium hover:bg-blue-50 disabled:opacity-70"
                                >
                                  <ArrowUpCircle className="w-4 h-4" />
                                  Escalate
                                </button>
                              </div>

                              {submittingReview && (
                                <div className="flex items-center gap-2 text-sm text-muted">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Processing...
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-dark/80 p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div
            className="relative max-w-2xl w-full animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-cream rounded-full flex items-center justify-center shadow-lg hover:bg-warm z-10"
            >
              <X className="w-4 h-4 text-dark" />
            </button>
            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.caption}
              className="w-full rounded-sm shadow-2xl"
            />
            <p className="text-center text-cream text-sm mt-3">
              {lightboxPhoto.caption}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
