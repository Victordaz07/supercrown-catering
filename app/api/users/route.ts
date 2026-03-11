import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcryptjs from "bcryptjs";
const { hash } = bcryptjs;
import { authOptions, creatableRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  phone: true,
  createdAt: true,
  createdBy: { select: { name: true } },
} as const;

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get("role");
  const activeFilter = searchParams.get("active");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (session.user.role === "ADMIN") {
    where.createdById = session.user.id;
    where.role = { in: ["SALES", "DELIVERY"] };
  }

  if (roleFilter) {
    if (session.user.role === "ADMIN" && !["SALES", "DELIVERY"].includes(roleFilter)) {
      return NextResponse.json([], { status: 200 });
    }
    where.role = roleFilter;
  }

  if (activeFilter !== null && activeFilter !== undefined) {
    where.active = activeFilter === "true";
  }

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: userSelect,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await request.json();
  const { email, password, name, role, phone } = body as {
    email?: string;
    password?: string;
    name?: string;
    role?: string;
    phone?: string;
  };

  if (!email?.trim()) {
    return NextResponse.json({ error: "El email es requerido" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 },
    );
  }
  if (!name?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }
  if (!role || !creatableRoles(session.user.role).includes(role)) {
    return NextResponse.json(
      { error: `Rol inválido. Roles permitidos: ${creatableRoles(session.user.role).join(", ")}` },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: email.trim(),
      passwordHash,
      name: name.trim(),
      role,
      phone: phone?.trim() || null,
      createdById: session.user.id,
    },
    select: userSelect,
  });

  await logAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "User",
    entityId: user.id,
    metadata: { email: user.email, role: user.role, name: user.name },
  });

  return NextResponse.json(user, { status: 201 });
}
