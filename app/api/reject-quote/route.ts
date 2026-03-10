import { NextResponse } from "next/server";
import { Resend } from "resend";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { quoteId, reason } = body;

    if (!quoteId || !reason?.trim()) {
      return NextResponse.json(
        { error: "quoteId and reason are required" },
        { status: 400 }
      );
    }

    const quoteRef = adminDb.collection("quotes").doc(quoteId);
    const quoteSnap = await quoteRef.get();
    if (!quoteSnap.exists) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const data = quoteSnap.data()!;
    const clientEmail = data.clientEmail as string | undefined;
    const clientName = data.clientName as string | undefined;

    await quoteRef.update({
      status: "rejected",
      rejectionReason: reason.trim(),
      reviewedBy: FieldValue.serverTimestamp(),
    });

    if (process.env.RESEND_API_KEY && clientEmail) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "hello@supercrowncatering.com",
        to: clientEmail,
        subject: `Update on your quote request — Super Crown Catering`,
        html: `
          <p>Hi ${(clientName || "Customer").toString()},</p>
          <p>Thank you for your interest in Super Crown Catering. Unfortunately we are unable to fulfill your quote request at this time.</p>
          <p><strong>Reason:</strong> ${reason.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          <p>Please don't hesitate to reach out if you have questions or would like to submit a new request.</p>
          <p>— Super Crown Team</p>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("reject-quote error:", err);
    return NextResponse.json(
      { error: "Failed to reject quote" },
      { status: 500 }
    );
  }
}
