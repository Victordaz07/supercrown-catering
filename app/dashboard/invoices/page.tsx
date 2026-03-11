"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  Loader2,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  Download,
  CreditCard,
} from "lucide-react";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  orderId: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  adjustmentSum: number;
  adjustedTotal: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  paymentMethod: string | null;
  paymentRef: string | null;
  pdfPathDriver: string | null;
  pdfPathClient: string | null;
  notes: string | null;
  createdAt: string;
  order: { orderNumber: string; customerName: string; customerEmail: string };
};

type Stats = { totalInvoiced: number; totalPaid: number; totalPending: number; totalOverdue: number };

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft", SENT: "Sent", DELIVERED: "Delivered", ADJUSTED: "Adjusted",
  PAID: "Paid", OVERDUE: "Overdue", VOID: "Void", REFUNDED: "Refunded",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-stone/20 text-stone", SENT: "bg-blue-100 text-blue-700", DELIVERED: "bg-olive/20 text-olive",
  ADJUSTED: "bg-amber-100 text-amber-700", PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-red-100 text-red-700", VOID: "bg-gray-200 text-gray-500", REFUNDED: "bg-purple-100 text-purple-700",
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash", CHECK: "Check", CARD: "Card", TRANSFER: "Transfer", OTHER: "Other",
};

