import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;

  if (role === "MASTER" || role === "ADMIN" || role === "SALES") {
    redirect("/dashboard/orders");
  }
  if (role === "DELIVERY") {
    redirect("/dashboard/delivery");
  }

  redirect("/");
}
