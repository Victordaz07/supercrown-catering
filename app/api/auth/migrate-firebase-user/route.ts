import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { adminAuth } from "@/lib/firebase/admin";

type FirebaseAuthResponse = {
  email?: string;
  localId?: string;
  displayName?: string;
  idToken?: string;
};

function normalizeEmail(email: string) {
  return String(email).trim().toLowerCase();
}

function inferRole(rawRole: unknown): "MASTER" | "ADMIN" | "SALES" | "DELIVERY" | "CLIENT" {
  const role = String(rawRole ?? "").trim().toLowerCase();
  if (role === "master") return "MASTER";
  if (role === "admin") return "ADMIN";
  if (role === "sales") return "SALES";
  if (role === "driver" || role === "delivery") return "DELIVERY";
  return "CLIENT";
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function authenticateFirebaseUser(email: string, password: string): Promise<FirebaseAuthResponse | null> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!apiKey) return null;

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
      cache: "no-store",
    }
  );

  if (!response.ok) return null;
  return (await response.json()) as FirebaseAuthResponse;
}

async function readRoleFromIdToken(idToken: string): Promise<"MASTER" | "ADMIN" | "SALES" | "DELIVERY" | "CLIENT"> {
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return inferRole(decoded.role);
  } catch {
    const payload = decodeJwtPayload(idToken);
    return inferRole(payload?.role);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email ?? "");
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const firebaseUser = await authenticateFirebaseUser(email, password);
    if (!firebaseUser?.idToken) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const normalizedFirebaseEmail = normalizeEmail(firebaseUser.email ?? email);
    const firebaseRole = await readRoleFromIdToken(firebaseUser.idToken);
    const nameFromFirebase =
      String(firebaseUser.displayName ?? "").trim() ||
      normalizedFirebaseEmail.split("@")[0] ||
      "Team Member";
    const passwordHash = await hash(password, 12);

    const existing = await prisma.user.findUnique({
      where: { email: normalizedFirebaseEmail },
      select: { id: true, role: true, name: true },
    });

    const targetRole = existing?.role || firebaseRole;

    if (existing) {
      await prisma.user.update({
        where: { email: normalizedFirebaseEmail },
        data: {
          passwordHash,
          active: true,
          name: existing.name?.trim() ? existing.name : nameFromFirebase,
          role: targetRole,
        },
      });
    } else {
      await prisma.user.create({
        data: {
          email: normalizedFirebaseEmail,
          passwordHash,
          name: nameFromFirebase,
          role: targetRole,
          active: true,
        },
      });
    }

    return NextResponse.json({ success: true, role: targetRole });
  } catch (error) {
    console.error("migrate-firebase-user error:", error);
    return NextResponse.json(
      { error: "Could not migrate user" },
      { status: 500 }
    );
  }
}
