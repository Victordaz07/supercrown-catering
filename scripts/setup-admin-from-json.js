/**
 * Configura Firebase Admin en .env.local desde el JSON de cuenta de servicio.
 *
 * Uso:
 * 1. Descarga el JSON desde Firebase Console → Configuración → Cuentas de servicio → Generar clave
 * 2. Guarda el archivo como service-account.json en la raíz del proyecto
 * 3. Ejecuta: node scripts/setup-admin-from-json.js
 * 4. Borra service-account.json por seguridad
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const jsonPath = path.join(projectRoot, "service-account.json");
const envPath = path.join(projectRoot, ".env.local");

if (!fs.existsSync(jsonPath)) {
  console.error("No se encontró service-account.json");
  console.log("Descárgalo desde: https://console.firebase.google.com/project/supercrown-catering/settings/serviceaccounts/adminsdk");
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const privateKey = json.private_key.replace(/\n/g, "\\n");

let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

const updates = {
  FIREBASE_ADMIN_PROJECT_ID: json.project_id,
  FIREBASE_ADMIN_CLIENT_EMAIL: json.client_email,
  FIREBASE_ADMIN_PRIVATE_KEY: `"${privateKey}"`,
  FIREBASE_ADMIN_STORAGE_BUCKET: json.project_id + ".firebasestorage.app",
};

for (const [key, value] of Object.entries(updates)) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (envContent.match(regex)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }
}

fs.writeFileSync(envPath, envContent.trim() + "\n");
console.log("✓ .env.local actualizado con credenciales de Firebase Admin");
console.log("  Elimina service-account.json por seguridad: del service-account.json");
