"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

type Tab = "login" | "register";

function getRedirectByRole(role: string, callbackUrl: string) {
  if (role === "CLIENT") {
    if (callbackUrl.startsWith("/dashboard")) return "/";
    return callbackUrl || "/";
  }
  if (role === "DELIVERY") return "/dashboard/delivery";
  if (role === "SALES" || role === "ADMIN" || role === "MASTER") return "/dashboard/orders";
  return "/";
}

function FloatingInput({
  label,
  type = "text",
  value,
  onChange,
  required = false,
  minLength,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        minLength={minLength}
        placeholder=" "
        className="peer w-full bg-cream border border-stone/40 rounded-xl px-4 pt-6 pb-2 text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all duration-300 placeholder-transparent"
      />
      <label className="absolute left-4 top-2 text-[11px] uppercase tracking-wider text-muted transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-terracotta pointer-events-none">
        {label}
      </label>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [tab, setTab] = useState<Tab>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Invalid email or password");
      setLoading(false);
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const sessionData = await sessionRes.json().catch(() => null);
    const role = sessionData?.user?.role ?? "CLIENT";

    router.push(getRedirectByRole(role, callbackUrl));
    router.refresh();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not create account");
      }

      const loginRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (loginRes?.error) {
        throw new Error("Account created, but could not sign in");
      }

      router.push(callbackUrl.startsWith("/dashboard") ? "/" : callbackUrl);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream flex">
      {/* Left decorative panel (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-dark relative overflow-hidden items-center justify-center p-16">
        <div className="absolute inset-0 bg-gradient-to-br from-terracotta/15 via-dark to-dark" />
        <div className="relative z-10 max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-px bg-terracotta" />
            <span className="text-terracotta text-sm uppercase tracking-widest">
              Welcome back
            </span>
          </div>
          <h2 className="font-display text-5xl text-cream font-light mb-6 leading-tight">
            Fresh meals for every{" "}
            <span className="italic text-stone">occasion</span>
          </h2>
          <p className="text-stone text-lg leading-relaxed">
            Sign in to manage your orders, request quotes, and access your
            personalized catering dashboard.
          </p>
          <div className="mt-12 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-terracotta/10 border border-terracotta/20 flex items-center justify-center">
              <span className="font-display text-2xl text-terracotta font-semibold">500+</span>
            </div>
            <div>
              <p className="text-cream text-sm font-medium">Events served</p>
              <p className="text-stone text-xs">and counting</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted hover:text-terracotta text-sm mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to site
          </Link>

          <div className="mb-8">
            <Link href="/" className="block mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.png"
                alt="Super Crown Catering"
                className="h-10 w-auto object-contain"
                style={{ mixBlendMode: "multiply" }}
              />
            </Link>
            <h1 className="font-display text-3xl text-dark mb-2">
              {tab === "login" ? "Sign in" : "Create account"}
            </h1>
            <p className="text-muted text-sm">
              One login for clients, delivery, sales, and admin.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mb-8 bg-warm rounded-xl p-1">
            <button
              type="button"
              onClick={() => { setTab("login"); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                tab === "login"
                  ? "bg-cream text-dark shadow-sm"
                  : "text-muted hover:text-dark"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setTab("register"); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${
                tab === "register"
                  ? "bg-cream text-dark shadow-sm"
                  : "text-muted hover:text-dark"
              }`}
            >
              Create account
            </button>
          </div>

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <FloatingInput
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                required
              />
              <FloatingInput
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                required
              />
              {error && (
                <p className="text-red-600 text-sm animate-fade-in">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-terracotta text-cream py-3.5 px-6 font-medium hover:bg-terracotta/90 hover:shadow-lg rounded-xl disabled:opacity-70 transition-all duration-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <FloatingInput
                label="Name"
                value={name}
                onChange={setName}
                required
              />
              <FloatingInput
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                required
              />
              <FloatingInput
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                required
                minLength={6}
              />
              {error && (
                <p className="text-red-600 text-sm animate-fade-in">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-terracotta text-cream py-3.5 px-6 font-medium hover:bg-terracotta/90 hover:shadow-lg rounded-xl disabled:opacity-70 transition-all duration-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create account"
                )}
              </button>
              <p className="text-muted text-xs text-center pt-2">
                Account creation is for clients. Sales, delivery, and admin
                accounts are created internally.
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-cream flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-terracotta animate-spin" />
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
