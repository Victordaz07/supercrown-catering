import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { Package, Truck, Users, FileText, Shield, ClipboardCheck } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role === "CLIENT") redirect("/");

  const role = session.user.role;
  const isMasterOrAdmin = role === "MASTER" || role === "ADMIN";
  const isSalesOrAbove = isMasterOrAdmin || role === "SALES";
  const isDelivery = role === "DELIVERY";

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <header className="bg-dark text-cream py-4 px-4 md:px-8 border-b border-stone/30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="font-display text-xl">
            Super Crown · Dashboard
          </Link>
          <div className="flex items-center gap-6">
            <span className="text-stone text-sm hidden md:block">
              {session.user.name}
              <span className="ml-2 text-xs bg-stone/20 px-2 py-0.5 rounded-lg">{role}</span>
            </span>
            <Link href="/" className="text-stone hover:text-cream text-sm">
              ← Site
            </Link>
            <SignOutButton />
          </div>
        </div>
        <nav className="max-w-7xl mx-auto mt-4 flex gap-2 md:gap-4 overflow-x-auto pb-1">
          {isSalesOrAbove && (
            <Link href="/dashboard/orders"
              className="flex items-center gap-1.5 text-stone hover:text-cream py-2 px-2 border-b-2 border-transparent hover:border-terracotta text-sm whitespace-nowrap transition-colors">
              <Package className="w-4 h-4" /> Orders
            </Link>
          )}
          {isSalesOrAbove && (
            <Link href="/dashboard/invoices"
              className="flex items-center gap-1.5 text-stone hover:text-cream py-2 px-2 border-b-2 border-transparent hover:border-terracotta text-sm whitespace-nowrap transition-colors">
              <FileText className="w-4 h-4" /> Invoices
            </Link>
          )}
          {isSalesOrAbove && (
            <Link href="/dashboard/deliveries"
              className="flex items-center gap-1.5 text-stone hover:text-cream py-2 px-2 border-b-2 border-transparent hover:border-terracotta text-sm whitespace-nowrap transition-colors">
              <ClipboardCheck className="w-4 h-4" /> Deliveries
            </Link>
          )}
          {isDelivery && (
            <Link href="/dashboard/delivery"
              className="flex items-center gap-1.5 text-stone hover:text-cream py-2 px-2 border-b-2 border-transparent hover:border-terracotta text-sm whitespace-nowrap transition-colors">
              <Truck className="w-4 h-4" /> My Deliveries
            </Link>
          )}
          {isMasterOrAdmin && (
            <Link href="/dashboard/users"
              className="flex items-center gap-1.5 text-stone hover:text-cream py-2 px-2 border-b-2 border-transparent hover:border-terracotta text-sm whitespace-nowrap transition-colors">
              <Users className="w-4 h-4" /> Team
            </Link>
          )}
          {isMasterOrAdmin && (
            <Link href="/dashboard/audit"
              className="flex items-center gap-1.5 text-stone hover:text-cream py-2 px-2 border-b-2 border-transparent hover:border-terracotta text-sm whitespace-nowrap transition-colors">
              <Shield className="w-4 h-4" /> Audit Log
            </Link>
          )}
        </nav>
      </header>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
