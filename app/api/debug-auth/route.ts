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
    });
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}
