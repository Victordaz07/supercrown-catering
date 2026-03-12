# Registro de Backfills y Scripts de Migración

| Script | Propósito | Entorno | Ejecutado | Fecha | Notas |
|--------|-----------|---------|-----------|-------|-------|
| scripts/migrate-order-statuses.ts | READY → READY_FOR_PICKUP | prod | ⬜ | - | Ejecutar después de epic3 migrate |
| scripts/backfill-quote-statuses.ts | String → QuoteStatus enum | prod | ⬜ | - | Ejecutar después de epic1 migrate |
| scripts/backfill-price-locks.ts | Lock órdenes confirmadas sin snapshot | prod | ⬜ | - | ONE-TIME, idempotente |
| scripts/backfill-invoice-statuses.ts | String → InvoiceStatus enum | prod | ⬜ | - | Ejecutar después de epic5 migrate |

## Orden de ejecución recomendado en producción

1. `npx prisma migrate deploy` (aplica TODAS las migraciones pendientes)
2. `npx tsx scripts/migrate-order-statuses.ts --dry-run`
3. `npx tsx scripts/migrate-order-statuses.ts`
4. `npx tsx scripts/backfill-quote-statuses.ts --dry-run`
5. `npx tsx scripts/backfill-quote-statuses.ts`
6. `npx tsx scripts/backfill-price-locks.ts --dry-run`
7. `npx tsx scripts/backfill-price-locks.ts`
8. `npx tsx scripts/backfill-invoice-statuses.ts --dry-run`
9. `npx tsx scripts/backfill-invoice-statuses.ts`

## IMPORTANTE

- Todos los scripts son idempotentes — seguros de correr múltiples veces
- Siempre correr `--dry-run` primero en producción
- Marcar ✅ y fecha en esta tabla después de ejecutar
