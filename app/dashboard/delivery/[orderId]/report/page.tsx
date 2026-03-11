"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { onAuthChange } from "@/lib/firebase/auth";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  X,
  Loader2,
  FileCheck,
  Upload,
} from "lucide-react";

type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
};

type IssueType =
  | "SIN_PROBLEMA"
  | "FALTANTE"
  | "DANADO"
  | "PRODUCTO_EQUIVOCADO"
  | "OTRO";

const ISSUE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: "SIN_PROBLEMA", label: "No issue" },
  { value: "FALTANTE", label: "Missing" },
  { value: "DANADO", label: "Damaged" },
  { value: "PRODUCTO_EQUIVOCADO", label: "Wrong product" },
  { value: "OTRO", label: "Other" },
];

type ItemReport = {
  itemId: string;
  productName: string;
  expectedQty: number;
  deliveredQty: number;
  issueType: IssueType;
  issueNotes: string;
};

type PhotoEntry = {
  file: File;
  preview: string;
  photoType: "FACTURA_DRIVER" | "FACTURA_CLIENTE" | "PRODUCTO_DANADO";
  caption: string;
};

export default function DeliveryReportPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orderNumber, setOrderNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [notes, setNotes] = useState("");
  const [itemReports, setItemReports] = useState<ItemReport[]>([]);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoType, setActivePhotoType] = useState<PhotoEntry["photoType"] | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return;
      try {
        const orderSnap = await getDoc(doc(db, "orders", orderId));
        if (!orderSnap.exists()) {
          setError("Order not found");
          setLoading(false);
          return;
        }

        const orderData = orderSnap.data();
        setOrderNumber(orderId.slice(-8).toUpperCase());
        setClientName(orderData.clientName || orderData.clientEmail || "—");

        const quoteId = orderData.quoteId;
        const items: OrderItem[] = [];
        if (quoteId) {
          const itemsSnap = await getDocs(
            collection(db, "quotes", quoteId, "items")
          );
          itemsSnap.docs.forEach((d) => {
            const data = d.data();
            items.push({
              id: d.id,
              productName: data.productName || "Product",
              quantity: data.quantity || 1,
            });
          });
        }

        setItemReports(
          items.map((item) => ({
            itemId: item.id,
            productName: item.productName,
            expectedQty: item.quantity,
            deliveredQty: item.quantity,
            issueType: "SIN_PROBLEMA",
            issueNotes: "",
          }))
        );
      } catch {
        setError("Error loading order");
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderId]);

  const updateItem = (index: number, updates: Partial<ItemReport>) => {
    setItemReports((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const hasIssues = itemReports.some((i) => i.issueType !== "SIN_PROBLEMA");

  const triggerPhotoUpload = (type: PhotoEntry["photoType"]) => {
    setActivePhotoType(type);
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoType) return;

    const preview = URL.createObjectURL(file);
    const captions: Record<PhotoEntry["photoType"], string> = {
      FACTURA_DRIVER: "Signed invoice (Driver)",
      FACTURA_CLIENTE: "Signed invoice (Client)",
      PRODUCTO_DANADO: "Damaged product",
    };

    setPhotos((prev) => [
      ...prev,
      {
        file,
        preview,
        photoType: activePhotoType,
        caption: captions[activePhotoType],
      },
    ]);
    setActivePhotoType(null);
    e.target.value = "";
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!receiverName.trim()) {
      setError("Please enter the receiver's name");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const reportRes = await fetch(`/api/deliveries/${orderId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverName: receiverName.trim(),
          notes: notes.trim(),
          items: itemReports.map((item) => ({
            itemId: item.itemId,
            productName: item.productName,
            expectedQty: item.expectedQty,
            deliveredQty: item.deliveredQty,
            issueType: item.issueType,
            issueNotes: item.issueNotes,
          })),
        }),
      });

      if (!reportRes.ok) {
        const data = await reportRes.json().catch(() => ({}));
        throw new Error(data.error || "Error creating report");
      }

      const { reportId } = await reportRes.json();

      if (photos.length > 0 && reportId) {
        for (const photo of photos) {
          const formData = new FormData();
          formData.append("file", photo.file);
          formData.append("photoType", photo.photoType);
          formData.append("caption", photo.caption);

          await fetch(`/api/deliveries/${reportId}/photos`, {
            method: "POST",
            body: formData,
          });
        }
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/driver"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error submitting report");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto p-4 mt-12">
        <div className="bg-olive/20 border border-olive/30 rounded-sm p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-olive mx-auto mb-3" />
          <p className="font-display text-xl text-dark">
            Report submitted successfully
          </p>
          <p className="text-muted text-sm mt-2">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-cream">
      <div className="p-4 pb-28">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl text-dark">
            Delivery Report
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-block bg-warm border border-stone/40 px-2 py-0.5 rounded text-xs font-medium text-muted">
              #{orderNumber}
            </span>
            <span className="text-sm text-dark">{clientName}</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-sm text-sm mb-4 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Receiver Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-dark mb-1">
            Receiver's name
          </label>
          <input
            type="text"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            placeholder="Full name"
            className="w-full bg-white border border-stone/40 rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:border-terracotta"
          />
        </div>

        {/* Items Checklist */}
        <div className="mb-6">
          <h2 className="font-display text-lg text-dark mb-3">
            Delivered products
          </h2>
          <div className="space-y-3">
            {itemReports.map((item, i) => (
              <div
                key={item.itemId}
                className={`bg-white border rounded-sm p-3 transition-colors ${
                  item.issueType !== "SIN_PROBLEMA"
                    ? "border-red-300 bg-red-50/30"
                    : "border-stone/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-dark">
                    {item.productName}
                  </p>
                  <span className="text-xs text-muted whitespace-nowrap">
                    Expected: {item.expectedQty}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div>
                    <label className="block text-xs text-muted mb-1">
                      Delivered qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={item.deliveredQty}
                      onChange={(e) =>
                        updateItem(i, {
                          deliveredQty: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-cream border border-stone/40 rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-terracotta"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">
                      Status
                    </label>
                    <div className="relative">
                      <select
                        value={item.issueType}
                        onChange={(e) =>
                          updateItem(i, {
                            issueType: e.target.value as IssueType,
                          })
                        }
                        className="w-full appearance-none bg-cream border border-stone/40 rounded-sm px-2 py-1.5 text-sm pr-7 focus:outline-none focus:border-terracotta"
                      >
                        {ISSUE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" />
                    </div>
                  </div>
                </div>

                {item.issueType !== "SIN_PROBLEMA" && (
                  <input
                    type="text"
                    value={item.issueNotes}
                    onChange={(e) =>
                      updateItem(i, { issueNotes: e.target.value })
                    }
                    placeholder="Describe the issue..."
                    className="w-full bg-cream border border-stone/40 rounded-sm px-2 py-1.5 text-sm focus:outline-none focus:border-terracotta"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* General Notes */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-dark mb-1">
            General notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes about the delivery..."
            rows={3}
            className="w-full bg-white border border-stone/40 rounded-sm px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-terracotta"
          />
        </div>

        {/* Photo Upload */}
        <div className="mb-6">
          <h2 className="font-display text-lg text-dark mb-3">
            Photos and evidence
          </h2>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelected}
          />

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => triggerPhotoUpload("FACTURA_DRIVER")}
              className="w-full flex items-center gap-3 bg-white border border-stone/40 rounded-sm px-3 py-3 text-sm text-dark hover:bg-warm transition-colors"
            >
              <FileCheck className="w-5 h-5 text-terracotta shrink-0" />
              <span>Upload signed invoice (Driver)</span>
              <Upload className="w-4 h-4 text-muted ml-auto" />
            </button>

            <button
              type="button"
              onClick={() => triggerPhotoUpload("FACTURA_CLIENTE")}
              className="w-full flex items-center gap-3 bg-white border border-stone/40 rounded-sm px-3 py-3 text-sm text-dark hover:bg-warm transition-colors"
            >
              <FileCheck className="w-5 h-5 text-olive shrink-0" />
              <span>Upload signed invoice (Client)</span>
              <Upload className="w-4 h-4 text-muted ml-auto" />
            </button>

            {hasIssues && (
              <button
                type="button"
                onClick={() => triggerPhotoUpload("PRODUCTO_DANADO")}
                className="w-full flex items-center gap-3 bg-red-50 border border-red-200 rounded-sm px-3 py-3 text-sm text-red-700 hover:bg-red-100 transition-colors"
              >
                <Camera className="w-5 h-5 shrink-0" />
                <span>Upload photo of damaged product</span>
                <Upload className="w-4 h-4 ml-auto opacity-60" />
              </button>
            )}
          </div>

          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative group">
                  <img
                    src={photo.preview}
                    alt={photo.caption}
                    className="w-full aspect-square object-cover rounded-sm border border-stone/40"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <p className="text-[10px] text-muted mt-1 truncate">
                    {photo.caption}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 bg-terracotta text-cream font-medium rounded-sm hover:bg-terracotta/90 disabled:opacity-70 flex items-center justify-center gap-2 text-base"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Submit report
            </>
          )}
        </button>
      </div>
    </div>
  );
}
