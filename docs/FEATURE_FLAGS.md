# Feature Flags

## FEATURE_ORDER_STATE_MACHINE_V2

Activa el engine v2 de transiciones de estado en transitionGateway.ts.

- **true (PRODUCCIÓN)**: todas las transiciones pasan por stateMachine.ts con precondiciones, audit trail, y OrderStatusHistory
- **false (LEGACY/DEBUG)**: update directo sin validaciones

## FEATURE_QUOTE_V2

Reservado para activación futura de endpoints /api/v2/quotes.

Actualmente no tiene ramas condicionadas en el código.
Safe to enable en cualquier entorno.

## FEATURE_PRICE_LOCK

Activa la verificación de price lock en checkPriceLock.

- **true**: órdenes con pricingLockedAt bloquean edición de precios/items
- **false**: checkPriceLock siempre retorna `{ blocked: false }` (útil solo para testing — NUNCA en producción)
