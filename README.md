# Super Crown Catering

Sistema integral de gestion para Super Crown Catering. Manejo de ordenes, facturacion, entregas con verificacion, gestion de equipo y auditoria completa.

## Stack Tecnologico

- **Framework:** Next.js 14 (App Router)
- **UI:** React 18, Tailwind CSS
- **Base de datos:** PostgreSQL (Neon) con Prisma ORM
- **Autenticacion:** NextAuth.js (JWT + Credentials)
- **PDF:** @react-pdf/renderer
- **Iconos:** Lucide React

## Inicio Rapido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env

# Ejecutar migraciones
npx prisma migrate dev

# Seed de datos iniciales (crea MASTER, SALES, DELIVERY)
npx prisma db seed

# Iniciar servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Variables de Entorno

```env
# Base de datos PostgreSQL (Neon recomendado - neon.tech)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

NEXTAUTH_SECRET="tu-secret-seguro"
NEXTAUTH_URL="http://localhost:3000"

# Credenciales del Master User (opcionales, tienen defaults)
MASTER_EMAIL="admin@supercrown.com"
MASTER_PASSWORD="master2026!"
MASTER_NAME="Victor"
```

## Jerarquia de Usuarios

| Rol | Nivel | Puede crear | Acceso |
|---|---|---|---|
| MASTER | 100 | ADMIN, SALES, DELIVERY | Todo el sistema |
| ADMIN | 80 | SALES, DELIVERY | Todo excepto gestionar otros ADMIN |
| SALES | 40 | — | Ordenes, facturas, revision de entregas |
| DELIVERY | 20 | — | Lista de entregas, reportes de entrega |
| CLIENT | 10 | — | Auto-registro, ver sitio publico |

- MASTER puede crear y gestionar a todos.
- ADMIN puede crear y gestionar SALES y DELIVERY (solo los que creo).
- Los usuarios se desactivan (soft delete), nunca se eliminan.
- Usuarios desactivados no pueden iniciar sesion.

## Modulos del Dashboard

### Ordenes (`/dashboard/orders`)
- Listado de ordenes con estados: PENDING, CONFIRMED, READY, IN_TRANSIT, DELIVERED, CANCELLED
- Detalle de orden con items, notas y facturas
- Generacion de facturas con calculo de montos

### Facturas (`/dashboard/invoices`)
- Dashboard financiero con 4 tarjetas: Total Facturado, Cobrado, Pendiente, Vencido
- Filtros por estado, rango de fechas y busqueda
- Estados: DRAFT, SENT, DELIVERED, ADJUSTED, PAID, OVERDUE, VOID, REFUNDED
- Registro de pagos (Efectivo, Cheque, Tarjeta, Transferencia)
- Descarga de PDFs (copia Driver y copia Cliente)
- Notas de credito y ajustes vinculados a reportes de entrega

### Reportes de Entrega (`/dashboard/deliveries`)
- Revision de reportes creados por drivers
- Vista de items (esperado vs entregado)
- Galeria de fotos de evidencia (facturas firmadas, productos danados)
- Acciones: Aprobar, Aprobar con ajuste (nota de credito), Rechazar, Escalar a Master

### Reporte del Driver (`/dashboard/delivery/[orderId]/report`)
- Interfaz mobile-first para conductores
- Checklist de productos con cantidades entregadas
- Reporte de incidencias: Faltante, Danado, Producto Equivocado
- Carga de fotos: factura firmada (driver/cliente), productos danados
- Envio automatico al sistema de revision

### Gestion de Equipo (`/dashboard/users`)
- Tabla de usuarios con filtros por rol, estado y busqueda
- Crear, editar y desactivar miembros
- Roles permitidos segun jerarquia
- Badges de color por rol

### Registro de Auditoria (`/dashboard/audit`)
- Historial inmutable de todos los cambios en el sistema
- Registra: quien, que, cuando, valor anterior, valor nuevo
- Filtros por entidad, accion, rango de fechas
- Paginacion de 50 registros por pagina
- Solo visible para MASTER y ADMIN

