import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireAdminOrSales } from "@/lib/auth-server";

export async function POST(request: Request) {
  try {
    const sessionUser = await requireAdminOrSales();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name?.trim()) {
      return NextResponse.json(
        { error: "email, password, and name are required" },
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

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const user = await adminAuth.createUser({
      email: String(email).trim(),
      password: String(password),
      displayName: String(name).trim(),
      emailVerified: false,
    });

    await adminAuth.setCustomUserClaims(user.uid, { role: validRole });

    await adminDb.collection("users").doc(user.uid).set({
      email: user.email,
      name: String(name).trim(),
      role: validRole,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      uid: user.uid,
      email: user.email,
      role: validRole,
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
