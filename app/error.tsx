"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-cream flex flex-col items-center justify-center p-8">
      <h1 className="font-display text-2xl text-dark mb-4">Something went wrong</h1>
      <p className="text-muted mb-6 max-w-md text-center">{error.message}</p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-6 py-3 bg-terracotta text-white rounded-sm hover:bg-terracotta/90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-6 py-3 border border-stone rounded-sm hover:bg-warm"
        >
          Go to home
        </Link>
      </div>
    </main>
  );
}