## API Endpoints

### Usuarios
- `GET /api/users` — Listar usuarios (filtros: role, active, search)
- `POST /api/users` — Crear usuario
- `GET /api/users/[id]` — Detalle de usuario
- `PATCH /api/users/[id]` — Editar usuario
- `DELETE /api/users/[id]` — Desactivar usuario (soft delete)

### Ordenes
- `GET /api/orders/[id]` — Detalle de orden
- `PATCH /api/orders/[id]` — Actualizar estado/notas
- `POST /api/orders/[id]/invoice` — Generar factura con PDFs

### Facturas
- `GET /api/invoices` — Listar facturas con estadisticas
- `GET /api/invoices/[id]` — Detalle de factura
- `PATCH /api/invoices/[id]` — Actualizar estado, registrar pago
- `GET /api/invoices/[id]/adjust` — Listar ajustes
- `POST /api/invoices/[id]/adjust` — Crear nota de credito

### Entregas
- `GET /api/deliveries` — Listar reportes de entrega
- `POST /api/deliveries/report/[orderId]` — Driver crea reporte
- `GET /api/deliveries/report/[orderId]` — Obtener reporte de una orden
- `POST /api/deliveries/[id]/photos` — Subir foto de evidencia
- `PATCH /api/deliveries/[id]/review` — Revisar reporte (aprobar/rechazar/escalar)

### Autenticacion
- `POST /api/auth/register` — Auto-registro de clientes
- NextAuth handles `/api/auth/*` routes

## Workflow de Entrega y Verificacion

1. **Orden lista** — Sales confirma la orden y la marca como READY
2. **Doble factura** — Se generan dos copias PDF (Driver y Cliente) con espacio para anotaciones y firmas
3. **Entrega** — El driver lleva los productos y las dos copias de la factura
4. **Verificacion** — El receptor verifica los productos, anota cambios en ambas copias y firma
5. **Reporte digital** — El driver crea el reporte en la app: checklist de items, cantidades, incidencias
6. **Evidencia fotografica** — El driver sube fotos de ambas facturas firmadas y productos danados si aplica
7. **Revision** — Sales/Admin revisa el reporte, las fotos y las discrepancias
8. **Ajuste** — Si hay problemas, se crea una nota de credito vinculada al reporte con razon detallada
9. **Escalamiento** — Casos sospechosos se escalan al MASTER para decision final
10. **Auditoria** — Todo queda registrado en el log inmutable

## Estructura de Archivos

```
app/
  api/
    auth/          # NextAuth + registro
    deliveries/    # Reportes de entrega, fotos, revision
    invoices/      # Facturas, ajustes
    orders/        # Ordenes, generacion de factura
    users/         # CRUD de usuarios
  dashboard/
    audit/         # Registro de auditoria (server component)
    delivery/      # Vista del driver + reporte
    deliveries/    # Revision de entregas (sales/admin)
    invoices/      # Dashboard financiero
    orders/        # Listado y detalle de ordenes
    users/         # Gestion de equipo
  login/           # Login unificado
  menu/            # Menu publico
components/
  dashboard/       # Componentes del dashboard
  ui/              # Componentes reutilizables
lib/
  audit.ts         # Helper logAudit() inmutable
  auth.ts          # NextAuth config + jerarquia de roles
  db.ts            # Prisma client singleton
  invoiceUtils.ts  # Generacion de numeros de factura
prisma/
  schema.prisma    # 10 modelos
  seed.ts          # Seed de MASTER, SALES, DELIVERY
  migrations/      # Historial de migraciones
```

## Usuarios de Prueba

| Email | Password | Rol |
|---|---|---|
| admin@supercrown.com | master2026! | MASTER |
| ventas@supercrown.com | sales123 | SALES |
| repartidor@supercrown.com | delivery123 | DELIVERY |
