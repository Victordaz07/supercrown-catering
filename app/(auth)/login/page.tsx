"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmail,
  registerWithEmail,
  getUserRole,
} from "@/lib/firebase/auth";

type Tab = "login" | "register";

const inputStyles =
  "w-full bg-cream border border-stone rounded-sm px-4 py-3 focus:outline-none focus:border-terracotta transition-colors";

function getRedirectForRole(role: string | null, from: string) {
  if (role === "admin") {
    return from.startsWith("/dashboard/admin") ? from : "/dashboard/admin";
  }
  if (role === "sales") {
    return from.startsWith("/dashboard/sales") ? from : "/dashboard/sales";
  }
  if (role === "driver") {
    return from.startsWith("/dashboard/driver") ? from : "/dashboard/driver";
  }
  if (role === "client") {
    if (from.startsWith("/dashboard/")) return "/";
    return from || "/";
  }
  return "/";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/";

  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const createSession = async (idToken: string) => {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error("Could not create session");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { user } = await signInWithEmail(email, password);
      const role = await getUserRole(user);
      const idToken = await user.getIdToken(true);

      await createSession(idToken);
      router.push(getRedirectForRole(role, from));
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invalid email or password"
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

      const roleRes = await fetch("/api/auth/set-client-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: await user.getIdToken(),
          name: name.trim() || undefined,
        }),
      });

      if (!roleRes.ok) {
        const data = await roleRes.json().catch(() => ({}));
        throw new Error(data.error || "Could not create account");
      }

      const idToken = await user.getIdToken(true);
      await createSession(idToken);

      router.push(getRedirectForRole("client", from));
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("email-already-in-use")) {
        setError("This email already exists. Sign in.");
        setTab("login");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="font-display text-3xl text-dark text-center mb-2">
          Login
        </h1>
        <p className="text-muted text-sm text-center mb-8">
          One login for clients, delivery, sales, and admin.
        </p>

        <div className="bg-warm border border-stone/40 rounded-sm p-6">
          <div className="flex gap-2 mb-6 border-b border-stone/30">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError(null);
              }}
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
              onClick={() => {
                setTab("register");
                setError(null);
              }}
              className={`pb-3 px-4 text-sm font-medium transition-colors ${
                tab === "register"
                  ? "text-terracotta border-b-2 border-terracotta"
                  : "text-muted hover:text-dark"
              }`}
            >
              Create account
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
                  Password
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
                {loading ? "Creating..." : "Create account"}
              </button>
              <p className="text-muted text-xs text-center">
                Account creation is for clients. Sales, delivery, and admin accounts are created internally.
              </p>
            </form>
          )}
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-terracotta hover:underline text-sm">
            ← Back to site
          </Link>
        </p>
      </div>
    </div>
  );
}
