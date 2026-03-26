import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";

  const where = all ? {} : { isAvailable: true };

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ subcategory: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, category, subcategory, description, shortDescription, ingredients, calories, allergens, isPopular, isVegetarian, imagePlaceholder, imageUrl, reviewText, reviewAuthor, reviewRating } = body;

  if (!name?.trim() || !category?.trim() || !subcategory?.trim()) {
    return NextResponse.json({ error: "Name, category, and subcategory are required" }, { status: 400 });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + category.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "A product with this name/category already exists" }, { status: 409 });
  }

  const maxSort = await prisma.product.aggregate({ _max: { sortOrder: true }, where: { subcategory } });

  const product = await prisma.product.create({
    data: {
      slug,
      name: name.trim(),
      category: category.trim(),
      subcategory: subcategory.trim(),
      description: description?.trim() || "",
      shortDescription: shortDescription?.trim() || "",
      ingredients: JSON.stringify(ingredients || []),
      calories: parseInt(calories) || 0,
      allergens: JSON.stringify(allergens || []),
      isPopular: Boolean(isPopular),
      isVegetarian: Boolean(isVegetarian),
      imagePlaceholder: imagePlaceholder || "#C9A07A",
      imageUrl: imageUrl || null,
      galleryUrls: JSON.stringify(Array.isArray(body.galleryUrls) ? body.galleryUrls : []),
      sortOrder: (maxSort._max.sortOrder || 0) + 1,
      reviewText: reviewText || null,
      reviewAuthor: reviewAuthor || null,
      reviewRating: parseInt(reviewRating) || 5,
    },
  });

  return NextResponse.json(product, { status: 201 });
}
