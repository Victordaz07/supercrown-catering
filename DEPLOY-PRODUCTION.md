# Desplegar a producción (Firebase)

Para que la cotización, registro y login funcionen en producción, configura esto antes de `firebase deploy`:

## 1. Firebase Admin SDK (obligatorio)

Sin esto, las cotizaciones, registro y sesiones no funcionarán.

**Opción A — Script automático**
1. Descarga la clave de cuenta de servicio desde [Firebase Console](https://console.firebase.google.com/project/supercrown-catering/settings/serviceaccounts/adminsdk)
2. Guarda el JSON como `service-account.json` en la raíz del proyecto
3. Ejecuta: `npm run setup:admin`
4. Borra `service-account.json`

**Opción B — Manual**
Añade a `.env.local` (desde el JSON de la cuenta de servicio):
```
FIREBASE_ADMIN_PROJECT_ID=supercrown-catering
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@supercrown-catering.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_ADMIN_STORAGE_BUCKET=supercrown-catering.firebasestorage.app
```

## 2. Variables para producción

El deploy usa `.env.local`. Asegúrate de tener:

- `FIREBASE_ADMIN_*` (ver arriba)
- `RESEND_API_KEY` (para enviar emails)
- `OWNER_EMAIL` (donde llegan las cotizaciones)

## 3. Desplegar

```powershell
firebase deploy
```

O solo hosting + functions:
```powershell
firebase deploy --only "hosting,functions,firestore" --force
```
