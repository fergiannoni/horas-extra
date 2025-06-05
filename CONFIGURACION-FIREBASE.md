# Configuración de Firebase para Sincronización Multi-Dispositivo

Para que el sistema funcione desde varios teléfonos con sincronización automática, necesitas configurar Firebase. Es **gratuito** y muy fácil de configurar.

## 🚀 Pasos para Configurar Firebase

### 1. Crear Proyecto en Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear un proyecto"
3. Nombra tu proyecto (ej: "control-horas-empresa")
4. Acepta los términos y continúa
5. Puedes deshabilitar Google Analytics (no es necesario)

### 2. Configurar Firestore Database
1. En el panel izquierdo, haz clic en "Firestore Database"
2. Haz clic en "Crear base de datos"
3. Selecciona "Comenzar en modo de prueba" (puedes cambiarlo después)
4. Elige la ubicación más cercana a tu región

### 3. Configurar Aplicación Web
1. En el panel principal, haz clic en el ícono web `</>`
2. Nombra tu app (ej: "control-horas-web")
3. **NO** habilites Firebase Hosting (no es necesario)
4. Haz clic en "Registrar app"

### 4. Obtener la Configuración
Después del paso anterior, Firebase te mostrará un código similar a este:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

### 5. Actualizar las Aplicaciones

**En `index.html`**, busca y reemplaza la configuración demo:

```javascript
// Reemplaza esta configuración demo:
const firebaseConfig = {
    apiKey: "demo-api-key",
    authDomain: "demo-project.firebaseapp.com",
    projectId: "demo-project",
    storageBucket: "demo-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "demo-app-id"
};

// Por tu configuración real de Firebase:
const firebaseConfig = {
    apiKey: "TU_API_KEY_REAL",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};
```

**En `ninera-app.html`**, hace el mismo reemplazo en la sección Firebase SDK.

### 6. Cambiar el ID de Empresa

En ambos archivos (`index.html` y `ninera-app.html`), busca y cambia:

```javascript
const COMPANY_ID = 'company_demo'; // Cambiar por un ID único de tu empresa
```

Por ejemplo:
```javascript
const COMPANY_ID = 'empresa_garcia_2024'; // Usa un nombre único para tu empresa
```

## ✅ Verificar que Funciona

1. Abre la aplicación del empleador en un dispositivo
2. Configura el sueldo base y valor de hora extra
3. Abre la aplicación de horas extra en otro dispositivo (o navegador)
4. Marca entrada/salida
5. Verifica que los datos aparezcan en ambas aplicaciones

## 🔒 Configurar Seguridad (Recomendado)

1. Ve a Firestore Database > Reglas
2. Reemplaza las reglas por defecto con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura/escritura solo en la colección de tu empresa
    match /companies/{companyId}/{document=**} {
      allow read, write: if companyId == "TU_COMPANY_ID_AQUI";
    }
  }
}
```

3. Reemplaza `TU_COMPANY_ID_AQUI` por el ID que pusiste en el paso 6
4. Haz clic en "Publicar"

## 💰 Límites Gratuitos de Firebase

Firebase Firestore es **gratuito** hasta:
- 📖 **50,000 lecturas por día**
- ✍️ **20,000 escrituras por día**  
- 🗄️ **1 GB de almacenamiento**

Para un negocio pequeño, esto es más que suficiente. Un empleado marcando entrada/salida usa aproximadamente:
- **2 escrituras por día** (entrada + salida)
- **10-20 lecturas por día** (sincronización)

## 🆘 Resolución de Problemas

**Los datos no se sincronizan:**
- Verifica que el `COMPANY_ID` sea igual en ambas aplicaciones
- Revisa la consola del navegador (F12) para ver errores
- Asegúrate de tener conexión a internet

**Error de permisos:**
- Verifica que las reglas de Firestore estén configuradas correctamente
- Revisa que el `COMPANY_ID` en las reglas coincida con el de las aplicaciones

**Fallback automático:**
- Si Firebase no está disponible, las aplicaciones siguen funcionando con almacenamiento local
- Los datos se migrarán automáticamente cuando Firebase vuelva a estar disponible

## 🎯 Beneficios de esta Configuración

✅ **Sincronización automática** entre todos los dispositivos  
✅ **Respaldo en la nube** - los datos nunca se pierden  
✅ **Tiempo real** - los cambios aparecen inmediatamente en otros dispositivos  
✅ **Fallback local** - funciona aunque Firebase esté caído  
✅ **Gratuito** para la mayoría de casos de uso  
✅ **Seguro** - cada empresa tiene sus propios datos aislados 