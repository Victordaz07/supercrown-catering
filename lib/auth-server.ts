import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

const SESSION_COOKIE_NAME = "session";

export type SessionUser = {
  uid: string;
  email: string | null;
  role: "client" | "sales" | "driver" | "admin";
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const role = decoded.role as string | undefined;
    if (role !== "client" && role !== "sales" && role !== "driver" && role !== "admin") {
      return null;
    }
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      role,
    };
  } catch {
    return null;
  }
}

export async function requireSales(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "sales") {
    throw new Error("Unauthorized: sales role required");
  }
  return user;
}

export async function requireClient(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "client") {
    throw new Error("Unauthorized: client login required");
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized: admin role required");
  }
  return user;
}

/** Admin o Sales pueden crear usuarios */
export async function requireAdminOrSales(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || (user.role !== "admin" && user.role !== "sales")) {
    throw new Error("Unauthorized: admin or sales role required");
  }
  return user;
}
