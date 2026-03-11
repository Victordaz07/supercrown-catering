"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-stone hover:text-cream text-sm flex items-center gap-1"
    >
      <LogOut className="w-4 h-4" /> Sign out
    </button>
  );
}
