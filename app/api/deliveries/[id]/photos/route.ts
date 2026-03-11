import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import fs from "fs";
import nodePath from "path";

const VALID_PHOTO_TYPES = ["SIGNED_INVOICE_DRIVER", "SIGNED_INVOICE_CLIENT", "DAMAGED_ITEM", "OTHER"] as const;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "DELIVERY") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id: reportId } = await params;

  const report = await prisma.deliveryReport.findUnique({ where: { id: reportId } });
  if (!report) {
    return NextResponse.json({ error: "Reporte no encontrado" }, { status: 404 });
  }
  if (report.driverId !== session.user.id) {
    return NextResponse.json({ error: "Solo el conductor asignado puede subir fotos" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const photoType = formData.get("photoType") as string | null;
  const caption = formData.get("caption") as string | null;

  if (!file || !photoType) {
    return NextResponse.json({ error: "file y photoType son requeridos" }, { status: 400 });
  }

  if (!VALID_PHOTO_TYPES.includes(photoType as (typeof VALID_PHOTO_TYPES)[number])) {
    return NextResponse.json({ error: `photoType inválido. Válidos: ${VALID_PHOTO_TYPES.join(", ")}` }, { status: 400 });
  }

  const ext = nodePath.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return NextResponse.json({ error: `Extensión no permitida. Permitidas: ${ALLOWED_EXTENSIONS.join(", ")}` }, { status: 400 });
  }

  const uploadsDir = nodePath.join(process.cwd(), "public", "delivery-photos");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  const filename = `${reportId}-${Date.now()}${ext}`;
  fs.writeFileSync(nodePath.join(uploadsDir, filename), Buffer.from(await file.arrayBuffer()));

  const photo = await prisma.deliveryPhoto.create({
    data: { deliveryReportId: reportId, photoUrl: `/delivery-photos/${filename}`, photoType, caption: caption ?? null },
  });

  return NextResponse.json(photo, { status: 201 });
}
