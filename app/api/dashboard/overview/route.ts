import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/dashboard/data";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN", "SALES", "DELIVERY"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getDashboardOverview(session.user.role, session.user.id);
  return NextResponse.json(data);
}
