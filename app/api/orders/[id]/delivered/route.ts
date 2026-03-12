import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { transitionOrderStatus } from "@/lib/orders/transitionGateway";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !["SALES", "DELIVERY"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const transitionResult = await transitionOrderStatus(
    id,
    "DELIVERED",
    session.user.id,
    session.user.role,
    undefined,
    "api/orders/[id]/delivered#POST",
  );
  if (!transitionResult.success) {
    return NextResponse.json({ error: transitionResult.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
