import { NextResponse } from "next/server";
import { getValidInvitationByToken } from "@/lib/teamInvitations";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = String(searchParams.get("token") ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const invitation = await getValidInvitationByToken(token);
  if (!invitation) {
    return NextResponse.json({ error: "Invitation is invalid or expired" }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    email: invitation.email,
    role: invitation.role,
    provider: invitation.provider,
    expiresAt: invitation.expiresAt,
  });
}
