import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkOrderClosure } from "@/lib/orders/closeOrder";

const ALLOWED_ROLES = ["ADMIN", "MASTER"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await params;

  const result = await checkOrderClosure(orderId);
  return NextResponse.json(result);
}
