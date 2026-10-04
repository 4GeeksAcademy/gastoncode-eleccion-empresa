# Dashboard backoffice: autenticacion

## Alcance actual

El dashboard dispone de cliente auth, contexto de sesion y guard reutilizable.
El `AuthProvider` esta conectado al layout raiz. Las vistas `/login` y `/register`
estan implementadas y `/`, `/account` y `/account/profile` utilizan el guard.
La cabecera muestra la identidad autenticada y permite cerrar sesion.

El registro pide email, contrasena, confirmacion y nombre opcional. Tras crear
la cuenta, redirige al login con una confirmacion, sin guardar token ni iniciar
sesion automaticamente. Se valida email requerido y coincidencia de contrasenas;
no se impone una politica de fortaleza que la API todavia no define.

## Conexion con la API

Los rewrites de Next.js dirigen `/api/auth`, `/api/users` y `/api/profiles` a
`AUTH_API_URL`, con valor predeterminado `http://localhost:8001`.
La variable pertenece al servidor Next.js, no utiliza el prefijo `NEXT_PUBLIC`.
No es necesario modificar un archivo de entorno para usar el valor predeterminado.

Desde la raiz del monorepo:

```bash
npm run dev:dashboard
```

El servicio auth debe iniciarse siguiendo su propia guia y con sus secretos
configurados fuera del frontend. Esta integracion no modifica la API ni sus permisos.

## Cliente y sesion

- `auth-api.ts` expone login, registro, usuario actual, usuarios y perfil propio.
- El login envia un formulario OAuth2 con `username` igual al email.
- `login` del cliente devuelve el token; `login` del contexto lo guarda y valida
  la identidad mediante `/auth/me` antes de resolver satisfactoriamente.
- Solo el JWT se guarda en `localStorage`, bajo `brasaland.dashboard.token`.
- Cada llamada protegida agrega `Authorization: Bearer <token>` y usa `no-store`.
- Un `401` protegido elimina el token usado, notifica al proveedor y redirige a
  `/login`. Una respuesta tardia no elimina un token que ya fue reemplazado.
- Un `403`, un error de red o un fallo del servidor no elimina el token.
- Al montar, el proveedor recupera el token y consulta `/auth/me`. Los errores
  temporales quedan disponibles para reintentar mediante `refreshSession`.
- `logout` elimina el token, limpia el estado y ejecuta `router.replace('/login')`.
- El evento `storage` sincroniza cambios de sesion entre pestanas del mismo origen.

`useAuth()` ofrece `user`, `initializing`, `error`, `login`, `logout` y
`refreshSession`. Debe usarse dentro del proveedor y en componentes cliente.
Despues de editar cuenta o perfil, llamar a `refreshSession` para actualizar
la identidad mostrada. El registro no inicia sesion automaticamente.

## Gestion de cuenta y perfil

- `/account` permite al usuario cambiar su email y establecer una contrasena
  nueva. La contrasena y su confirmacion son opcionales; no se impone una
  fortaleza no definida por el backend.
- `admin` y `manager` ven el directorio de usuarios devuelto por `GET /users`.
  Ese endpoint no incluye perfiles, por lo que la tabla no inventa nombres ni
  telefonos. `manager` solo puede consultar la lista.
- Solo `admin` ve controles para modificar email, rol, estado y contrasena de
  otra cuenta, siempre mediante `PUT /users/{user_id}`. El frontend no reemplaza
  las comprobaciones de permisos de FastAPI.
- `/account/profile` lee y actualiza exclusivamente el perfil propio mediante
  `GET /profiles/me` y `PUT /profiles/me`. Un valor vacio se envia como cadena
  vacia; la API omite valores `null`, asi que no se promete limpieza mediante null.
- Tras guardar perfil o credenciales, se revalida `/auth/me` para actualizar el
  nombre y email mostrados en la cabecera. Los errores 401 invalidan la sesion;
  403 y fallos de red se muestran sin borrar el token.

## Guard

En las futuras paginas o layouts protegidos:

```tsx
import { AuthGuard } from "@/app/components/auth-guard";

<AuthGuard>{children}</AuthGuard>
<AuthGuard allowedRoles={["admin"]}>{children}</AuthGuard>
```

No envolver `/login` ni `/register` con el guard. Estas vistas redirigen al
dashboard si la sesion ya esta validada. El guard oculta sus hijos
durante la validacion y los errores de sesion; ofrece reintento y distingue
usuario sin sesion de usuario sin permisos. La redireccion conserva el pathname
en `/login?next=...`, sin parametros de consulta. Login valida `next` mediante
una lista de rutas internas: `/`, `/account` y `/account/profile`. Descarta
URLs externas, rutas desconocidas y bucles hacia login/registro.

El guard controla presentacion y navegacion, no protege Server Components,
datos enviados desde servidor ni APIs. FastAPI sigue autorizando cada solicitud.

## Verificacion

```bash
node --test uis/backoffice/dashboard-backoffice/tests/auth-api.test.mjs
npm run lint -w dashboard-backoffice
npm exec -w dashboard-backoffice -- tsc --noEmit --incremental false
npm run build -w dashboard-backoffice
```

Las pruebas del cliente simulan fetch y almacenamiento. Las pruebas de navegador
usan Chromium y una API auth interceptada: no crean usuarios reales ni conectan
TinyDB. Cubren formularios, errores, redirecciones, rutas protegidas, restauracion,
cierre entre pestanas, token expirado, errores de red, permisos de cuenta/perfil y
capturas de escritorio/movil. Los contratos y permisos tambien se verificaron
manualmente contra una instancia temporal de `api-auth` con TinyDB aislada.

La suite de navegador requiere Playwright y Chromium disponibles externamente;
no se agregaron dependencias al workspace. En el entorno temporal autorizado:

```bash
LD_LIBRARY_PATH=/tmp/brasaland-account-browser/libs/usr/lib/x86_64-linux-gnu \
PLAYWRIGHT_MODULE=/tmp/brasaland-account-browser/node_modules/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/tmp/brasaland-account-browser/browsers \
node --test uis/backoffice/dashboard-backoffice/tests/auth-browser.test.mjs
```

Iniciar el dashboard antes de ejecutar esa suite. `DASHBOARD_URL` permite
cambiar su URL. Las capturas quedan en `/tmp/brasaland-auth-*.png`, no en el repositorio.
El entorno de `/tmp` es efimero y debera recrearse si se elimina. La validacion
de navegador simulada no sustituye la prueba manual contra el backend real.

## Limites

El almacenamiento es por origen: no comparte sesion con las otras aplicaciones.
El JWT es accesible a JavaScript y debe protegerse frente a XSS; nunca registrar
tokens ni contrasenas. No hay refresh ni revocacion backend: el logout elimina
la copia local, pero un token obtenido previamente puede seguir siendo valido.
La expiracion se detecta en la siguiente llamada protegida, no mediante un temporizador.