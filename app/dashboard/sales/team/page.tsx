"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Button } from "@/components/ui/Button";
import { Loader2, Pencil, UserPlus, X } from "lucide-react";

const inputStyles =
  "w-full bg-cream border border-stone rounded-sm px-4 py-2.5 focus:outline-none focus:border-terracotta transition-colors text-sm";

export default function TeamPage() {
  type TeamMember = {
    id: string;
    name?: string;
    email?: string;
    role?: "driver" | "sales" | "admin";
  };
  const [drivers, setDrivers] = useState<TeamMember[]>([]);
  const [sales, setSales] = useState<TeamMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    name: "",
    role: "driver" as "driver" | "sales",
  });
  const [editForm, setEditForm] = useState({
    email: "",
    name: "",
    role: "driver" as "driver" | "sales" | "admin",
  });

  useEffect(() => {
    const unsubDrivers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "driver")),
      (snap) => {
        setDrivers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TeamMember, "id">) })));
      }
    );
    const unsubSales = onSnapshot(
      query(collection(db, "users"), where("role", "==", "sales")),
      (snap) => {
        setSales(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TeamMember, "id">) })));
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
      setSuccess(`${form.role === "driver" ? "Driver" : "Sales"} created and invitation sent: ${form.email}`);
      setForm({ email: "", name: "", role: "driver" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating user");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (member: TeamMember) => {
    setEditing(member);
    setEditForm({
      name: member.name ?? "",
      email: member.email ?? "",
      role: member.role ?? "driver",
    });
    setError(null);
    setSuccess(null);
    setShowEdit(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setUpdating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update member");
      }
      if (data.invitationError) {
        setSuccess(`Member updated. ${data.invitationError}`);
      } else if (data.invitationResent) {
        setSuccess("Member updated and invitation resent to the new email.");
      } else {
        setSuccess("Member updated.");
      }
      setShowEdit(false);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating member");
    } finally {
      setUpdating(false);
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
              Invitation
            </label>
            <div className={`${inputStyles} text-muted`}>
              A setup email will be sent so the member can create their password.
            </div>
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

      {showEdit && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 p-4">
          <form
            onSubmit={handleUpdate}
            className="bg-cream border border-stone/40 rounded-sm p-6 w-full max-w-md space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg text-dark">Edit member</h2>
              <button
                type="button"
                onClick={() => {
                  setShowEdit(false);
                  setEditing(null);
                }}
                className="text-muted hover:text-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-muted text-xs uppercase tracking-wider mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className={inputStyles}
                required
                disabled={updating}
              />
            </div>
            <div>
              <label className="block text-muted text-xs uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                className={inputStyles}
                required
                disabled={updating}
              />
              <p className="mt-1 text-[11px] text-muted">
                If email changes, a new invitation email is sent automatically.
              </p>
            </div>
            <div>
              <label className="block text-muted text-xs uppercase tracking-wider mb-1.5">
                Role
              </label>
              <select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, role: e.target.value as "driver" | "sales" | "admin" }))
                }
                className={inputStyles}
                disabled={updating}
              >
                <option value="driver">Driver</option>
                <option value="sales">Sales</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={updating}>
                {updating ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save changes"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowEdit(false);
                  setEditing(null);
                }}
                disabled={updating}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-warm border border-stone/40 rounded-sm p-4">
          <h2 className="font-display text-lg text-dark mb-3">Sales</h2>
          {sales.length === 0 ? (
            <p className="text-muted text-sm">No sales users.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {sales.map((u) => (
                <li key={u.id} className="text-dark flex items-center justify-between gap-2">
                  <div>
                    <p>{u.name ?? u.email ?? u.id}</p>
                    <p className="text-xs text-muted">{u.email ?? "No email"}</p>
                  </div>
                  <button
                    type="button"
                    className="p-2 hover:bg-cream rounded-sm"
                    onClick={() => openEdit(u)}
                    title="Edit member"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted" />
                  </button>
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
                <li key={u.id} className="text-dark flex items-center justify-between gap-2">
                  <div>
                    <p>{u.name ?? u.email ?? u.id}</p>
                    <p className="text-xs text-muted">{u.email ?? "No email"}</p>
                  </div>
                  <button
                    type="button"
                    className="p-2 hover:bg-cream rounded-sm"
                    onClick={() => openEdit(u)}
                    title="Edit member"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
