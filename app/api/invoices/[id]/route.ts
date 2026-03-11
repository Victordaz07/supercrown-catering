import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit, logAuditBatch } from "@/lib/audit";

const ALLOWED_ROLES = ["MASTER", "ADMIN", "SALES"];

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SENT"],
  SENT: ["DELIVERED", "PAID", "OVERDUE", "VOID"],
  DELIVERED: ["PAID"],
  ADJUSTED: ["PAID"],
  OVERDUE: ["PAID"],
  PAID: ["REFUNDED"],
};

const VALID_PAYMENT_METHODS = ["CASH", "CHECK", "CARD", "TRANSFER", "OTHER"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          items: true,
        },
      },
      adjustments: {
        include: {
          approvedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const adjustmentSum = invoice.adjustments.reduce((sum, a) => sum + a.amount, 0);

  return NextResponse.json({
    ...invoice,
    adjustmentSum,
    adjustedTotal: invoice.total + adjustmentSum,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !ALLOWED_ROLES.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, paymentMethod, paymentRef, notes, dueDate } = body;

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  const auditEntries: Parameters<typeof logAudit>[0][] = [];
  const userId = session.user.id;

  if (status && status !== invoice.status) {
    const allowed = VALID_TRANSITIONS[invoice.status];
    if (!allowed || !allowed.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid transition: ${invoice.status} → ${status}`,
          allowedTransitions: allowed ?? [],
        },
        { status: 400 }
      );
    }

    if (status === "PAID") {
      const method = paymentMethod ?? body.paymentMethod;
      if (!method || !VALID_PAYMENT_METHODS.includes(method)) {
        return NextResponse.json(
          { error: "paymentMethod is required when marking as PAID", validMethods: VALID_PAYMENT_METHODS },
          { status: 400 }
        );
      }
      updateData.paymentMethod = method;
      updateData.paidAt = new Date();

      if (invoice.paymentMethod !== method) {
        auditEntries.push({
          userId,
          action: "PAYMENT",
          entity: "Invoice",
          entityId: id,
          field: "paymentMethod",
          oldValue: invoice.paymentMethod,
          newValue: method,
        });
      }
      auditEntries.push({
        userId,
        action: "PAYMENT",
        entity: "Invoice",
        entityId: id,
        field: "paidAt",
        oldValue: invoice.paidAt?.toISOString() ?? null,
        newValue: (updateData.paidAt as Date).toISOString(),
      });
    }

    updateData.status = status;
    auditEntries.push({
      userId,
      action: "STATUS_CHANGE",
      entity: "Invoice",
      entityId: id,
      field: "status",
      oldValue: invoice.status,
      newValue: status,
    });
  }

  if (paymentRef !== undefined && paymentRef !== invoice.paymentRef) {
    updateData.paymentRef = paymentRef;
    auditEntries.push({
      userId,
      action: "UPDATE",
      entity: "Invoice",
      entityId: id,
      field: "paymentRef",
      oldValue: invoice.paymentRef,
      newValue: paymentRef,
    });
  }

  if (notes !== undefined && notes !== invoice.notes) {
    updateData.notes = notes;
    auditEntries.push({
      userId,
      action: "UPDATE",
      entity: "Invoice",
      entityId: id,
      field: "notes",
      oldValue: invoice.notes,
      newValue: notes,
    });
  }

  if (dueDate !== undefined) {
    const newDue = dueDate ? new Date(dueDate) : null;
    const oldDueStr = invoice.dueDate?.toISOString() ?? null;
    const newDueStr = newDue?.toISOString() ?? null;

    if (oldDueStr !== newDueStr) {
      updateData.dueDate = newDue;
      auditEntries.push({
        userId,
        action: "UPDATE",
        entity: "Invoice",
        entityId: id,
        field: "dueDate",
        oldValue: oldDueStr,
        newValue: newDueStr,
      });
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: updateData,
    include: {
      order: {
        select: { customerName: true, orderNumber: true },
      },
      adjustments: {
        select: { amount: true },
      },
    },
  });

  if (auditEntries.length > 0) {
    await logAuditBatch(auditEntries);
  }

  const adjustmentSum = updated.adjustments.reduce((sum, a) => sum + a.amount, 0);

  return NextResponse.json({
    ...updated,
    adjustmentSum,
    adjustedTotal: updated.total + adjustmentSum,
  });
}
