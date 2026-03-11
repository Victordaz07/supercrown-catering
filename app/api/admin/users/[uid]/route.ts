import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireAdminOrSales } from "@/lib/auth-server";
import { createAndSendTeamInvitation } from "@/lib/teamInvitations";

type RouteContext = { params: Promise<{ uid: string }> };

const VALID_ROLES = new Set(["admin", "sales", "driver"]);

export async function PATCH(request: Request, { params }: RouteContext) {
  let sessionUser;
  try {
    sessionUser = await requireAdminOrSales();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (sessionUser.role !== "admin") {
    return NextResponse.json(
      { error: "Only admins can edit team members" },
      { status: 403 }
    );
  }

  const { uid } = await params;

  try {
    const body = await request.json();
    const name = body.name === undefined ? undefined : String(body.name).trim();
    const email =
      body.email === undefined ? undefined : String(body.email).trim().toLowerCase();
    const role = body.role === undefined ? undefined : String(body.role).trim().toLowerCase();

    if (name !== undefined && !name) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    if (email !== undefined && !email) {
      return NextResponse.json({ error: "Email cannot be empty" }, { status: 400 });
    }
    if (role !== undefined && !VALID_ROLES.has(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const currentUser = await adminAuth.getUser(uid);
    const currentRole =
      typeof currentUser.customClaims?.role === "string"
        ? String(currentUser.customClaims?.role)
        : null;

    if (role === "admin" && sessionUser.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can assign admin role" },
        { status: 403 }
      );
    }

    if (email && email !== (currentUser.email ?? "").toLowerCase()) {
      try {
        const existing = await adminAuth.getUserByEmail(email);
        if (existing.uid !== uid) {
          return NextResponse.json(
            { error: "A user with this email already exists" },
            { status: 409 }
          );
        }
      } catch {
        // Email not found; continue.
      }
    }

    const authUpdates: { email?: string; displayName?: string; emailVerified?: boolean } = {};
    if (name !== undefined && name !== (currentUser.displayName ?? "")) {
      authUpdates.displayName = name;
    }
    if (email !== undefined && email !== (currentUser.email ?? "").toLowerCase()) {
      authUpdates.email = email;
      authUpdates.emailVerified = false;
    }

    if (Object.keys(authUpdates).length > 0) {
      await adminAuth.updateUser(uid, authUpdates);
    }

    if (role !== undefined && role !== currentRole) {
      await adminAuth.setCustomUserClaims(uid, { role });
    }

    const firestoreUpdates: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) firestoreUpdates.name = name;
    if (email !== undefined) firestoreUpdates.email = email;
    if (role !== undefined) firestoreUpdates.role = role;
    await adminDb.collection("users").doc(uid).set(firestoreUpdates, { merge: true });

    let invitationResent = false;
    let invitationError: string | null = null;
    if (email !== undefined && email !== (currentUser.email ?? "").toLowerCase()) {
      try {
        await createAndSendTeamInvitation({
          provider: "FIREBASE",
          subjectId: uid,
          email,
          role: (role ?? currentRole ?? "driver").toUpperCase(),
          memberName: name ?? currentUser.displayName ?? undefined,
          createdById: sessionUser.uid,
        });
        invitationResent = true;
      } catch (err) {
        console.error("firebase resend invitation error:", err);
        invitationError = "Could not resend invitation email";
      }
    }

    const updatedUser = await adminAuth.getUser(uid);
    return NextResponse.json({
      success: true,
      uid,
      email: updatedUser.email,
      name: updatedUser.displayName,
      role:
        typeof updatedUser.customClaims?.role === "string"
          ? String(updatedUser.customClaims?.role)
          : role ?? currentRole ?? "driver",
      invitationResent,
      invitationError,
    });
  } catch (err) {
    console.error("admin users PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update team member" },
      { status: 500 }
    );
  }
}
