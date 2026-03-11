import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard/data";
import { ExecutiveDashboardView } from "@/app/dashboard/_components/ExecutiveDashboardView";
import { SalesDashboardView } from "@/app/dashboard/_components/SalesDashboardView";
import { DeliveryDashboardView } from "@/app/dashboard/_components/DeliveryDashboardView";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role === "CLIENT") {
    redirect("/client");
  }
  if (!["MASTER", "ADMIN", "SALES", "DELIVERY"].includes(role)) {
    redirect("/");
  }

  const overview = await getDashboardOverview(role, session.user.id);

  if (role === "DELIVERY" && overview.delivery) {
    return <DeliveryDashboardView data={overview.delivery} />;
  }
  if ((role === "MASTER" || role === "ADMIN") && overview.executive) {
    return <ExecutiveDashboardView data={overview.executive} />;
  }
  if (overview.sales) {
    return <SalesDashboardView data={overview.sales} />;
  }

  redirect("/dashboard/orders");
}
