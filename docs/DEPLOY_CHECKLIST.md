# Checklist de Deploy — Lo que debes hacer tú

Este documento lista **solo** los pasos que requieren acción manual (no automatizable desde el código).

---

## ✅ Ya hecho automáticamente

- [x] Build script actualizado: usa `prisma migrate deploy` en lugar de `db push` (más seguro para producción)
- [x] Migraciones creadas en `prisma/migrations/`
- [x] Scripts de backfill listos en `scripts/`

---

## 1. Variables de entorno en Vercel

1. Entra a [vercel.com](https://vercel.com) → tu proyecto → **Settings** → **Environment Variables**
2. Añade estas variables (Production + Preview):

| Variable | Valor | Obligatorio |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | ✅ Sí |
| `NEXTAUTH_SECRET` | Genera con `openssl rand -base64 32` | ✅ Sí |
| `NEXTAUTH_URL` | `https://tu-dominio.vercel.app` | ✅ Sí |
| `MASTER_EMAIL` | `admin@supercrown.com` (o el que uses) | Para login inicial |
| `MASTER_PASSWORD` | Tu contraseña segura | Para login inicial |
| `FEATURE_ORDER_STATE_MACHINE_V2` | `true` | ✅ Sí |
| `FEATURE_PRICE_LOCK` | `true` | ✅ Sí |
| `FEATURE_QUOTE_V2` | `true` | ✅ Sí |
| `TAX_RATE` | `0.08` | Opcional |
| `RESEND_API_KEY` | `re_...` (de resend.com) | Para emails |
| `EMAIL_FROM` | `hello@supercrowncatering.com` | Para emails |
| `CRON_SECRET` | String aleatorio | Para cron expire-quotes |

3. **Redeploy** después de añadir variables (Deployments → ⋮ → Redeploy)

---

## 2. Base de datos (Neon u otro Postgres)

Si aún no tienes base de datos:

1. Crea una en [neon.tech](https://neon.tech) (gratis)
2. Copia la connection string
3. Pégala en `DATABASE_URL` en Vercel

---

## 3. Backfills (después del primer deploy exitoso)

Cuando el deploy funcione y la app esté en línea, ejecuta estos comandos **en tu máquina** con la DB de producción:

```bash
# Crea .env.local con DATABASE_URL de producción (solo para estos comandos)
# O usa: $env:DATABASE_URL="postgresql://..." en PowerShell

# 1. Migrar READY → READY_FOR_PICKUP
npx tsx scripts/migrate-order-statuses.ts --dry-run
npx tsx scripts/migrate-order-statuses.ts

# 2. Backfill quote statuses
npx tsx scripts/backfill-quote-statuses.ts --dry-run
npx tsx scripts/backfill-quote-statuses.ts

# 3. Backfill price locks
npx tsx scripts/backfill-price-locks.ts --dry-run
npx tsx scripts/backfill-price-locks.ts

# 4. Backfill invoice statuses
npx tsx scripts/backfill-invoice-statuses.ts --dry-run
npx tsx scripts/backfill-invoice-statuses.ts
```

Marca ✅ en `docs/BACKFILL_REGISTRY.md` cuando termines.

---

## 4. Cron de expiración de quotes (opcional)

Si quieres que las quotes expiren automáticamente:

1. Vercel → **Settings** → **Cron Jobs**
2. Añade: `0 2 * * *` (diario 2:00 AM)
3. URL: `https://tu-dominio.vercel.app/api/cron/expire-quotes`
4. Header: `Authorization: Bearer TU_CRON_SECRET`

---

## 5. Verificación rápida

1. Abre la URL de producción
2. Login con `MASTER_EMAIL` / `MASTER_PASSWORD` (del seed)
3. Crea una quote → conviértela en orden → genera factura
4. Marca factura como PAID (manual)
5. Revisa que el cierre de orden funcione en el dashboard

---

## Resumen mínimo para ir a producción

1. Añadir `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` en Vercel
2. Añadir los 3 feature flags en `true`
3. Redeploy
4. Ejecutar backfills cuando el deploy esté OK
