import { NextResponse } from "next/server";
import { adminDb, adminStorage } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

/** POST /api/products/[id]/upload-image - Subir imagen para producto (admin) */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !file.size) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const docRef = adminDb.collection("products").doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const path = `products/${id}.${ext}`;
    const bucket = adminStorage.bucket();
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const blob = bucket.file(path);
    await blob.save(fileBuffer, {
      metadata: { contentType: file.type || "image/jpeg" },
    });
    await blob.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${path}`;

    await docRef.update({
      imageUrl: publicUrl,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, imageUrl: publicUrl });
  } catch (err) {
    console.error("POST /api/products/[id]/upload-image:", err);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
