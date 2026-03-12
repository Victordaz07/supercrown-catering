"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ClipboardCheck,
  DollarSign,
  FileText,
  Gift,
  GitPullRequest,
  LayoutGrid,
  Menu,
  Package,
  Route,
  Shield,
  Tag,
  Truck,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

type ShellProps = {
  children: React.ReactNode;
  userName: string;
  role: string;
  isMasterOrAdmin: boolean;
  isSalesOrAbove: boolean;
  isDelivery: boolean;
  isClient: boolean;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

export function DashboardShell({
  children,
  userName,
  role,
  isMasterOrAdmin,
  isSalesOrAbove,
  isDelivery,
  isClient,
}: ShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navGroups = useMemo<NavGroup[]>(
    () => [
      {
        title: "Overview",
        items: [
          { label: "Dashboard", href: "/dashboard", icon: LayoutGrid, show: isSalesOrAbove || isDelivery },
          { label: "User Guides", href: "/dashboard/help", icon: BookOpen, show: isSalesOrAbove || isDelivery },
        ],
      },
      {
        title: "Products",
        items: [
          { label: "Products", href: "/dashboard/products", icon: UtensilsCrossed, show: isMasterOrAdmin },
          { label: "Pricing", href: "/dashboard/pricing", icon: DollarSign, show: isSalesOrAbove },
          { label: "Coupons", href: "/dashboard/coupons", icon: Tag, show: isMasterOrAdmin },
        ],
      },
      {
        title: "Delivery",
        items: [
          { label: "Routes", href: "/dashboard/routes", icon: Route, show: isSalesOrAbove },
          { label: "Deliveries", href: "/dashboard/deliveries", icon: ClipboardCheck, show: isSalesOrAbove },
          { label: "My Deliveries", href: "/dashboard/delivery", icon: Truck, show: isDelivery },
        ],
      },
      {
        title: "Sales",
        items: [
          { label: "Orders / Quotes", href: "/dashboard/orders", icon: Package, show: isSalesOrAbove },
          { label: "Invoices", href: "/dashboard/invoices", icon: FileText, show: isSalesOrAbove },
        ],
      },
      {
        title: "Customers",
        items: [{ label: "Loyalty", href: "/dashboard/loyalty", icon: Gift, show: isClient || isSalesOrAbove }],
      },
      {
        title: "Administration",
        items: [
          { label: "Status Requests", href: "/dashboard/status-requests", icon: GitPullRequest, show: isSalesOrAbove },
          { label: "Team", href: "/dashboard/users", icon: Users, show: isMasterOrAdmin },
          { label: "Audit Log", href: "/dashboard/audit", icon: Shield, show: isMasterOrAdmin },
        ],
      },
    ],
    [isClient, isDelivery, isMasterOrAdmin, isSalesOrAbove]
  );

  return (
    <div className="min-h-screen bg-cream">
      <header className="h-16 bg-dark text-cream border-b border-stone/30 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="lg:hidden p-2 rounded-md hover:bg-stone/20 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link
            href="/dashboard"
            className="p-1 rounded-md hover:bg-stone/20 transition-colors"
            aria-label="Go to dashboard home"
            title="Dashboard"
          >
            <LayoutGrid className="w-5 h-5" />
          </Link>
          <Link href="/dashboard" className="font-display text-lg md:text-xl">
            Super Crown · Dashboard
          </Link>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <span className="text-stone text-sm hidden md:block">
            {userName}
            <span className="ml-2 text-xs bg-stone/20 px-2 py-0.5 rounded-lg">{role}</span>
          </span>
          <Link href="/" className="text-stone hover:text-cream text-sm">
            ← Site
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="flex">
        {mobileOpen && (
          <button
            aria-label="Close menu overlay"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          />
        )}

        <aside
          className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-72 bg-dark text-cream border-r border-stone/20 z-30 overflow-y-auto transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 lg:sticky`}
        >
          <nav className="p-4 space-y-6">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter((item) => item.show);
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.title}>
                  <h3 className="text-[11px] uppercase tracking-widest text-stone/80 mb-2 px-2">
                    {group.title}
                  </h3>
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                            active
                              ? "bg-terracotta text-cream"
                              : "text-stone hover:text-cream hover:bg-stone/10"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
