import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getRequiredApprovers,
  shouldAutoApprove,
} from "@/lib/adjustments/authorizationRules";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (
    !session ||
    !["SALES", "ADMIN", "MASTER"].includes(session.user.role)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const deltaParam = searchParams.get("delta");
  const delta = deltaParam ? parseFloat(deltaParam) : 0;

  if (Number.isNaN(delta) || delta < 0) {
    return NextResponse.json(
      { error: "delta debe ser un número positivo" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    requiredApprovers: getRequiredApprovers(delta),
    autoApprove: shouldAutoApprove(delta),
  });
}
