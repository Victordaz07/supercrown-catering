import { randomBytes, createHash } from "node:crypto";
import { Resend } from "resend";
import { prisma } from "@/lib/db";

export type InvitationProvider = "PRISMA" | "FIREBASE";

type CreateInvitationParams = {
  provider: InvitationProvider;
  subjectId?: string;
  email: string;
  role?: string;
  memberName?: string;
  createdById?: string;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const INVITATION_TTL_HOURS = 48;
const SIMULATE_MODE = !process.env.RESEND_API_KEY;

function normalizeEmail(email: string): string {
  return String(email).trim().toLowerCase();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function buildInvitationEmailHtml(params: {
  memberName?: string;
  role?: string;
  setupUrl: string;
}): string {
  const safeName = escapeHtml(params.memberName?.trim() || "there");
  const safeRole = params.role ? escapeHtml(params.role) : null;
  const roleLine = safeRole
    ? `<p style="margin:0 0 10px;color:#2A2520;"><strong>Role:</strong> ${safeRole}</p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
    <tr>
      <td style="background:#2A2520;padding:24px 32px;">
        <p style="margin:0;font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#fff;">SUPER CROWN</p>
        <p style="margin:8px 0 0;color:#C9BFA8;font-size:14px;">Team invitation</p>
      </td>
    </tr>
    <tr>
      <td style="padding:28px 32px;">
        <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:28px;color:#2A2520;">Welcome, ${safeName}</h1>
        <p style="margin:0 0 16px;color:#8A8070;line-height:1.6;">
          Your team account is ready. Confirm your email and create your password to finish setup.
        </p>
        ${roleLine}
        <p style="margin:0 0 24px;color:#8A8070;line-height:1.6;">
          This link expires in ${INVITATION_TTL_HOURS} hours for security.
        </p>
        <p style="margin:0 0 20px;">
          <a href="${escapeHtml(params.setupUrl)}" style="display:inline-block;background:#B5612A;color:#fff;padding:12px 24px;text-decoration:none;font-weight:600;border-radius:4px;">
            Create password
          </a>
        </p>
        <p style="margin:0;color:#8A8070;font-size:12px;line-height:1.6;">
          If the button does not work, copy and paste this link in your browser:<br />
          <span style="color:#2A2520;">${escapeHtml(params.setupUrl)}</span>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

export function generateProvisioningPassword(): string {
  return `tmp_${randomBytes(18).toString("base64url")}`;
}

export async function createAndSendTeamInvitation(params: CreateInvitationParams) {
  const email = normalizeEmail(params.email);
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);
  const setupUrl = `${SITE_URL}/set-password?token=${encodeURIComponent(token)}`;

  await prisma.teamInvitation.updateMany({
    where: {
      provider: params.provider,
      usedAt: null,
      ...(params.subjectId
        ? { subjectId: params.subjectId }
        : { email }),
    },
    data: { usedAt: new Date() },
  });

  await prisma.teamInvitation.create({
    data: {
      provider: params.provider,
      subjectId: params.subjectId,
      email,
      role: params.role,
      tokenHash,
      expiresAt,
      createdById: params.createdById,
    },
  });

  if (SIMULATE_MODE) {
    console.log("[TEAM INVITE] Simulated email:", { email, setupUrl, provider: params.provider });
    return { simulated: true, setupUrl };
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);
  await resend.emails.send({
    from: "hello@supercrowncatering.com",
    to: email,
    subject: "You are invited to Super Crown team",
    html: buildInvitationEmailHtml({
      memberName: params.memberName,
      role: params.role,
      setupUrl,
    }),
  });

  return { simulated: false, setupUrl };
}

export async function getValidInvitationByToken(token: string) {
  const tokenHash = hashToken(token);
  const invitation = await prisma.teamInvitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation) return null;
  if (invitation.usedAt) return null;
  if (invitation.expiresAt.getTime() < Date.now()) return null;

  return invitation;
}

export async function markInvitationUsed(id: string) {
  await prisma.teamInvitation.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}
