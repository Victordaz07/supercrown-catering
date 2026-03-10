/**
 * Script para crear el primer usuario de ventas.
 * Ejecutar: npx tsx scripts/seed-admin.ts
 *
 * Requiere: .env.local con FIREBASE_ADMIN_*
 */
import * as dotenv from "dotenv";
import * as path from "path";

// Cargar .env.local
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const email = process.env.SEED_ADMIN_EMAIL || "admin@supercrowncatering.com";
const password = process.env.SEED_ADMIN_PASSWORD || "SuperCrown2024!";
const name = process.env.SEED_ADMIN_NAME || "Admin";

async function main() {
  const { adminAuth, adminDb } = await import("../lib/firebase/admin");

  console.log("Creando usuario de ventas:", email);

  let user;
  try {
    user = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
    });
    console.log("Usuario creado en Auth:", user.uid);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("already exists")) {
      const existing = await adminAuth.getUserByEmail(email);
      user = existing;
      console.log("Usuario ya existe en Auth:", user.uid);
    } else {
      throw err;
    }
  }

  await adminAuth.setCustomUserClaims(user.uid, { role: "sales" });
  console.log("Rol 'sales' asignado en custom claims");

  await adminDb.collection("users").doc(user.uid).set(
    {
      email: user.email,
      name: name,
      role: "sales",
      createdAt: new Date(),
    },
    { merge: true }
  );
  console.log("Documento creado en Firestore users/");

  console.log("\n✅ Listo. Puedes iniciar sesión en /login con:");
  console.log("   Email:", email);
  console.log("   Password:", password);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
