# Proceso completo: Cotización → Entrega → Factura pagada

Esquema del flujo desde que el cliente solicita una cotización hasta que el repartidor entrega y la factura está procesada.

---

## Diagrama del flujo

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  CLIENTE                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
         │
         │ 1. Solicita cotización (web / formulario)
         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  QUOTE (Cotización) — Estado: REQUESTED → PRICING → SENT → CLIENT_APPROVED                   │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  Dónde: Dashboard → Sales → Quotes | Cliente recibe email con link                           │
│  Qué pasa: Sales crea cotización, envía al cliente, cliente aprueba/rechaza                  │
│  Puede: Ver, editar precios, enviar, convertir a orden                                       │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
         │
         │ 2. Cliente aprueba → "Convert to Order"
         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  ORDEN CREADA — Estado: CONFIRMED (pricing locked)                                           │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  Dónde: Dashboard → Orders / Quotes                                                          │
│  Qué pasa: Se crea Order desde Quote aprobada                                                │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  PASO A: PENDING (opcional, si la orden se creó manual o en otro flujo)                       │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  Dónde: Dashboard → Orders → [orden]                                                          │
│  Encuentro: Datos cliente, ítems, precios (editables si no locked)                            │
│  PUEDO: Editar cliente, ítems, precios, guardar                                               │
│  PUEDO: "Confirm Order" → pasa a CONFIRMED                                                    │
│  NO PUEDO: Generar factura, asignar driver, avanzar a READY                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  PASO B: CONFIRMED                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  Dónde: Dashboard → Orders → [orden]                                                          │
│  Encuentro: Datos cliente, ítems (precios locked), sección Invoices & PDF                     │
│  PUEDO: "Generate Invoice" (si todos los ítems tienen precio) → crea factura + PDFs         │
│  PUEDO: "Mark Ready for Delivery" → pasa a READY                                              │
│  PUEDO: Ver cotización original (si existe) — link "Ver cotización"                            │
│  NO PUEDO: Editar precios (locked), asignar driver aún                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  PASO C: READY                                                                                │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  Dónde: Dashboard → Orders → [orden] | Dashboard → Routes                                     │
│  Encuentro: Asignar driver, PDFs de factura (si se generó)                                    │
│  PUEDO: "Assign Driver" (seleccionar repartidor)                                              │
│  PUEDO: Crear ruta en Routes y asignar órdenes a driver                                      │
│  PUEDO: Generar factura si no existe                                                          │
│  NO PUEDO: El driver aún no ve la orden hasta que esté asignada                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
         │
         │ 3. Driver asignado + Sales/Admin marcan "En ruta" O driver marca "Mark En Route"
         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  PASO D: IN_TRANSIT                                                                           │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  Dónde (SALES/ADMIN): Dashboard → Orders → [orden]                                            │
│  Dónde (DRIVER): Dashboard → My Deliveries (/dashboard/delivery)                              │
│  Encuentro:                                                                                    │
│    • Sales/Admin: orden con estado IN_TRANSIT, PDFs disponibles                               │
│    • Driver: su ruta con paradas, mapa, ítems, dirección, teléfono cliente                   │
│  PUEDO (Driver): "Mark En Route" (si stop PENDING) | "Mark Delivered" (si stop EN_ROUTE)      │
│  PUEDO (Driver): Ver dirección, abrir Google Maps, llamar al cliente                          │
│  PUEDO (Sales): Generar factura si faltaba                                                    │
│  NO PUEDO (Driver): Asignar otros drivers, cambiar estado manualmente                         │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
         │
         │ 4. Driver marca "Mark Delivered" en la parada
         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  PASO E: DELIVERED                                                                            │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  Dónde: Dashboard → Orders → [orden] | Dashboard → Deliveries                                  │
│  Encuentro: Panel de reporte de entrega, ajustes, Order Closure Checklist                     │
│  PUEDO: Crear reporte de entrega (driver: /dashboard/delivery/[orderId]/report)              │
│  PUEDO: Registrar incidencias (faltantes, daños), fotos, firma                                 │
│  PUEDO: Solicitar ajustes si hay discrepancia                                                 │
│  NO PUEDO: Cambiar estado a READY/IN_TRANSIT (ya entregado)                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  PASO F: Cierre de orden + Factura pagada                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  Estados: UNDER_REVIEW → COMPLETED | DISPUTED → COMPLETED                                     │
│  Encuentro: OrderClosureChecklist, AdjustmentRequestPanel                                     │
│  PUEDO: Revisar reportes, aprobar ajustes, marcar factura PAID                                │
│  Flujo: Factura DRAFT/SENT → cliente paga → marcar PAID → checklist completo → COMPLETED     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Resumen paso a paso (flujo típico)

| # | Quién | Acción | Estado anterior | Estado nuevo | Dónde |
|---|------|--------|-----------------|--------------|-------|
| 1 | Cliente | Solicita cotización | — | Quote REQUESTED | Web pública |
| 2 | Sales | Crea cotización, precios, envía | REQUESTED | SENT | Dashboard → Quotes |
| 3 | Cliente | Aprueba cotización | SENT | CLIENT_APPROVED | Email link |
| 4 | Sales | "Convert to Order" | — | Order CONFIRMED | Dashboard → Quotes |
| 5 | Sales | "Generate Invoice" | CONFIRMED | (factura creada) | Dashboard → Orders |
| 6 | Sales/Admin | "Mark Ready for Delivery" | CONFIRMED | READY | Dashboard → Orders |
| 7 | Sales/Admin | Asigna driver | READY | (driverId set) | Order detail o Routes |
| 8 | Driver | "Mark En Route" en parada | READY | IN_TRANSIT | My Deliveries |
| 9 | Driver | "Mark Delivered" en parada | IN_TRANSIT | DELIVERED | My Deliveries |
| 10 | Driver | Reporte de entrega (opcional) | DELIVERED | — | /delivery/[orderId]/report |
| 11 | Admin | Marca factura PAID | — | Invoice PAID | Dashboard → Invoices |
| 12 | Admin | Cierra orden (checklist) | DELIVERED/UNDER_REVIEW | COMPLETED | Order detail |

---

## ¿Puede el driver ver órdenes en IN_TRANSIT?

**Sí**, siempre que la orden esté asignada a él (driverId = su usuario).

**Condiciones para que el driver vea una orden:**

1. La orden tiene `driverId` = ID del driver (asignada).
2. La orden está en READY, IN_TRANSIT o DELIVERED.
3. La orden aparece en su ruta del día (eventDate = fecha de la ruta).

**Si el driver no la ve:**

- Comprobar que la orden esté asignada a ese driver (Order detail → "Assign Driver" cuando está READY).
- O asignarla desde Dashboard → Routes creando/añadiendo la parada a su ruta.

---

## Rutas de acceso rápido

| Rol | Ruta | Qué ve |
|-----|------|--------|
| Sales/Admin | `/dashboard/orders` | Lista de órdenes |
| Sales/Admin | `/dashboard/orders/[id]` | Detalle, acciones, PDFs, asignar driver |
| Sales/Admin | `/dashboard/routes` | Crear rutas, asignar órdenes a drivers |
| Sales/Admin | `/dashboard/invoices` | Facturas, marcar PAID |
| Sales/Admin | `/dashboard/sales/quotes` | Cotizaciones |
| Driver | `/dashboard/delivery` (My Deliveries) | Sus rutas y paradas del día/semana |
