"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Plus, Trash2, DollarSign, ChevronDown, ChevronUp, Check, X, Loader2, Save } from "lucide-react";

type PriceTier = {
  id: string;
  itemId: string;
  itemName: string;
  minQty: number;
  unitPrice: number;
  discountPct: number;
};

type GroupedTiers = Record<string, { name: string; tiers: PriceTier[] }>;

type NewTierRow = { minQty: string; unitPrice: string; discountPct: string };

export default function PricingPage() {
  const { data: session } = useSession();
  const [allTiers, setAllTiers] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ minQty: string; unitPrice: string; discountPct: string }>({ minQty: "", unitPrice: "", discountPct: "" });

  const [newProductName, setNewProductName] = useState("");
  const [newProductId, setNewProductId] = useState("");
  const [newRows, setNewRows] = useState<NewTierRow[]>([{ minQty: "1", unitPrice: "", discountPct: "0" }]);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const allowed = session?.user?.role && ["MASTER", "ADMIN", "SALES"].includes(session.user.role);

  const loadTiers = useCallback(async () => {
    try {
      const res = await fetch("/api/price-tiers");
      if (res.ok) setAllTiers(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadTiers(); }, [loadTiers]);

  if (!allowed) {
    return <div className="p-8 text-muted">Access denied.</div>;
  }

  const grouped: GroupedTiers = {};
  for (const t of allTiers) {
    if (!grouped[t.itemId]) grouped[t.itemId] = { name: t.itemName, tiers: [] };
    grouped[t.itemId].tiers.push(t);
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].tiers.sort((a, b) => a.minQty - b.minQty);
  }

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  const handleNameChange = (name: string) => {
    setNewProductName(name);
    setNewProductId(name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const addRow = () => setNewRows((p) => [...p, { minQty: "", unitPrice: "", discountPct: "0" }]);

  const updateRow = (idx: number, field: keyof NewTierRow, val: string) => {
    setNewRows((p) => { const n = [...p]; n[idx] = { ...n[idx], [field]: val }; return n; });
  };

  const removeRow = (idx: number) => setNewRows((p) => p.filter((_, i) => i !== idx));

  const saveNewProduct = async () => {
    if (!newProductName.trim() || !newProductId.trim()) { setMsg("Product name required"); return; }
    const valid = newRows.filter((r) => r.minQty && r.unitPrice);
    if (valid.length === 0) { setMsg("Add at least one tier"); return; }

    setSaving(true);
    setMsg("");
    try {
      for (const row of valid) {
        const res = await fetch("/api/price-tiers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: newProductId,
            itemName: newProductName,
            minQty: parseInt(row.minQty),
            unitPrice: parseFloat(row.unitPrice),
            discountPct: parseFloat(row.discountPct) || 0,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create tier");
        }
      }
      setShowNewProduct(false);
      setNewProductName("");
      setNewProductId("");
      setNewRows([{ minQty: "1", unitPrice: "", discountPct: "0" }]);
      loadTiers();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (t: PriceTier) => {
    setEditId(t.id);
    setEditData({ minQty: String(t.minQty), unitPrice: String(t.unitPrice), discountPct: String(t.discountPct) });
  };

  const saveEdit = async () => {
    if (!editId) return;
    await fetch(`/api/price-tiers/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        minQty: parseInt(editData.minQty),
        unitPrice: parseFloat(editData.unitPrice),
        discountPct: parseFloat(editData.discountPct) || 0,
      }),
    });
    setEditId(null);
    loadTiers();
  };

  const deleteTier = async (id: string) => {
    if (!confirm("Delete this tier?")) return;
    await fetch(`/api/price-tiers/${id}`, { method: "DELETE" });
    loadTiers();
  };

  return (
    <div className="max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-2xl text-dark">Volume Pricing</h1>
        {!showNewProduct && (
          <button onClick={() => setShowNewProduct(true)}
            className="flex items-center gap-2 px-4 py-2 bg-terracotta text-cream rounded-lg hover:bg-terracotta/90 transition-all text-sm">
            <Plus className="w-4 h-4" /> Add Product Pricing
          </button>
        )}
      </div>

      {/* New Product Form */}
      {showNewProduct && (
        <div className="bg-warm border border-stone/30 rounded-lg p-5 mb-6 space-y-4">
          <h3 className="font-display text-lg text-dark">New Product Pricing</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Product Name *</label>
              <input value={newProductName} onChange={(e) => handleNameChange(e.target.value)}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                placeholder="e.g. Yogurt Parfait" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Product ID</label>
              <input value={newProductId} onChange={(e) => setNewProductId(e.target.value)}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm text-muted font-mono focus:outline-none"
                placeholder="auto-generated" />
            </div>
          </div>

          <div className="mt-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-2">Price Tiers</p>
            <table className="w-full text-sm border border-stone/30 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-stone/10">
                  <th className="text-right p-2 font-medium w-28">Min Qty</th>
                  <th className="text-right p-2 font-medium w-32">Unit Price ($)</th>
                  <th className="text-right p-2 font-medium w-28">Discount %</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {newRows.map((row, idx) => (
                  <tr key={idx} className="border-t border-stone/20">
                    <td className="p-2">
                      <input type="number" min={1} value={row.minQty} onChange={(e) => updateRow(idx, "minQty", e.target.value)}
                        className="w-full text-right bg-cream border border-stone/40 rounded px-2 py-1 focus:outline-none" />
                    </td>
                    <td className="p-2">
                      <input type="number" min={0} step={0.01} value={row.unitPrice} onChange={(e) => updateRow(idx, "unitPrice", e.target.value)}
                        className="w-full text-right bg-cream border border-stone/40 rounded px-2 py-1 focus:outline-none" placeholder="0.00" />
                    </td>
                    <td className="p-2">
                      <input type="number" min={0} max={100} step={0.1} value={row.discountPct} onChange={(e) => updateRow(idx, "discountPct", e.target.value)}
                        className="w-full text-right bg-cream border border-stone/40 rounded px-2 py-1 focus:outline-none" />
                    </td>
                    <td className="p-2">
                      {newRows.length > 1 && (
                        <button onClick={() => removeRow(idx)} className="text-muted hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addRow} className="mt-2 flex items-center gap-1 text-xs text-terracotta hover:underline">
              <Plus className="w-3 h-3" /> Add tier row
            </button>
          </div>

          {msg && <p className="text-sm text-red-600">{msg}</p>}
          <div className="flex gap-3">
            <button onClick={saveNewProduct} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-dark text-cream rounded-lg hover:bg-dark/90 text-sm disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save All Tiers"}
            </button>
            <button onClick={() => { setShowNewProduct(false); setMsg(""); }}
              className="flex items-center gap-2 px-4 py-2 text-muted hover:text-dark text-sm">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing Products */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted py-8"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-muted">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No pricing tiers yet. Add your first product pricing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([itemId, { name, tiers }]) => (
            <div key={itemId} className="bg-white border border-stone/30 rounded-lg overflow-hidden">
              <button onClick={() => toggle(itemId)}
                className="w-full flex items-center justify-between p-4 hover:bg-warm/50 transition-colors">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-terracotta" />
                  <div className="text-left">
                    <span className="font-display text-dark">{name}</span>
                    <span className="ml-2 text-xs text-muted font-mono">{itemId}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">{tiers.length} tier{tiers.length !== 1 ? "s" : ""}</span>
                  {expanded[itemId] ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                </div>
              </button>

              {expanded[itemId] && (
                <div className="border-t border-stone/20">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-stone/5">
                        <th className="text-right p-3 font-medium">Min Qty</th>
                        <th className="text-right p-3 font-medium">Unit Price</th>
                        <th className="text-right p-3 font-medium">Discount</th>
                        <th className="text-center p-3 font-medium w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tiers.map((t) => (
                        <tr key={t.id} className="border-t border-stone/10">
                          {editId === t.id ? (
                            <>
                              <td className="p-2">
                                <input type="number" value={editData.minQty} onChange={(e) => setEditData((p) => ({ ...p, minQty: e.target.value }))}
                                  className="w-20 text-right bg-cream border border-stone/40 rounded px-2 py-1 focus:outline-none" />
                              </td>
                              <td className="p-2">
                                <input type="number" step={0.01} value={editData.unitPrice} onChange={(e) => setEditData((p) => ({ ...p, unitPrice: e.target.value }))}
                                  className="w-24 text-right bg-cream border border-stone/40 rounded px-2 py-1 focus:outline-none" />
                              </td>
                              <td className="p-2">
                                <input type="number" step={0.1} value={editData.discountPct} onChange={(e) => setEditData((p) => ({ ...p, discountPct: e.target.value }))}
                                  className="w-20 text-right bg-cream border border-stone/40 rounded px-2 py-1 focus:outline-none" />
                              </td>
                              <td className="p-2 text-center">
                                <button onClick={saveEdit} className="p-1 text-olive hover:text-olive/80"><Check className="w-4 h-4" /></button>
                                <button onClick={() => setEditId(null)} className="p-1 text-muted hover:text-dark"><X className="w-4 h-4" /></button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-3 text-right">{t.minQty}+</td>
                              <td className="p-3 text-right font-medium">${t.unitPrice.toFixed(2)}</td>
                              <td className="p-3 text-right">{t.discountPct > 0 ? <span className="text-olive">{t.discountPct}%</span> : <span className="text-muted">—</span>}</td>
                              <td className="p-3 text-center">
                                <button onClick={() => startEdit(t)} className="p-1 text-muted hover:text-dark" title="Edit">
                                  <DollarSign className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => deleteTier(t.id)} className="p-1 text-muted hover:text-red-600" title="Delete">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
