# Solución: Error "auth/api-key-not-valid"

Si ves **"Firebase: Error (auth/api-key-not-valid)"** al registrar o iniciar sesión, sigue estos pasos:

## 1. Obtener la API key correcta desde Firebase Console

1. Entra a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto **supercrown-catering-b9e40**
3. Haz clic en el ícono de engranaje → **Configuración del proyecto**
4. En la pestaña **General**, baja hasta **Tus apps**
5. Selecciona tu app web (o créala si no existe)
6. Copia la **Clave de API** (API Key) que aparece en el objeto `firebaseConfig`

## 2. Actualizar `.env.local`

Asegúrate de que `.env.local` tenga la clave correcta:

```
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key_aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=supercrown-catering-b9e40.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=supercrown-catering-b9e40
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=supercrown-catering-b9e40.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=632979490965
NEXT_PUBLIC_FIREBASE_APP_ID=1:632979490965:web:54ffcc634b29ee05c2f39c
```

**Importante:** Después de cambiar `.env.local`, **reinicia el servidor** (`Ctrl+C` y luego `npm run dev`).

## 3. Revisar restricciones de la API key (Google Cloud)

Si la clave es correcta pero sigue fallando, puede estar restringida:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/) → tu proyecto
2. **APIs y servicios** → **Credenciales**
3. Busca la clave de API de tipo "Clave de API de navegador"
4. Haz clic para editarla
5. En **Restricciones de aplicación**:
   - Si está en "Ninguna", no debería haber problema
   - Si está en "Referentes HTTP", añade:
     - `http://localhost:3000/*`
     - `http://localhost:*/*`
     - `https://supercrown-catering-b9e40.web.app/*`
     - `https://supercrown-catering-b9e40.firebaseapp.com/*`

## 4. Si estás en producción (Firebase Hosting)

Las variables `NEXT_PUBLIC_*` se incluyen en el build. Configúralas antes de desplegar:

```powershell
firebase functions:config:set app.next_public_firebase_api_key="tu_api_key"
# O usa .env.production.local con las variables
```

Luego haz un nuevo deploy: `firebase deploy`

## 5. Verificar que Authentication esté habilitado

En Firebase Console → **Authentication** → pestaña **Sign-in method**:
- Activa **Correo electrónico/contraseña** si no está activo
