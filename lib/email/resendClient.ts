import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("[Resend] RESEND_API_KEY no configurada — emails desactivados");
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const EMAIL_FROM_DEFAULT =
  process.env.EMAIL_FROM ?? "hello@supercrowncatering.com";

export const EMAIL_FROM_QUOTES =
  process.env.EMAIL_FROM_QUOTES ?? "quotes@supercrowncatering.com";

export const CLIENT_PORTAL_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
