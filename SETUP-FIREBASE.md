# Configuración pendiente de Firebase

## 0. Crear primer usuario de ventas

Después de configurar Firebase Admin en `.env.local`:

```powershell
npm run seed:admin
```

Esto crea un usuario con email `admin@supercrowncatering.com` y contraseña `SuperCrown2024!` (o los valores de `SEED_ADMIN_*` en `.env.local`). Luego puedes iniciar sesión en `/login`.

## 1. Storage (1 minuto) — REQUERIDO PARA DEPLOY

Se abrió la pestaña de Storage. Solo necesitas:

1. En la pestaña que se abrió, haz clic en **"Comenzar"** / **"Get Started"**
2. Acepta modo producción y región (ej. us-central1)
3. Ejecuta: `firebase deploy`

## 2. Firebase Admin SDK (para login, cotizaciones, facturas)

1. Abre: https://console.firebase.google.com/project/supercrown-catering-b9e40/settings/serviceaccounts/adminsdk
2. Haz clic en **"Generar nueva clave privada"**
3. Se descargará un JSON. Abre el archivo y copia:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY` (mantén los `\n` o usa comillas)
4. Añade a `.env.local`:
   ```
   FIREBASE_ADMIN_PROJECT_ID=supercrown-catering-b9e40
   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@supercrown-catering-b9e40.iam.gserviceaccount.com
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_ADMIN_STORAGE_BUCKET=supercrown-catering-b9e40.firebasestorage.app
   ```

## 3. Deploy completo (requiere plan Blaze)

```powershell
firebase deploy
```
