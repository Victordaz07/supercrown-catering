"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";

type VerifyState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; email: string; role?: string | null };

function SetPasswordContent() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [verify, setVerify] = useState<VerifyState>({ status: "loading" });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setVerify({ status: "error", message: "Invalid invitation link." });
      return;
    }
    let active = true;
    (async () => {
      const res = await fetch(`/api/team-invitations/verify?token=${encodeURIComponent(token)}`);
      const data = await res.json().catch(() => ({}));
      if (!active) return;
      if (!res.ok) {
        setVerify({ status: "error", message: data.error ?? "Invitation is invalid or expired." });
        return;
      }
      setVerify({ status: "ready", email: data.email, role: data.role ?? null });
    })();

    return () => {
      active = false;
    };
  }, [token]);

  const canSubmit =
    verify.status === "ready" &&
    password.length >= 6 &&
    confirmPassword.length >= 6 &&
    password === confirmPassword &&
    !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!canSubmit) return;
    setSaving(true);
    try {
      const res = await fetch("/api/team-invitations/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error ?? "Could not create password.");
        return;
      }
      setSuccess(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-warm border border-stone/30 rounded-2xl p-6 shadow-sm">
        <h1 className="font-display text-3xl text-dark mb-2">Create password</h1>
        <p className="text-sm text-muted mb-6">
          Finish your account setup to access the team dashboard.
        </p>

        {verify.status === "loading" && (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-terracotta" />
          </div>
        )}

        {verify.status === "error" && (
          <div className="space-y-4">
            <p className="text-sm text-red-600">{verify.message}</p>
            <Link href="/login" className="inline-flex text-sm text-terracotta hover:underline">
              Go to login
            </Link>
          </div>
        )}

        {verify.status === "ready" && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-xs text-muted bg-cream border border-stone/40 rounded-xl px-4 py-3">
              <p className="font-medium text-dark">{verify.email}</p>
              {verify.role ? <p className="mt-1">Role: {verify.role}</p> : null}
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-11 bg-white border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-11 bg-white border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-dark"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Passwords do not match.</p>
              )}
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-terracotta text-cream py-3 rounded-xl font-medium hover:bg-terracotta/90 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save password
            </button>
          </form>
        )}

        {verify.status === "ready" && success && (
          <div className="space-y-4">
            <p className="text-sm text-olive font-medium">
              Password created successfully. You can now sign in.
            </p>
            <Link
              href="/login"
              className="inline-flex bg-terracotta text-cream py-2.5 px-4 rounded-xl text-sm font-medium hover:bg-terracotta/90 transition-all"
            >
              Go to login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-cream flex items-center justify-center px-4 py-10">
          <Loader2 className="w-6 h-6 animate-spin text-terracotta" />
        </main>
      }
    >
      <SetPasswordContent />
    </Suspense>
  );
}
