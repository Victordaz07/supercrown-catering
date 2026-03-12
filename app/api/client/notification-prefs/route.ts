import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const KNOWN_KEYS = ["email", "statusUpdates", "invoices", "quotes"] as const;

function isValidPrefs(obj: unknown): obj is Record<string, boolean> {
  if (!obj || typeof obj !== "object") return false;
  for (const [k, v] of Object.entries(obj)) {
    if (!KNOWN_KEYS.includes(k as (typeof KNOWN_KEYS)[number])) return false;
    if (typeof v !== "boolean") return false;
  }
  return true;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const prefs = (user.notificationPrefs as Record<string, boolean>) ?? {};
  return NextResponse.json({
    email: prefs.email !== false,
    statusUpdates: prefs.statusUpdates !== false,
    invoices: prefs.invoices !== false,
    quotes: prefs.quotes !== false,
  });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CLIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (!isValidPrefs(body)) {
    return NextResponse.json(
      { error: "Invalid prefs: only email, statusUpdates, invoices, quotes (boolean)" },
      { status: 400 },
    );
  }

  const filtered: Record<string, boolean> = {};
  for (const k of KNOWN_KEYS) {
    if (k in body) filtered[k] = body[k];
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user || user.id !== session.user.id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = (user.notificationPrefs as Record<string, boolean>) ?? {};
  const merged = { ...existing, ...filtered };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationPrefs: merged },
  });

  return NextResponse.json({
    email: merged.email !== false,
    statusUpdates: merged.statusUpdates !== false,
    invoices: merged.invoices !== false,
    quotes: merged.quotes !== false,
  });
}
