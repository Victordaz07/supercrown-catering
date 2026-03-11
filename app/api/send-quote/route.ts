import { Resend } from "resend";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { generateOwnerEmail, generateCustomerEmail } from "@/lib/emailTemplates";
import { getSessionUser } from "@/lib/auth-server";

/** Beta mode: when RESEND_API_KEY is not set, simulate the send (log payload, return success) */
const SIMULATE_MODE = !process.env.RESEND_API_KEY;

export async function POST(request: Request) {
  try {
    let sessionUser = null;
    try {
      sessionUser = await getSessionUser();
    } catch (authErr) {
      console.warn("Session check failed (continuing without clientId):", authErr);
    }

    const body = await request.json();
    const { contactInfo, cartItems, budget } = body;

    const name = contactInfo?.name?.trim();
    const email = contactInfo?.email?.trim();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { error: "Please add at least one item to your quote" },
        { status: 400 }
      );
    }

    const deliveryAddress =
      contactInfo?.deliveryAddress?.trim() || "";
    if (!deliveryAddress) {
      return NextResponse.json(
        { error: "Delivery address is required" },
        { status: 400 }
      );
    }

    const totalItems = cartItems.reduce(
      (sum: number, i: { quantity?: number }) => sum + (i.quantity ?? 0),
      0
    );

    // 1. Save quote to Firestore (before emails)
    const quoteRef = adminDb.collection("quotes").doc();
    const quoteId = quoteRef.id;

    await quoteRef.set({
      clientId: sessionUser?.uid ?? null,
      clientName: name,
      clientEmail: email,
      clientPhone: contactInfo?.phone?.trim() || null,
      eventDate: contactInfo?.eventDate || null,
      guestCount: contactInfo?.guestCount || null,
      deliveryAddress,
      budget: budget || null,
      eventDetails: contactInfo?.eventDetails?.trim() || null,
      typeOfService: contactInfo?.typeOfService || null,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
      reviewedBy: null,
      rejectionReason: null,
    });

    // 2. Save items as subcollection
    const itemsRef = quoteRef.collection("items");
    const batch = adminDb.batch();
    for (const item of cartItems) {
      const itemRef = itemsRef.doc();
      batch.set(itemRef, {
        productId: item.id,
        productName: item.name,
        category: item.category,
        quantity: item.quantity ?? 1,
        unitPrice: null,
        subtotal: null,
      });
    }
    await batch.commit();

    const emailData = {
      customerName: name,
      customerEmail: email,
      eventDate: contactInfo?.eventDate ?? "",
      guestCount: contactInfo?.guestCount ?? "",
      budget: budget ?? "",
      eventDetails: contactInfo?.eventDetails ?? "",
      deliveryAddress,
      quoteId,
      items: cartItems,
      totalItems,
    };

    if (SIMULATE_MODE) {
      console.log("[BETA] Simulated quote request:", {
        ...emailData,
        quoteId,
        ownerEmail: process.env.OWNER_EMAIL || "(not set)",
      });
      return NextResponse.json({
        success: true,
        quoteId,
        simulated: true,
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY!);
    const ownerHtml = generateOwnerEmail(emailData);
    const customerHtml = generateCustomerEmail(emailData);

    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
      throw new Error("OWNER_EMAIL is not configured");
    }

    await resend.emails.send({
      from: "quotes@supercrowncatering.com",
      to: ownerEmail,
      replyTo: email,
      subject: `New Quote #${quoteId.slice(-6)} from ${name} — ${emailData.eventDate || "TBD"} — ${emailData.guestCount || "—"} guests`,
      html: ownerHtml,
    });

    await resend.emails.send({
      from: "hello@supercrowncatering.com",
      to: email,
      subject: `We got your request, ${name}! — Super Crown Catering`,
      html: customerHtml,
    });

    return NextResponse.json({ success: true, quoteId });
  } catch (err) {
    console.error("send-quote error:", err);
    const msg = err instanceof Error ? err.message : "";
    const isAdminError = msg.includes("Missing Firebase Admin") || msg.includes("FIREBASE_ADMIN");
    return NextResponse.json(
      {
        error: isAdminError
          ? "Configure Firebase Admin: run 'npm run setup:admin' and redeploy."
          : "Could not send the quote. Please try again.",
      },
      { status: 500 }
    );
  }
}
