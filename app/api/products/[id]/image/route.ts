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
  // default + covers image/jpeg
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

  const storageStatus = storageConfigStatus();
  if (!storageStatus.ok) {
    return NextResponse.json(
      {
        error:
          "Image storage is not configured on the server. Set FIREBASE_ADMIN_* environment variables in your deployment.",
        missing: storageStatus.missing,
      },
      { status: 503 }
    );
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

  // Security: validate content-type and size (avoid arbitrary uploads / memory abuse)
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  const contentType = (file.type || "").toLowerCase();
  if (!allowedTypes.has(contentType)) {
    return NextResponse.json(
      { error: "Unsupported image type. Allowed: jpeg, png, webp." },
      { status: 415 }
    );
  }
  const maxBytes = 5 * 1024 * 1024; // 5MB
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: "Image too large. Max size is 5MB." },
      { status: 413 }
    );
  }

  const bucket = adminStorage.bucket();
  const bucketName = bucket.name;

  const ext = extFromMime(contentType);
  const objectPath = `products/${id}.${ext}`;

  const oldObjectPath =
    product.imageUrl ? extractGcsObjectPath(product.imageUrl, bucketName) : null;

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const blob = bucket.file(objectPath);
    await blob.save(fileBuffer, {
      metadata: { contentType },
    });
    await blob.makePublic();

    if (oldObjectPath && oldObjectPath !== objectPath) {
      await bucket.file(oldObjectPath).delete({ ignoreNotFound: true });
    }
  } catch (err) {
    console.error("POST /api/products/[id]/image storage error:", err);
    return NextResponse.json(
      { error: "Failed to upload image to storage" },
      { status: 502 }
    );
  }

  const imageUrl = `https://storage.googleapis.com/${bucketName}/${objectPath}`;
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

  // Always clear DB pointer; storage deletion is best-effort (depends on env/config)
  const storageStatus = storageConfigStatus();
  if (storageStatus.ok) {
    try {
      const bucket = adminStorage.bucket();
      const bucketName = bucket.name;
      const objectPath =
        product.imageUrl ? extractGcsObjectPath(product.imageUrl, bucketName) : null;

      if (objectPath) {
        await bucket.file(objectPath).delete({ ignoreNotFound: true });
      }
    } catch (err) {
      console.error("DELETE /api/products/[id]/image storage error:", err);
      // continue: DB will still be updated below
    }
  }

  await prisma.product.update({ where: { id }, data: { imageUrl: null } });
  return NextResponse.json({ success: true });
}
