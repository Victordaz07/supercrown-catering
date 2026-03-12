"use client";

import { useState, useEffect } from "react";

type Prefs = {
  email: boolean;
  statusUpdates: boolean;
  invoices: boolean;
  quotes: boolean;
};

export function NotificationPrefsForm({ initialPrefs }: { initialPrefs: Prefs }) {
  const [prefs, setPrefs] = useState<Prefs>(initialPrefs);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrefs(initialPrefs);
  }, [initialPrefs]);

  const handleChange = async (key: keyof Prefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    if (key === "email" && !value) {
      next.statusUpdates = false;
      next.invoices = false;
      next.quotes = false;
    }
    setPrefs(next);
    setSaving(true);
    try {
      const res = await fetch("/api/client/notification-prefs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.ok) {
        const data = await res.json();
        setPrefs(data);
      }
    } catch {
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  };

  const disabled = !prefs.email;

  return (
    <div className="space-y-4">
      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-dark">Emails activos</span>
        <input
          type="checkbox"
          checked={prefs.email}
          onChange={(e) => handleChange("email", e.target.checked)}
          disabled={saving}
          className="rounded border-stone/40 text-terracotta focus:ring-terracotta"
        />
      </label>
      <p className="text-xs text-muted -mt-2">
        Master toggle. Si está desactivado, no recibirás ningún email.
      </p>

      <label
        className={`flex items-center justify-between gap-4 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="text-dark">Actualizaciones de mi orden</span>
        <input
          type="checkbox"
          checked={prefs.statusUpdates}
          onChange={(e) => handleChange("statusUpdates", e.target.checked)}
          disabled={saving || disabled}
          className="rounded border-stone/40 text-terracotta focus:ring-terracotta"
        />
      </label>

      <label
        className={`flex items-center justify-between gap-4 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="text-dark">Facturas y pagos</span>
        <input
          type="checkbox"
          checked={prefs.invoices}
          onChange={(e) => handleChange("invoices", e.target.checked)}
          disabled={saving || disabled}
          className="rounded border-stone/40 text-terracotta focus:ring-terracotta"
        />
      </label>

      <label
        className={`flex items-center justify-between gap-4 ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="text-dark">Cotizaciones</span>
        <input
          type="checkbox"
          checked={prefs.quotes}
          onChange={(e) => handleChange("quotes", e.target.checked)}
          disabled={saving || disabled}
          className="rounded border-stone/40 text-terracotta focus:ring-terracotta"
        />
      </label>

      {saving && (
        <p className="text-sm text-muted">Guardando…</p>
      )}
    </div>
  );
}
