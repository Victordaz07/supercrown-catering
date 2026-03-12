import crypto from "crypto";

export type QuoteTokenScope = "VIEW" | "APPROVE" | "REJECT" | "PROPOSE_CHANGES";

export function createRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

