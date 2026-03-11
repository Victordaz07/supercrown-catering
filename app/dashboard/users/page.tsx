"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  X,
  Loader2,
  Phone,
  Mail,
  Shield,
  ChevronDown,
  Pencil,
  UserX,
  UserCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { onAuthChange, getUserRole } from "@/lib/firebase/auth";

type Role = "MASTER" | "ADMIN" | "SALES" | "DELIVERY" | "CLIENT";

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  active: boolean;
  createdAt: string;
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone: string;
}

const ROLE_BADGE_STYLES: Record<Role, string> = {
  MASTER: "bg-dark text-cream",
  ADMIN: "bg-olive text-cream",
  SALES: "bg-terracotta text-cream",
  DELIVERY: "bg-stone text-dark",
  CLIENT: "bg-warm text-dark",
};

const ROLE_LABELS: Record<Role, string> = {
  MASTER: "Master",
  ADMIN: "Administrator",
  SALES: "Sales",
  DELIVERY: "Driver",
  CLIENT: "Client",
};

const ALL_ROLES: Role[] = ["MASTER", "ADMIN", "SALES", "DELIVERY", "CLIENT"];

function getAllowedRoles(currentRole: Role | null): Role[] {
  if (currentRole === "MASTER") return ["ADMIN", "SALES", "DELIVERY", "CLIENT"];
  if (currentRole === "ADMIN") return ["SALES", "DELIVERY", "CLIENT"];
  return [];
}

const EMPTY_FORM: UserFormData = {
  name: "",
  email: "",
  password: "",
  role: "SALES",
  phone: "",
};

const inputStyles =
  "w-full bg-cream border border-stone/50 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all text-sm text-dark placeholder:text-muted/60";

const selectStyles =
  "w-full bg-cream border border-stone/50 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all text-sm text-dark appearance-none cursor-pointer";

