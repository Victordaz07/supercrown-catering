import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateQuoteNumber } from "@/lib/quoteUtils";
import { resend } from "@/lib/email/resendClient";

const SIMULATE_MODE = !process.env.RESEND_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type CartItem = { id: string; name: string; category: string; quantity: number };

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contactInfo, cartItems, budget, typeOfService } = body as {
      contactInfo: Record<string, unknown>;
      cartItems: CartItem[];
      budget?: string;
      typeOfService?: string;
    };

    const name = String(contactInfo?.name ?? "").trim();
    const email = String(contactInfo?.email ?? "").trim();
    const normalizedEmail = email.toLowerCase();
    const deliveryAddress = String(contactInfo?.deliveryAddress ?? "").trim();
    const eventDateStr = String(contactInfo?.eventDate ?? "").trim();

    if (!name || !normalizedEmail) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }
    if (!deliveryAddress) {
      return NextResponse.json({ error: "Delivery address is required" }, { status: 400 });
    }
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json({ error: "Please add at least one item to your quote" }, { status: 400 });
    }

    const eventDate = eventDateStr ? new Date(eventDateStr) : new Date();
    const expiryDays = Number.parseInt(process.env.QUOTE_EXPIRY_DAYS ?? "30", 10);
    const safeExpiryDays = Number.isFinite(expiryDays) && expiryDays > 0 ? expiryDays : 30;
    const expiresAt = new Date(Date.now() + safeExpiryDays * 24 * 60 * 60 * 1000);

    const session = await getServerSession(authOptions);
    const clientId = session?.user?.role === "CLIENT" ? session.user.id : null;

    const quoteNumber = await generateQuoteNumber();
    const itemsSnapshot = cartItems.map((i) => ({
      itemId: i.id,
      name: i.name,
      category: i.category,
      quantity: i.quantity,
    }));

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        clientId,
        clientName: name,
        clientEmail: normalizedEmail,
        clientPhone: String(contactInfo?.phone ?? "").trim() || null,
        deliveryAddress,
        eventDate,
        guestCount: String(contactInfo?.guestCount ?? "").trim() || null,
        budget: budget ?? null,
        typeOfService: typeOfService ?? null,
        eventDetails: String(contactInfo?.eventDetails ?? "").trim() || null,
        status: "REQUESTED",
        expiresAt,
        revisions: {
          create: {
            revisionNumber: 1,
            createdByRole: "CLIENT",
            itemsJson: JSON.stringify(itemsSnapshot),
          },
        },
      },
      include: { revisions: true },
    });

    const ownerEmail = process.env.OWNER_EMAIL;
    if (SIMULATE_MODE) {
      console.log("[BETA] Quote saved, simulated notify sales:", {
        quoteId: quote.id,
        quoteNumber,
        customerName: name,
        customerEmail: normalizedEmail,
      });
      return NextResponse.json({ success: true, simulated: true, quoteId: quote.id, quoteNumber });
    }
    if (!ownerEmail) throw new Error("OWNER_EMAIL is not configured");
    if (!resend) {
      console.warn("[Email] Sin cliente Resend configurado");
      return NextResponse.json({ success: true, simulated: true, quoteId: quote.id, quoteNumber });
    }

    await resend.emails.send({
      from: "quotes@supercrowncatering.com",
      to: ownerEmail,
      replyTo: normalizedEmail,
      subject: `[${quoteNumber}] New quote request from ${name} — ${eventDateStr || "TBD"}`,
      html: `
        <p><strong>New quote request</strong></p>
        <p><strong>Client:</strong> ${name} (${normalizedEmail})</p>
        <p><strong>Delivery:</strong> ${deliveryAddress}</p>
        <p><strong>Event date:</strong> ${eventDateStr || "TBD"}</p>
        <p><a href="${SITE_URL}/dashboard/sales/quotes/${quote.id}">Open in dashboard</a></p>
      `,
    });

    return NextResponse.json({ success: true, quoteId: quote.id, quoteNumber });
  } catch (err) {
    console.error("POST /api/quotes/request:", err);
    return NextResponse.json({ error: "Failed to create quote request" }, { status: 500 });
  }
}

