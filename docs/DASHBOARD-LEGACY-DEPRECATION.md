# Dashboard Legacy Deprecation

## Context

The backoffice now uses `/dashboard` as the single entrypoint for internal roles:

- `MASTER` / `ADMIN` / `SALES` / `DELIVERY` -> `/dashboard`

Legacy routes are still present for compatibility, but they are no longer part of the main navigation flow.

## Legacy routes redirected out of primary flow

- `/dashboard/sales` -> `/dashboard`
- `/dashboard/admin` -> `/dashboard`
- `/dashboard/driver` -> `/dashboard/delivery`

## Why

- Prevent split experiences between old Firebase-based pages and modern Prisma-backed dashboard pages.
- Keep role routing and navigation consistent.
- Reduce operational risk by having one source of truth for dashboard entry behavior.

## Next cleanup pass

- Evaluate remaining legacy sub-routes under `app/dashboard/sales/*` and `app/dashboard/admin/*`.
- Remove any no-longer-used Firebase dashboard dependencies once those routes are fully retired.