function formatDate(dateStr: string): string {
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

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className={`fixed top-4 right-4 z-[60] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg animate-fade-up ${
        type === "success"
          ? "bg-olive/10 border border-olive/30 text-olive"
          : "bg-red-50 border border-red-200 text-red-700"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="w-5 h-5 shrink-0" />
      ) : (
        <AlertCircle className="w-5 h-5 shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 p-0.5 rounded-full hover:bg-black/5 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function UserModal({
  open,
  user,
  allowedRoles,
  saving,
  onClose,
  onSave,
}: {
  open: boolean;
  user: TeamUser | null;
  allowedRoles: Role[];
  saving: boolean;
  onClose: () => void;
  onSave: (data: UserFormData) => void;
}) {
  const isEdit = !!user;
  const [form, setForm] = useState<UserFormData>(EMPTY_FORM);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        password: "",
        role: user.role,
        phone: user.phone || "",
      });
    } else {
      setForm({ ...EMPTY_FORM, role: allowedRoles[0] || "SALES" });
    }
  }, [user, allowedRoles]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const update = (field: keyof UserFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-dark/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-cream rounded-2xl shadow-2xl animate-modal-in overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone/30">
          <h2 className="font-display text-xl text-dark">
            {isEdit ? "Edit member" : "New member"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-warm transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-muted text-xs uppercase tracking-wider mb-1.5 font-medium">
              Full name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className={inputStyles}
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-muted text-xs uppercase tracking-wider mb-1.5 font-medium">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputStyles}
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-muted text-xs uppercase tracking-wider mb-1.5 font-medium">
              {isEdit
                ? "Password (leave empty to keep current)"
                : "Password"}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              className={inputStyles}
              placeholder={isEdit ? "••••••••" : "Minimum 6 characters"}
              minLength={isEdit ? 0 : 6}
              required={!isEdit}
            />
          </div>

          <div className="relative">
            <label className="block text-muted text-xs uppercase tracking-wider mb-1.5 font-medium">
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className={selectStyles}
            >
              {allowedRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 bottom-3 w-4 h-4 text-muted pointer-events-none" />
          </div>

          <div>
            <label className="block text-muted text-xs uppercase tracking-wider mb-1.5 font-medium">
              Phone (optional)
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputStyles}
              placeholder="+52 55 1234 5678"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-dark text-cream rounded-xl text-sm font-medium hover:bg-dark/90 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save changes"
                  : "Create member"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 border border-stone/50 text-dark rounded-xl text-sm font-medium hover:border-terracotta hover:text-terracotta transition-all disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [currentRole, setCurrentRole] = useState<Role | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "ALL">("ALL");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const role = await getUserRole(firebaseUser);
        const mapped =
          role === "admin"
            ? "ADMIN"
            : role === "sales"
              ? "SALES"
              : role === "driver"
                ? "DELIVERY"
                : null;
        setCurrentRole(mapped as Role | null);
      } else {
        setCurrentRole(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const allowedRoles = useMemo(
    () => getAllowedRoles(currentRole),
    [currentRole],
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (activeFilter === "active") params.set("active", "true");
      if (activeFilter === "inactive") params.set("active", "false");
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/users?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error loading users");
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setToast({
        message:
          err instanceof Error ? err.message : "Error loading users",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [roleFilter, activeFilter, search]);

  useEffect(() => {
    if (!authLoading) fetchUsers();
  }, [authLoading, fetchUsers]);

  const handleCreate = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const handleEdit = (user: TeamUser) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleSave = async (data: UserFormData) => {
    setSaving(true);
    try {
      if (editingUser) {
        const body: Record<string, unknown> = {
          name: data.name,
          email: data.email,
          role: data.role,
          phone: data.phone || undefined,
        };
        if (data.password) body.password = data.password;

        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error updating user");
        }
        setToast({ message: "Member updated successfully", type: "success" });
      } else {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.email,
            password: data.password,
            name: data.name,
            role: data.role,
            phone: data.phone || undefined,
          }),
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error creating user");
        }
        setToast({ message: "Member created successfully", type: "success" });
      }

      handleCloseModal();
      fetchUsers();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Unexpected error",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: TeamUser) => {
    setTogglingId(user.id);
    try {
      if (user.active) {
        const res = await fetch(`/api/users/${user.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error deactivating user");
        }
        setToast({ message: `${user.name} deactivated`, type: "success" });
      } else {
        const res = await fetch(`/api/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ active: true }),
          credentials: "include",
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Error reactivating user");
        }
        setToast({ message: `${user.name} reactivated`, type: "success" });
      }
      fetchUsers();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : "Unexpected error",
        type: "error",
      });
    } finally {
      setTogglingId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta" />
      </div>
    );
  }

  if (!currentRole || !["MASTER", "ADMIN"].includes(currentRole)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-12 h-12 text-stone mb-4" />
        <h2 className="font-display text-xl text-dark mb-2">Access restricted</h2>
        <p className="text-muted text-sm">
          You don't have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-terracotta/10 rounded-xl">
            <Users className="w-6 h-6 text-terracotta" />
          </div>
          <div>
            <h1 className="font-display text-2xl text-dark">Team</h1>
            <p className="text-muted text-sm">
              Manage your team members
            </p>
          </div>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-dark text-cream rounded-xl text-sm font-medium hover:bg-dark/90 active:scale-[0.98] transition-all shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          New member
        </button>
      </div>

      {/* Filters */}
      <div className="bg-warm/60 border border-stone/20 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full bg-cream border border-stone/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-dark placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-stone/20 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted" />
              </button>
            )}
          </div>

          {/* Role filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | "ALL")}
              className="bg-cream border border-stone/40 rounded-xl px-4 py-2.5 pr-9 text-sm text-dark appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
            >
              <option value="ALL">All roles</option>
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          </div>
        </div>

        {/* Active/Inactive pills */}
        <div className="flex items-center gap-2">
          {(["all", "active", "inactive"] as const).map((filter) => {
            const labels = {
              all: "All",
              active: "Active",
              inactive: "Inactive",
            };
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? "bg-dark text-cream shadow-sm"
                    : "bg-cream text-muted border border-stone/30 hover:border-stone/60"
                }`}
              >
                {labels[filter]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-terracotta" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-10 h-10 text-stone mb-3" />
          <p className="text-muted text-sm">No members found</p>
          <p className="text-muted/60 text-xs mt-1">
            Try changing the filters or add a new member
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-cream border border-stone/20 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone/20 bg-warm/40">
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-muted font-medium">
                    Member
                  </th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-muted font-medium">
                    Role
                  </th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-muted font-medium">
                    Status
                  </th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-muted font-medium">
                    Phone
                  </th>
                  <th className="text-left px-5 py-3 text-xs uppercase tracking-wider text-muted font-medium">
                    Created
                  </th>
                  <th className="text-right px-5 py-3 text-xs uppercase tracking-wider text-muted font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone/10">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="group hover:bg-warm/30 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-stone/20 flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium text-dark">
                            {user.name
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-dark truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-muted truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE_STYLES[user.role]}`}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            user.active ? "bg-olive" : "bg-stone"
                          }`}
                        />
                        <span className="text-sm text-muted">
                          {user.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-muted">
                        {user.phone || "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-muted">
                        {formatDate(user.createdAt)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 rounded-lg hover:bg-warm transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4 text-muted hover:text-dark" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          disabled={togglingId === user.id}
                          className="p-2 rounded-lg hover:bg-warm transition-colors disabled:opacity-50"
                          title={user.active ? "Deactivate" : "Reactivate"}
                        >
                          {togglingId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted" />
                          ) : user.active ? (
                            <UserX className="w-4 h-4 text-muted hover:text-red-600" />
                          ) : (
                            <UserCheck className="w-4 h-4 text-muted hover:text-olive" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden grid gap-3 sm:grid-cols-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-cream border border-stone/20 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-stone/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-medium text-dark">
                        {user.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-dark truncate">
                        {user.name}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium mt-0.5 ${ROLE_BADGE_STYLES[user.role]}`}
                      >
                        {ROLE_LABELS[user.role]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        user.active ? "bg-olive" : "bg-stone"
                      }`}
                    />
                    <span className="text-[10px] text-muted">
                      {user.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{user.phone}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-muted/60">
                    Created: {formatDate(user.createdAt)}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-stone/10">
                  <button
                    onClick={() => handleEdit(user)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-dark bg-warm rounded-lg hover:bg-stone/30 transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(user)}
                    disabled={togglingId === user.id}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                      user.active
                        ? "text-red-700 bg-red-50 hover:bg-red-100"
                        : "text-olive bg-olive/10 hover:bg-olive/20"
                    }`}
                  >
                    {togglingId === user.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : user.active ? (
                      <>
                        <UserX className="w-3 h-3" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3 h-3" />
                        Reactivate
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Create / Edit Modal */}
      <UserModal
        open={modalOpen}
        user={editingUser}
        allowedRoles={allowedRoles}
        saving={saving}
        onClose={handleCloseModal}
        onSave={handleSave}
      />
    </div>
  );
}
