# Panel de administración de productos

## Resumen

El admin puede gestionar productos del menú de forma completa:

- **Crear** productos nuevos
- **Editar** productos existentes (nombre, descripción, ingredientes, calorías, alérgenos, etc.)
- **Agregar y editar reseñas** destacadas por producto
- **Subir imágenes** (Firebase Storage) — ideal cuando tomas nuevas fotos
- **Marcar como no disponible** temporalmente (oculta del menú público sin eliminar)
- **Eliminar** productos permanentemente

## Pasos para activar

### 1. Migrar productos a Firestore

Si aún no tienes productos en Firestore, ejecuta:

```bash
npx tsx scripts/seed-products.ts
```

Esto copia todos los productos de `menuData.json` a la colección `products` en Firestore.

### 2. Crear un usuario admin

**Opción A:** Promover un usuario existente a admin:

```bash
ADMIN_EMAIL=tu-email@ejemplo.com npx tsx scripts/seed-admin-role.ts
```

**Opción B:** Crear un nuevo admin desde el panel de Team (si ya tienes un admin que pueda crear usuarios).

### 3. Desplegar reglas de Firestore

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 4. Acceder al panel

1. Inicia sesión en `/login` con el usuario admin
2. Serás redirigido a `/dashboard/admin`
3. Navega a **Productos** para gestionar el menú

## Flujo de trabajo con nuevas fotos

1. Toma las fotos de los productos
2. En **Productos** → **Editar** el producto
3. En la sección **Subir nueva imagen**, selecciona la foto
4. La imagen se sube a Firebase Storage y reemplaza la anterior
5. El menú público mostrará la nueva imagen automáticamente

## Estructura de datos

Los productos se almacenan en Firestore (`products`). Cada documento incluye:

- Datos básicos: nombre, categoría, subcategoría, descripción
- Ingredientes, calorías, alérgenos
- Banderas: `isPopular`, `isVegetarian`, `isAvailable`
- `imageUrl`: URL de la imagen en Storage (si se subió)
- `review`: reseña destacada (texto, autor, rating)

Si `imageUrl` está vacío, se usa el mapeo en `menuImageMap.ts` (imágenes en `/images/`).
