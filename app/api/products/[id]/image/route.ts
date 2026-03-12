import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { adminStorage } from "@/lib/firebase/admin";

type RouteContext = { params: Promise<{ id: string }> };

function isAdmin(role?: string) {
  return role === "MASTER" || role === "ADMIN";
}

function guessExtFromFilename(name: string | undefined): string {
  const ext = name?.split(".").pop()?.toLowerCase();
  if (!ext) return "jpg";
  if (ext.length > 8) return "jpg";
  return ext;
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

  const formData = await request.formData();
  const file =
    (formData.get("image") as File | null) ?? (formData.get("file") as File | null);
  if (!file) {
    return NextResponse.json({ error: "No image file provided" }, { status: 400 });
  }

  if (!file.size) {
    return NextResponse.json({ error: "Empty image file" }, { status: 400 });
  }

  const bucket = adminStorage.bucket();
  const bucketName = bucket.name;

  const ext = guessExtFromFilename(file.name);
  const objectPath = `products/${id}.${ext}`;

  const oldObjectPath =
    product.imageUrl ? extractGcsObjectPath(product.imageUrl, bucketName) : null;

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const blob = bucket.file(objectPath);
  await blob.save(fileBuffer, {
    metadata: { contentType: file.type || "image/jpeg" },
  });
  await blob.makePublic();

  if (oldObjectPath && oldObjectPath !== objectPath) {
    await bucket.file(oldObjectPath).delete({ ignoreNotFound: true });
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

  const bucket = adminStorage.bucket();
  const bucketName = bucket.name;
  const objectPath =
    product.imageUrl ? extractGcsObjectPath(product.imageUrl, bucketName) : null;

  if (objectPath) {
    await bucket.file(objectPath).delete({ ignoreNotFound: true });
  }

  await prisma.product.update({ where: { id }, data: { imageUrl: null } });
  return NextResponse.json({ success: true });
}
