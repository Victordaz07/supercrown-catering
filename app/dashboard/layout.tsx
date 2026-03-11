import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role === "CLIENT") redirect("/client");

  const isMasterOrAdmin = role === "MASTER" || role === "ADMIN";
  const isSalesOrAbove = isMasterOrAdmin || role === "SALES";
  const isDelivery = role === "DELIVERY";
  const isClient = role === "CLIENT";

  return (
    <DashboardShell
      userName={session.user.name}
      role={role}
      isMasterOrAdmin={isMasterOrAdmin}
      isSalesOrAbove={isSalesOrAbove}
      isDelivery={isDelivery}
      isClient={isClient}
    >
      {children}
    </DashboardShell>
  );
}
