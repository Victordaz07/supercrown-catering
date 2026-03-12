import { NextResponse } from "next/server";
import { resend } from "@/lib/email/resendClient";
import { generateOwnerEmail, generateCustomerEmail } from "@/lib/email/templates/legacyTemplates";
import { prisma } from "@/lib/db";
import { generateOrderNumber } from "@/lib/orderUtils";

const SIMULATE_MODE = !process.env.RESEND_API_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contactInfo, cartItems, budget, typeOfService } = body;

    const name = contactInfo?.name?.trim();
    const email = contactInfo?.email?.trim();
    const normalizedEmail = email?.toLowerCase();
    const deliveryAddress = contactInfo?.deliveryAddress?.trim();
    const eventDateStr = contactInfo?.eventDate?.trim();

    if (!name || !normalizedEmail) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    if (!deliveryAddress) {
      return NextResponse.json(
        { error: "Delivery address is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return NextResponse.json(
        { error: "Please add at least one item to your quote" },
        { status: 400 }
      );
    }

    const totalItems = cartItems.reduce(
      (sum: number, i: { quantity?: number }) => sum + (i.quantity ?? 0),
      0
    );

    const orderNumber = await generateOrderNumber();
    const eventDate = eventDateStr ? new Date(eventDateStr) : new Date();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: name,
        customerEmail: normalizedEmail,
        customerPhone: contactInfo?.phone?.trim() || null,
        deliveryAddress,
        eventDate,
        guestCount: contactInfo?.guestCount?.trim() || null,
        budget: budget ?? null,
        typeOfService: typeOfService ?? null,
        eventDetails: contactInfo?.eventDetails?.trim() || null,
        totalItems,
        status: "PENDING",
        items: {
          create: cartItems.map((i: { id: string; name: string; category: string; quantity: number }) => ({
            itemId: i.id,
            name: i.name,
            category: i.category,
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
    });

    const emailData = {
      customerName: name,
      customerEmail: normalizedEmail,
      customerPhone: contactInfo?.phone ?? "",
      deliveryAddress,
      eventDate: eventDateStr ?? "",
      guestCount: contactInfo?.guestCount ?? "",
      budget: budget ?? "",
      eventDetails: contactInfo?.eventDetails ?? "",
      items: cartItems,
      totalItems,
      orderNumber,
      dashboardUrl: `${SITE_URL}/dashboard/orders/${order.id}`,
    };

    if (SIMULATE_MODE) {
      console.log("[BETA] Order saved, simulated email:", emailData);
      return NextResponse.json({
        success: true,
        simulated: true,
        orderId: order.id,
        orderNumber,
      });
    }

    if (!resend) {
      console.warn("[Email] Sin cliente Resend configurado");
      return NextResponse.json({ success: true, simulated: true, orderId: order.id, orderNumber });
    }
    const ownerHtml = generateOwnerEmail(emailData);
    const customerHtml = generateCustomerEmail(emailData);

    const ownerEmail = process.env.OWNER_EMAIL;
    if (!ownerEmail) {
      throw new Error("OWNER_EMAIL is not configured");
    }

    await resend.emails.send({
      from: "quotes@supercrowncatering.com",
      to: ownerEmail,
      replyTo: normalizedEmail,
      subject: `[${orderNumber}] New Quote from ${name} — ${eventDateStr || "TBD"} — ${contactInfo?.guestCount || "—"} guests`,
      html: ownerHtml,
    });

    await resend.emails.send({
      from: "hello@supercrowncatering.com",
      to: normalizedEmail,
      subject: `We got your request, ${name}! — Super Crown Catering`,
      html: customerHtml,
    });

    return NextResponse.json({ success: true, orderId: order.id, orderNumber });
  } catch (err) {
    console.error("send-quote error:", err);
    return NextResponse.json(
      { error: "Failed to send quote request" },
      { status: 500 }
    );
  }
}
