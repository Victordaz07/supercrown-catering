/**
 * Script to create the first sales user.
 * Run: npx tsx scripts/seed-admin.ts
 *
 * Requires: .env.local with FIREBASE_ADMIN_*
 */
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const email = process.env.SEED_ADMIN_EMAIL || "admin@supercrowncatering.com";
const password = process.env.SEED_ADMIN_PASSWORD || "SuperCrown2024!";
const name = process.env.SEED_ADMIN_NAME || "Admin";

async function main() {
  const { adminAuth, adminDb } = await import("../lib/firebase/admin");

  console.log("Creating sales user:", email);

  let user;
  try {
    user = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
    });
    console.log("User created in Auth:", user.uid);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists")) {
      const existing = await adminAuth.getUserByEmail(email);
      user = existing;
      console.log("User already exists in Auth:", user.uid);
    } else {
      throw err;
    }
  }

  await adminAuth.setCustomUserClaims(user.uid, { role: "sales" });
  console.log("Role 'sales' assigned in custom claims");

  await adminDb.collection("users").doc(user.uid).set(
    {
      email: user.email,
      name: name,
      role: "sales",
      createdAt: new Date(),
    },
    { merge: true }
  );
  console.log("Document created in Firestore users/");

  console.log("\n✅ Done. You can sign in at /login with:");
  console.log("   Email:", email);
  console.log("   Password:", password);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
