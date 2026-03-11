"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { UserPlus } from "lucide-react";

const inputStyles =
  "w-full bg-cream border border-stone rounded-sm px-4 py-2.5 focus:outline-none focus:border-terracotta transition-colors text-sm";

export default function TeamPage() {
  const [drivers, setDrivers] = useState<Array<Record<string, unknown>>>([]);
  const [sales, setSales] = useState<Array<Record<string, unknown>>>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "driver" as "driver" | "sales",
  });

  useEffect(() => {
    const unsubDrivers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "driver")),
      (snap) => {
        setDrivers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    const unsubSales = onSnapshot(
      query(collection(db, "users"), where("role", "==", "sales")),
      (snap) => {
        setSales(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );
    return () => {
      unsubDrivers();
      unsubSales();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }
      setSuccess(`${form.role === "driver" ? "Driver" : "Sales"} created: ${form.email}`);
      setForm({ email: "", password: "", name: "", role: "driver" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-display text-2xl text-dark">Team</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add member
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-warm border border-stone/40 rounded-sm p-6 space-y-4"
        >
          <h2 className="font-display text-lg text-dark">New team member</h2>
          <div>
            <label className="block text-muted text-xs uppercase tracking-wider mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputStyles}
              placeholder="John Doe"
              required
            />
          </div>
          <div>
            <label className="block text-muted text-xs uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputStyles}
              placeholder="juan@ejemplo.com"
              required
            />
          </div>
          <div>
            <label className="block text-muted text-xs uppercase tracking-wider mb-1.5">
              Password (min. 6 characters)
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={inputStyles}
              minLength={6}
              required
            />
          </div>
          <div>
            <label className="block text-muted text-xs uppercase tracking-wider mb-1.5">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as "driver" | "sales" }))
              }
              className={inputStyles}
            >
              <option value="driver">Driver</option>
              <option value="sales">Sales</option>
            </select>
          </div>
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-sm text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 text-green-800 px-4 py-3 rounded-sm text-sm">
              {success}
            </div>
          )}
          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowForm(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-warm border border-stone/40 rounded-sm p-4">
          <h2 className="font-display text-lg text-dark mb-3">Sales</h2>
          {sales.length === 0 ? (
            <p className="text-muted text-sm">No sales users.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {sales.map((u) => (
                <li key={String(u.id)} className="text-dark">
                  {String(u.name ?? u.email ?? u.id)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-warm border border-stone/40 rounded-sm p-4">
          <h2 className="font-display text-lg text-dark mb-3">Drivers</h2>
          {drivers.length === 0 ? (
            <p className="text-muted text-sm">No drivers. Add one with the button above.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {drivers.map((u) => (
                <li key={String(u.id)} className="text-dark">
                  {String(u.name ?? u.email ?? u.id)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
