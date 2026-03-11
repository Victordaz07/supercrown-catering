/**
 * Configures Firebase Admin in .env.local from the service account JSON.
 *
 * Usage:
 * 1. Download the JSON from Firebase Console → Settings → Service accounts → Generate key
 * 2. Save the file as service-account.json in the project root
 * 3. Run: node scripts/setup-admin-from-json.js
 * 4. Delete service-account.json for security
 */

const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const jsonPath = path.join(projectRoot, "service-account.json");
const envPath = path.join(projectRoot, ".env.local");

if (!fs.existsSync(jsonPath)) {
  console.error("service-account.json not found");
  console.log("Download it from: https://console.firebase.google.com/project/supercrown-catering/settings/serviceaccounts/adminsdk");
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
console.log("✓ .env.local updated with Firebase Admin credentials");
console.log("  Delete service-account.json for security: del service-account.json");
