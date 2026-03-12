"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Gift,
  HelpCircle,
  LayoutGrid,
  Menu,
  Package,
  Settings,
  Tag,
  X,
} from "lucide-react";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

type Props = {
  children: React.ReactNode;
  userName: string;
};

const NAV_ITEMS = [
  {
    title: "General",
    items: [
      { label: "Inicio", href: "/client", icon: LayoutGrid },
      { label: "Guía de uso", href: "/client/help", icon: HelpCircle },
    ],
  },
  {
    title: "Mis pedidos",
    items: [
      { label: "Pedidos", href: "/client/orders", icon: Package },
      { label: "Cotizaciones", href: "/client/quotes", icon: FileText },
      { label: "Facturas", href: "/client/invoices", icon: FileText },
    ],
  },
  {
    title: "Beneficios",
    items: [
      { label: "Loyalty", href: "/client/loyalty", icon: Gift },
      { label: "Ofertas", href: "/client/offers", icon: Tag },
    ],
  },
  {
    title: "Cuenta",
    items: [
      { label: "Configuración", href: "/client/settings", icon: Settings },
    ],
  },
];

export function ClientShell({ children, userName }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
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
            href="/client"
            className="p-1 rounded-md hover:bg-stone/20 transition-colors"
            aria-label="Ir al inicio"
            title="Inicio"
          >
            <LayoutGrid className="w-5 h-5" />
          </Link>
          <Link href="/client" className="font-display text-lg md:text-xl">
            Super Crown · Portal
          </Link>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <span className="text-stone text-sm hidden md:block">
            {userName}
            <span className="ml-2 text-xs bg-stone/20 px-2 py-0.5 rounded-lg">Cliente</span>
          </span>
          <Link href="/" className="text-stone hover:text-cream text-sm">
            ← Sitio
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="flex">
        {/* Mobile overlay */}
        {mobileOpen && (
          <button
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-dark text-cream border-r border-stone/20 z-30 overflow-y-auto transition-transform duration-200 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 lg:sticky`}
        >
          <nav className="p-4 space-y-6">
            {NAV_ITEMS.map((group) => (
              <div key={group.title}>
                <h3 className="text-[11px] uppercase tracking-widest text-stone/80 mb-2 px-2">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active =
                      item.href === "/client"
                        ? pathname === "/client"
                        : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
            ))}

            {/* Branding bottom */}
            <div className="pt-4 border-t border-stone/20 px-2">
              <p className="text-[10px] text-stone/50 uppercase tracking-widest">Super Crown Catering</p>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
