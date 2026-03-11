import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { authOptions, canManageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit, logAuditBatch } from "@/lib/audit";
import { createAndSendTeamInvitation } from "@/lib/teamInvitations";

type RouteContext = { params: Promise<{ id: string }> };

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  phone: true,
  createdAt: true,
  createdById: true,
  createdBy: { select: { name: true } },
} as const;

async function assertAccess(
  session: { user: { id: string; role: string } },
  targetId: string,
) {
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: userSelect,
  });

  if (!target) return { error: "Usuario no encontrado", status: 404, target: null };

  if (session.user.role === "MASTER") return { error: null, status: 200, target };

  if (session.user.role === "ADMIN") {
    if (!["SALES", "DELIVERY"].includes(target.role) || target.createdById !== session.user.id) {
      return { error: "No autorizado para este usuario", status: 403, target: null };
    }
    return { error: null, status: 200, target };
  }

  return { error: "No autorizado", status: 401, target: null };
}

export async function GET(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { error, status, target } = await assertAccess(session, id);
  if (error) return NextResponse.json({ error }, { status });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdById, ...user } = target!;
  return NextResponse.json(user);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const { error, status, target } = await assertAccess(session, id);
  if (error) return NextResponse.json({ error }, { status });

  const current = target!;
  const body = await request.json();
  const { name, email, phone, role, active, password } = body as {
    name?: string;
    email?: string;
    phone?: string;
    role?: string;
    active?: boolean;
    password?: string;
  };

  if (role && !canManageRole(session.user.role, role)) {
    return NextResponse.json({ error: "No puede asignar ese rol" }, { status: 403 });
  }

  if (session.user.role === "MASTER" && current.role === "MASTER" && session.user.id !== id) {
    return NextResponse.json(
      { error: "No puede modificar a otro MASTER" },
      { status: 403 },
    );
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (email !== undefined && !normalizedEmail) {
    return NextResponse.json({ error: "El email no puede estar vacío" }, { status: 400 });
  }

  if (normalizedEmail) {
    const dup = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (dup && dup.id !== id) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
    }
  }

  if (password && password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  const audits: { field: string; oldValue: string | null; newValue: string | null }[] = [];

  if (name !== undefined && name !== current.name) {
    data.name = name.trim();
    audits.push({ field: "name", oldValue: current.name, newValue: name.trim() });
  }
  if (normalizedEmail !== undefined && normalizedEmail !== current.email) {
    data.email = normalizedEmail;
    audits.push({ field: "email", oldValue: current.email, newValue: normalizedEmail });
  }
  if (phone !== undefined && (phone || null) !== current.phone) {
    data.phone = phone?.trim() || null;
    audits.push({ field: "phone", oldValue: current.phone, newValue: phone?.trim() || null });
  }
  if (role !== undefined && role !== current.role) {
    data.role = role;
    audits.push({ field: "role", oldValue: current.role, newValue: role });
  }
  if (active !== undefined && active !== current.active) {
    data.active = active;
    audits.push({
      field: "active",
      oldValue: String(current.active),
      newValue: String(active),
    });
  }
  if (password) {
    data.passwordHash = await hash(password, 12);
    audits.push({ field: "password", oldValue: null, newValue: "[changed]" });
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No hay cambios" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });

  let invitationResent = false;
  let invitationError: string | null = null;
  if (normalizedEmail !== undefined && normalizedEmail !== current.email) {
    try {
      await createAndSendTeamInvitation({
        provider: "PRISMA",
        subjectId: updated.id,
        email: updated.email,
        role: updated.role,
        memberName: updated.name,
        createdById: session.user.id,
      });
      invitationResent = true;
    } catch (err) {
      console.error("resend invitation error:", err);
      invitationError = "No se pudo reenviar la invitación automáticamente";
    }
  }

  if (audits.length > 0) {
    await logAuditBatch(
      audits.map((a) => ({
        userId: session.user.id,
        action: "UPDATE" as const,
        entity: "User" as const,
        entityId: id,
        field: a.field,
        oldValue: a.oldValue,
        newValue: a.newValue,
      })),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdById, ...result } = updated;
  return NextResponse.json({ ...result, invitationResent, invitationError });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "No puede desactivarse a sí mismo" }, { status: 403 });
  }

  const { error, status, target } = await assertAccess(session, id);
  if (error) return NextResponse.json({ error }, { status });

  if (target!.role === "MASTER") {
    return NextResponse.json({ error: "No puede desactivar a un MASTER" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id },
    data: { active: false },
  });

  await logAudit({
    userId: session.user.id,
    action: "DELETE",
    entity: "User",
    entityId: id,
    field: "active",
    oldValue: "true",
    newValue: "false",
  });

  return NextResponse.json({ success: true, message: "Usuario desactivado" });
}
