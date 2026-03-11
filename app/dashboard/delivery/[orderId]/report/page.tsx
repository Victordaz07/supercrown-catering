"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Truck,
  Camera,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Upload,
  X,
  ArrowLeft,
} from "lucide-react";

type OrderItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
};

type ItemReport = {
  orderItemId: string;
  name: string;
  expectedQty: number;
  deliveredQty: number;
  issue: string;
  issueNotes: string;
};

type PendingPhoto = {
  file: File;
  photoType: string;
  preview: string;
};

const ISSUE_OPTIONS = [
  { value: "", label: "No issue" },
  { value: "MISSING", label: "Missing" },
  { value: "DAMAGED", label: "Damaged" },
  { value: "WRONG_ITEM", label: "Wrong product" },
  { value: "OTHER", label: "Other" },
];

export default function DeliveryReportPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;

  const [orderInfo, setOrderInfo] = useState<{ orderNumber: string; customerName: string } | null>(null);
  const [items, setItems] = useState<ItemReport[]>([]);
  const [receiverName, setReceiverName] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) { setError("Could not load order"); setLoading(false); return; }
      const data = await res.json();
      setOrderInfo({ orderNumber: data.orderNumber, customerName: data.customerName });
      setItems(
        (data.items ?? []).map((it: OrderItem) => ({
          orderItemId: it.id,
          name: it.name,
          expectedQty: it.quantity,
          deliveredQty: it.quantity,
          issue: "",
          issueNotes: "",
        })),
      );
      setLoading(false);
    }
    loadOrder();
  }, [orderId]);

  function updateItem(idx: number, field: string, value: string | number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addPhoto(photoType: string) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setPhotos((prev) => [...prev, { file, photoType, preview: URL.createObjectURL(file) }]);
    };
    input.click();
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleSubmit() {
    if (!receiverName.trim()) { setError("Receiver's name is required"); return; }
    setSubmitting(true);
    setError("");

    try {
      const reportRes = await fetch(`/api/deliveries/report/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverName: receiverName.trim(),
          notes: notes.trim() || undefined,
          items: items.map((it) => ({
            orderItemId: it.orderItemId,
            deliveredQty: Number(it.deliveredQty),
            issue: it.issue || undefined,
            issueNotes: it.issueNotes || undefined,
          })),
        }),
      });

      if (!reportRes.ok) {
        const d = await reportRes.json();
        setError(d.error ?? "Error creating report");
        setSubmitting(false);
        return;
      }

      const { id: reportId } = await reportRes.json();

      for (const photo of photos) {
        const fd = new FormData();
        fd.append("file", photo.file);
        fd.append("photoType", photo.photoType);
        await fetch(`/api/deliveries/${reportId}/photos`, { method: "POST", body: fd });
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/delivery"), 2000);
    } catch {
      setError("Connection error");
      setSubmitting(false);
    }
  }

  const hasIssues = items.some((it) => it.deliveredQty < it.expectedQty || it.issue);

  if (loading) {
    return (
      <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <CheckCircle className="w-12 h-12 text-olive mx-auto mb-4" />
        <h2 className="font-display text-2xl text-dark mb-2">Report submitted</h2>
        <p className="text-muted text-sm">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pb-8">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-muted text-sm mb-4 hover:text-terracotta transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <Truck className="w-6 h-6 text-terracotta" />
        <div>
          <h1 className="font-display text-2xl text-dark">Delivery Report</h1>
          {orderInfo && <p className="text-sm text-muted">{orderInfo.orderNumber} · {orderInfo.customerName}</p>}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Receiver */}
      <div className="mb-5">
        <label className="block text-xs uppercase tracking-wider text-muted mb-1">Receiver&apos;s name</label>
        <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)}
          placeholder="Full name"
          className="w-full px-4 py-3 bg-cream border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
      </div>

      {/* Items */}
      <div className="mb-5 space-y-3">
        <span className="block text-xs uppercase tracking-wider text-muted">Products</span>
        {items.map((it, idx) => (
          <div key={it.orderItemId} className={`border rounded-xl p-3 ${it.issue || it.deliveredQty < it.expectedQty ? "border-red-300 bg-red-50/50" : "border-stone/30 bg-white"}`}>
            <div className="flex justify-between items-start mb-2">
              <p className="font-medium text-dark text-sm">{it.name}</p>
              <span className="text-xs text-muted">Expected: {it.expectedQty}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase text-muted">Delivered</label>
                <input type="number" min={0} max={it.expectedQty} value={it.deliveredQty}
                  onChange={(e) => updateItem(idx, "deliveredQty", parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-stone/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
              </div>
              <div>
                <label className="text-[10px] uppercase text-muted">Status</label>
                <select value={it.issue} onChange={(e) => updateItem(idx, "issue", e.target.value)}
                  className="w-full px-3 py-2 border border-stone/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30">
                  {ISSUE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            {it.issue && (
              <input value={it.issueNotes} onChange={(e) => updateItem(idx, "issueNotes", e.target.value)}
                placeholder="Describe the issue..."
                className="w-full mt-2 px-3 py-2 border border-stone/40 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
            )}
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="mb-5">
        <label className="block text-xs uppercase tracking-wider text-muted mb-1">General notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Delivery observations..."
          className="w-full px-4 py-3 bg-cream border border-stone/40 rounded-xl text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
      </div>

      {/* Photos */}
      <div className="mb-6 space-y-3">
        <span className="block text-xs uppercase tracking-wider text-muted">Photo evidence</span>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => addPhoto("SIGNED_INVOICE_DRIVER")}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-stone/30 rounded-xl text-xs hover:bg-warm transition-colors">
            <Camera className="w-3.5 h-3.5" /> Driver Invoice
          </button>
          <button onClick={() => addPhoto("SIGNED_INVOICE_CLIENT")}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-stone/30 rounded-xl text-xs hover:bg-warm transition-colors">
            <Camera className="w-3.5 h-3.5" /> Client Invoice
          </button>
          {hasIssues && (
            <button onClick={() => addPhoto("DAMAGED_ITEM")}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 rounded-xl text-xs text-red-600 hover:bg-red-50 transition-colors">
              <Camera className="w-3.5 h-3.5" /> Damaged product
            </button>
          )}
        </div>
        {photos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {photos.map((p, i) => (
              <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removePhoto(i)} className="absolute top-0.5 right-0.5 bg-dark/60 rounded-full p-0.5">
                  <X className="w-3 h-3 text-cream" />
                </button>
                <span className="absolute bottom-0 left-0 right-0 bg-dark/60 text-cream text-[8px] px-1 truncate">{p.photoType.split("_").pop()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasIssues && photos.filter((p) => p.photoType.includes("SIGNED_INVOICE")).length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-xs mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          There are issues. It is recommended to upload at least one signed invoice photo.
        </div>
      )}

      <button onClick={handleSubmit} disabled={submitting || !receiverName.trim()}
        className="w-full bg-terracotta text-cream py-3.5 rounded-xl font-medium hover:bg-terracotta/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Upload className="w-4 h-4" /> Submit report</>}
      </button>
    </div>
  );
}
