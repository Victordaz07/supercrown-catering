# Cron Setup

## Endpoint

- `GET /api/cron/expire-quotes`

## Seguridad

- Requiere header:
  - `Authorization: Bearer <CRON_SECRET>`
- Configurar `CRON_SECRET` en variables de entorno.

## Variables requeridas

- `CRON_SECRET`
- `QUOTE_EXPIRY_DAYS` (usado al crear nuevas cotizaciones)

## Configuracion en Vercel Cron

1. Ir a `Project Settings -> Cron Jobs`.
2. Crear cron job para `/api/cron/expire-quotes` (por ejemplo, diario).
3. Configurar header `Authorization` con `Bearer ${CRON_SECRET}`.
4. Verificar respuesta esperada:
   - `{ "expired": number, "quoteIds": string[] }`
