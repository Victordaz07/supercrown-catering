/**
 * Marca TODAS las migraciones como aplicadas.
 * Usar cuando la DB ya tiene el schema (ej. por db push) y migrate deploy falla
 * con "column already exists".
 *
 * Ejecutar UNA VEZ con DATABASE_URL:
 *   $env:DATABASE_URL="postgresql://..."; npx tsx scripts/mark-all-migrations-applied.ts
 */
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
const dirs = fs.readdirSync(migrationsDir).filter((d) => {
  const full = path.join(migrationsDir, d);
  return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "migration.sql"));
});

const sorted = dirs.sort();

console.log(`Marcando ${sorted.length} migraciones como aplicadas...\n`);

for (const name of sorted) {
  try {
    execSync(`npx prisma migrate resolve --applied "${name}"`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name} - puede que ya esté aplicada, continuando...`);
  }
}

console.log("\n✅ Listo. Haz Redeploy en Vercel.");
