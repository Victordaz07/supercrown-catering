import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { executeTransition } from "@/lib/orders/stateMachine";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN", "SALES"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const action = String(body.action || "").toLowerCase();
  const reviewNote = (body.reviewNote as string | undefined)?.trim() || null;

  const req = await prisma.orderStatusRequest.findUnique({
    where: { id },
    include: { order: true },
  });
  if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (req.status !== "PENDING") {
    return NextResponse.json({ error: "Only pending requests can be processed" }, { status: 400 });
  }

  if (action === "cancel") {
    if (session.user.role === "SALES" && req.requestedById !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updated = await prisma.orderStatusRequest.update({
      where: { id },
      data: {
        status: "CANCELLED",
        reviewNote,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "OrderStatusRequest",
      entityId: id,
      field: "status",
      oldValue: "PENDING",
      newValue: "CANCELLED",
      metadata: { reviewNote: reviewNote || "" },
    });

    return NextResponse.json(updated);
  }

  if (!["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Only ADMIN/MASTER can approve or reject" }, { status: 401 });
  }

  if (action === "reject") {
    const updated = await prisma.orderStatusRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewNote,
        reviewedById: session.user.id,
        reviewedAt: new Date(),
      },
    });

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "OrderStatusRequest",
      entityId: id,
      field: "status",
      oldValue: "PENDING",
      newValue: "REJECTED",
      metadata: { reviewNote: reviewNote || "" },
    });

    return NextResponse.json(updated);
  }

  if (action === "approve") {
    let updated;
    try {
      updated = await prisma.$transaction(async (tx) => {
        const requestUpdated = await tx.orderStatusRequest.update({
          where: { id },
          data: {
            status: "APPROVED",
            reviewNote,
            reviewedById: session.user.id,
            reviewedAt: new Date(),
          },
        });

        const transitionResult = await executeTransition(
          req.orderId,
          req.requestedStatus,
          session.user.id,
          session.user.role,
          reviewNote ?? req.reason ?? undefined,
          {
            skipApprovalCheck: true,
            tx,
            source: "api/order-status-requests/[id]#approve",
          },
        );

        if (!transitionResult.success) {
          throw new Error(transitionResult.error ?? "No fue posible aplicar la transicion aprobada");
        }

        return requestUpdated;
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "No fue posible aprobar la solicitud" },
        { status: 400 },
      );
    }

    await logAudit({
      userId: session.user.id,
      action: "STATUS_CHANGE",
      entity: "Order",
      entityId: req.orderId,
      field: "status",
      oldValue: req.currentStatus,
      newValue: req.requestedStatus,
      metadata: { requestId: id, approvedBy: session.user.id },
    });

    await logAudit({
      userId: session.user.id,
      action: "UPDATE",
      entity: "OrderStatusRequest",
      entityId: id,
      field: "status",
      oldValue: "PENDING",
      newValue: "APPROVED",
      metadata: { orderId: req.orderId, reviewNote: reviewNote || "" },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
