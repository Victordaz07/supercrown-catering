"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { getCurrentUser, getUserRole } from "@/lib/firebase/auth";

interface PriceTier {
  id: string;
  itemId: string;
  itemName: string;
  minQty: number;
  unitPrice: number;
  discountPercent: number;
}

const inputStyles =
  "w-full rounded-lg border border-stone/40 bg-cream px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/40";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function PricingPage() {
  const router = useRouter();
  const [tiers, setTiers] = useState<PriceTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);

  // Add Product form state
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState("");
  const [newTiers, setNewTiers] = useState<{ minQty: number; unitPrice: number; discountPercent: number }[]>([
    { minQty: 1, unitPrice: 0, discountPercent: 0 },
  ]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PriceTier>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTiers = useCallback(async () => {
    try {
      const res = await fetch("/api/price-tiers", { credentials: "include" });
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      setTiers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setTiers([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      const user = await getCurrentUser();
      if (!mounted) return;
      if (!user) {
        router.replace("/login");
        return;
      }
      const r = await getUserRole(user);
      if (!mounted) return;
      setRole(r);
      setRoleChecked(true);
      if (r !== "admin" && r !== "sales") {
        router.replace("/dashboard");
        return;
      }
      await fetchTiers();
    };

    checkAuth();
    return () => {
      mounted = false;
    };
  }, [router, fetchTiers]);

  useEffect(() => {
    setProductId(slugify(productName));
  }, [productName]);

  const addTierRow = () => {
    setNewTiers((prev) => [...prev, { minQty: 1, unitPrice: 0, discountPercent: 0 }]);
  };

  const updateNewTier = (index: number, field: "minQty" | "unitPrice" | "discountPercent", value: number) => {
    setNewTiers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeNewTierRow = (index: number) => {
    setNewTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const saveAllTiers = async () => {
    if (!productName.trim() || !productId.trim()) {
      setSaveError("Product Name and Product ID are required");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      for (const t of newTiers) {
        const res = await fetch("/api/price-tiers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            itemId: productId,
            itemName: productName.trim(),
            minQty: t.minQty,
            unitPrice: t.unitPrice,
            discountPercent: t.discountPercent,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to save tier");
        }
      }
      setProductName("");
      setProductId("");
      setNewTiers([{ minQty: 1, unitPrice: 0, discountPercent: 0 }]);
      await fetchTiers();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (tier: PriceTier) => {
    setEditingId(tier.id);
    setEditValues({
      minQty: tier.minQty,
      unitPrice: tier.unitPrice,
      discountPercent: tier.discountPercent,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/price-tiers/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editValues),
      });
      if (res.ok) {
        setEditingId(null);
        setEditValues({});
        await fetchTiers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update");
    }
  };

  const deleteTier = async (id: string) => {
    if (!confirm("Delete this price tier?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/price-tiers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        await fetchTiers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const groupedByProduct = tiers.reduce<Record<string, PriceTier[]>>((acc, t) => {
    const key = `${t.itemName} (${t.itemId})`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    acc[key].sort((a, b) => a.minQty - b.minQty);
    return acc;
  }, {});

  if (!roleChecked || (role !== "admin" && role !== "sales")) {
    return (
      <div className="min-h-[200px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="w-7 h-7 text-terracotta" />
        <div>
          <h1 className="font-display text-3xl text-dark">Price Tier Management</h1>
          <p className="text-muted text-sm">Manage volume pricing tiers per product</p>
        </div>
      </div>

      {/* Add Product Pricing */}
      <section className="bg-warm border border-stone/30 rounded-lg p-5">
        <h2 className="font-display text-xl text-dark mb-4">Add Product Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Product Name</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Yogurt Parfait"
              className={inputStyles}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Product ID (auto-generated)</label>
            <input
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="yogurt-parfait"
              className={inputStyles}
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-dark">Tiers</span>
            <button
              type="button"
              onClick={addTierRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-terracotta/20 text-terracotta text-sm font-medium hover:bg-terracotta/30 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Tier
            </button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-stone/30 bg-white">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="bg-stone/20 border-b border-stone/30">
                  <th className="text-left px-4 py-2 font-medium text-dark">Min Qty</th>
                  <th className="text-left px-4 py-2 font-medium text-dark">Unit Price</th>
                  <th className="text-left px-4 py-2 font-medium text-dark">Discount %</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {newTiers.map((t, i) => (
                  <tr key={i} className="border-t border-stone/20">
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={1}
                        value={t.minQty}
                        onChange={(e) => updateNewTier(i, "minQty", Number(e.target.value) || 0)}
                        className="w-20 rounded border border-stone/40 bg-cream px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={t.unitPrice || ""}
                        onChange={(e) => updateNewTier(i, "unitPrice", Number(e.target.value) || 0)}
                        className="w-24 rounded border border-stone/40 bg-cream px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={t.discountPercent || ""}
                        onChange={(e) => updateNewTier(i, "discountPercent", Number(e.target.value) || 0)}
                        className="w-20 rounded border border-stone/40 bg-cream px-2 py-1.5 text-sm"
                      />
                    </td>
                    <td className="px-2 py-2">
                      {newTiers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeNewTierRow(i)}
                          className="p-1.5 text-muted hover:text-red-600 rounded transition-colors"
                          aria-label="Remove tier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {saveError && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{saveError}</div>
        )}
        <button
          type="button"
          onClick={saveAllTiers}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-terracotta text-cream text-sm font-medium hover:bg-terracotta/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Save All
        </button>
      </section>

      {/* Existing tiers by product */}
      <section>
        <h2 className="font-display text-xl text-dark mb-4">Existing Product Pricing</h2>
        {Object.keys(groupedByProduct).length === 0 ? (
          <div className="bg-warm border border-stone/30 rounded-lg p-12 text-center">
            <p className="text-muted">No price tiers yet. Add product pricing above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedByProduct).map(([label, productTiers]) => (
              <ProductSection
                key={label}
                label={label}
                tiers={productTiers}
                editingId={editingId}
                editValues={editValues}
                setEditValues={setEditValues}
                deletingId={deletingId}
                onStartEdit={startEdit}
                onCancelEdit={cancelEdit}
                onSaveEdit={saveEdit}
                onDelete={deleteTier}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ProductSection({
  label,
  tiers,
  editingId,
  editValues,
  setEditValues,
  deletingId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  label: string;
  tiers: PriceTier[];
  editingId: string | null;
  editValues: Partial<PriceTier>;
  setEditValues: (v: Partial<PriceTier>) => void;
  deletingId: string | null;
  onStartEdit: (t: PriceTier) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white border border-stone/30 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-warm hover:bg-stone/10 transition-colors text-left"
      >
        <span className="font-display text-lg text-dark">{label}</span>
        {open ? (
          <ChevronUp className="w-5 h-5 text-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted" />
        )}
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="bg-stone/20 border-b border-stone/30">
                <th className="text-left px-4 py-3 font-medium text-dark">Min Qty</th>
                <th className="text-left px-4 py-3 font-medium text-dark">Unit Price</th>
                <th className="text-left px-4 py-3 font-medium text-dark">Discount %</th>
                <th className="text-right px-4 py-3 font-medium text-dark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.id} className="border-t border-stone/20">
                  <td className="px-4 py-3 text-dark">
                    {editingId === tier.id ? (
                      <input
                        type="number"
                        min={1}
                        value={editValues.minQty ?? tier.minQty}
                        onChange={(e) =>
                          setEditValues({ ...editValues, minQty: Number(e.target.value) || 0 })
                        }
                        className="w-20 rounded border border-stone/40 bg-cream px-2 py-1.5 text-sm"
                      />
                    ) : (
                      tier.minQty
                    )}
                  </td>
                  <td className="px-4 py-3 text-dark">
                    {editingId === tier.id ? (
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={editValues.unitPrice ?? tier.unitPrice}
                        onChange={(e) =>
                          setEditValues({ ...editValues, unitPrice: Number(e.target.value) || 0 })
                        }
                        className="w-24 rounded border border-stone/40 bg-cream px-2 py-1.5 text-sm"
                      />
                    ) : (
                      `$${Number(tier.unitPrice).toFixed(2)}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-dark">
                    {editingId === tier.id ? (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editValues.discountPercent ?? tier.discountPercent}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            discountPercent: Number(e.target.value) || 0,
                          })
                        }
                        className="w-20 rounded border border-stone/40 bg-cream px-2 py-1.5 text-sm"
                      />
                    ) : (
                      `${tier.discountPercent}%`
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === tier.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={onSaveEdit}
                          className="p-2 text-olive hover:bg-olive/10 rounded-lg transition-colors"
                          aria-label="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={onCancelEdit}
                          className="p-2 text-muted hover:bg-stone/20 rounded-lg transition-colors"
                          aria-label="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onStartEdit(tier)}
                          className="p-2 text-terracotta hover:bg-terracotta/10 rounded-lg transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(tier.id)}
                          disabled={deletingId === tier.id}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          aria-label="Delete"
                        >
                          {deletingId === tier.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
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
