"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  X,
  Eye,
  CreditCard,
  Ban,
  FileDown,
  ChevronDown,
  Loader2,
  History,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type InvoiceItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Adjustment = {
  id: string;
  date: string;
  reason: string;
  previousTotal: number;
  newTotal: number;
  adjustedBy: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  orderNumber: string;
  total: number;
  adjustedTotal: number | null;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
  items: InvoiceItem[];
  paymentMethod: string | null;
  paymentRef: string | null;
  notes: string | null;
  pdfDriverUrl: string | null;
  pdfClientUrl: string | null;
};

type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "DELIVERED"
  | "ADJUSTED"
  | "PAID"
  | "OVERDUE"
  | "VOID"
  | "REFUNDED";

type Stats = {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
};

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  DRAFT: "bg-stone/30 text-stone",
  SENT: "bg-blue-100 text-blue-700",
  DELIVERED: "bg-olive/20 text-olive",
  ADJUSTED: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-red-100 text-red-700",
  VOID: "bg-gray-200 text-gray-500",
  REFUNDED: "bg-purple-100 text-purple-700",
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  DELIVERED: "Delivered",
  ADJUSTED: "Adjusted",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Voided",
  REFUNDED: "Refunded",
};

const ALL_STATUSES: InvoiceStatus[] = [
  "DRAFT",
  "SENT",
  "DELIVERED",
  "ADJUSTED",
  "PAID",
  "OVERDUE",
  "VOID",
  "REFUNDED",
];

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "CHECK", label: "Check" },
  { value: "CARD", label: "Card" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "OTHER", label: "Other" },
];

const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);

