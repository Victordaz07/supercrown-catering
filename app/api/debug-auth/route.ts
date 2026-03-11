import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { compare, hash } from "bcryptjs";

export async function GET() {
  try {
    const testHash = await hash("test123", 12);
    const testCompare = await compare("test123", testHash);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        passwordHash: true,
      },
      take: 5,
    });

    const masterEmail = process.env.MASTER_EMAIL ?? "admin@supercrown.com";
    const masterPassword = process.env.MASTER_PASSWORD ?? "master2026!";

    const master = users.find((u) => u.email === masterEmail);
    let passwordMatch = false;
    if (master) {
      passwordMatch = await compare(masterPassword, master.passwordHash);
    }

    return NextResponse.json({
      bcryptWorks: testCompare,
      envEmail: masterEmail,
      envPasswordLength: masterPassword.length,
      envPasswordFirst3: masterPassword.substring(0, 3),
      userCount: users.length,
      users: users.map((u) => ({
        email: u.email,
        role: u.role,
        active: u.active,
        hashPrefix: u.passwordHash.substring(0, 10),
      })),
      masterFound: !!master,
      passwordMatch,
      nextauth: {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "NOT SET",
        NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
        VERCEL_URL: process.env.VERCEL_URL ?? "NOT SET",
        NODE_ENV: process.env.NODE_ENV,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return NextResponse.json({ step: "findUser", result: "NOT FOUND" });
    if (!user.active) return NextResponse.json({ step: "checkActive", result: "INACTIVE" });

    const valid = await compare(password, user.passwordHash);
    return NextResponse.json({
      step: "compare",
      valid,
      userRole: user.role,
      userName: user.name,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
