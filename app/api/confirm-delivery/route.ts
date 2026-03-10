import { NextResponse } from "next/server";
import { Resend } from "resend";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
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

    await deliveryRef.update({
      status: "delivered",
      confirmedAt: FieldValue.serverTimestamp(),
      receivedBy: receivedBy.trim(),
      driverSignature: signature || null,
      photoUrl: photoUrl || null,
      notes: notes?.trim() || null,
    });

    if (orderId) {
      const orderRef = adminDb.collection("orders").doc(orderId);
      await orderRef.update({ status: "delivered" });

      const orderSnap = await orderRef.get();
      const orderData = orderSnap.exists ? orderSnap.data()! : {};
      const clientEmail = orderData.clientEmail as string | undefined;
      const clientName = orderData.clientName as string | undefined;

      if (process.env.RESEND_API_KEY && clientEmail) {
        const resend = new Resend(process.env.RESEND_API_KEY);
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
