"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Users,
  Plus,
  Search,
  X,
  Loader2,
  UserCheck,
  UserX,
  Pencil,
} from "lucide-react";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  phone: string | null;
  createdAt: string;
  createdBy?: { name: string } | null;
};

const ROLE_COLORS: Record<string, string> = {
  MASTER: "bg-dark text-cream",
  ADMIN: "bg-olive text-cream",
  SALES: "bg-terracotta text-cream",
  DELIVERY: "bg-stone text-cream",
  CLIENT: "bg-warm text-dark",
};

const ROLE_LABELS: Record<string, string> = {
  MASTER: "Master",
  ADMIN: "Admin",
  SALES: "Sales",
  DELIVERY: "Driver",
  CLIENT: "Client",
};

const CREATABLE: Record<string, string[]> = {
  MASTER: ["ADMIN", "SALES", "DELIVERY"],
  ADMIN: ["SALES", "DELIVERY"],
};

export default function UsersPage() {
  const { data: session } = useSession();
  const role = session?.user?.role ?? "";

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "true" | "false">("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const allowed = CREATABLE[role] ?? [];

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterRole) params.set("role", filterRole);
    if (filterActive !== "all") params.set("active", filterActive);
    if (search) params.set("search", search);
    const res = await fetch(`/api/users?${params}`);
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, [filterRole, filterActive, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", email: "", password: "", role: allowed[0] ?? "", phone: "" });
    setModal("create");
  }

  function openEdit(u: UserRow) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, phone: u.phone ?? "" });
    setModal("edit");
  }

  async function handleSave() {
    setSaving(true);
    try {
      const url = modal === "create" ? "/api/users" : `/api/users/${editing!.id}`;
      const method = modal === "create" ? "POST" : "PATCH";
      const body: Record<string, string> = { name: form.name, email: form.email, role: form.role };
      if (form.phone) body.phone = form.phone;
      if (form.password) body.password = form.password;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json();
        setToast({ msg: d.error ?? "An error occurred", ok: false });
        return;
      }
      setToast({ msg: modal === "create" ? "User created" : "User updated", ok: true });
      setModal(null);
      fetchUsers();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: UserRow) {
    if (u.active) {
      await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    } else {
      await fetch(`/api/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: true }) });
    }
    fetchUsers();
  }

  if (!["MASTER", "ADMIN"].includes(role)) {
    return <div className="p-8 text-center text-muted">Access denied</div>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${toast.ok ? "bg-olive text-cream" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-terracotta" />
          <h1 className="font-display text-3xl text-dark">Team</h1>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-terracotta text-cream px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-terracotta/90 transition-all">
          <Plus className="w-4 h-4" /> New member
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-cream border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2.5 bg-cream border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30"
        >
          <option value="">All roles</option>
          {["MASTER", "ADMIN", "SALES", "DELIVERY", "CLIENT"].map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <div className="flex gap-1 bg-warm rounded-xl p-1">
          {(["all", "true", "false"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setFilterActive(v)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-all ${filterActive === v ? "bg-cream text-dark shadow-sm" : "text-muted hover:text-dark"}`}
            >
              {v === "all" ? "All" : v === "true" ? "Active" : "Inactive"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-terracotta" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No users found</p>
        </div>
      ) : (
        <div className="bg-white border border-stone/20 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-warm/60 border-b border-stone/20">
                  <th className="text-left px-4 py-3 font-medium text-muted">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted hidden lg:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className={`border-b border-stone/10 hover:bg-warm/30 transition-colors ${i % 2 === 0 ? "" : "bg-warm/20"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone/20 flex items-center justify-center text-xs font-medium text-dark">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-dark">{u.name}</p>
                          <p className="text-muted text-xs md:hidden">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${ROLE_COLORS[u.role] ?? "bg-warm text-dark"}`}>
                        {ROLE_LABELS[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted hidden lg:table-cell">{u.phone ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${u.active ? "text-olive" : "text-red-500"}`}>
                        <span className={`w-2 h-2 rounded-full ${u.active ? "bg-olive" : "bg-red-500"}`} />
                        {u.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(u)} className="p-2 hover:bg-warm rounded-lg transition-colors" title="Edit">
                          <Pencil className="w-3.5 h-3.5 text-muted" />
                        </button>
                        <button onClick={() => toggleActive(u)} className="p-2 hover:bg-warm rounded-lg transition-colors" title={u.active ? "Deactivate" : "Reactivate"}>
                          {u.active ? <UserX className="w-3.5 h-3.5 text-red-500" /> : <UserCheck className="w-3.5 h-3.5 text-olive" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/40 backdrop-blur-sm p-4" onClick={() => setModal(null)}>
          <div className="bg-cream rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl text-dark">
                {modal === "create" ? "New member" : "Edit member"}
              </h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-warm rounded-lg"><X className="w-5 h-5 text-muted" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-1">Full name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-1">
                  Password{modal === "edit" && " (leave empty to keep)"}
                </label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-1">Role</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30">
                  {(modal === "edit" && editing ? Array.from(new Set([editing.role, ...allowed])) : allowed).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted mb-1">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-2.5 bg-white border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !form.name || !form.email || (modal === "create" && !form.password)}
              className="w-full mt-6 bg-terracotta text-cream py-3 rounded-xl font-medium hover:bg-terracotta/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {modal === "create" ? "Create" : "Save changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
