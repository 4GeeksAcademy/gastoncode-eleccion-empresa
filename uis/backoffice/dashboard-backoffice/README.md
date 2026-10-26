# Dashboard backoffice: autenticacion

## Alcance actual

El dashboard dispone de cliente auth, contexto de sesion y guard reutilizable.
El `AuthProvider` esta conectado al layout raiz. Las vistas `/login` y `/register`
estan implementadas. Usan `AuthGuard`: `/`, `/account`, `/account/profile` y
`/account/change-password`. Las vistas publicas `/forgot-password` y
`/reset-password` no usan el guard. La cabecera muestra la identidad autenticada
y permite cerrar sesion.

Para levantar las cuatro interfaces y las tres APIs con un comando, consultar
[integracion del backoffice](../../../docs/BACKOFFICE_INTEGRATION.es.md).
`/suppliers`, `/incidents-manager` y `/incidents-analyzer` pertenecen a apps independientes
expuestas por el proxy del dashboard; el catalogo de la portada enlaza a ellas. Tras el
login, `next` admite esas rutas y navega a ellas con recarga completa.

El registro pide email, contrasena, confirmacion y nombre opcional. Tras crear
la cuenta, redirige al login con una confirmacion, sin guardar token ni iniciar
sesion automaticamente. Se valida email requerido y coincidencia de contrasenas;
no se impone una politica de fortaleza que la API todavia no define.

## Conexion con la API

Los rewrites de Next.js dirigen `/api/auth`, `/api/users` y `/api/profiles` a
`AUTH_API_URL`, con valor predeterminado `http://localhost:8001`.
La variable pertenece al servidor Next.js, no utiliza el prefijo `NEXT_PUBLIC`.
No es necesario modificar un archivo de entorno para usar el valor predeterminado.

Para el gestor de incidencias, `/incidents-manager` se reenvía a
`INCIDENTS_MANAGER_UI_URL` (`http://localhost:3004`) y `/api/incidents` a
`INCIDENTS_API_URL` (`http://localhost:8002`).
El analizador CSV y sus assets se publican en `/incidents-analyzer`, mediante
`INCIDENTS_UI_URL` (`http://localhost:3002`).

Desde la raiz del monorepo:

```bash
npm run dev:dashboard
```

El servicio auth debe iniciarse siguiendo su propia guia y con sus secretos
configurados fuera del frontend. Esta integracion no modifica la API ni sus permisos.

## Cliente y sesion

- `auth-api.ts` expone login, registro, usuario actual, usuarios, perfil propio,
  solicitud de restablecimiento (`forgotPassword`), canje de token (`resetPassword`)
  y cambio de contraseña desde sesión activa (`changePassword`).
- El login envia un formulario OAuth2 con `username` igual al email.
- `login` del cliente devuelve el token; `login` del contexto lo guarda y valida
  la identidad mediante `/auth/me` antes de resolver satisfactoriamente.
- Solo el JWT se guarda en `localStorage`, bajo `brasaland.backoffice.token`.
- Cliente, contexto y guard viven en `../auth-shared`; las cuatro apps los reutilizan.
- Cada llamada protegida agrega `Authorization: Bearer <token>` y usa `no-store`.
- Un `401` protegido elimina el token usado, notifica al proveedor y redirige a
  `/login?next=...`, conservando solo el pathname validado, sin query ni
  fragmento. Una respuesta tardia no elimina un token que ya fue reemplazado.
- Un `403`, un error de red o un fallo del servidor no elimina el token.
- Al montar, el proveedor recupera el token y consulta `/auth/me`. Los errores
  temporales quedan disponibles para reintentar mediante `refreshSession`.
- `logout` elimina el token y navega a `/login` sin retorno. Mientras se
  redirige, el proveedor mantiene el estado de inicializacion para evitar
  otra redireccion del guard.
- El evento `storage` sincroniza cambios de sesion entre pestanas del mismo origen.
- Las reglas de destinos internos viven en `../auth-shared/auth-navigation.ts`;
  el dashboard las reexporta para sus formularios.

`useAuth()` ofrece `user`, `initializing`, `error`, `login`, `logout` y
`refreshSession`. Debe usarse dentro del proveedor y en componentes cliente.
Despues de editar cuenta o perfil, llamar a `refreshSession` para actualizar
la identidad mostrada. El registro no inicia sesion automaticamente.

## Gestion de cuenta y perfil

- `/account` permite al usuario cambiar su email y establecer una contrasena
  nueva. La contrasena y su confirmacion son opcionales; no se impone una
  fortaleza no definida por el backend.
- `/account/change-password` permite al usuario cambiar su contrasena desde la
  sesion activa, solicitando la contrasena actual y una nueva (minimo 8 caracteres).
- `/forgot-password` pagina publica (sin `AuthGuard`) donde el usuario ingresa su
  email para recibir un enlace de restablecimiento. No revela si el email existe.
- `/reset-password` pagina publica que lee el token de `?token=` en la URL y
  permite establecer una nueva contrasena. Redirige a `/login?reset=1` al exito.
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
una lista de rutas internas: `/`, `/account`, `/account/profile`, `/account/change-password`
y `/suppliers`, `/incidents-manager`, `/incidents-analyzer` y sus subrutas. Descarta
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
no se agregaron dependencias al workspace. Con el dashboard iniciado, el
preparador temporal descarga ambos, ejecuta los tests y limpia al finalizar:

```bash
node scripts/browser-tests.mjs
```

Tambien se permite usar una instalacion externa existente mediante
`PLAYWRIGHT_MODULE`. Ejemplo de configuracion manual:

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

El almacenamiento es por origen: dashboard, proveedores, gestor y analizador
de incidencias comparten sesion al acceder desde el origen del dashboard.
Talento sigue separado. Entrar directamente por 3001, 3002 o 3004 usa otro almacenamiento.
El JWT es accesible a JavaScript y debe protegerse frente a XSS; nunca registrar
tokens ni contrasenas. No hay refresh ni revocacion backend: el logout elimina
la copia local, pero un token obtenido previamente puede seguir siendo valido.
La expiracion se detecta en la siguiente llamada protegida, no mediante un temporizador.