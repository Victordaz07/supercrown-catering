"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, FileText, Tag, Percent, DollarSign, Sparkles, Truck } from "lucide-react";

type Driver = { id: string; name: string };

type Item = {
  id: string;
  itemId: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
};

type PriceTier = {
  itemId: string;
  minQty: number;
  unitPrice: number;
  discountPct: number;
};

type OrderData = {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  deliveryAddress: string;
  eventDate: string;
  guestCount: string | null;
  eventDetails: string | null;
  notes: string | null;
  discountType: string | null;
  discountValue: number;
  discountAmount: number;
  driverId?: string | null;
  driverName?: string | null;
  items: Item[];
  invoices: Array<{ id: string; invoiceNumber: string; pdfPathDriver?: string | null; pdfPathClient?: string | null }>;
};

function isWorkflowTransition(fromStatus: string, toStatus: string) {
  return (
    (fromStatus === "PENDING" && toStatus === "CONFIRMED") ||
    (fromStatus === "CONFIRMED" && toStatus === "READY") ||
    (fromStatus === "READY" && toStatus === "IN_TRANSIT") ||
    (fromStatus === "IN_TRANSIT" && toStatus === "DELIVERED")
  );
}

export function OrderActions({
  order: initialOrder,
  viewerRole,
}: {
  order: OrderData;
  viewerRole: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [items, setItems] = useState<Item[]>(initialOrder.items);
  const [removedIds, setRemovedIds] = useState<string[]>([]);

  const [customer, setCustomer] = useState({
    customerName: initialOrder.customerName,
    customerEmail: initialOrder.customerEmail,
    customerPhone: initialOrder.customerPhone || "",
    deliveryAddress: initialOrder.deliveryAddress,
    eventDate: initialOrder.eventDate?.split("T")[0] || "",
    guestCount: initialOrder.guestCount || "",
    eventDetails: initialOrder.eventDetails || "",
  });

  const [notes, setNotes] = useState(initialOrder.notes || "");
  const [discountType, setDiscountType] = useState(initialOrder.discountType || "");
  const [discountValue, setDiscountValue] = useState(initialOrder.discountValue || 0);
  const [couponCode, setCouponCode] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [taxRate, setTaxRate] = useState(0.08875);

  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Box Lunch");
  const [newItemQty, setNewItemQty] = useState(1);
  const [showAddItem, setShowAddItem] = useState(false);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [assignDriverId, setAssignDriverId] = useState(initialOrder.driverId || "");
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [statusDraft, setStatusDraft] = useState(initialOrder.status);
  const [statusSaving, setStatusSaving] = useState(false);
  const canAuthorizeManualStatus = viewerRole === "MASTER" || viewerRole === "ADMIN";

  const editable = ["PENDING", "CONFIRMED"].includes(initialOrder.status);

  useEffect(() => {
    fetch("/api/price-tiers")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTiers(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (initialOrder.status === "READY" || initialOrder.status === "CONFIRMED") {
      fetch("/api/users?role=DELIVERY")
        .then((r) => r.json())
        .then((data) => setDrivers(Array.isArray(data) ? data : data.users || []))
        .catch(() => {});
    }
  }, [initialOrder.status]);

  const normalizeItemId = useCallback((value: string) => value.toLowerCase().trim().replace(/\s+/g, "-"), []);

  const getTierPrice = useCallback((itemId: string, qty: number): { price: number; pct: number } | null => {
    const itemTiers = tiers.filter((t) => t.itemId === itemId).sort((a, b) => b.minQty - a.minQty);
    const match = itemTiers.find((t) => qty >= t.minQty);
    return match ? { price: match.unitPrice, pct: match.discountPct } : null;
  }, [tiers]);

  const getSuggestedPrice = useCallback((item: Pick<Item, "itemId" | "name" | "category" | "quantity">): { price: number; source: "TIER" | "RULE"; pct?: number } => {
    const candidates = [normalizeItemId(item.itemId), normalizeItemId(item.name)];
    for (const candidate of candidates) {
      const tier = getTierPrice(candidate, item.quantity);
      if (tier) return { price: tier.price, source: "TIER", pct: tier.pct };
    }

    const n = item.name.toLowerCase();
    const c = item.category.toLowerCase();
    let base = 6;

    if (n.includes("sandwich") || n.includes("turkey") || n.includes("ham") || n.includes("jack")) base = 6;
    else if (n.includes("tray") || n.includes("platter") || n.includes("plate")) base = 8;
    else if (n.includes("yogurt") || n.includes("parfait")) base = 5;
    else if (n.includes("snack")) base = 5.5;
    else if (n.includes("salad")) base = 7;
    else if (n.includes("dessert") || n.includes("cookie") || n.includes("brownie")) base = 4;
    else if (n.includes("water") || n.includes("coffee") || n.includes("juice") || n.includes("beverage")) base = 3;
    else if (c.includes("grab")) base = 7;
    else if (c.includes("box")) base = 6;

    let adjusted = base;
    if (item.quantity >= 15) adjusted = base * 0.93;
    else if (item.quantity >= 10) adjusted = base * 0.96;

    // Keep pricing in the requested business range.
    adjusted = Math.min(10, Math.max(3, adjusted));
    return { price: Number(adjusted.toFixed(2)), source: "RULE" };
  }, [getTierPrice, normalizeItemId]);

  useEffect(() => {
    setItems((prev) => prev.map((item) => {
      if (item.unitPrice > 0) return item;
      const suggestion = getSuggestedPrice(item);
      return { ...item, unitPrice: suggestion.price };
    }));
  }, [getSuggestedPrice]);

  const updateItemField = (idx: number, field: "quantity" | "unitPrice", val: number) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      if (field === "quantity") {
        const suggestion = getSuggestedPrice(next[idx]);
        if (suggestion.price > 0) next[idx].unitPrice = suggestion.price;
      }
      return next;
    });
  };

  const removeItem = (idx: number) => {
    const item = items[idx];
    if (item.id && !item.id.startsWith("new-")) {
      setRemovedIds((p) => [...p, item.id]);
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    if (!newItemName.trim()) return;
    const newItem: Item = {
      id: `new-${Date.now()}`,
      itemId: newItemName.toLowerCase().replace(/\s+/g, "-"),
      name: newItemName,
      category: newItemCategory,
      quantity: newItemQty,
      unitPrice: 0,
    };
    const suggestion = getSuggestedPrice(newItem);
    newItem.unitPrice = suggestion.price;
    setItems((prev) => [...prev, newItem]);
    setNewItemName("");
    setNewItemQty(1);
    setShowAddItem(false);
  };

  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);

  let discountAmt = 0;
  if (discountType === "PERCENTAGE") discountAmt = subtotal * (discountValue / 100);
  else if (discountType === "FIXED") discountAmt = Math.min(discountValue, subtotal);

  const afterDiscount = subtotal - discountAmt;
  const taxAmount = afterDiscount * taxRate;
  const total = afterDiscount + taxAmount;
  const allPriced = items.length > 0 && items.every((i) => i.unitPrice > 0);

  const applyCoupon = async () => {
    setCouponMsg("");
    if (!couponCode.trim()) return;
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, subtotal }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponMsg(data.error || "Invalid coupon"); return; }
      setDiscountType("COUPON");
      setDiscountValue(data.coupon.type === "PERCENTAGE" ? data.coupon.value : data.coupon.value);
      setCouponMsg(`Applied: ${data.coupon.type === "PERCENTAGE" ? `${data.coupon.value}%` : `$${data.coupon.value}`} off`);
      if (data.coupon.type === "PERCENTAGE") {
        setDiscountValue(data.coupon.value);
        setDiscountType("PERCENTAGE");
      } else {
        setDiscountValue(data.coupon.value);
        setDiscountType("FIXED");
      }
    } catch {
      setCouponMsg("Error validating coupon");
    }
  };

  const saveChanges = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const updateItems = items
        .filter((i) => !i.id.startsWith("new-"))
        .map((i) => ({ id: i.id, quantity: i.quantity, unitPrice: i.unitPrice }));

      const newAdded = items
        .filter((i) => i.id.startsWith("new-"))
        .map((i) => ({ itemId: i.itemId, name: i.name, category: i.category, quantity: i.quantity, unitPrice: i.unitPrice }));

      const res = await fetch(`/api/orders/${initialOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...customer,
          notes,
          discountType: discountType || null,
          discountValue,
          discountAmount: discountAmt,
          updateItems,
          addItems: newAdded,
          removeItems: removedIds,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save");
      setMsg({ type: "ok", text: "Changes saved" });
      setRemovedIds([]);
      router.refresh();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Error saving" });
    } finally {
      setSaving(false);
    }
  };

  const generateInvoice = async () => {
    setInvoicing(true);
    setMsg(null);
    try {
      await saveChanges();
      const priceMap: Record<string, number> = {};
      items.filter((i) => !i.id.startsWith("new-")).forEach((i) => { priceMap[i.id] = i.unitPrice; });

      const res = await fetch(`/api/orders/${initialOrder.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemPrices: priceMap }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to generate invoice");
      setMsg({ type: "ok", text: "Invoice generated" });
      router.refresh();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Error generating invoice" });
    } finally {
      setInvoicing(false);
    }
  };

  const changeStatus = async (nextStatus: string) => {
    if (!nextStatus || nextStatus === initialOrder.status) return;
    setStatusSaving(true);
    setMsg(null);
    try {
      const isWorkflowChange = isWorkflowTransition(initialOrder.status, nextStatus);
      const mustRequestApproval =
        viewerRole === "SALES" && !canAuthorizeManualStatus && !isWorkflowChange;

      if (mustRequestApproval) {
        const requestRes = await fetch("/api/order-status-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: initialOrder.id,
            requestedStatus: nextStatus,
            reason: `Manual override requested from order detail (${initialOrder.status} -> ${nextStatus}).`,
          }),
        });
        if (!requestRes.ok) {
          throw new Error((await requestRes.json()).error || "Failed to submit status request");
        }
        setMsg({
          type: "ok",
          text: `Manual change requested: ${initialOrder.status} -> ${nextStatus}. Awaiting ADMIN/MASTER approval.`,
        });
      } else {
        const res = await fetch(`/api/orders/${initialOrder.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (!res.ok) throw new Error((await res.json()).error || "Failed to update status");
        setMsg({ type: "ok", text: `Order status changed to ${nextStatus}` });
      }
      router.refresh();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Error updating status" });
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div className="space-y-6 border-t border-stone/20 pt-6">
      {/* Customer Info */}
      {editable && (
        <div>
          <h3 className="text-muted text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
            Customer Information
            <span className="text-[10px] bg-terracotta/10 text-terracotta px-2 py-0.5 rounded-full">Editable</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { key: "customerName", label: "Name", type: "text" },
              { key: "customerEmail", label: "Email", type: "email" },
              { key: "customerPhone", label: "Phone", type: "tel" },
              { key: "deliveryAddress", label: "Delivery Address", type: "text" },
              { key: "eventDate", label: "Event Date", type: "date" },
              { key: "guestCount", label: "Guests", type: "text" },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="text-xs text-muted uppercase tracking-wider">{label}</label>
                <input
                  type={type}
                  value={(customer as Record<string, string>)[key] || ""}
                  onChange={(e) => setCustomer((p) => ({ ...p, [key]: e.target.value }))}
                  className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="text-xs text-muted uppercase tracking-wider">Event Details</label>
              <textarea
                value={customer.eventDetails}
                onChange={(e) => setCustomer((p) => ({ ...p, eventDetails: e.target.value }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
              />
            </div>
          </div>
        </div>
      )}

      {/* Items + Pricing */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-muted text-xs uppercase tracking-wider">Items & Pricing</h3>
          {editable && (
            <button
              onClick={() => {
                setItems((prev) =>
                  prev.map((item) => {
                    const suggestion = getSuggestedPrice(item);
                    return { ...item, unitPrice: suggestion.price };
                  })
                );
              }}
              className="text-xs text-terracotta hover:underline"
            >
              Apply suggested prices
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-stone/30 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-stone/10">
                <th className="text-left p-3 font-medium">Item</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-right p-3 font-medium w-24">Qty</th>
                <th className="text-right p-3 font-medium w-32">Unit Price</th>
                <th className="text-right p-3 font-medium w-28">Subtotal</th>
                {editable && <th className="p-3 w-10"></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const tier = getTierPrice(normalizeItemId(item.itemId), item.quantity) || getTierPrice(normalizeItemId(item.name), item.quantity);
                const suggestion = getSuggestedPrice(item);
                return (
                  <tr key={item.id} className="border-t border-stone/20">
                    <td className="p-3">
                      <span className="font-medium">{item.name}</span>
                      {tier && tier.pct > 0 && (
                        <span className="ml-2 text-[10px] bg-olive/15 text-olive px-1.5 py-0.5 rounded-full">
                          -{tier.pct}% vol.
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-muted">{item.category}</td>
                    <td className="p-3 text-right">
                      {editable ? (
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItemField(idx, "quantity", parseInt(e.target.value) || 1)}
                          className="w-20 text-right bg-cream border border-stone/40 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-terracotta/30"
                        />
                      ) : (
                        item.quantity
                      )}
                    </td>
                    <td className="p-3 text-right">
                      {editable ? (
                        <div className="inline-flex flex-col items-end gap-1">
                          <div className="relative inline-block">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">$</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.unitPrice || ""}
                              onChange={(e) => updateItemField(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-28 text-right bg-cream border border-stone/40 rounded px-2 py-1 pl-5 focus:outline-none focus:ring-1 focus:ring-terracotta/30"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => updateItemField(idx, "unitPrice", suggestion.price)}
                            className="text-[10px] text-olive hover:underline"
                            title={suggestion.source === "TIER" ? "Suggested by quantity tier" : "Suggested by business rule"}
                          >
                            Suggested: ${suggestion.price.toFixed(2)} {suggestion.source === "TIER" ? "(tier)" : "(rule)"}
                          </button>
                        </div>
                      ) : (
                        `$${item.unitPrice.toFixed(2)}`
                      )}
                    </td>
                    <td className="p-3 text-right font-medium">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </td>
                    {editable && (
                      <td className="p-3">
                        <button onClick={() => removeItem(idx)} className="text-muted hover:text-red-600 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add item */}
        {editable && (
          <div className="mt-3">
            {showAddItem ? (
              <div className="flex flex-wrap items-end gap-2 p-3 bg-warm rounded-lg border border-stone/20">
                <div>
                  <label className="text-[10px] text-muted uppercase">Name</label>
                  <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                    className="block w-40 bg-cream border border-stone/40 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-terracotta/30" />
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase">Category</label>
                  <select value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)}
                    className="block bg-cream border border-stone/40 rounded px-2 py-1 text-sm focus:outline-none">
                    <option>Box Lunch</option>
                    <option>Grab-N-Go</option>
                    <option>Custom</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase">Qty</label>
                  <input type="number" min={1} value={newItemQty} onChange={(e) => setNewItemQty(parseInt(e.target.value) || 1)}
                    className="block w-16 bg-cream border border-stone/40 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-terracotta/30" />
                </div>
                <button onClick={addItem} className="px-3 py-1.5 bg-olive text-cream text-sm rounded hover:bg-olive/90">Add</button>
                <button onClick={() => setShowAddItem(false)} className="px-3 py-1.5 text-muted text-sm hover:text-dark">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowAddItem(true)}
                className="flex items-center gap-1.5 text-sm text-terracotta hover:text-terracotta/80 transition-colors">
                <Plus className="w-4 h-4" /> Add item
              </button>
            )}
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="bg-warm rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Subtotal</span>
          <span className="font-medium">${subtotal.toFixed(2)}</span>
        </div>

        {/* Discount */}
        {editable && (
          <div className="flex flex-wrap items-center gap-2 py-2 border-y border-stone/20">
            <Tag className="w-4 h-4 text-muted" />
            <select value={discountType} onChange={(e) => { setDiscountType(e.target.value); setDiscountValue(0); }}
              className="bg-cream border border-stone/40 rounded px-2 py-1 text-sm">
              <option value="">No discount</option>
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed amount</option>
            </select>
            {discountType && discountType !== "COUPON" && (
              <div className="relative">
                {discountType === "PERCENTAGE" ? (
                  <Percent className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                ) : (
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                )}
                <input type="number" min={0} step={discountType === "PERCENTAGE" ? 1 : 0.01}
                  value={discountValue || ""} onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className={`w-24 bg-cream border border-stone/40 rounded py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-terracotta/30 ${discountType === "FIXED" ? "pl-6 pr-2" : "px-2 pr-6"}`} />
              </div>
            )}
            <span className="text-muted text-xs">or</span>
            <input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="Coupon code" className="w-32 bg-cream border border-stone/40 rounded px-2 py-1 text-sm uppercase focus:outline-none focus:ring-1 focus:ring-terracotta/30" />
            <button onClick={applyCoupon} className="text-xs text-terracotta hover:underline">Apply</button>
            {couponMsg && <span className={`text-xs ${couponMsg.startsWith("Applied") ? "text-olive" : "text-red-600"}`}>{couponMsg}</span>}
          </div>
        )}

        {discountAmt > 0 && (
          <div className="flex justify-between text-sm text-olive">
            <span>Discount {discountType === "PERCENTAGE" ? `(${discountValue}%)` : ""}</span>
            <span>-${discountAmt.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-sm items-center">
          <span className="text-muted flex items-center gap-2">
            Tax
            {editable && (
              <input type="number" min={0} max={1} step={0.001} value={taxRate}
                onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-20 bg-cream border border-stone/40 rounded px-1.5 py-0.5 text-xs text-right focus:outline-none" />
            )}
            <span className="text-xs text-muted">({(taxRate * 100).toFixed(3)}%)</span>
          </span>
          <span>${taxAmount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between text-lg font-display pt-2 border-t border-stone/30">
          <span>Total</span>
          <span className="text-terracotta font-semibold">${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Upsell Suggestions */}
      {editable && <UpsellSuggestions items={items} tiers={tiers} onAdd={(name, category, qty) => {
        const itemId = name.toLowerCase().replace(/\s+/g, "-");
        const tier = getTierPrice(itemId, qty);
        const newItem: Item = { id: `new-${Date.now()}`, itemId, name, category, quantity: qty, unitPrice: tier?.price || 0 };
        setItems((prev) => [...prev, newItem]);
      }} />}

      {/* Notes */}
      <div>
        <label className="text-xs text-muted uppercase tracking-wider">Internal Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes for this order..."
          className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta" />
      </div>

      {/* Messages */}
      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-olive/15 text-olive" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <div className="w-full flex flex-wrap items-center gap-2 pb-2 border-b border-stone/20">
          <span className="text-xs text-muted uppercase tracking-wider">Order Status</span>
          <select
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value)}
            className="bg-cream border border-stone/40 rounded px-2 py-1.5 text-sm"
          >
            {["PENDING", "CONFIRMED", "READY", "IN_TRANSIT", "DELIVERED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            disabled={statusSaving || statusDraft === initialOrder.status}
            onClick={() => changeStatus(statusDraft)}
            className="px-3 py-1.5 bg-[#556B2F] text-white rounded-lg text-sm hover:bg-[#4a5d29] disabled:opacity-50"
          >
            {statusSaving ? "Updating..." : viewerRole === "SALES" ? "Apply / Request Change" : "Update Status"}
          </button>
          {viewerRole === "SALES" && (
            <span className="text-[11px] text-muted">
              Workflow changes apply directly; manual overrides require ADMIN/MASTER approval.
            </span>
          )}
          {initialOrder.status === "CONFIRMED" && (
            <button
              onClick={() => changeStatus("PENDING")}
              disabled={statusSaving}
              className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm hover:bg-amber-200 disabled:opacity-50"
            >
              Move back to PENDING
            </button>
          )}
          {initialOrder.status === "READY" && (
            <button
              onClick={() => changeStatus("CONFIRMED")}
              disabled={statusSaving}
              className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm hover:bg-amber-200 disabled:opacity-50"
            >
              Move back to CONFIRMED
            </button>
          )}
        </div>

        {editable && (
          <button onClick={saveChanges} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-dark text-cream rounded-lg hover:bg-dark/90 disabled:opacity-50 transition-all">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        )}

        {initialOrder.status === "PENDING" && (
          <button onClick={async () => {
            await changeStatus("CONFIRMED");
          }} className="px-4 py-2 bg-olive text-cream rounded-lg hover:bg-olive/90">
            Confirm Order
          </button>
        )}

        {initialOrder.status === "CONFIRMED" && initialOrder.invoices.length === 0 && (
          <button onClick={generateInvoice} disabled={invoicing || !allPriced}
            className="flex items-center gap-2 px-4 py-2 bg-terracotta text-cream rounded-lg hover:bg-terracotta/90 disabled:opacity-50 transition-all"
            title={!allPriced ? "Set all item prices first" : ""}>
            <FileText className="w-4 h-4" />
            {invoicing ? "Generating..." : "Generate Invoice"}
          </button>
        )}

        {initialOrder.status === "CONFIRMED" && (
          <button onClick={async () => {
            await changeStatus("READY");
          }} className="px-4 py-2 bg-stone text-cream rounded-lg hover:bg-stone/90">
            Mark Ready for Delivery
          </button>
        )}

        {initialOrder.status === "READY" && (
          <div className="flex items-center gap-2 flex-wrap">
            <Truck className="w-4 h-4 text-muted" />
            {initialOrder.driverName ? (
              <span className="text-sm text-olive">Assigned to: <strong>{initialOrder.driverName}</strong></span>
            ) : (
              <>
                <select
                  value={assignDriverId}
                  onChange={(e) => setAssignDriverId(e.target.value)}
                  className="bg-cream border border-stone/40 rounded px-2 py-1.5 text-sm"
                >
                  <option value="">Assign a driver...</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <button
                  disabled={!assignDriverId || assigningDriver}
                  onClick={async () => {
                    setAssigningDriver(true);
                    try {
                      await fetch(`/api/orders/${initialOrder.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ driverId: assignDriverId }),
                      });
                      router.refresh();
                    } finally {
                      setAssigningDriver(false);
                    }
                  }}
                  className="px-3 py-1.5 bg-[#556B2F] text-white rounded-lg text-sm hover:bg-[#4a5d29] disabled:opacity-50"
                >
                  {assigningDriver ? "Assigning..." : "Assign Driver"}
                </button>
              </>
            )}
          </div>
        )}
        {initialOrder.status === "DELIVERED" && (
          <p className="text-sm text-olive py-2">&#10003; Delivered</p>
        )}
      </div>
    </div>
  );
}

