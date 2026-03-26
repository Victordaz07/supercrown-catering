import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  uploadProductFile,
  extFromMime,
  deleteStoredProductImage,
} from "@/lib/server/product-storage";

type RouteContext = { params: Promise<{ id: string }> };

function isAdmin(role?: string) {
  return role === "MASTER" || role === "ADMIN";
}

function parseGallery(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? v.filter((u): u is string => typeof u === "string") : [];
  } catch {
    return [];
  }
}

/** POST — append one gallery image (admin). */
export async function POST(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file =
    (formData.get("image") as File | null) ?? (formData.get("file") as File | null);
  if (!file?.size) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }

  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const contentType = (file.type || "").toLowerCase();
  if (!allowedTypes.has(contentType)) {
    return NextResponse.json(
      { error: "Unsupported image type. Allowed: jpeg, png, webp." },
      { status: 415 }
    );
  }

  const maxBytes = 4 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: "Imagen demasiado grande. Máximo 4 MB." },
      { status: 413 }
    );
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const ext = extFromMime(contentType);
  const suffix = randomBytes(8).toString("hex");
  const objectPath = `products/${id}-g-${suffix}.${ext}`;

  let imageUrl: string;
  try {
    imageUrl = await uploadProductFile(fileBuffer, contentType, objectPath);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "INLINE_TOO_LARGE") {
      return NextResponse.json(
        {
          error:
            "Sin almacenamiento en la nube, cada foto extra debe ser ≤ 512 KB o configura BLOB_READ_WRITE_TOKEN.",
        },
        { status: 413 }
      );
    }
    console.error("POST gallery upload:", e);
    return NextResponse.json({ error: "Error al subir la imagen" }, { status: 502 });
  }

  const list = parseGallery(product.galleryUrls);
  if (!list.includes(imageUrl)) {
    list.push(imageUrl);
  }

  await prisma.product.update({
    where: { id },
    data: { galleryUrls: JSON.stringify(list) },
  });

  return NextResponse.json({ imageUrl, galleryUrls: list });
}

/** DELETE — remove one gallery image by URL (admin). Body: { url: string } */
export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  if (url === product.imageUrl) {
    return NextResponse.json(
      { error: "Use DELETE /api/products/:id/image to remove the main image" },
      { status: 400 }
    );
  }

  const list = parseGallery(product.galleryUrls).filter((u) => u !== url);
  await prisma.product.update({
    where: { id },
    data: { galleryUrls: JSON.stringify(list) },
  });

  await deleteStoredProductImage(url);

  return NextResponse.json({ success: true, galleryUrls: list });
}
