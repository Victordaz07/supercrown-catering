import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adminStorage } from "@/lib/firebase/admin";

type RouteContext = { params: Promise<{ id: string }> };

function isAdmin(role?: string) {
  return role === "MASTER" || role === "ADMIN";
}

function extFromMime(mime: string | undefined): "jpg" | "png" | "webp" {
  const m = (mime ?? "").toLowerCase();
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  return "jpg";
}

function storageConfigStatus(): { ok: true } | { ok: false; missing: string[] } {
  const required = [
    "FIREBASE_ADMIN_PROJECT_ID",
    "FIREBASE_ADMIN_CLIENT_EMAIL",
    "FIREBASE_ADMIN_PRIVATE_KEY",
    "FIREBASE_ADMIN_STORAGE_BUCKET",
  ] as const;
  const missing = required.filter((k) => !process.env[k]?.trim());
  return missing.length ? { ok: false, missing } : { ok: true };
}

function extractGcsObjectPath(imageUrl: string, bucketName: string): string | null {
  try {
    const url = new URL(imageUrl);
    if (url.hostname !== "storage.googleapis.com") return null;
    const parts = url.pathname.replace(/^\/+/, "").split("/");
    const [bucket, ...rest] = parts;
    if (!bucket || bucket !== bucketName) return null;
    const objPath = rest.join("/");
    return objPath || null;
  } catch {
    return null;
  }
}

function isVercelBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

function isDataUrl(url: string): boolean {
  return url.startsWith("data:image/");
}

/** Max size when storing inline (no Firebase / no Vercel Blob). */
const INLINE_IMAGE_MAX_BYTES = 512 * 1024;

async function deleteVercelBlobIfPossible(url: string | null | undefined): Promise<void> {
  if (!url || !isVercelBlobUrl(url) || !process.env.BLOB_READ_WRITE_TOKEN?.trim()) return;
  try {
    const { del } = await import("@vercel/blob");
    await del(url);
  } catch (err) {
    console.error("DELETE vercel blob:", err);
  }
}

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
  if (!file) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }

  if (!file.size) {
    return NextResponse.json({ error: "Empty image file" }, { status: 400 });
  }

  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const contentType = (file.type || "").toLowerCase();
  if (!allowedTypes.has(contentType)) {
    return NextResponse.json(
      { error: "Unsupported image type. Allowed: jpeg, png, webp." },
      { status: 415 }
    );
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: "Image too large. Max size is 5MB." },
      { status: 413 }
    );
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const ext = extFromMime(contentType);
  const objectPath = `products/${id}.${ext}`;
  const storageStatus = storageConfigStatus();
  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());

  let imageUrl: string;

  if (storageStatus.ok) {
    const bucket = adminStorage.bucket();
    const bucketName = bucket.name;

    const oldObjectPath =
      product.imageUrl ? extractGcsObjectPath(product.imageUrl, bucketName) : null;

    try {
      const blob = bucket.file(objectPath);
      await blob.save(fileBuffer, {
        metadata: { contentType },
      });
      await blob.makePublic();

      if (oldObjectPath && oldObjectPath !== objectPath) {
        await bucket.file(oldObjectPath).delete({ ignoreNotFound: true });
      }
    } catch (err) {
      console.error("POST /api/products/[id]/image GCS error:", err);
      return NextResponse.json(
        { error: "Failed to upload image to storage" },
        { status: 502 }
      );
    }

    await deleteVercelBlobIfPossible(product.imageUrl);
    imageUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
  } else if (hasBlobToken) {
    try {
      const { put } = await import("@vercel/blob");
      const uploaded = await put(objectPath, fileBuffer, {
        access: "public",
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      imageUrl = uploaded.url;
      await deleteVercelBlobIfPossible(product.imageUrl);
    } catch (err) {
      console.error("POST /api/products/[id]/image Vercel Blob error:", err);
      return NextResponse.json(
        { error: "Failed to upload image to blob storage" },
        { status: 502 }
      );
    }
  } else {
    if (fileBuffer.length > INLINE_IMAGE_MAX_BYTES) {
      return NextResponse.json(
        {
          error:
            "Sin almacenamiento en la nube configurado, la imagen debe pesar ≤ 512 KB, o configura FIREBASE_ADMIN_* o BLOB_READ_WRITE_TOKEN en Vercel.",
        },
        { status: 413 }
      );
    }
    await deleteVercelBlobIfPossible(product.imageUrl);
    imageUrl = `data:${contentType};base64,${fileBuffer.toString("base64")}`;
  }

  await prisma.product.update({ where: { id }, data: { imageUrl } });

  return NextResponse.json({ imageUrl });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !isAdmin(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const url = product.imageUrl;

  if (url && isDataUrl(url)) {
    await prisma.product.update({ where: { id }, data: { imageUrl: null } });
    return NextResponse.json({ success: true });
  }

  await deleteVercelBlobIfPossible(url);

  const storageStatus = storageConfigStatus();
  if (storageStatus.ok && url) {
    try {
      const bucket = adminStorage.bucket();
      const bucketName = bucket.name;
      const objectPath = extractGcsObjectPath(url, bucketName);

      if (objectPath) {
        await bucket.file(objectPath).delete({ ignoreNotFound: true });
      }
    } catch (err) {
      console.error("DELETE /api/products/[id]/image GCS error:", err);
    }
  }

  await prisma.product.update({ where: { id }, data: { imageUrl: null } });
  return NextResponse.json({ success: true });
}
