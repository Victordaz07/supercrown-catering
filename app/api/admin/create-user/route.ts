import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireAdminOrSales } from "@/lib/auth-server";
import {
  createAndSendTeamInvitation,
  generateProvisioningPassword,
} from "@/lib/teamInvitations";

export async function POST(request: Request) {
  let sessionUser;
  try {
    sessionUser = await requireAdminOrSales();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, name, role } = body as {
      email?: string;
      name?: string;
      role?: string;
    };
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const normalizedName = String(name ?? "").trim();

    if (!normalizedEmail || !normalizedName) {
      return NextResponse.json(
        { error: "email and name are required" },
        { status: 400 }
      );
    }

    const validRole = role === "admin" || role === "sales" || role === "driver" ? role : "driver";
    if (validRole === "admin" && sessionUser.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can create admin users" },
        { status: 403 }
      );
    }

    const user = await adminAuth.createUser({
      email: normalizedEmail,
      password: generateProvisioningPassword(),
      displayName: normalizedName,
      emailVerified: false,
      disabled: true,
    });

    await adminAuth.setCustomUserClaims(user.uid, { role: validRole });

    await adminDb.collection("users").doc(user.uid).set({
      email: user.email,
      name: normalizedName,
      role: validRole,
      createdAt: new Date(),
    });

    try {
      await createAndSendTeamInvitation({
        provider: "FIREBASE",
        subjectId: user.uid,
        email: normalizedEmail,
        role: validRole.toUpperCase(),
        memberName: normalizedName,
        createdById: sessionUser.uid,
      });
    } catch (inviteError) {
      console.error("create-user invitation error:", inviteError);
      await adminAuth.deleteUser(user.uid).catch(() => null);
      await adminDb.collection("users").doc(user.uid).delete().catch(() => null);
      return NextResponse.json(
        { error: "Could not send invitation email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      uid: user.uid,
      email: user.email,
      role: validRole,
      invitationSent: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists") || msg.includes("email address")) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }
    console.error("create-user error:", err);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
