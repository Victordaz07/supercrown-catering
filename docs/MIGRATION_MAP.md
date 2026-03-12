# Migration Map (Phase 0)

Inventario de endpoints que mutan `Order.status` directamente o por flujo legacy Firestore.

## HIGH priority

- File: `app/api/orders/[id]/route.ts`
  - Endpoint: `PATCH /api/orders/[id]`
  - Transitions: cualquier cambio enviado en `body.status` (`PENDING|CONFIRMED|READY|IN_TRANSIT|DELIVERED|CANCELLED`)
  - Notes: mutación principal de backoffice; hoy permite cambios directos.
  - Status: ✅ Migrado en Epic 3

- File: `app/api/order-status-requests/[id]/route.ts`
  - Endpoint: `PATCH /api/order-status-requests/[id]` (`action=approve`)
  - Transitions: `currentStatus -> requestedStatus` (dinámico por solicitud)
  - Notes: aplica el cambio aprobado en transacción.
  - Status: ✅ Migrado en Epic 3

- File: `app/api/routes/[id]/stops/[stopId]/route.ts`
  - Endpoint: `PATCH /api/routes/[id]/stops/[stopId]`
  - Transitions:
    - `* -> IN_TRANSIT` cuando `body.status === EN_ROUTE`
    - `* -> DELIVERED` cuando `body.status === DELIVERED`
  - Notes: origen operativo de delivery, bypass de reglas centrales.
  - Status: ✅ Migrado en Epic 3

- File: `app/api/deliveries/report/[orderId]/route.ts`
  - Endpoint: `POST /api/deliveries/report/[orderId]`
  - Transitions: `READY|IN_TRANSIT -> DELIVERED`
  - Notes: transición automática al crear delivery report.
  - Status: ✅ Migrado en Epic 3

- File: `app/api/orders/[id]/delivered/route.ts`
  - Endpoint: `POST /api/orders/[id]/delivered`
  - Transitions: `* -> DELIVERED`
  - Notes: endpoint legacy de marcado rápido.
  - Status: ✅ Migrado en Epic 3

## MEDIUM priority

- File: `app/api/confirm-delivery/route.ts`
  - Endpoint: `POST /api/confirm-delivery`
  - Engine: Firestore legacy
  - Transitions: `orders/{orderId}.status -> delivered` (minúscula)
  - Notes: riesgo de inconsistencia de casing vs Prisma (`DELIVERED`).
  - Status: ✅ Migrado en Epic 3

## LOW priority

- File: `app/api/quotes/[id]/convert-to-order/route.ts`
  - Endpoint: `POST /api/quotes/[id]/convert-to-order`
  - Behavior: crea `Order` nueva con `status: CONFIRMED` (no update de orden existente)
  - Notes: revisar en Epic 1/2 para alinear con Quote v2 + price lock.

## Epic 3 completado

Fecha: 2026-03-11

Todos los endpoints HIGH y MEDIUM fueron migrados para usar `transitionOrderStatus` o `executeTransition` desde la state machine v2.
Engine v2 listo para activar via `FEATURE_ORDER_STATE_MACHINE_V2=true`.
