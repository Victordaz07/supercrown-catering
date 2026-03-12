import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { BookOpen } from "lucide-react";
import { HelpGuideCard } from "./HelpGuideCard";

const ROLE_CONFIG = {
  CLIENT: {
    label: "Client",
    iconName: "user",
    color: "olive",
    path: "/client",
    canDo: [
      "View your orders and order history",
      "Pay invoices online with card (Stripe)",
      "Approve, reject, or request changes to quotes",
      "View loyalty points and referral codes",
      "Copy coupon codes from active offers",
      "Configure notification preferences",
    ],
    cannotDo: [
      "Access the internal dashboard",
      "View other clients' orders or invoices",
      "Manage products, pricing, or team",
    ],
    menu: "My Orders, Invoices, Quotes, Loyalty, Offers, Settings",
  },
  DELIVERY: {
    label: "Delivery Driver",
    iconName: "truck",
    color: "terracotta",
    path: "/dashboard/delivery",
    canDo: [
      "View your assigned routes for the week",
      "Mark stops as En Route or Delivered",
      "Skip a stop when needed",
      "Create delivery reports with photos and signature",
      "Record receiver name and item quantities",
      "Open Google Maps for navigation",
      "Report issues (missing, damaged, wrong item)",
    ],
    cannotDo: [
      "View or edit orders, invoices, or quotes",
      "Create or modify routes",
      "Access pricing, products, or team management",
      "See deliveries assigned to other drivers",
    ],
    menu: "Dashboard, My Deliveries",
  },
  SALES: {
    label: "Sales",
    iconName: "shopping-bag",
    color: "terracotta",
    path: "/dashboard",
    canDo: [
      "Create and edit quotes, send to clients",
      "Convert approved quotes to orders",
      "Confirm orders, generate invoices, assign drivers",
      "Create routes and assign orders to drivers",
      "Mark invoices as paid, manage delivery reports",
      "Request status changes (requires ADMIN/MASTER approval)",
      "View loyalty and pricing",
    ],
    cannotDo: [
      "Manage products or coupons",
      "Create or edit users (Team)",
      "Approve status requests or adjustments",
      "Access Audit Log",
      "Manually close orders",
    ],
    menu: "Dashboard, Pricing, Routes, Deliveries, Orders/Quotes, Invoices, Loyalty, Status Requests",
  },
  ADMIN: {
    label: "Administrator",
    iconName: "shield",
    color: "dark",
    path: "/dashboard",
    canDo: [
      "Everything Sales can do",
      "Manage products (add, edit, deactivate)",
      "Create and edit coupons",
      "Create users (SALES, DELIVERY), edit team",
      "Approve or reject status requests",
      "Approve or reject adjustment requests",
      "View Audit Log",
    ],
    cannotDo: [
      "Create users with MASTER role",
      "Perform rollback on order transitions",
      "Manually close orders (MASTER only)",
    ],
    menu: "All Sales items + Products, Coupons, Team, Audit Log",
  },
  MASTER: {
    label: "Master",
    iconName: "crown",
    color: "dark",
    path: "/dashboard",
    canDo: [
      "Everything Administrator can do",
      "Create ADMIN users",
      "Manually close orders",
      "Rollback order status transitions",
      "Full system access",
    ],
    cannotDo: [],
    menu: "Same as Administrator",
  },
} as const;

export default async function HelpPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role as keyof typeof ROLE_CONFIG;
  const currentRoleConfig = ROLE_CONFIG[role] ?? ROLE_CONFIG.SALES;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="User Guides"
        subtitle="Step-by-step guides for each role. Find what you can do, where to do it, and common workflows."
      />

      <div className="bg-white rounded-xl border border-stone/20 p-4 md:p-6 shadow-sm">
        <p className="text-sm text-muted mb-4">
          You are logged in as <span className="font-medium text-dark">{session.user.name}</span> with role{" "}
          <span className="font-medium text-terracotta">{currentRoleConfig.label}</span>. Your guide is highlighted
          below.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(Object.entries(ROLE_CONFIG) as [keyof typeof ROLE_CONFIG, (typeof ROLE_CONFIG)[keyof typeof ROLE_CONFIG]][]).map(([roleKey, config]) => {
            const isCurrent = roleKey === role;
            return (
              <HelpGuideCard
                key={roleKey}
                title={config.label}
                iconName={config.iconName}
                isCurrentUser={isCurrent}
                canDo={config.canDo}
                cannotDo={config.cannotDo}
                menu={config.menu}
                path={config.path}
              />
            );
          })}
        </div>
      </div>

      <div className="bg-warm/40 rounded-xl border border-stone/20 p-4 md:p-6">
        <h3 className="font-display text-lg text-dark flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-terracotta" />
          Quick reference
        </h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-dark mb-2">Order flow</p>
            <p className="text-muted">
              PENDING → CONFIRMED → READY → IN_TRANSIT → DELIVERED. Generate invoice at CONFIRMED. Assign driver at
              READY. Driver marks En Route (→ IN_TRANSIT) and Delivered (→ DELIVERED).
            </p>
          </div>
          <div>
            <p className="font-medium text-dark mb-2">Quote flow</p>
            <p className="text-muted">
              REQUESTED → PRICING → SENT → Client approves/rejects. Approved quotes can be converted to orders from
              Dashboard → Orders/Quotes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
