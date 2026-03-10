/**
 * Convierte un usuario existente (por email) al rol admin.
 * Útil cuando ya tienes un usuario sales y quieres promoverlo a admin.
 *
 * Ejecutar: npx tsx scripts/seed-admin-role.ts
 * Requiere: .env.local con FIREBASE_ADMIN_* y ADMIN_EMAIL
 *
 * Ejemplo: ADMIN_EMAIL=admin@supercrowncatering.com npx tsx scripts/seed-admin-role.ts
 */
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const email = process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL;

async function main() {
  if (!email) {
    console.error("Define ADMIN_EMAIL o SEED_ADMIN_EMAIL en .env.local");
    process.exit(1);
  }

  const { adminAuth, adminDb } = await import("../lib/firebase/admin");

  const user = await adminAuth.getUserByEmail(email);
  await adminAuth.setCustomUserClaims(user.uid, { role: "admin" });
  await adminDb.collection("users").doc(user.uid).set(
    { role: "admin", updatedAt: new Date() },
    { merge: true }
  );

  console.log(`✅ Usuario ${email} ahora tiene rol admin`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
