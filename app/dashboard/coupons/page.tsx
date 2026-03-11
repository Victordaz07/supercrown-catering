"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Tag,
  Edit2,
  Loader2,
  X,
  Check,
  Shield,
} from "lucide-react";
import { onAuthChange, getUserRole } from "@/lib/firebase/auth";

type CouponType = "PERCENTAGE" | "FIXED";

interface Coupon {
  id: string;
  code: string;
  description?: string;
  type: CouponType;
  value: number;
  minOrder?: number;
  maxUses?: number;
  usedCount: number;
  validUntil?: string;
  isActive: boolean;
}

const EMPTY_FORM = {
  code: "",
  description: "",
  type: "FIXED" as CouponType,
  value: 0,
  minOrder: "",
  maxUses: "",
  validUntil: "",
};

const inputStyles =
  "w-full bg-cream border border-stone/50 rounded-lg px-3 py-2 text-sm text-dark placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta";

const selectStyles =
  "w-full bg-cream border border-stone/50 rounded-lg px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta appearance-none cursor-pointer";

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function CouponsPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const role = await getUserRole(firebaseUser);
        setAllowed(role === "admin");
      } else {
        setAllowed(false);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/coupons", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load coupons");
      const data = await res.json();
      setCoupons(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading coupons");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && allowed) fetchCoupons();
  }, [authLoading, allowed, fetchCoupons]);

  const handleCodeChange = (v: string) => {
    setForm((f) => ({ ...f, code: v.toUpperCase() }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: form.code.trim(),
          description: form.description.trim() || undefined,
          type: form.type,
          value: Number(form.value) || 0,
          minOrder: form.minOrder ? Number(form.minOrder) : undefined,
          maxUses: form.maxUses ? Number(form.maxUses) : undefined,
          validUntil: form.validUntil.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create coupon");
      setForm(EMPTY_FORM);
      setShowNewForm(false);
      await fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: Coupon) => {
    setEditingId(c.id);
    setEditForm({
      code: c.code,
      description: c.description ?? "",
      type: c.type,
      value: c.value,
      minOrder: c.minOrder ?? "",
      maxUses: c.maxUses ?? "",
      validUntil: c.validUntil ?? "",
    });
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: String(editForm.code).trim().toUpperCase(),
          description: editForm.description ? String(editForm.description).trim() : undefined,
          type: editForm.type,
          value: Number(editForm.value) ?? 0,
          minOrder: editForm.minOrder ? Number(editForm.minOrder) : undefined,
          maxUses: editForm.maxUses ? Number(editForm.maxUses) : undefined,
          validUntil: editForm.validUntil ? String(editForm.validUntil).trim() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setEditingId(null);
      await fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/coupons/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !c.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update");
      await fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Coupon) => {
    if (c.usedCount > 0) return;
    if (!confirm("Delete this coupon permanently?")) return;
    setDeletingId(c.id);
    setError(null);
    try {
      const res = await fetch(`/api/coupons/${c.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      await fetchCoupons();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-12 h-12 text-stone mb-4" />
        <h2 className="font-display text-xl text-dark mb-2">Access restricted</h2>
        <p className="text-muted text-sm">
          You need MASTER or ADMIN role to manage coupons.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-terracotta/10 rounded-lg">
            <Tag className="w-6 h-6 text-terracotta" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-dark">Coupons</h1>
            <p className="text-muted text-sm">
              Manage discount codes and promotions
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowNewForm((v) => !v);
            setForm(EMPTY_FORM);
            setError(null);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-terracotta text-cream rounded-lg text-sm font-medium hover:bg-terracotta/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Coupon
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New Coupon inline form */}
      {showNewForm && (
        <div className="bg-warm border border-stone/30 rounded-lg p-5">
          <h3 className="font-display text-lg text-dark mb-4">Create coupon</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Code</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="SUMMER20"
                className={inputStyles}
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">Description (optional)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Summer promotion"
                className={inputStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CouponType }))}
                className={selectStyles}
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Value</label>
              <input
                type="number"
                min={0}
                step={form.type === "PERCENTAGE" ? 1 : 0.01}
                value={form.value || ""}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder={form.type === "PERCENTAGE" ? "10" : "5.00"}
                className={inputStyles}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Min Order (optional)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={form.minOrder}
                onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))}
                placeholder="0"
                className={inputStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Max Uses (optional)</label>
              <input
                type="number"
                min={0}
                value={form.maxUses}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
                placeholder="Unlimited"
                className={inputStyles}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Valid Until (optional)</label>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                className={inputStyles}
              />
            </div>
            <div className="flex items-end gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={saving || !form.code.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-terracotta text-cream rounded-lg text-sm font-medium hover:bg-terracotta/90 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewForm(false);
                  setForm(EMPTY_FORM);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-stone/40 text-muted rounded-lg text-sm font-medium hover:bg-stone/10 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-warm border border-stone/30 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12 text-muted">
            <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No coupons yet</p>
            <p className="text-sm mt-1">Click &quot;New Coupon&quot; to create one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-stone/20 border-b border-stone/30">
                  <th className="text-left px-4 py-3 font-medium text-dark">Code</th>
                  <th className="text-left px-4 py-3 font-medium text-dark">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-dark">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-dark">Min Order</th>
                  <th className="text-left px-4 py-3 font-medium text-dark">Max Uses</th>
                  <th className="text-left px-4 py-3 font-medium text-dark">Used</th>
                  <th className="text-left px-4 py-3 font-medium text-dark">Valid Until</th>
                  <th className="text-left px-4 py-3 font-medium text-dark">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-dark">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-t border-stone/20 ${
                      i % 2 === 0 ? "bg-warm" : "bg-cream"
                    }`}
                  >
                    {editingId === c.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editForm.code}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
                            }
                            className={`${inputStyles} max-w-[100px]`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={editForm.type}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, type: e.target.value }))
                            }
                            className={`${selectStyles} max-w-[110px]`}
                          >
                            <option value="PERCENTAGE">Percentage</option>
                            <option value="FIXED">Fixed</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            value={editForm.value}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, value: e.target.value }))
                            }
                            className={`${inputStyles} max-w-[80px]`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            value={editForm.minOrder}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, minOrder: e.target.value }))
                            }
                            className={`${inputStyles} max-w-[80px]`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min={0}
                            value={editForm.maxUses}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, maxUses: e.target.value }))
                            }
                            className={`${inputStyles} max-w-[80px]`}
                          />
                        </td>
                        <td className="px-4 py-3 text-muted">{c.usedCount}</td>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={editForm.validUntil}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, validUntil: e.target.value }))
                            }
                            className={`${inputStyles} max-w-[140px]`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              c.isActive ? "bg-olive/20 text-olive" : "bg-stone/30 text-muted"
                            }`}
                          >
                            {c.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(c.id)}
                              disabled={saving}
                              className="p-1.5 rounded text-olive hover:bg-olive/20 transition-colors disabled:opacity-50"
                              title="Save"
                            >
                              {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1.5 rounded text-muted hover:bg-stone/20 transition-colors"
                              title="Cancel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-dark">{c.code}</td>
                        <td className="px-4 py-3 text-muted">{c.type}</td>
                        <td className="px-4 py-3 text-dark">
                          {c.type === "PERCENTAGE" ? `${c.value}%` : `$${c.value}`}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {c.minOrder != null ? `$${c.minOrder}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {c.maxUses != null ? c.maxUses : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted">{c.usedCount}</td>
                        <td className="px-4 py-3 text-muted">{formatDate(c.validUntil)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                              c.isActive ? "bg-olive/20 text-olive" : "bg-stone/30 text-muted"
                            }`}
                          >
                            {c.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleEdit(c)}
                              className="p-1.5 rounded text-terracotta hover:bg-terracotta/20 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleActive(c)}
                              disabled={saving}
                              className="p-1.5 rounded text-dark hover:bg-stone/20 transition-colors disabled:opacity-50"
                              title={c.isActive ? "Deactivate" : "Activate"}
                            >
                              {c.isActive ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c)}
                              disabled={c.usedCount > 0 || deletingId === c.id}
                              className="p-1.5 rounded text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={c.usedCount > 0 ? "Cannot delete used coupon" : "Delete"}
                            >
                              {deletingId === c.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
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
    </div>
  );
}
