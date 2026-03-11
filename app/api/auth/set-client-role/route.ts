import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

/**
 * Assigns 'client' role to a newly registered user.
 * Only users without role or with 'client' role can use this endpoint.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, name } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "idToken is required" },
        { status: 400 }
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email ?? null;
    const existingRole = decoded.role as string | undefined;

    if (existingRole === "sales" || existingRole === "driver") {
      return NextResponse.json(
        { error: "Cannot change role for team members" },
        { status: 403 }
      );
    }

    await adminAuth.setCustomUserClaims(uid, { role: "client" });

    await adminDb.collection("users").doc(uid).set(
      {
        email,
        name: (name && String(name).trim()) || email || "Client",
        role: "client",
        createdAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("set-client-role error:", err);
    return NextResponse.json(
      { error: "Failed to set client role" },
      { status: 500 }
    );
  }
}
