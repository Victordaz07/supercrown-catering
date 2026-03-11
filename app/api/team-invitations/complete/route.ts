import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { prisma } from "@/lib/db";
import { getValidInvitationByToken, markInvitationUsed } from "@/lib/teamInvitations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token ?? "").trim();
    const password = String(body.password ?? "");
    const confirmPassword = String(body.confirmPassword ?? "");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    const invitation = await getValidInvitationByToken(token);
    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation is invalid or expired" },
        { status: 404 }
      );
    }

    if (invitation.provider === "PRISMA") {
      if (!invitation.subjectId) {
        return NextResponse.json({ error: "Invalid invitation subject" }, { status: 400 });
      }
      const passwordHash = await hash(password, 12);
      await prisma.user.update({
        where: { id: invitation.subjectId },
        data: {
          passwordHash,
          email: invitation.email,
          active: true,
        },
      });
    } else if (invitation.provider === "FIREBASE") {
      if (!invitation.subjectId) {
        return NextResponse.json({ error: "Invalid invitation subject" }, { status: 400 });
      }
      await adminAuth.updateUser(invitation.subjectId, {
        email: invitation.email,
        password,
        disabled: false,
        emailVerified: true,
      });
      await adminDb.collection("users").doc(invitation.subjectId).set(
        {
          email: invitation.email,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } else {
      return NextResponse.json({ error: "Unknown invitation provider" }, { status: 400 });
    }

    await markInvitationUsed(invitation.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("complete invitation error:", err);
    return NextResponse.json(
      { error: "Could not complete invitation" },
      { status: 500 }
    );
  }
}
