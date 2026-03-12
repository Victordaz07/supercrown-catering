# Resolver errores de migración (P3009, P3018)

El build puede fallar con:
- **P3009**: migración fallida
- **P3018**: "column already exists" (la DB ya tiene el schema por db push)

## Solución: marcar todas como aplicadas

Si tu base de datos ya tiene el esquema completo (por `db push` anterior), ejecuta **una vez**:

```powershell
cd "z:\supercrown Page\supercrown-catering"
$env:DATABASE_URL="postgresql://TU_USUARIO:TU_PASSWORD@ep-xxx.neon.tech/neondb?sslmode=require"
npx tsx scripts/mark-all-migrations-applied.ts
```

(Reemplaza la URL con tu connection string de Vercel)

### Después

1. Haz **Redeploy** en Vercel
2. El build debería pasar
