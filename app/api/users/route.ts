import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions, creatableRoles } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  createAndSendTeamInvitation,
  generateProvisioningPassword,
} from "@/lib/teamInvitations";

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
  if (!session || !["MASTER", "ADMIN", "SALES"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get("role");
  const activeFilter = searchParams.get("active");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (session.user.role === "SALES") {
    where.role = "DELIVERY";
    if (roleFilter && roleFilter !== "DELIVERY") {
      return NextResponse.json([], { status: 200 });
    }
  } else if (session.user.role === "ADMIN") {
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
  const { email, name, role, phone } = body as {
    email?: string;
    name?: string;
    role?: string;
    phone?: string;
  };

  if (!email?.trim()) {
    return NextResponse.json({ error: "El email es requerido" }, { status: 400 });
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!name?.trim()) {
    return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
  }
  if (!role || !creatableRoles(session.user.role).includes(role)) {
    return NextResponse.json(
      { error: `Rol inválido. Roles permitidos: ${creatableRoles(session.user.role).join(", ")}` },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }

  let user;
  try {
    const passwordHash = await hash(generateProvisioningPassword(), 12);
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        role,
        active: false,
        phone: phone?.trim() || null,
        createdById: session.user.id,
      },
      select: userSelect,
    });

    await createAndSendTeamInvitation({
      provider: "PRISMA",
      subjectId: user.id,
      email: user.email,
      role: user.role,
      memberName: user.name,
      createdById: session.user.id,
    });
  } catch (err) {
    if (user?.id) {
      await prisma.user.delete({ where: { id: user.id } }).catch(() => null);
    }
    console.error("user invite error:", err);
    return NextResponse.json({ error: "No se pudo enviar la invitación" }, { status: 500 });
  }

  await logAudit({
    userId: session.user.id,
    action: "CREATE",
    entity: "User",
    entityId: user.id,
    metadata: { email: user.email, role: user.role, name: user.name, invite: true },
  });

  return NextResponse.json(user, { status: 201 });
}
