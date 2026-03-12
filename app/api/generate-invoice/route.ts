import { NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { resend } from "@/lib/email/resendClient";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      orderId,
      clientName,
      clientEmail,
      deliveryAddress,
      items,
      subtotal,
      taxRate,
      tax,
      total,
    } = body;

    if (!orderId || !clientEmail || !items?.length || typeof total !== "number") {
      return NextResponse.json(
        { error: "Missing required fields: orderId, clientEmail, items, total" },
        { status: 400 }
      );
    }

    const counterRef = adminDb.collection("counters").doc("invoices");
    const nextNum = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(counterRef);
      const current = snap.exists && typeof snap.data()?.value === "number"
        ? snap.data()!.value
        : 0;
      const next = current + 1;
      tx.set(counterRef, { value: next }, { merge: true });
      return next;
    });

    const year = new Date().getFullYear();
    const invoiceNumber = `SCF-${year}-${String(nextNum).padStart(4, "0")}`;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    let y = 750;

    const dark = rgb(0.165, 0.145, 0.125);
    const muted = rgb(0.54, 0.5, 0.44);
    const terracotta = rgb(0.71, 0.38, 0.165);

    page.drawText("SUPER CROWN CATERING", { x: 50, y, size: 24, font: fontBold, color: dark });
    y -= 18;
    page.drawText("Fresh meals for every occasion", { x: 50, y, size: 10, font, color: muted });
    y -= 24;

    page.drawText(`Invoice: ${invoiceNumber}`, { x: 50, y, size: 12, font: fontBold, color: terracotta });
    y -= 24;

    page.drawText("BILL TO / DELIVER TO", { x: 50, y, size: 10, font: fontBold, color: muted });
    y -= 14;
    page.drawText(clientName || clientEmail, { x: 50, y, size: 11, font, color: dark });
    y -= 12;
    page.drawText(clientEmail, { x: 50, y, size: 10, font, color: dark });
    y -= 12;
    if (deliveryAddress) {
      page.drawText(deliveryAddress, { x: 50, y, size: 10, font, color: dark });
      y -= 12;
    }
    y -= 12;

    page.drawText("ITEMS", { x: 50, y, size: 10, font: fontBold, color: muted });
    y -= 14;
    page.drawText("Item", { x: 50, y, size: 9, font: fontBold, color: dark });
    page.drawText("Qty", { x: 350, y, size: 9, font: fontBold, color: dark });
    page.drawText("Unit $", { x: 400, y, size: 9, font: fontBold, color: dark });
    page.drawText("Subtotal", { x: 500, y, size: 9, font: fontBold, color: dark });
    y -= 12;

    for (const item of items) {
      const name = (item.productName || item.name || "Item").toString().slice(0, 40);
      const qty = item.quantity ?? 1;
      const unitPrice = item.unitPrice ?? 0;
      const subtotalItem = (item.subtotal ?? unitPrice * qty) as number;
      page.drawText(name, { x: 50, y, size: 9, font, color: dark });
      page.drawText(String(qty), { x: 350, y, size: 9, font, color: dark });
      page.drawText(unitPrice.toFixed(2), { x: 400, y, size: 9, font, color: dark });
      page.drawText(subtotalItem.toFixed(2), { x: 500, y, size: 9, font, color: dark });
      y -= 14;
    }
    y -= 8;

    page.drawText("Subtotal:", { x: 400, y, size: 10, font, color: dark });
    page.drawText(`$${(subtotal ?? total).toFixed(2)}`, { x: 500, y, size: 10, font, color: dark });
    y -= 14;
    if (tax !== undefined && tax !== null) {
      page.drawText(`Tax (${((taxRate ?? 0) * 100).toFixed(0)}%):`, { x: 400, y, size: 10, font, color: dark });
      page.drawText(`$${Number(tax).toFixed(2)}`, { x: 500, y, size: 10, font, color: dark });
      y -= 14;
    }
    page.drawText("TOTAL:", { x: 400, y, size: 11, font: fontBold, color: terracotta });
    page.drawText(`$${Number(total).toFixed(2)}`, { x: 500, y, size: 11, font: fontBold, color: terracotta });
    y -= 36;

    page.drawText("DELIVERED BY: _________________________", { x: 50, y, size: 10, font, color: muted });
    y -= 16;
    page.drawText("RECEIVED BY: _________________________", { x: 50, y, size: 10, font, color: muted });
    y -= 36;

    page.drawText("Thank you for your business!", { x: 50, y, size: 10, font: fontBold, color: dark });

    const pdfBytes = await pdfDoc.save();

    const bucket = adminStorage.bucket();
    const invoiceId = adminDb.collection("invoices").doc().id;
    const file = bucket.file(`invoices/${invoiceId}.pdf`);
    await file.save(Buffer.from(pdfBytes), {
      metadata: { contentType: "application/pdf" },
    });
    const [urlResult] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });

    await adminDb.collection("invoices").doc(invoiceId).set({
      orderId,
      invoiceNumber,
      pdfUrl: urlResult,
      total: Number(total),
      clientEmail,
      createdAt: FieldValue.serverTimestamp(),
    });

    if (resend && clientEmail) {
      try {
        await resend.emails.send({
          from: "hello@supercrowncatering.com",
          to: clientEmail,
          subject: `Your invoice ${invoiceNumber} — Super Crown Catering`,
          html: `
            <p>Hi ${(clientName || "Customer").toString()},</p>
            <p>Your invoice is ready. <a href="${urlResult}">Download your invoice PDF here</a>.</p>
            <p>Thank you for your business!<br/>— Super Crown Team</p>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send invoice email:", emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      invoiceId,
      pdfUrl: urlResult,
      invoiceNumber,
    });
  } catch (err) {
    console.error("generate-invoice error:", err);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
