import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { resend } from "@/lib/email/resendClient";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { transitionOrderStatus } from "@/lib/orders/transitionGateway";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const allowedRoles = ["DELIVERY", "ADMIN", "MASTER"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: "No tienes permiso para confirmar entregas" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { deliveryId, receivedBy, signature, photoUrl, notes } = body;

    if (!deliveryId || !receivedBy?.trim()) {
      return NextResponse.json(
        { error: "deliveryId and receivedBy are required" },
        { status: 400 }
      );
    }

    const deliveryRef = adminDb.collection("deliveries").doc(deliveryId);
    const deliverySnap = await deliveryRef.get();
    if (!deliverySnap.exists) {
      return NextResponse.json({ error: "Delivery not found" }, { status: 404 });
    }

    const deliveryData = deliverySnap.data()!;
    const orderId = deliveryData.orderId as string;

    if (orderId) {
      const transitionResult = await transitionOrderStatus(
        orderId,
        "DELIVERED",
        session.user.id,
        session.user.role,
        "Entrega confirmada por driver",
        "confirm-delivery",
      );
      if (!transitionResult.success) {
        console.error("[confirm-delivery] Transition failed:", transitionResult.error);
        return NextResponse.json(
          { error: transitionResult.error ?? "No se pudo actualizar el estado de la orden" },
          { status: 400 },
        );
      }
    }

    await deliveryRef.update({
      status: "delivered",
      confirmedAt: FieldValue.serverTimestamp(),
      receivedBy: receivedBy.trim(),
      driverSignature: signature || null,
      photoUrl: photoUrl || null,
      notes: notes?.trim() || null,
    });

    if (orderId && resend) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { customerEmail: true, customerName: true },
      });
      const clientEmail = order?.customerEmail;
      const clientName = order?.customerName;

      if (clientEmail) {
        await resend.emails.send({
          from: "hello@supercrowncatering.com",
          to: clientEmail,
          subject: "Your order has been delivered — Super Crown Catering",
          html: `
            <p>Hi ${(clientName || "Customer").toString()},</p>
            <p>Your order has been delivered successfully!</p>
            <p><strong>Received by:</strong> ${receivedBy.trim()}</p>
            <p>Thank you for choosing Super Crown Catering!</p>
            <p>— Super Crown Team</p>
          `,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("confirm-delivery error:", err);
    return NextResponse.json(
      { error: "Failed to confirm delivery" },
      { status: 500 }
    );
  }
}
