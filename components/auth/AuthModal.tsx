"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  signInWithEmail,
  registerWithEmail,
  getUserRole,
} from "@/lib/firebase/auth";

const inputStyles =
  "w-full bg-cream border border-stone rounded-sm px-4 py-3 focus:outline-none focus:border-terracotta transition-colors";

type Tab = "login" | "register";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setError(null);
    setName("");
    setEmail("");
    setPassword("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await signInWithEmail(email, password);
      const role = await getUserRole(user);

      if (role !== "client" && role !== null) {
        setError("This is a team account. Use the Team Login link in the menu.");
        return;
      }

      if (!role) {
        setError("Account without assigned role. Register first.");
        return;
      }

      const idToken = await user.getIdToken(true);
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Error creating session");
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Incorrect email or password."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { user } = await registerWithEmail(email, password);

      const res = await fetch("/api/auth/set-client-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: await user.getIdToken(), name: name.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error registering");
      }

      const idToken = await user.getIdToken(true);
      const sessionRes = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      if (!sessionRes.ok) {
        const errData = await sessionRes.json().catch(() => ({}));
        throw new Error(errData.error || "Error creating session");
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("email-already-in-use") || msg.includes("already in use")) {
        setError("This email is already registered. Sign in.");
        setTab("login");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-dark/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative bg-cream border border-stone/40 rounded-sm shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl text-dark">
              {tab === "login" ? "Sign in" : "Create account"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-muted hover:text-dark transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2 mb-6 border-b border-stone/30">
            <button
              type="button"
              onClick={() => { setTab("login"); setError(null); }}
              className={`pb-3 px-4 text-sm font-medium transition-colors ${
                tab === "login"
                  ? "text-terracotta border-b-2 border-terracotta"
                  : "text-muted hover:text-dark"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setTab("register"); setError(null); }}
              className={`pb-3 px-4 text-sm font-medium transition-colors ${
                tab === "register"
                  ? "text-terracotta border-b-2 border-terracotta"
                  : "text-muted hover:text-dark"
              }`}
            >
              Register
            </button>
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputStyles}
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputStyles}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-sm text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-terracotta text-cream py-4 px-6 font-medium hover:bg-terracotta/90 active:scale-[0.98] transition-all rounded-sm disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputStyles}
                  placeholder="Your name"
                  required
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputStyles}
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                  Password (min. 6 characters)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputStyles}
                  minLength={6}
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-sm text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-terracotta text-cream py-4 px-6 font-medium hover:bg-terracotta/90 active:scale-[0.98] transition-all rounded-sm disabled:opacity-70"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
          )}

          <p className="text-muted text-xs mt-4 text-center">
            You need an account to submit your quote and for us to identify you.
          </p>
        </div>
      </div>
    </div>
  );
}
