import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  return NextResponse.json(product);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  const stringFields = ["name", "category", "subcategory", "description", "shortDescription", "imagePlaceholder", "imageUrl", "reviewText", "reviewAuthor"];
  for (const f of stringFields) {
    if (body[f] !== undefined) data[f] = body[f];
  }

  if (body.ingredients !== undefined) data.ingredients = JSON.stringify(body.ingredients);
  if (body.allergens !== undefined) data.allergens = JSON.stringify(body.allergens);
  if (body.galleryUrls !== undefined) {
    data.galleryUrls = JSON.stringify(
      Array.isArray(body.galleryUrls) ? body.galleryUrls : []
    );
  }
  if (body.calories !== undefined) data.calories = parseInt(body.calories) || 0;
  if (body.reviewRating !== undefined) data.reviewRating = parseInt(body.reviewRating) || 5;
  if (body.sortOrder !== undefined) data.sortOrder = parseInt(body.sortOrder) || 0;
  if (body.isPopular !== undefined) data.isPopular = Boolean(body.isPopular);
  if (body.isVegetarian !== undefined) data.isVegetarian = Boolean(body.isVegetarian);
  if (body.isAvailable !== undefined) data.isAvailable = Boolean(body.isAvailable);

  const updated = await prisma.product.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
