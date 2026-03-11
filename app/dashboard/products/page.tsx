"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Plus, Trash2, Edit2, Eye, EyeOff, Star, Leaf, Image as ImageIcon,
  Save, X, ChevronDown, ChevronUp, Search, Loader2, Upload,
} from "lucide-react";

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
  const [filterCat, setFilterCat] = useState("");
  const [filterSub, setFilterSub] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const isAdmin = session?.user?.role && ["MASTER", "ADMIN"].includes(session.user.role);

  const [form, setForm] = useState({
    name: "", category: "Box Lunch", subcategory: "Sandwiches",
    description: "", shortDescription: "", ingredients: [] as string[],
    calories: 0, allergens: [] as string[], isPopular: false,
    isVegetarian: false, imagePlaceholder: "#C9A07A", imageUrl: "",
    reviewText: "", reviewAuthor: "", reviewRating: 5,
  });
  const [ingredientInput, setIngredientInput] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/products?all=true");
      if (res.ok) setProducts(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!isAdmin) {
    return <div className="p-8 text-muted">Access denied. Requires MASTER or ADMIN role.</div>;
  }

  const filtered = products.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && p.category !== filterCat) return false;
    if (filterSub && p.subcategory !== filterSub) return false;
    return true;
  });

  const resetForm = () => {
    setForm({ name: "", category: "Box Lunch", subcategory: "Sandwiches", description: "", shortDescription: "", ingredients: [], calories: 0, allergens: [], isPopular: false, isVegetarian: false, imagePlaceholder: "#C9A07A", imageUrl: "", reviewText: "", reviewAuthor: "", reviewRating: 5 });
    setIngredientInput("");
    setEditId(null);
    setShowNew(false);
  };

  const startEdit = (p: Product) => {
    setForm({
      name: p.name, category: p.category, subcategory: p.subcategory,
      description: p.description, shortDescription: p.shortDescription,
      ingredients: parseJson(p.ingredients), calories: p.calories,
      allergens: parseJson(p.allergens), isPopular: p.isPopular,
      isVegetarian: p.isVegetarian, imagePlaceholder: p.imagePlaceholder,
      imageUrl: p.imageUrl || "", reviewText: p.reviewText || "",
      reviewAuthor: p.reviewAuthor || "", reviewRating: p.reviewRating,
    });
    setEditId(p.id);
    setShowNew(true);
  };

  const addIngredient = () => {
    if (!ingredientInput.trim()) return;
    setForm((p) => ({ ...p, ingredients: [...p.ingredients, ingredientInput.trim()] }));
    setIngredientInput("");
  };

  const toggleAllergen = (a: string) => {
    setForm((p) => ({
      ...p,
      allergens: p.allergens.includes(a) ? p.allergens.filter((x) => x !== a) : [...p.allergens, a],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const url = editId ? `/api/products/${editId}` : "/api/products";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Error saving");
      setMsg({ type: "ok", text: editId ? "Product updated" : "Product created" });
      resetForm();
      load();
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Error" });
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (p: Product) => {
    await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !p.isAvailable }),
    });
    load();
  };

  const togglePopular = async (p: Product) => {
    await fetch(`/api/products/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPopular: !p.isPopular }),
    });
    load();
  };

  const deleteProduct = async (p: Product) => {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await fetch(`/api/products/${p.id}`, { method: "DELETE" });
    load();
  };

  const uploadImage = async (productId: string, file: File) => {
    setUploadingId(productId);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch(`/api/products/${productId}/image`, { method: "POST", body: fd });
      if (res.ok) {
        setMsg({ type: "ok", text: "Image uploaded" });
        load();
      } else {
        setMsg({ type: "err", text: "Failed to upload image" });
      }
    } catch {
      setMsg({ type: "err", text: "Upload error" });
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
        <h1 className="font-display text-2xl text-dark">Products</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{products.length} items</span>
          {!showNew && (
            <button onClick={() => { resetForm(); setShowNew(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-terracotta text-cream rounded-lg hover:bg-terracotta/90 text-sm">
              <Plus className="w-4 h-4" /> New Product
            </button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${msg.type === "ok" ? "bg-olive/15 text-olive" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Create / Edit Form */}
      {showNew && (
        <div className="bg-warm border border-stone/30 rounded-lg p-5 mb-6 space-y-4">
          <h3 className="font-display text-lg text-dark">{editId ? "Edit Product" : "New Product"}</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted uppercase tracking-wider">Name *</label>
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Calories</label>
              <input type="number" value={form.calories} onChange={(e) => setForm((p) => ({ ...p, calories: parseInt(e.target.value) || 0 }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Category *</label>
              <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Subcategory *</label>
              <select value={form.subcategory} onChange={(e) => setForm((p) => ({ ...p, subcategory: e.target.value }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none">
                {SUBCATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Placeholder Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.imagePlaceholder} onChange={(e) => setForm((p) => ({ ...p, imagePlaceholder: e.target.value }))}
                  className="w-10 h-10 rounded border border-stone/40 cursor-pointer" />
                <span className="text-xs text-muted font-mono">{form.imagePlaceholder}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted uppercase tracking-wider">Description</label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm min-h-[60px] focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider">Short Description</label>
            <input value={form.shortDescription} onChange={(e) => setForm((p) => ({ ...p, shortDescription: e.target.value }))}
              className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
          </div>

          {/* Ingredients */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wider">Ingredients</label>
            <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
              {form.ingredients.map((ing, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-cream border border-stone/30 rounded text-xs">
                  {ing}
                  <button type="button" onClick={() => setForm((p) => ({ ...p, ingredients: p.ingredients.filter((_, j) => j !== i) }))}
                    className="text-muted hover:text-red-600"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={ingredientInput} onChange={(e) => setIngredientInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addIngredient(); } }}
                placeholder="Type and press Enter" className="flex-1 bg-cream border border-stone/40 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-terracotta/30" />
              <button type="button" onClick={addIngredient} className="px-3 py-1.5 bg-stone/20 rounded text-sm text-dark hover:bg-stone/30">Add</button>
            </div>
          </div>

          {/* Allergens */}
          <div>
            <label className="text-xs text-muted uppercase tracking-wider">Allergens</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ALLERGEN_OPTIONS.map((a) => (
                <label key={a} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form.allergens.includes(a)} onChange={() => toggleAllergen(a)}
                    className="w-3.5 h-3.5 rounded border-stone/40 text-terracotta focus:ring-terracotta/30" />
                  <span className="text-xs text-dark capitalize">{a}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isPopular} onChange={(e) => setForm((p) => ({ ...p, isPopular: e.target.checked }))}
                className="w-4 h-4 rounded border-stone/40 text-terracotta focus:ring-terracotta/30" />
              <span className="text-sm text-dark">Popular</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isVegetarian} onChange={(e) => setForm((p) => ({ ...p, isVegetarian: e.target.checked }))}
                className="w-4 h-4 rounded border-stone/40 text-olive focus:ring-olive/30" />
              <span className="text-sm text-dark">Vegetarian</span>
            </label>
          </div>

          {/* Review */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted uppercase tracking-wider">Review Text</label>
              <input value={form.reviewText} onChange={(e) => setForm((p) => ({ ...p, reviewText: e.target.value }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
            </div>
            <div>
              <label className="text-xs text-muted uppercase tracking-wider">Review Author</label>
              <input value={form.reviewAuthor} onChange={(e) => setForm((p) => ({ ...p, reviewAuthor: e.target.value }))}
                className="w-full mt-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-dark text-cream rounded-lg hover:bg-dark/90 text-sm disabled:opacity-50">
              <Save className="w-4 h-4" /> {saving ? "Saving..." : editId ? "Update Product" : "Create Product"}
            </button>
            <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 text-muted hover:text-dark text-sm">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full bg-cream border border-stone/40 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterSub} onChange={(e) => setFilterSub(e.target.value)}
          className="bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm focus:outline-none">
          <option value="">All Types</option>
          {SUBCATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Product list */}
      {loading ? (
        <div className="flex items-center gap-2 text-muted py-8"><Loader2 className="w-5 h-5 animate-spin" /> Loading products...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No products found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className={`bg-white border rounded-lg overflow-hidden transition-all ${!p.isAvailable ? "border-red-200 opacity-60" : "border-stone/30"}`}>
              <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-warm/30" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-white/80 font-medium" style={{ backgroundColor: p.imagePlaceholder }}>
                      {p.name.substring(0, 2)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-dark truncate">{p.name}</h3>
                    {p.isPopular && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    {p.isVegetarian && <Leaf className="w-3.5 h-3.5 text-olive flex-shrink-0" />}
                    {!p.isAvailable && <EyeOff className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted truncate">{p.category} · {p.subcategory} · {p.calories} cal</p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); toggleAvailability(p); }}
                    className={`p-1.5 rounded ${p.isAvailable ? "text-olive hover:bg-olive/10" : "text-red-400 hover:bg-red-50"}`}
                    title={p.isAvailable ? "Disable" : "Enable"}>
                    {p.isAvailable ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); togglePopular(p); }}
                    className={`p-1.5 rounded ${p.isPopular ? "text-amber-500 hover:bg-amber-50" : "text-muted hover:bg-stone/10"}`}
                    title="Toggle popular">
                    <Star className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); startEdit(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="p-1.5 text-muted hover:text-dark rounded hover:bg-stone/10" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteProduct(p); }}
                    className="p-1.5 text-muted hover:text-red-600 rounded hover:bg-red-50" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedId === p.id ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                </div>
              </div>

              {/* Expanded details */}
              {expandedId === p.id && (
                <div className="border-t border-stone/20 p-4 bg-warm/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted uppercase">Description</p>
                      <p className="text-sm text-dark">{p.description || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted uppercase">Short Description</p>
                      <p className="text-sm text-dark">{p.shortDescription || "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted uppercase">Ingredients</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parseJson(p.ingredients).map((ing, i) => (
                          <span key={i} className="px-2 py-0.5 bg-cream border border-stone/30 rounded text-xs">{ing}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted uppercase">Allergens</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parseJson(p.allergens).length > 0
                          ? parseJson(p.allergens).map((a, i) => (
                              <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded text-xs capitalize">{a}</span>
                            ))
                          : <span className="text-xs text-muted">None</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted uppercase">Review</p>
                      {p.reviewText ? (
                        <p className="text-sm text-dark italic">&ldquo;{p.reviewText}&rdquo; — {p.reviewAuthor}</p>
                      ) : (
                        <p className="text-xs text-muted">No review</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted uppercase mb-2">Image</p>
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt={p.name} className="w-24 h-24 rounded-lg object-cover" />
                        ) : (
                          <div className="w-24 h-24 rounded-lg flex items-center justify-center text-white/80 text-sm" style={{ backgroundColor: p.imagePlaceholder }}>
                            No image
                          </div>
                        )}
                        <div>
                          <input ref={fileRef} type="file" accept="image/*" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(p.id, f); }} />
                          <button onClick={() => fileRef.current?.click()} disabled={uploadingId === p.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-dark text-cream rounded text-xs hover:bg-dark/90 disabled:opacity-50">
                            {uploadingId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            {uploadingId === p.id ? "Uploading..." : "Upload Image"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted">Slug: {p.slug} · Sort: {p.sortOrder}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