const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function InvoicesDashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalInvoiced: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentRef, setPaymentRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ---- Fetch invoices ---- */
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("from", dateFrom);
      if (dateTo) params.set("to", dateTo);
      if (search) params.set("search", search);

      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (!res.ok) throw new Error("Error loading invoices");
      const data = await res.json();
      setInvoices(data.invoices ?? []);
      setStats(
        data.stats ?? {
          totalInvoiced: 0,
          totalPaid: 0,
          totalPending: 0,
          totalOverdue: 0,
        }
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFrom, dateTo, search]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  /* ---- Fetch adjustments for selected invoice ---- */
  const fetchAdjustments = useCallback(async (invoiceId: string) => {
    setLoadingAdjustments(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/adjust`);
      if (res.ok) {
        const data = await res.json();
        setAdjustments(data.adjustments ?? data ?? []);
      }
    } catch {
      /* silent */
    } finally {
      setLoadingAdjustments(false);
    }
  }, []);

  const openDetail = useCallback(
    (inv: Invoice) => {
      setSelectedInvoice(inv);
      setShowPaymentForm(false);
      setPaymentMethod("CASH");
      setPaymentRef("");
      fetchAdjustments(inv.id);
    },
    [fetchAdjustments]
  );

  const closeDetail = useCallback(() => {
    setSelectedInvoice(null);
    setAdjustments([]);
    setShowPaymentForm(false);
  }, []);

  /* ---- PATCH invoice ---- */
  const patchInvoice = useCallback(
    async (id: string, body: Record<string, unknown>) => {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/invoices/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Error updating invoice");
        await fetchInvoices();
        const updated = await res.json();
        if (selectedInvoice?.id === id) {
          setSelectedInvoice((prev) => (prev ? { ...prev, ...updated } : prev));
        }
      } catch (err) {
        alert((err as Error).message);
      } finally {
        setSubmitting(false);
      }
    },
    [fetchInvoices, selectedInvoice]
  );

  const handleRegisterPayment = useCallback(async () => {
    if (!selectedInvoice) return;
    await patchInvoice(selectedInvoice.id, {
      status: "PAID",
      paymentMethod,
      paymentRef: paymentRef || null,
    });
    setShowPaymentForm(false);
  }, [selectedInvoice, patchInvoice, paymentMethod, paymentRef]);

  const handleVoid = useCallback(async () => {
    if (!selectedInvoice) return;
    if (!confirm("Void this invoice? This action cannot be undone.")) return;
    await patchInvoice(selectedInvoice.id, { status: "VOID" });
  }, [selectedInvoice, patchInvoice]);

  /* ---- Summary cards data ---- */
  const summaryCards = useMemo(
    () => [
      {
        label: "Total Invoiced",
        value: stats.totalInvoiced,
        icon: DollarSign,
        border: "border-l-dark",
        iconBg: "bg-dark/10 text-dark",
      },
      {
        label: "Total Collected",
        value: stats.totalPaid,
        icon: CheckCircle2,
        border: "border-l-olive",
        iconBg: "bg-olive/10 text-olive",
      },
      {
        label: "Total Pending",
        value: stats.totalPending,
        icon: Clock,
        border: "border-l-amber-500",
        iconBg: "bg-amber-100 text-amber-600",
      },
      {
        label: "Total Overdue",
        value: stats.totalOverdue,
        icon: AlertTriangle,
        border: "border-l-terracotta",
        iconBg: "bg-terracotta/10 text-terracotta",
      },
    ],
    [stats]
  );

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="font-display text-3xl text-dark">Invoices</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <div
            key={c.label}
            className={`bg-white border border-stone/30 ${c.border} border-l-4 rounded-xl p-5 flex items-center gap-4 shadow-sm`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.iconBg}`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted uppercase tracking-wide">{c.label}</p>
              <p className="text-xl font-semibold text-dark">{usd(c.value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-end">
        {/* Status */}
        <div className="w-full md:w-44">
          <label className="block text-xs font-medium text-muted mb-1">Status</label>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none bg-white border border-stone/40 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta pr-8"
            >
              <option value="">All</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Date from */}
        <div className="w-full md:w-40">
          <label className="block text-xs font-medium text-muted mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full bg-white border border-stone/40 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
          />
        </div>

        {/* Date to */}
        <div className="w-full md:w-40">
          <label className="block text-xs font-medium text-muted mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full bg-white border border-stone/40 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
          />
        </div>

        {/* Search */}
        <div className="w-full md:flex-1">
          <label className="block text-xs font-medium text-muted mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Client or invoice number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-stone/40 rounded-lg pl-9 pr-3 py-2 text-sm text-dark placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-stone/30 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-warm/60">
                <th className="text-left px-4 py-3 font-medium text-dark text-xs uppercase tracking-wide">
                  Invoice #
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark text-xs uppercase tracking-wide">
                  Client
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark text-xs uppercase tracking-wide hidden lg:table-cell">
                  Order #
                </th>
                <th className="text-right px-4 py-3 font-medium text-dark text-xs uppercase tracking-wide">
                  Total
                </th>
                <th className="text-center px-4 py-3 font-medium text-dark text-xs uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark text-xs uppercase tracking-wide hidden md:table-cell">
                  Due date
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark text-xs uppercase tracking-wide hidden xl:table-cell">
                  Created
                </th>
                <th className="text-right px-4 py-3 font-medium text-dark text-xs uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone/15">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted mx-auto" />
                    <p className="text-muted text-sm mt-2">Loading invoices...</p>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted">
                    No invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-warm/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openDetail(inv)}
                        className="text-terracotta font-medium hover:underline"
                      >
                        {inv.invoiceNumber}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-dark">{inv.customerName}</td>
                    <td className="px-4 py-3 text-muted font-mono text-xs hidden lg:table-cell">
                      {inv.orderNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-dark">
                      {inv.adjustedTotal != null && inv.adjustedTotal !== inv.total ? (
                        <span className="flex flex-col items-end">
                          <span>{usd(inv.adjustedTotal)}</span>
                          <span className="text-xs text-muted line-through">{usd(inv.total)}</span>
                        </span>
                      ) : (
                        usd(inv.total)
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          STATUS_BADGE[inv.status] ?? "bg-stone/20 text-muted"
                        }`}
                      >
                        {STATUS_LABEL[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted hidden md:table-cell">
                      {fmtDate(inv.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-muted hidden xl:table-cell">
                      {fmtDate(inv.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          title="View details"
                          onClick={() => openDetail(inv)}
                          className="p-1.5 rounded-lg text-muted hover:text-dark hover:bg-warm transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {inv.status !== "PAID" &&
                          inv.status !== "VOID" &&
                          inv.status !== "REFUNDED" && (
                            <button
                              title="Record payment"
                              onClick={() => {
                                openDetail(inv);
                                setTimeout(() => setShowPaymentForm(true), 0);
                              }}
                              className="p-1.5 rounded-lg text-muted hover:text-olive hover:bg-olive/10 transition-colors"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                        {inv.status !== "VOID" && inv.status !== "REFUNDED" && (
                          <button
                            title="Void"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              handleVoid();
                            }}
                            className="p-1.5 rounded-lg text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Invoice Detail Modal ---- */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-dark/40 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDetail();
          }}
        >
          <div className="bg-cream border border-stone/30 rounded-xl shadow-xl w-full max-w-2xl my-8 animate-modal-in">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone/30">
              <div>
                <h2 className="font-display text-xl text-dark">
                  Invoice {selectedInvoice.invoiceNumber}
                </h2>
                <p className="text-sm text-muted">
                  {selectedInvoice.customerName} &middot; Order{" "}
                  {selectedInvoice.orderNumber || "—"}
                </p>
              </div>
              <button
                onClick={closeDetail}
                className="p-2 rounded-lg hover:bg-warm text-muted hover:text-dark transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-6">
              {/* Meta */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted text-xs uppercase tracking-wide">Status</p>
                  <span
                    className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      STATUS_BADGE[selectedInvoice.status]
                    }`}
                  >
                    {STATUS_LABEL[selectedInvoice.status]}
                  </span>
                </div>
                <div>
                  <p className="text-muted text-xs uppercase tracking-wide">Due date</p>
                  <p className="mt-1 text-dark font-medium">{fmtDate(selectedInvoice.dueDate)}</p>
                </div>
                <div>
                  <p className="text-muted text-xs uppercase tracking-wide">Created</p>
                  <p className="mt-1 text-dark font-medium">{fmtDate(selectedInvoice.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted text-xs uppercase tracking-wide">Total</p>
                  <p className="mt-1 text-dark font-semibold text-lg">
                    {usd(selectedInvoice.adjustedTotal ?? selectedInvoice.total)}
                  </p>
                  {selectedInvoice.adjustedTotal != null &&
                    selectedInvoice.adjustedTotal !== selectedInvoice.total && (
                      <p className="text-xs text-muted line-through">
                        Original: {usd(selectedInvoice.total)}
                      </p>
                    )}
                </div>
                {selectedInvoice.paymentMethod && (
                  <div>
                    <p className="text-muted text-xs uppercase tracking-wide">Payment Method</p>
                    <p className="mt-1 text-dark font-medium">
                      {PAYMENT_METHODS.find((m) => m.value === selectedInvoice.paymentMethod)
                        ?.label ?? selectedInvoice.paymentMethod}
                    </p>
                  </div>
                )}
                {selectedInvoice.paymentRef && (
                  <div>
                    <p className="text-muted text-xs uppercase tracking-wide">Payment Ref</p>
                    <p className="mt-1 text-dark font-medium font-mono text-xs">
                      {selectedInvoice.paymentRef}
                    </p>
                  </div>
                )}
              </div>

              {selectedInvoice.notes && (
                <div className="bg-warm/60 rounded-lg px-4 py-3 text-sm text-dark">
                  <p className="text-xs text-muted uppercase tracking-wide mb-1">Notes</p>
                  {selectedInvoice.notes}
                </div>
              )}

              {/* Items table */}
              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-dark mb-2">Items</h3>
                  <div className="border border-stone/30 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-warm/40">
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted">
                            Item
                          </th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-muted">
                            Qty
                          </th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted">
                            Unit Price
                          </th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted">
                            Subtotal
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone/15">
                        {selectedInvoice.items.map((item, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-dark">{item.name}</td>
                            <td className="px-3 py-2 text-center text-muted">{item.quantity}</td>
                            <td className="px-3 py-2 text-right text-muted">
                              {usd(item.unitPrice)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-dark">
                              {usd(item.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Adjustment history */}
              <div>
                <h3 className="text-sm font-medium text-dark mb-2 flex items-center gap-2">
                  <History className="w-4 h-4 text-muted" />
                  Adjustment History
                </h3>
                {loadingAdjustments ? (
                  <div className="flex items-center gap-2 text-muted text-sm py-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading...
                  </div>
                ) : adjustments.length === 0 ? (
                  <p className="text-sm text-muted">No adjustments recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {adjustments.map((adj) => (
                      <div
                        key={adj.id}
                        className="bg-warm/40 rounded-lg px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center gap-2"
                      >
                        <div className="flex-1">
                          <p className="text-dark font-medium">{adj.reason}</p>
                          <p className="text-xs text-muted">
                            {fmtDate(adj.date)} &middot; {adj.adjustedBy}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-muted line-through text-xs">
                            {usd(adj.previousTotal)}
                          </span>{" "}
                          <span className="text-dark font-semibold">{usd(adj.newTotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment form */}
              {showPaymentForm &&
                selectedInvoice.status !== "PAID" &&
                selectedInvoice.status !== "VOID" &&
                selectedInvoice.status !== "REFUNDED" && (
                  <div className="border border-olive/30 bg-olive/5 rounded-xl p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-olive">Record Payment</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">
                          Payment Method
                        </label>
                        <div className="relative">
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full appearance-none bg-white border border-stone/40 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-olive/30 focus:border-olive pr-8"
                          >
                            {PAYMENT_METHODS.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted mb-1">
                          Reference
                        </label>
                        <input
                          type="text"
                          placeholder="Check #, transaction..."
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          className="w-full bg-white border border-stone/40 rounded-lg px-3 py-2 text-sm text-dark placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-olive/30 focus:border-olive"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setShowPaymentForm(false)}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-dark hover:bg-warm transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRegisterPayment}
                        disabled={submitting}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-olive text-cream hover:bg-olive/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Confirm Payment
                      </button>
                    </div>
                  </div>
                )}
            </div>

            {/* Modal footer */}
            <div className="flex flex-wrap items-center gap-2 px-6 py-4 border-t border-stone/30 bg-warm/30 rounded-b-xl">
              {selectedInvoice.status !== "PAID" &&
                selectedInvoice.status !== "VOID" &&
                selectedInvoice.status !== "REFUNDED" && (
                  <>
                    <button
                      onClick={() => setShowPaymentForm(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-olive text-cream hover:bg-olive/90 transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      Record Payment
                    </button>
                    <button
                      onClick={handleVoid}
                      disabled={submitting}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Ban className="w-4 h-4" />
                      Void
                    </button>
                  </>
                )}
              {selectedInvoice.pdfDriverUrl && (
                <a
                  href={selectedInvoice.pdfDriverUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-dark bg-warm hover:bg-stone/30 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Driver PDF
                </a>
              )}
              {selectedInvoice.pdfClientUrl && (
                <a
                  href={selectedInvoice.pdfClientUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-dark bg-warm hover:bg-stone/30 transition-colors"
                >
                  <FileDown className="w-4 h-4" />
                  Client PDF
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
