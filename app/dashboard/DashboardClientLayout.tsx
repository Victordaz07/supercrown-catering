"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Package,
  Truck,
  Receipt,
  Users,
  MapPin,
  LogOut,
  UtensilsCrossed,
  Settings,
  DollarSign,
  Tag,
} from "lucide-react";
import { onAuthChange, signOutUser, getUserRole } from "@/lib/firebase/auth";
import { QuoteBadge } from "@/components/dashboard/QuoteBadge";


const driverNav = [{ href: "/dashboard/driver", label: "My Deliveries", icon: MapPin }];

const adminNav = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/products", label: "Products", icon: UtensilsCrossed },
  { href: "/dashboard/coupons", label: "Coupons", icon: Tag },
  { href: "/dashboard/pricing", label: "Pricing", icon: DollarSign },
  { href: "/dashboard/admin/settings", label: "Settings", icon: Settings },
];

const salesNavWithPricing = [
  { href: "/dashboard/sales", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/sales/quotes", label: "Quotes", icon: FileText },
  { href: "/dashboard/sales/orders", label: "Orders", icon: Package },
  { href: "/dashboard/sales/deliveries", label: "Deliveries", icon: Truck },
  { href: "/dashboard/sales/invoices", label: "Invoices", icon: Receipt },
  { href: "/dashboard/sales/team", label: "Team", icon: Users },
  { href: "/dashboard/pricing", label: "Pricing", icon: DollarSign },
];

export function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ uid: string; email: string | null; displayName: string | null } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setLoading(false);
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        router.replace("/login");
        return;
      }
      const r = await getUserRole(firebaseUser);
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? null,
        displayName: firebaseUser.displayName ?? null,
      });
      setRole(r);

      if (r === "driver" && (pathname.startsWith("/dashboard/sales") || pathname.startsWith("/dashboard/admin") || pathname.startsWith("/dashboard/pricing"))) {
        router.replace("/dashboard/driver");
      } else if (r === "sales" && (pathname === "/dashboard/driver" || pathname.startsWith("/dashboard/admin"))) {
        router.replace("/dashboard/sales");
      } else if (r === "admin" && (pathname.startsWith("/dashboard/sales") || pathname.startsWith("/dashboard/driver"))) {
        router.replace("/dashboard/admin");
      } else if ((r === "client" || !r) && pathname.startsWith("/dashboard")) {
        router.replace("/");
      }
    });
    return () => unsubscribe();
  }, [pathname, router]);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await signOutUser();
    router.replace("/login");
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  const nav = role === "admin" ? adminNav : role === "driver" ? driverNav : salesNavWithPricing;
  const isAdmin = role === "admin";
  const isSales = role === "sales";

  return (
    <div className="min-h-screen bg-cream flex flex-col md:flex-row">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex md:flex-col md:w-56 bg-dark text-stone shrink-0">
        <div className="p-4 border-b border-stone/30">
          <Link href={isAdmin ? "/dashboard/admin" : isSales ? "/dashboard/sales" : "/dashboard/driver"} className="font-display text-xl text-cream">
            Super Crown
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {nav.map((item) => {
            const isActive =
              item.href === pathname ||
              (item.href !== "/dashboard/sales" && item.href !== "/dashboard/driver" && item.href !== "/dashboard/admin" && pathname.startsWith(item.href)) ||
              (item.href === "/dashboard/admin" && pathname === "/dashboard/admin");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-colors ${
                  isActive ? "bg-terracotta text-cream" : "hover:bg-stone/20 text-stone hover:text-cream"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
                {item.label === "Quotes" && item.href === "/dashboard/sales/quotes" && (
                  <QuoteBadge />
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 px-4 py-3 bg-cream border-b border-stone/40">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg text-dark">Super Crown</span>
            <span className="text-muted text-sm hidden sm:inline">
              — {isAdmin ? "Admin" : isSales ? "Sales" : "Driver"} Dashboard
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted truncate max-w-[120px] sm:max-w-[200px]">
              {user.displayName || user.email || "User"}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-muted hover:text-terracotta text-sm transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Bottom nav - mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around bg-dark text-stone py-2 border-t border-stone/30 safe-area-pb">
          {nav.slice(0, 4).map((item) => {
            const isActive =
              item.href === pathname ||
              (item.href !== "/dashboard/sales" &&
                item.href !== "/dashboard/driver" &&
                item.href !== "/dashboard/admin" &&
                pathname.startsWith(item.href)) ||
              (item.href === "/dashboard/admin" && pathname.startsWith("/dashboard/admin"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 p-2 rounded-sm transition-colors ${
                  isActive ? "text-terracotta" : "hover:text-cream"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
