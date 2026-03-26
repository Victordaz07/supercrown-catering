"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Plus, Trash2, Edit2, Eye, EyeOff, Star, Leaf, Image as ImageIcon,
  Save, X, Search, Loader2, Upload, ChevronRight, Package,
} from "lucide-react";
import {
  compressProductImageForUpload,
  INLINE_UPLOAD_TARGET_BYTES,
} from "@/lib/compress-product-image";

type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  shortDescription: string;
  ingredients: string;
  calories: number;
  allergens: string;
  isPopular: boolean;
  isVegetarian: boolean;
  isAvailable: boolean;
  imagePlaceholder: string;
  imageUrl: string | null;
  sortOrder: number;
  reviewText: string | null;
  reviewAuthor: string | null;
  reviewRating: number;
};

const CATEGORIES = ["Box Lunch", "Grab-N-Go"];
const SUBCATEGORIES = ["Sandwiches", "Snacks", "Salads"];
const ALLERGEN_OPTIONS = ["gluten", "dairy", "egg", "fish", "peanuts", "tree nuts", "soy", "shellfish"];

function parseJson(str: string): string[] {
  try { return JSON.parse(str); } catch { return []; }
}

export default function ProductsPage() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const panelImageRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.user?.role && ["MASTER", "ADMIN"].includes(session.user.role);

  const [form, setForm] = useState({
    name: "", category: "Box Lunch", subcategory: "Sandwiches",
    description: "", shortDescription: "", ingredients: [] as string[],
    calories: 0, allergens: [] as string[], isPopular: false,
    isVegetarian: false, imagePlaceholder: "#C9A07A", imageUrl: "",
    reviewText: "", reviewAuthor: "", reviewRating: 5,
  });
  const [ingredientInput, setIngredientInput] = useState("");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);

  const clearPendingImage = useCallback(() => {
    setPendingImageFile(null);
    setPendingImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (panelImageRef.current) panelImageRef.current.value = "";
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/products?all=true");
      if (res.ok) setProducts(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (msg) {
      const t = setTimeout(() => setMsg(null), 3000);
      return () => clearTimeout(t);
    }
  }, [msg]);

  if (!isAdmin) {
    return <div className="p-8 text-muted">Access denied. Requires MASTER or ADMIN role.</div>;
  }

  const searched = search
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.subcategory.toLowerCase().includes(search.toLowerCase()))
    : products;

  const catFiltered = activeTab === "all" ? searched : searched.filter((p) => p.category === activeTab);

  const grouped: Record<string, Product[]> = {};
  for (const p of catFiltered) {
    const key = `${p.category} — ${p.subcategory}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  }

  const groupKeys = Object.keys(grouped).sort();

  const openPanel = (product: Product | null) => {
    clearPendingImage();
    if (product) {
      setForm({
        name: product.name, category: product.category, subcategory: product.subcategory,
        description: product.description, shortDescription: product.shortDescription,
        ingredients: parseJson(product.ingredients), calories: product.calories,
        allergens: parseJson(product.allergens), isPopular: product.isPopular,
        isVegetarian: product.isVegetarian, imagePlaceholder: product.imagePlaceholder,
        // Never put imageUrl (can be a huge data: URL) into form — it would blow PATCH JSON and cause 413 on Vercel.
        imageUrl: "",
        reviewText: product.reviewText || "",
        reviewAuthor: product.reviewAuthor || "", reviewRating: product.reviewRating,
      });
      setEditProduct(product);
      setIsNew(false);
    } else {
      setForm({
        name: "", category: activeTab !== "all" ? activeTab : "Box Lunch", subcategory: "Sandwiches",
        description: "", shortDescription: "", ingredients: [], calories: 0,
        allergens: [], isPopular: false, isVegetarian: false,
        imagePlaceholder: "#C9A07A", imageUrl: "", reviewText: "", reviewAuthor: "", reviewRating: 5,
      });
      setEditProduct(null);
      setIsNew(true);
    }
    setIngredientInput("");
    setShowPanel(true);
    setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const closePanel = () => {
    setShowPanel(false);
    setEditProduct(null);
    setIsNew(false);
    clearPendingImage();
  };

  const addIngredient = () => {
    if (!ingredientInput.trim()) return;
    setForm((p) => ({ ...p, ingredients: [...p.ingredients, ingredientInput.trim()] }));
    setIngredientInput("");
  };

  const toggleAllergen = (a: string) => {
    setForm((p) => ({
      ...p, allergens: p.allergens.includes(a) ? p.allergens.filter((x) => x !== a) : [...p.allergens, a],
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setMsg({ type: "err", text: "Name is required" }); return; }
    setSaving(true);
    setMsg(null);
    try {
      const url = editProduct ? `/api/products/${editProduct.id}` : "/api/products";
      const method = editProduct ? "PATCH" : "POST";
      // Omit imageUrl: large data URLs must not be sent here (Vercel body limit → 413). Images use POST /api/products/:id/image.
      const { imageUrl: _omitImageUrl, ...savePayload } = form;
      void _omitImageUrl;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savePayload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error saving");

      const saved: Product | null = await res.json().catch(() => null);

      if (pendingImageFile) {
        const productId = editProduct?.id ?? saved?.id;
        if (productId) {
          const imageOk = await uploadImage(productId, pendingImageFile);
          if (!imageOk) {
            load();
            return;
          }
        }
      }

      setMsg({ type: "ok", text: editProduct ? "Product updated" : "Product created" });
      closePanel();
      load();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (p: Product) => {
    await fetch(`/api/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isAvailable: !p.isAvailable }) });
    load();
  };

  const togglePopular = async (p: Product) => {
    await fetch(`/api/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPopular: !p.isPopular }) });
    load();
  };

  const deleteProduct = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    load();
  };

  /** Vercel serverless request body limit is ~4.5MB; stay under it. */
  const MAX_IMAGE_UPLOAD_BYTES = 4 * 1024 * 1024;

  const uploadImage = async (productId: string, file: File): Promise<boolean> => {
    setUploadingId(productId);
    try {
      let toUpload = file;
      if (file.size > INLINE_UPLOAD_TARGET_BYTES) {
        try {
          toUpload = await compressProductImageForUpload(file);
        } catch (e) {
          setMsg({
            type: "err",
            text: e instanceof Error ? e.message : "Error al optimizar la imagen",
          });
          return false;
        }
      }
      if (toUpload.size > MAX_IMAGE_UPLOAD_BYTES) {
        setMsg({
          type: "err",
          text: "La imagen supera 4 MB incluso tras optimizar. Prueba con otra foto.",
        });
        return false;
      }
      const fd = new FormData();
      fd.append("image", toUpload);
      const res = await fetch(`/api/products/${productId}/image`, { method: "POST", body: fd });
      if (res.ok) {
        setMsg({ type: "ok", text: "Image uploaded" });
        clearPendingImage();
        load();
        return true;
      }
      let detail = "No se pudo subir la imagen";
      try {
        const j = (await res.json()) as { error?: string };
        if (j.error) detail = j.error;
      } catch {
        /* ignore */
      }
      setMsg({ type: "err", text: detail });
      return false;
    } catch {
      setMsg({ type: "err", text: "Error de red al subir la imagen" });
      return false;
    } finally {
      setUploadingId(null);
    }
  };

  const removeImage = async (productId: string) => {
    setUploadingId(productId);
    try {
      const res = await fetch(`/api/products/${productId}/image`, { method: "DELETE" });
      if (res.ok) { setMsg({ type: "ok", text: "Image removed" }); load(); }
      else setMsg({ type: "err", text: "Failed to remove image" });
    } catch {
      setMsg({ type: "err", text: "Remove error" });
    } finally {
      setUploadingId(null);
    }
  };

  const availCount = products.filter((p) => p.isAvailable).length;
  const unavailCount = products.length - availCount;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2C2C2C]">Menu Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            {products.length} products &middot; {availCount} active &middot; {unavailCount} disabled
          </p>
        </div>
        <button
          onClick={() => openPanel(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#C17C4E] text-white rounded-lg hover:bg-[#a96a40] text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Product
        </button>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium transition-all ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Search & Category Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C17C4E]/30 focus:border-[#C17C4E] shadow-sm"
          />
        </div>
        <div className="flex rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
          {[
            { key: "all", label: "All" },
            { key: "Box Lunch", label: "Box Lunch" },
            { key: "Grab-N-Go", label: "Grab-N-Go" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-[#556B2F] text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-70">
                ({tab.key === "all" ? searched.length : searched.filter((p) => p.category === tab.key).length})
              </span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 py-16 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading products...
        </div>
      ) : groupKeys.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No products found</p>
          {search && <p className="text-sm text-gray-400 mt-1">Try a different search term</p>}
        </div>
      ) : (
        <div className="space-y-8">
          {groupKeys.map((key) => {
            const [cat, sub] = key.split(" — ");
            const items = grouped[key];
            return (
              <section key={key}>
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-1 h-8 rounded-full ${cat === "Box Lunch" ? "bg-[#C17C4E]" : "bg-[#556B2F]"}`} />
                  <div>
                    <h2 className="text-lg font-semibold text-[#2C2C2C]">{sub}</h2>
                    <p className="text-xs text-gray-400">{cat} &middot; {items.length} items</p>
                  </div>
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((p) => (
                    <div
                      key={p.id}
                      className={`group bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all ${
                        !p.isAvailable ? "border-red-200 opacity-70" : "border-gray-200"
                      }`}
                    >
                      {/* Image */}
                      <div className="relative aspect-[4/3] overflow-hidden">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{ backgroundColor: p.imagePlaceholder }}
                          >
                            <ImageIcon className="w-8 h-8 text-white/40" />
                          </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          {p.isPopular && (
                            <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5" /> Popular
                            </span>
                          )}
                          {p.isVegetarian && (
                            <span className="bg-[#556B2F] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              <Leaf className="w-2.5 h-2.5" /> Veg
                            </span>
                          )}
                        </div>

                        {!p.isAvailable && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">DISABLED</span>
                          </div>
                        )}

                        {/* Quick Image Upload */}
                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <input ref={editProduct?.id === p.id ? fileRef : undefined} type="file" accept="image/*" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(p.id, f); }} />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditProduct(p);
                              setTimeout(() => fileRef.current?.click(), 50);
                            }}
                            disabled={uploadingId === p.id}
                            className="bg-black/60 text-white p-1.5 rounded-lg hover:bg-black/80 transition-colors"
                          >
                            {uploadingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-3">
                        <h3 className="font-semibold text-sm text-[#2C2C2C] truncate">{p.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{p.shortDescription || p.description}</p>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {parseJson(p.allergens).map((a, i) => (
                            <span key={i} className="text-[9px] uppercase tracking-wide bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded">{a}</span>
                          ))}
                          <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{p.calories} cal</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                          <div className="flex gap-0.5">
                            <button
                              onClick={() => toggleAvailability(p)}
                              className={`p-1.5 rounded-lg transition-colors ${p.isAvailable ? "text-green-600 hover:bg-green-50" : "text-red-400 hover:bg-red-50"}`}
                              title={p.isAvailable ? "Disable" : "Enable"}
                            >
                              {p.isAvailable ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => togglePopular(p)}
                              className={`p-1.5 rounded-lg transition-colors ${p.isPopular ? "text-amber-500 hover:bg-amber-50" : "text-gray-300 hover:bg-gray-50"}`}
                              title="Toggle popular"
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex gap-0.5">
                            <button
                              onClick={() => openPanel(p)}
                              className="p-1.5 text-gray-400 hover:text-[#2C2C2C] rounded-lg hover:bg-gray-50 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteProduct(p)}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add product card for this category */}
                  <button
                    onClick={() => {
                      setForm((prev) => ({ ...prev, category: cat, subcategory: sub }));
                      openPanel(null);
                    }}
                    className="border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 min-h-[200px] hover:border-[#C17C4E] hover:bg-[#C17C4E]/5 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-[#C17C4E]/10 flex items-center justify-center transition-colors">
                      <Plus className="w-5 h-5 text-gray-400 group-hover:text-[#C17C4E]" />
                    </div>
                    <span className="text-sm text-gray-400 group-hover:text-[#C17C4E]">Add to {sub}</span>
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Edit/Create Panel — Slide-in from right */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={closePanel} />
          <div ref={panelRef} className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-in">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className={`w-1.5 h-8 rounded-full ${isNew ? "bg-[#C17C4E]" : "bg-[#556B2F]"}`} />
                <div>
                  <h2 className="font-semibold text-[#2C2C2C]">{isNew ? "New Product" : "Edit Product"}</h2>
                  {editProduct && <p className="text-xs text-gray-400">{editProduct.slug}</p>}
                </div>
              </div>
              <button onClick={closePanel} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Image */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                  {pendingImagePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pendingImagePreview} alt="" className="w-full h-full object-cover" />
                  ) : editProduct?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={editProduct.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ backgroundColor: editProduct?.imagePlaceholder ?? form.imagePlaceholder }}
                    >
                      <ImageIcon className="w-6 h-6 text-white/40" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={panelImageRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      setPendingImageFile(f);
                      setPendingImagePreview((prev) => {
                        if (prev) URL.revokeObjectURL(prev);
                        return URL.createObjectURL(f);
                      });
                    }}
                  />
                  <button
                    onClick={() => panelImageRef.current?.click()}
                    disabled={!!(editProduct && uploadingId === editProduct.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2C2C2C] text-white rounded-lg text-xs hover:bg-[#2C2C2C]/80 disabled:opacity-50"
                  >
                    {editProduct && uploadingId === editProduct.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Upload className="w-3 h-3" />
                    )}
                    {pendingImageFile ? "Change Image" : "Select Image"}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (pendingImageFile || pendingImagePreview) {
                        clearPendingImage();
                        return;
                      }
                      if (editProduct?.id && editProduct.imageUrl) {
                        await removeImage(editProduct.id);
                      }
                    }}
                    disabled={!!(editProduct && uploadingId === editProduct.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs hover:bg-gray-200 disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                    {pendingImageFile || pendingImagePreview
                      ? "Clear selection"
                      : editProduct?.imageUrl
                        ? "Remove image"
                        : "No image"}
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C17C4E]/30 focus:border-[#C17C4E]"
                  placeholder="Product name"
                />
              </div>

              {/* Category & Subcategory */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C17C4E]/30"
                  >
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Subcategory</label>
                  <select
                    value={form.subcategory}
                    onChange={(e) => setForm((p) => ({ ...p, subcategory: e.target.value }))}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C17C4E]/30"
                  >
                    {SUBCATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[#C17C4E]/30"
                  placeholder="Full description..."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Short Description</label>
                <input
                  value={form.shortDescription}
                  onChange={(e) => setForm((p) => ({ ...p, shortDescription: e.target.value }))}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C17C4E]/30"
                  placeholder="Brief tagline"
                />
              </div>

              {/* Calories & Color */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Calories</label>
                  <input
                    type="number"
                    value={form.calories}
                    onChange={(e) => setForm((p) => ({ ...p, calories: parseInt(e.target.value) || 0 }))}
                    className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C17C4E]/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Placeholder Color</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={form.imagePlaceholder}
                      onChange={(e) => setForm((p) => ({ ...p, imagePlaceholder: e.target.value }))}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                    />
                    <span className="text-xs text-gray-400 font-mono">{form.imagePlaceholder}</span>
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Ingredients</label>
                <div className="flex flex-wrap gap-1.5 mt-2 mb-2 min-h-[28px]">
                  {form.ingredients.map((ing, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#556B2F]/10 text-[#556B2F] rounded-full text-xs font-medium">
                      {ing}
                      <button onClick={() => setForm((p) => ({ ...p, ingredients: p.ingredients.filter((_, j) => j !== i) }))}
                        className="hover:text-red-600 ml-0.5"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={ingredientInput}
                    onChange={(e) => setIngredientInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIngredient(); } }}
                    placeholder="Type ingredient, press Enter"
                    className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C17C4E]/30"
                  />
                  <button onClick={addIngredient} className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200">Add</button>
                </div>
              </div>

              {/* Allergens */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Allergens</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ALLERGEN_OPTIONS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAllergen(a)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        form.allergens.includes(a)
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-gray-50 text-gray-400 border border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPopular}
                    onChange={(e) => setForm((p) => ({ ...p, isPopular: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                  />
                  <span className="text-sm text-[#2C2C2C] flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500" /> Popular</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isVegetarian}
                    onChange={(e) => setForm((p) => ({ ...p, isVegetarian: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-[#556B2F] focus:ring-[#556B2F]"
                  />
                  <span className="text-sm text-[#2C2C2C] flex items-center gap-1"><Leaf className="w-3.5 h-3.5 text-[#556B2F]" /> Vegetarian</span>
                </label>
              </div>

              {/* Review */}
              <details className="group">
                <summary className="text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer flex items-center gap-1">
                  <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform" />
                  Customer Review (optional)
                </summary>
                <div className="mt-3 space-y-3">
                  <input
                    value={form.reviewText}
                    onChange={(e) => setForm((p) => ({ ...p, reviewText: e.target.value }))}
                    placeholder="Review text..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#C17C4E]/30"
                  />
                  <input
                    value={form.reviewAuthor}
                    onChange={(e) => setForm((p) => ({ ...p, reviewAuthor: e.target.value }))}
                    placeholder="Author name"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#C17C4E]/30"
                  />
                </div>
              </details>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2C2C2C] text-white rounded-lg hover:bg-[#2C2C2C]/90 text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : isNew ? "Create Product" : "Update Product"}
              </button>
              <button
                onClick={closePanel}
                className="px-4 py-2.5 text-gray-500 hover:text-[#2C2C2C] text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-in animation */}
      <style jsx global>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