function usd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [stats, setStats] = useState<Stats>({ totalInvoiced: 0, totalPaid: 0, totalPending: 0, totalOverdue: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<InvoiceRow | null>(null);
  const [payForm, setPayForm] = useState(false);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payRef, setPayRef] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterStatus) p.set("status", filterStatus);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (search) p.set("search", search);
    const res = await fetch(`/api/invoices?${p}`);
    if (res.ok) {
      const d = await res.json();
      setInvoices(d.invoices ?? []);
      setStats(d.stats ?? { totalInvoiced: 0, totalPaid: 0, totalPending: 0, totalOverdue: 0 });
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, from, to, search]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  async function handlePay() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/invoices/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID", paymentMethod: payMethod, paymentRef: payRef || undefined }),
    });
    setSaving(false);
    if (res.ok) {
      setPayForm(false);
      setSelected(null);
      fetchInvoices();
    }
  }

  async function handleVoid() {
    if (!selected || !confirm("Are you sure you want to void this invoice?")) return;
    await fetch(`/api/invoices/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "VOID" }),
    });
    setSelected(null);
    fetchInvoices();
  }

  const statCards = [
    { label: "Total Invoiced", value: stats.totalInvoiced, icon: DollarSign, border: "border-dark" },
    { label: "Total Collected", value: stats.totalPaid, icon: CheckCircle, border: "border-olive" },
    { label: "Total Pending", value: stats.totalPending, icon: Clock, border: "border-amber-500" },
    { label: "Total Overdue", value: stats.totalOverdue, icon: AlertTriangle, border: "border-terracotta" },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <FileText className="w-6 h-6 text-terracotta" />
        <h1 className="font-display text-3xl text-dark">Invoices</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <div key={s.label} className={`bg-white rounded-xl p-4 border-l-4 ${s.border} shadow-sm`}>
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-4 h-4 text-muted" />
              <span className="text-xs uppercase tracking-wider text-muted">{s.label}</span>
            </div>
            <p className="font-display text-2xl text-dark">{usd(s.value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client or invoice..."
            className="w-full pl-10 pr-4 py-2.5 bg-cream border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 bg-cream border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="px-3 py-2.5 bg-cream border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="px-3 py-2.5 bg-cream border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No invoices found</p>
        </div>
      ) : (
        <div className="bg-white border border-stone/20 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-warm/60 border-b border-stone/20">
                  <th className="text-left px-4 py-3 font-medium text-muted">Invoice</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-muted hidden md:table-cell">Order</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted hidden lg:table-cell">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} onClick={() => { setSelected(inv); setPayForm(false); }}
                    className={`border-b border-stone/10 cursor-pointer hover:bg-warm/30 transition-colors ${i % 2 === 0 ? "" : "bg-warm/20"}`}>
                    <td className="px-4 py-3 font-medium text-terracotta">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3 text-dark">{inv.order.customerName}</td>
                    <td className="px-4 py-3 text-muted hidden md:table-cell">{inv.order.orderNumber}</td>
                    <td className="px-4 py-3 text-right font-medium text-dark">
                      {inv.adjustmentSum < 0 ? (
                        <div><span className="line-through text-muted text-xs">{usd(inv.total)}</span> {usd(inv.adjustedTotal)}</div>
                      ) : usd(inv.total)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[inv.status] ?? "bg-warm text-dark"}`}>
                        {STATUS_LABELS[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted hidden lg:table-cell">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("en-US") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="bg-cream rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-display text-2xl text-dark">{selected.invoiceNumber}</h2>
                <p className="text-muted text-sm">{selected.order.customerName} · {selected.order.orderNumber}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-warm rounded-lg"><X className="w-5 h-5 text-muted" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-muted text-xs uppercase">Subtotal</span>
                <p className="font-medium">{usd(selected.subtotal)}</p>
              </div>
              <div>
                <span className="text-muted text-xs uppercase">Tax ({(selected.taxRate * 100).toFixed(1)}%)</span>
                <p className="font-medium">{usd(selected.taxAmount)}</p>
              </div>
              <div>
                <span className="text-muted text-xs uppercase">Total</span>
                <p className="font-medium text-lg">{usd(selected.total)}</p>
              </div>
              {selected.adjustmentSum < 0 && (
                <div>
                  <span className="text-muted text-xs uppercase">Adjusted total</span>
                  <p className="font-medium text-lg text-terracotta">{usd(selected.adjustedTotal)}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
              {selected.paidAt && <span className="text-xs text-muted">Paid on {new Date(selected.paidAt).toLocaleDateString("en-US")}</span>}
              {selected.paymentMethod && <span className="text-xs text-muted">· {PAYMENT_LABELS[selected.paymentMethod] ?? selected.paymentMethod}</span>}
            </div>

            {/* PDFs */}
            <div className="flex gap-2 mb-4">
              {selected.pdfPathDriver && (
                <a href={selected.pdfPathDriver} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-stone/30 rounded-xl text-xs hover:bg-warm transition-colors">
                  <Download className="w-3.5 h-3.5" /> PDF Driver
                </a>
              )}
              {selected.pdfPathClient && (
                <a href={selected.pdfPathClient} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-stone/30 rounded-xl text-xs hover:bg-warm transition-colors">
                  <Download className="w-3.5 h-3.5" /> PDF Client
                </a>
              )}
            </div>

            {/* Pay form */}
            {!["PAID", "VOID", "REFUNDED", "DRAFT"].includes(selected.status) && !payForm && (
              <div className="flex gap-2 mb-4">
                <button onClick={() => setPayForm(true)} className="flex items-center gap-2 bg-olive text-cream px-4 py-2 rounded-xl text-sm hover:bg-olive/90 transition-all">
                  <CreditCard className="w-4 h-4" /> Record payment
                </button>
                <button onClick={handleVoid} className="px-4 py-2 border border-red-300 text-red-600 rounded-xl text-sm hover:bg-red-50 transition-all">
                  Void
                </button>
              </div>
            )}

            {payForm && (
              <div className="bg-white border border-stone/20 rounded-xl p-4 mb-4 space-y-3">
                <p className="font-medium text-sm text-dark">Record Payment</p>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30">
                  {Object.entries(PAYMENT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="Reference (optional)"
                  className="w-full px-3 py-2 border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
                <div className="flex gap-2">
                  <button onClick={handlePay} disabled={saving}
                    className="flex-1 bg-olive text-cream py-2 rounded-xl text-sm font-medium hover:bg-olive/90 disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />} Confirm Payment
                  </button>
                  <button onClick={() => setPayForm(false)} className="px-4 py-2 border border-stone/30 rounded-xl text-sm">Cancel</button>
                </div>
              </div>
            )}

            {selected.notes && (
              <div className="p-3 bg-warm rounded-xl text-sm text-dark mb-4">
                <span className="text-muted text-xs uppercase block mb-1">Notes</span>
                {selected.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
