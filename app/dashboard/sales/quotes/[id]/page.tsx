"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  writeBatch,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { FLEET_CONFIG, type VehicleId } from "@/lib/fleet-config";

type QuoteItem = {
  id: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number | null;
  subtotal: number | null;
};

type RouteSuggestion = {
  zoneId: string;
  zoneLabel: string;
  milesEstimated: number;
  stopsCount: number;
  trayEquivalent: number;
  refrigerationRequired: boolean;
  suggestedVehicleId: VehicleId;
  suggestedVehicleLabel: string;
  suggestedStops: number;
  estimatedLoadLevel: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  reasonCodes: string[];
};

export default function QuoteReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [quote, setQuote] = useState<Record<string, unknown> | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [taxRate, setTaxRate] = useState(0.08);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [drivers, setDrivers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [assignDriverId, setAssignDriverId] = useState("");
  const [assignDate, setAssignDate] = useState("");
  const [assignTime, setAssignTime] = useState("");
  const [vehicleId, setVehicleId] = useState<VehicleId | "">("");
  const [vehicleDecisionSource, setVehicleDecisionSource] = useState<"manual" | "suggested">(
    "manual"
  );
  const [stopsCountHint, setStopsCountHint] = useState(1);
  const [estimatedMilesInput, setEstimatedMilesInput] = useState("");
  const [suggestingRoute, setSuggestingRoute] = useState(false);
  const [routeSuggestion, setRouteSuggestion] = useState<RouteSuggestion | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const quoteSnap = await getDoc(doc(db, "quotes", id));
      if (!quoteSnap.exists()) {
        setQuote(null);
        setLoading(false);
        return;
      }
      setQuote({ id: quoteSnap.id, ...quoteSnap.data() });

      const itemsSnap = await getDocs(collection(db, "quotes", id, "items"));
      const itemsList: QuoteItem[] = [];
      itemsSnap.docs.forEach((d) => {
        const data = d.data();
        itemsList.push({
          id: d.id,
          productId: data.productId ?? "",
          productName: data.productName ?? "",
          category: data.category ?? "",
          quantity: data.quantity ?? 1,
          unitPrice: data.unitPrice ?? null,
          subtotal: data.subtotal ?? null,
        });
      });
      setItems(itemsList);

      const driversSnap = await getDocs(
        collection(db, "users")
      );
      const driverList: Array<{ id: string; name: string; email: string }> = [];
      driversSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.role === "driver") {
          driverList.push({
            id: d.id,
            name: data.name || data.email || d.id,
            email: data.email || "",
          });
        }
      });
      setDrivers(driverList);
      setLoading(false);
    }
    load();
  }, [id]);

  const updateItemPrice = (index: number, unitPrice: number) => {
    const updated = [...items];
    const item = updated[index];
    item.unitPrice = unitPrice;
    item.subtotal = unitPrice * item.quantity;
    setItems(updated);
  };

  const subtotal = items.reduce(
    (s, i) => s + (i.subtotal ?? (i.unitPrice ?? 0) * i.quantity),
    0
  );
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handleApprove = async () => {
    const hasAllPrices = items.every((i) => i.unitPrice != null && i.unitPrice > 0);
    if (!hasAllPrices) {
      setError("Please fill in unit price for all items");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      const itemsRef = collection(db, "quotes", id, "items");
      items.forEach((item) => {
        batch.update(doc(itemsRef, item.id), {
          unitPrice: item.unitPrice,
          subtotal: item.subtotal ?? item.unitPrice! * item.quantity,
        });
      });
      await batch.commit();

      await updateDoc(doc(db, "quotes", id), {
        status: "approved",
        reviewedBy: serverTimestamp(),
      });

      const orderRef = doc(collection(db, "orders"));
      await setDoc(orderRef, {
        quoteId: id,
        clientEmail: quote?.clientEmail,
        clientName: quote?.clientName,
        deliveryAddress: quote?.deliveryAddress,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      const createdOrderId = orderRef.id;
      setOrderId(createdOrderId);

      const res = await fetch("/api/generate-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: createdOrderId,
          clientName: quote?.clientName,
          clientEmail: quote?.clientEmail,
          deliveryAddress: quote?.deliveryAddress,
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subtotal: i.subtotal ?? i.unitPrice! * i.quantity,
          })),
          subtotal,
          taxRate,
          tax,
          total,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate invoice");

      setInvoiceUrl(data.pdfUrl);
      setApproved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/reject-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: id, reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject");
      setRejectModal(false);
      router.push("/dashboard/sales/quotes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignDriver = async () => {
    if (!assignDriverId || !assignDate) return;
    const oid = orderId;
    if (!oid) {
      setError("Order ID not found. Please refresh the page.");
      return;
    }
    setAssigning(true);
    setError(null);
    try {
      const chosenVehicle =
        vehicleId || routeSuggestion?.suggestedVehicleId || "ford_connect_small_2";
      const deliveryRef = doc(collection(db, "deliveries"));
      await setDoc(deliveryRef, {
        orderId: oid,
        driverId: assignDriverId,
        deliveryDate: assignDate,
        scheduledTime: assignTime || null,
        vehicleId: chosenVehicle,
        vehicleDecisionSource,
        routeStopsCount: stopsCountHint,
        routeMilesEstimated: Number(estimatedMilesInput) || routeSuggestion?.milesEstimated || null,
        routeZoneId: routeSuggestion?.zoneId ?? null,
        routeZoneLabel: routeSuggestion?.zoneLabel ?? null,
        refrigerationRequired: routeSuggestion?.refrigerationRequired ?? false,
        trayEquivalent: routeSuggestion?.trayEquivalent ?? null,
        suggestionConfidence: routeSuggestion?.confidence ?? null,
        suggestionReasonCodes: routeSuggestion?.reasonCodes ?? [],
        status: "pending",
        createdAt: serverTimestamp(),
      });
      router.push("/dashboard/sales/deliveries");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign");
    } finally {
      setAssigning(false);
    }
  };

  const handleSuggestRoute = async () => {
    const deliveryAddress = String(quote?.deliveryAddress ?? "").trim();
    if (!deliveryAddress) {
      setError("Delivery address is required to analyze route");
      return;
    }

    setSuggestingRoute(true);
    setError(null);
    try {
      const res = await fetch("/api/deliveries/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryAddress: deliveryAddress,
          stopsCountHint,
          estimatedMiles: Number(estimatedMilesInput) || null,
          items: items.map((item) => ({
            name: item.productName,
            category: item.category,
            quantity: item.quantity,
          })),
        }),
      });
      const data = (await res.json()) as RouteSuggestion | { error?: string };
      if (!res.ok) {
        throw new Error("error" in data ? data.error || "Failed to analyze route" : "Failed to analyze route");
      }

      const suggestion = data as RouteSuggestion;
      setRouteSuggestion(suggestion);
      setVehicleId(suggestion.suggestedVehicleId);
      setVehicleDecisionSource("suggested");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze route");
    } finally {
      setSuggestingRoute(false);
    }
  };

  if (loading || !quote) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-muted">{loading ? "Loading..." : "Quote not found"}</p>
      </div>
    );
  }

  const status = quote.status as string;
  const canEdit = status === "pending" || status === "reviewing";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/sales/quotes" className="text-terracotta hover:underline text-sm">
          ← Back to Quotes
        </Link>
      </div>

      <h1 className="font-display text-2xl text-dark">
        Quote #{id.slice(-8)}
      </h1>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-sm text-sm">
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Client info (read-only) */}
        <div className="bg-warm border border-stone/40 rounded-sm p-4 space-y-3">
          <h2 className="font-display text-lg text-dark">Client Details</h2>
          <p><span className="text-muted text-sm">Name:</span> {String(quote.clientName ?? "—")}</p>
          <p><span className="text-muted text-sm">Email:</span> {String(quote.clientEmail ?? "—")}</p>
          <p><span className="text-muted text-sm">Phone:</span> {String(quote.clientPhone ?? "—")}</p>
          <p><span className="text-muted text-sm">Delivery:</span> {String(quote.deliveryAddress ?? "—")}</p>
          <p><span className="text-muted text-sm">Event date:</span> {String(quote.eventDate ?? "—")}</p>
          <p><span className="text-muted text-sm">Guests:</span> {String(quote.guestCount ?? "—")}</p>
          <p><span className="text-muted text-sm">Budget:</span> {String(quote.budget ?? "—")}</p>
          {quote.eventDetails ? (
            <div>
              <p className="text-muted text-sm">Event Details</p>
              <p className="text-dark whitespace-pre-wrap">{String(quote.eventDetails)}</p>
            </div>
          ) : null}
        </div>

        {/* Right: Pricing + actions */}
        <div className="space-y-6">
          <div className="bg-warm border border-stone/40 rounded-sm p-4">
            <h2 className="font-display text-lg text-dark mb-4">Items & Pricing</h2>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={item.id} className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 min-w-0 text-sm text-dark truncate">
                    {item.productName} (×{item.quantity})
                  </span>
                  <span className="text-muted text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={item.unitPrice ?? ""}
                    onChange={(e) => updateItemPrice(i, parseFloat(e.target.value) || 0)}
                    disabled={!canEdit}
                    className="w-20 bg-cream border border-stone rounded px-2 py-1 text-sm"
                  />
                  <span className="text-terracotta font-medium w-16 text-right">
                    ${((item.subtotal ?? (item.unitPrice ?? 0) * item.quantity) || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-stone/40">
              <div className="flex justify-between text-sm">
                <span>Tax rate:</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  disabled={!canEdit}
                  className="w-16 bg-cream border border-stone rounded px-2 py-1 text-right"
                />
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Tax:</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium text-terracotta mt-2">
                <span>TOTAL:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {canEdit && (
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleApprove}
                  disabled={saving}
                  className="flex-1 bg-terracotta text-cream py-2 px-4 rounded-sm font-medium hover:bg-terracotta/90 disabled:opacity-70"
                >
                  {saving ? "Processing..." : "Approve"}
                </button>
                <button
                  onClick={() => setRejectModal(true)}
                  disabled={saving}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-sm font-medium hover:bg-red-50 disabled:opacity-70"
                >
                  Reject
                </button>
              </div>
            )}
          </div>

          {approved && invoiceUrl && (
            <div className="bg-olive/20 text-olive px-4 py-3 rounded-sm">
              <p className="font-medium">Invoice generated successfully</p>
              <a
                href={invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terracotta hover:underline text-sm mt-1 inline-block"
              >
                Download PDF →
              </a>
            </div>
          )}

          {approved && (
            <div className="bg-warm border border-stone/40 rounded-sm p-4">
              <h2 className="font-display text-lg text-dark mb-3">Assign Driver</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={stopsCountHint}
                    onChange={(e) => setStopsCountHint(Math.max(1, Number(e.target.value) || 1))}
                    className="bg-cream border border-stone rounded-sm px-3 py-2"
                    placeholder="Stops count"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={estimatedMilesInput}
                    onChange={(e) => setEstimatedMilesInput(e.target.value)}
                    className="bg-cream border border-stone rounded-sm px-3 py-2"
                    placeholder="Miles (optional)"
                  />
                </div>
                <button
                  onClick={handleSuggestRoute}
                  disabled={suggestingRoute}
                  className="w-full border border-stone text-dark py-2 px-4 rounded-sm font-medium hover:bg-stone/10 disabled:opacity-70"
                >
                  {suggestingRoute ? "Analyzing route..." : "Analyze route and suggest vehicle"}
                </button>

                {routeSuggestion && (
                  <div className="rounded-sm border border-stone/40 bg-cream p-3 text-sm space-y-1">
                    <p className="text-dark">
                      Suggested vehicle: <strong>{routeSuggestion.suggestedVehicleLabel}</strong>
                    </p>
                    <p className="text-muted">
                      Zone: {routeSuggestion.zoneLabel} | Stops: {routeSuggestion.stopsCount} | Miles:{" "}
                      {routeSuggestion.milesEstimated}
                    </p>
                    <p className="text-muted">
                      Tray load: {routeSuggestion.trayEquivalent} | Refrigeration:{" "}
                      {routeSuggestion.refrigerationRequired ? "required" : "not required"}
                    </p>
                    <p className="text-muted">
                      Confidence: {routeSuggestion.confidence} | Load level: {routeSuggestion.estimatedLoadLevel}
                    </p>
                  </div>
                )}

                <select
                  value={assignDriverId}
                  onChange={(e) => setAssignDriverId(e.target.value)}
                  className="w-full bg-cream border border-stone rounded-sm px-3 py-2"
                >
                  <option value="">Select driver...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <select
                  value={vehicleId}
                  onChange={(e) => {
                    setVehicleId(e.target.value as VehicleId);
                    setVehicleDecisionSource("manual");
                  }}
                  className="w-full bg-cream border border-stone rounded-sm px-3 py-2"
                >
                  <option value="">Select vehicle...</option>
                  {FLEET_CONFIG.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.label} {vehicle.refrigerated ? "(Refrigerated)" : "(Non-refrigerated)"}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={assignDate}
                    onChange={(e) => setAssignDate(e.target.value)}
                    className="bg-cream border border-stone rounded-sm px-3 py-2"
                  />
                  <input
                    type="time"
                    value={assignTime}
                    onChange={(e) => setAssignTime(e.target.value)}
                    className="bg-cream border border-stone rounded-sm px-3 py-2"
                  />
                </div>
                <button
                  onClick={handleAssignDriver}
                  disabled={assigning || !assignDriverId || !assignDate}
                  className="w-full bg-terracotta text-cream py-2 px-4 rounded-sm font-medium hover:bg-terracotta/90 disabled:opacity-70"
                >
                  {assigning ? "Assigning..." : "Assign Delivery"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/50 p-4">
          <div className="bg-cream rounded-sm p-6 max-w-md w-full">
            <h3 className="font-display text-lg text-dark mb-2">Reject Quote</h3>
            <p className="text-muted text-sm mb-3">Reason for rejection (will be shared with client):</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full bg-warm border border-stone rounded-sm px-3 py-2 min-h-[80px]"
              placeholder="Enter reason..."
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setRejectModal(false)}
                className="px-4 py-2 border border-stone text-muted rounded-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={saving || !rejectReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-sm disabled:opacity-70"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}