/**
 * Resuelve la migración fallida 202603102301_team_invitations
 *
 * Ejecutar con: npx tsx scripts/resolve-failed-migration.ts
 *
 * Requiere DATABASE_URL en el entorno (usa .env.local o pasa inline):
 *   $env:DATABASE_URL="postgresql://..." ; npx tsx scripts/resolve-failed-migration.ts
 */
import { execSync } from "child_process";

const MIGRATION_NAME = "202603102301_team_invitations";

try {
  execSync(
    `npx prisma migrate resolve --applied "${MIGRATION_NAME}"`,
    {
      stdio: "inherit",
      cwd: process.cwd(),
    },
  );
  console.log(`\n✅ Migración ${MIGRATION_NAME} marcada como aplicada.`);
  console.log("Ahora puedes hacer redeploy en Vercel.");
} catch (err) {
  console.error("Error:", err);
  process.exit(1);
}
