"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, Trash2, Tag, Edit2, X, Check, Loader2 } from "lucide-react";

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  minOrder: number | null;
  maxUses: number | null;
  usedCount: number;
  validUntil: string | null;
  active: boolean;
  _count?: { orders: number };
};

export default function CouponsPage() {
  const { data: session } = useSession();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "PERCENTAGE",
    value: "",
    minOrder: "",
    maxUses: "",
    validUntil: "",
  });

  const allowed = session?.user?.role && ["MASTER", "ADMIN"].includes(session.user.role);

  const loadCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/coupons");
      if (res.ok) setCoupons(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadCoupons(); }, [loadCoupons]);

  if (!allowed) {
    return <div className="p-8 text-muted">Access denied. Requires MASTER or ADMIN role.</div>;
  }

  const resetForm = () => {
    setForm({ code: "", description: "", type: "PERCENTAGE", value: "", minOrder: "", maxUses: "", validUntil: "" });
    setShowForm(false);
    setEditId(null);
  };

  const handleSave = async () => {
    setMsg("");
    const payload = {
      code: form.code,
      description: form.description || null,
      type: form.type,
      value: parseFloat(form.value) || 0,
      minOrder: form.minOrder ? parseFloat(form.minOrder) : null,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      validUntil: form.validUntil || null,
    };

    try {
      const url = editId ? `/api/coupons/${editId}` : "/api/coupons";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editId ? { ...payload, active: true } : payload) });
      if (!res.ok) { setMsg((await res.json()).error || "Error"); return; }
      resetForm();
      loadCoupons();
    } catch {
      setMsg("Network error");
    }
  };

  const toggleActive = async (c: Coupon) => {
    await fetch(`/api/coupons/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !c.active }) });
    loadCoupons();
  };

  const deleteCoupon = async (c: Coupon) => {
    if (c.usedCount > 0) return;
    if (!confirm(`Delete coupon ${c.code}?`)) return;
    await fetch(`/api/coupons/${c.id}`, { method: "DELETE" });
    loadCoupons();
  };

  const startEdit = (c: Coupon) => {
    setForm({
      code: c.code,
      description: c.description || "",
      type: c.type,
      value: String(c.value),
      minOrder: c.minOrder ? String(c.minOrder) : "",
      maxUses: c.maxUses ? String(c.maxUses) : "",
      validUntil: c.validUntil ? c.validUntil.split("T")[0] : "",
    });
    setEditId(c.id);
    setShowForm(true);
  };

  return (
    <div className="max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-2xl text-dark">Coupons</h1>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-terracotta text-cream rounded-lg hover:bg-terracotta/90 transition-all text-sm">
            <Plus className="w-4 h-4" /> New Coupon
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-warm border border-stone/30 rounded-lg p-5 mb-6 space-y-4">
          <h3 className="font-display text-lg text-dark">{editId ? "Edit Coupon" : "New Coupon"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Code *</label>
              <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-terracotta/30" placeholder="e.g. SUMMER20" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Type *</label>
              <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none">
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount ($)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Value *</label>
              <input type="number" min={0} step={form.type === "PERCENTAGE" ? 1 : 0.01} value={form.value}
                onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                placeholder={form.type === "PERCENTAGE" ? "e.g. 20" : "e.g. 10.00"} />
            </div>
            <div className="sm:col-span-3">
              <label className="text-xs text-muted uppercase tracking-wider">Description</label>
              <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" placeholder="Optional description" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Min Order ($)</label>
              <input type="number" min={0} step={0.01} value={form.minOrder}
                onChange={(e) => setForm((p) => ({ ...p, minOrder: e.target.value }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" placeholder="No minimum" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Max Uses</label>
              <input type="number" min={1} value={form.maxUses}
                onChange={(e) => setForm((p) => ({ ...p, maxUses: e.target.value }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" placeholder="Unlimited" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Valid Until</label>
              <input type="date" value={form.validUntil}
                onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
            </div>
          </div>
          {msg && <p className="text-sm text-red-600">{msg}</p>}
          <div className="flex gap-3">
            <button onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-dark text-cream rounded-lg hover:bg-dark/90 text-sm">
              <Check className="w-4 h-4" /> {editId ? "Update" : "Create"}
            </button>
            <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 text-muted hover:text-dark text-sm">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-muted py-8"><Loader2 className="w-5 h-5 animate-spin" /> Loading coupons...</div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No coupons yet. Create your first one.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-stone/30 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-stone/10">
                <th className="text-left p-3 font-medium">Code</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-right p-3 font-medium">Value</th>
                <th className="text-right p-3 font-medium">Min Order</th>
                <th className="text-right p-3 font-medium">Uses</th>
                <th className="text-left p-3 font-medium">Expires</th>
                <th className="text-center p-3 font-medium">Status</th>
                <th className="text-center p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className={`border-t border-stone/20 ${!c.active ? "opacity-50" : ""}`}>
                  <td className="p-3 font-mono font-medium">{c.code}</td>
                  <td className="p-3 text-muted">{c.type}</td>
                  <td className="p-3 text-right">{c.type === "PERCENTAGE" ? `${c.value}%` : `$${c.value.toFixed(2)}`}</td>
                  <td className="p-3 text-right text-muted">{c.minOrder ? `$${c.minOrder.toFixed(2)}` : "—"}</td>
                  <td className="p-3 text-right">{c.usedCount}{c.maxUses ? `/${c.maxUses}` : ""}</td>
                  <td className="p-3 text-muted">{c.validUntil ? new Date(c.validUntil).toLocaleDateString("en-US") : "Never"}</td>
                  <td className="p-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.active ? "bg-olive/15 text-olive" : "bg-stone/20 text-muted"}`}>
                      {c.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => startEdit(c)} className="p-1.5 text-muted hover:text-dark rounded hover:bg-stone/10" title="Edit">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleActive(c)} className={`p-1.5 rounded text-xs ${c.active ? "text-muted hover:text-red-600" : "text-olive hover:text-olive/80"}`}
                        title={c.active ? "Deactivate" : "Activate"}>
                        {c.active ? "Off" : "On"}
                      </button>
                      {c.usedCount === 0 && (
                        <button onClick={() => deleteCoupon(c)} className="p-1.5 text-muted hover:text-red-600 rounded hover:bg-red-50" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
