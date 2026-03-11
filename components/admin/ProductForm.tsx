"use client";

import { useState, useRef } from "react";
import { Loader2, Upload, X } from "lucide-react";
import type { Product, ProductReview } from "@/lib/product-types";

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const CATEGORIES = ["Box Lunch", "Grab-N-Go"];
const SUBCATEGORIES = ["Sandwiches", "Snacks", "Salads"];
const ALLERGENS = ["gluten", "dairy", "fish", "egg", "tree nuts", "peanuts"];

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const isEdit = !!product;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: product?.category ?? "Box Lunch",
    subcategory: product?.subcategory ?? "Sandwiches",
    description: product?.description ?? "",
    shortDescription: product?.shortDescription ?? "",
    ingredients: product?.ingredients?.join(", ") ?? "",
    calories: product?.calories ?? 0,
    allergens: product?.allergens ?? [],
    isPopular: product?.isPopular ?? false,
    isVegetarian: product?.isVegetarian ?? false,
    imagePlaceholder: product?.imagePlaceholder ?? "#C9A07A",
    isAvailable: product?.isAvailable ?? true,
    reviewText: product?.review?.text ?? "",
    reviewAuthor: product?.review?.author ?? "",
    reviewRating: product?.review?.rating ?? 5,
  });

  const toggleAllergen = (a: string) => {
    setForm((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(a)
        ? prev.allergens.filter((x) => x !== a)
        : [...prev.allergens, a],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        subcategory: form.subcategory,
        description: form.description,
        shortDescription: form.shortDescription || form.name,
        ingredients: form.ingredients.split(",").map((s) => s.trim()).filter(Boolean),
        calories: Number(form.calories) || 0,
        allergens: form.allergens,
        isPopular: form.isPopular,
        isVegetarian: form.isVegetarian,
        imagePlaceholder: form.imagePlaceholder,
        isAvailable: form.isAvailable,
        review: {
          text: form.reviewText,
          author: form.reviewAuthor,
          rating: Math.min(5, Math.max(1, form.reviewRating)),
        } as ProductReview,
      };

      if (isEdit && product) {
        const res = await fetch(`/api/products/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error updating");
        }
      } else {
        const id = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error creating");
        }
      }
      onSuccess();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/products/${product.id}/upload-image`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Error uploading");
      await res.json();
      alert("Image uploaded successfully");
      onSuccess();
    } catch {
      alert("Error uploading image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-sm font-medium text-dark mb-1">Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
          className="w-full px-4 py-2 border border-stone rounded-lg focus:ring-2 focus:ring-terracotta/50 focus:border-terracotta"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Category</label>
          <select
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            className="w-full px-4 py-2 border border-stone rounded-lg"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-dark mb-1">Subcategory</label>
          <select
            value={form.subcategory}
            onChange={(e) => setForm((p) => ({ ...p, subcategory: e.target.value }))}
            className="w-full px-4 py-2 border border-stone rounded-lg"
          >
            {SUBCATEGORIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-dark mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          rows={3}
          className="w-full px-4 py-2 border border-stone rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-dark mb-1">Short description</label>
        <input
          type="text"
          value={form.shortDescription}
          onChange={(e) => setForm((p) => ({ ...p, shortDescription: e.target.value }))}
          placeholder="For the product card"
          className="w-full px-4 py-2 border border-stone rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-dark mb-1">Ingredients (comma separated)</label>
        <input
          type="text"
          value={form.ingredients}
          onChange={(e) => setForm((p) => ({ ...p, ingredients: e.target.value }))}
          className="w-full px-4 py-2 border border-stone rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-dark mb-1">Calories</label>
        <input
          type="number"
          value={form.calories || ""}
          onChange={(e) => setForm((p) => ({ ...p, calories: Number(e.target.value) || 0 }))}
          min={0}
          className="w-full px-4 py-2 border border-stone rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-dark mb-1">Allergens</label>
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAllergen(a)}
              className={`px-3 py-1 rounded-full text-sm ${
                form.allergens.includes(a)
                  ? "bg-terracotta/30 text-terracotta"
                  : "bg-stone/20 text-muted"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isPopular}
            onChange={(e) => setForm((p) => ({ ...p, isPopular: e.target.checked }))}
            className="rounded border-stone"
          />
          <span className="text-sm">Popular</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isVegetarian}
            onChange={(e) => setForm((p) => ({ ...p, isVegetarian: e.target.checked }))}
            className="rounded border-stone"
          />
          <span className="text-sm">Vegetarian</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isAvailable}
            onChange={(e) => setForm((p) => ({ ...p, isAvailable: e.target.checked }))}
            className="rounded border-stone"
          />
          <span className="text-sm">Available</span>
        </label>
      </div>

      <div className="border-t border-stone/30 pt-6">
        <h3 className="font-display text-lg text-dark mb-3">Featured review</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-muted mb-1">Text</label>
            <textarea
              value={form.reviewText}
              onChange={(e) => setForm((p) => ({ ...p, reviewText: e.target.value }))}
              rows={2}
              className="w-full px-4 py-2 border border-stone rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-muted mb-1">Author</label>
              <input
                type="text"
                value={form.reviewAuthor}
                onChange={(e) => setForm((p) => ({ ...p, reviewAuthor: e.target.value }))}
                placeholder="E.g.: Maria G."
                className="w-full px-4 py-2 border border-stone rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-muted mb-1">Stars (1-5)</label>
              <input
                type="number"
                value={form.reviewRating}
                onChange={(e) => setForm((p) => ({ ...p, reviewRating: Number(e.target.value) || 5 }))}
                min={1}
                max={5}
                className="w-full px-4 py-2 border border-stone rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>

      {isEdit && product && (
        <div id="upload" className="border-t border-stone/30 pt-6">
          <h3 className="font-display text-lg text-dark mb-3">Upload new image</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-stone/20 rounded-lg hover:bg-stone/30 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {uploading ? "Uploading..." : "Select image"}
          </button>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-terracotta text-white rounded-lg font-medium hover:bg-terracotta/90 disabled:opacity-50 flex items-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isEdit ? "Save changes" : "Create product"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2 border border-stone rounded-lg hover:bg-stone/20 transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}
