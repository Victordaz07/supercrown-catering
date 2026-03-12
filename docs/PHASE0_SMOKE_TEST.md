# Phase 0 Smoke Test

Checklist manual para validar que Fase 0 no altera comportamiento visible.

- [ ] Crear orden como `SALES` y verificar status inicial esperado.
- [ ] Cambiar status como `ADMIN` desde flujo actual y validar respuesta normal.
- [ ] Revisar logs de transición en Firestore (`auditLog`) con `engine: "v1_legacy"`.
- [ ] Confirmar flags en `false`:
  - `FEATURE_ORDER_STATE_MACHINE_V2=false`
  - `FEATURE_QUOTE_V2=false`
  - `FEATURE_PRICE_LOCK=false`
- [ ] Verificar que el comportamiento de APIs/UI es idéntico al previo.
- [ ] Ejecutar migración Prisma de Fase 0 sin errores.
- [ ] Confirmar que registros existentes en `Order` conservan `null` en:
  - `sourceQuoteId`
  - `priceSnapshot`
  - `pricingLockedAt`
  - `pricingLockedBy`
  - `stateMachineV` (puede quedar `null` en históricos; default aplica a nuevos)
