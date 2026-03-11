/**
 * Converts an existing user (by email) to admin role.
 * Useful when you already have a sales user and want to promote them to admin.
 *
 * Run: npx tsx scripts/seed-admin-role.ts
 * Requires: .env.local with FIREBASE_ADMIN_* and ADMIN_EMAIL
 *
 * Example: ADMIN_EMAIL=admin@supercrowncatering.com npx tsx scripts/seed-admin-role.ts
 */
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const email = process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL;

async function main() {
  if (!email) {
    console.error("Define ADMIN_EMAIL or SEED_ADMIN_EMAIL in .env.local");
    process.exit(1);
  }

  const { adminAuth, adminDb } = await import("../lib/firebase/admin");

  const user = await adminAuth.getUserByEmail(email);
  await adminAuth.setCustomUserClaims(user.uid, { role: "admin" });
  await adminDb.collection("users").doc(user.uid).set(
    { role: "admin", updatedAt: new Date() },
    { merge: true }
  );

  console.log(`✅ User ${email} now has admin role`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