const UPSELL_MAP: Record<string, Array<{ name: string; category: string; reason: string }>> = {
  "Box Lunch": [
    { name: "Bottled Water", category: "Beverages", reason: "Popular pairing with box lunches" },
    { name: "Cookie Assortment", category: "Desserts", reason: "Sweet finish for lunch events" },
    { name: "Fresh Fruit Cup", category: "Grab-N-Go", reason: "Healthy complement" },
  ],
  "Grab-N-Go": [
    { name: "Coffee Service", category: "Beverages", reason: "Most requested with grab-n-go" },
    { name: "Yogurt Parfait", category: "Grab-N-Go", reason: "Popular add-on for breakfast events" },
  ],
  "Beverages": [
    { name: "Pastry Platter", category: "Grab-N-Go", reason: "Perfect with beverages" },
  ],
  "Desserts": [
    { name: "Coffee Service", category: "Beverages", reason: "Pairs well with desserts" },
  ],
  "Custom": [
    { name: "Utensil Kit", category: "Supplies", reason: "Essential for custom catering" },
    { name: "Napkin Bundle", category: "Supplies", reason: "Often needed for events" },
  ],
};

function UpsellSuggestions({ items, tiers, onAdd }: {
  items: Item[];
  tiers: PriceTier[];
  onAdd: (name: string, category: string, qty: number) => void;
}) {
  const categories = Array.from(new Set(items.map((i) => i.category)));
  const existingNames = new Set(items.map((i) => i.name.toLowerCase()));

  const suggestions: Array<{ name: string; category: string; reason: string; price: number }> = [];

  for (const cat of categories) {
    const mapped = UPSELL_MAP[cat] || [];
    for (const s of mapped) {
      if (existingNames.has(s.name.toLowerCase())) continue;
      if (suggestions.find((x) => x.name === s.name)) continue;
      const itemId = s.name.toLowerCase().replace(/\s+/g, "-");
      const tier = tiers.filter((t) => t.itemId === itemId).sort((a, b) => a.minQty - b.minQty)[0];
      suggestions.push({ ...s, price: tier?.unitPrice || 0 });
    }
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="bg-amber-50/60 border border-amber-200/60 rounded-lg p-4">
      <h3 className="text-xs uppercase tracking-wider text-amber-700 mb-3 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5" /> Suggested Add-ons
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {suggestions.slice(0, 4).map((s) => (
          <div key={s.name} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
            <div>
              <p className="text-sm font-medium text-dark">{s.name}</p>
              <p className="text-[11px] text-muted">{s.reason}</p>
              {s.price > 0 && <p className="text-[11px] text-terracotta">from ${s.price.toFixed(2)}/unit</p>}
            </div>
            <button onClick={() => onAdd(s.name, s.category, 1)}
              className="ml-2 p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded transition-colors flex-shrink-0">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
