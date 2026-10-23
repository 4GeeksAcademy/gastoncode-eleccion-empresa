# Gestor de incidencias (backoffice)

Aplicación Next.js para registrar incidencias de Brasaland en
`services/api-incidents`. Por ahora incluye la vista del formulario de
registro y el panel de resumen.

## Ejecutar

Requiere `api-auth` en el puerto 8001 e `api-incidents` en el 8002, ambos
con el mismo `JWT_SECRET`.

Se usa a través del dashboard, en http://localhost:3000/incidents-manager,
para compartir la sesión del backoffice. La forma más simple de levantar todo es,
desde la raíz:

```bash
npm run backoffice:dev
```

Para levantar solo esta app: `npm run dev:incidents-manager` (puerto 3004,
`basePath` `/incidents-manager`). El dashboard debe estar en marcha para el
login. Next.js redirige `/api/auth`,
`/api/users` y `/api/profiles` a `AUTH_API_URL` y `/api/incidents` a
`INCIDENTS_API_URL`. Ambas variables son opcionales y por defecto usan
`http://127.0.0.1:8001` y `http://127.0.0.1:8002`.

## Vistas

Rutas relativas a `/incidents-manager`:

- `/`: formulario de registro, protegido por sesión.
- `/summary`: panel de resumen, protegido por sesión.
- `/login`: redirige al login del dashboard (`NEXT_PUBLIC_DASHBOARD_URL`),
  que devuelve al gestor tras iniciar sesión.

La sesión se comparte con el dashboard mediante `auth-shared`. Sin sesión,
o al cerrarla, se vuelve a `/login` del dashboard. "← Backoffice" vuelve a la
portada.

Al expirar la sesion se conserva el pathname validado para regresar despues
del login, sin query ni fragmento. El cierre voluntario va a `/login` sin
retorno. Un 401 tardio de una solicitud con token anterior no elimina la
sesion nueva, tanto al registrar como al cargar el resumen.

## Formulario de registro

- Campos: título, descripción, categoría, origen y sede, todos obligatorios.
  El estado se muestra como "Abierta" y no se puede editar. El `id` y las
  fechas los genera la API.
- La sede siempre está visible. Si el origen es "Sede", el campo se destaca
  y no admite Central.
- Al enviar, el botón se deshabilita y muestra un indicador de carga.
- Los errores de validación se muestran junto a cada campo, tanto los del
  navegador como los 400 de la API. Los demás errores (sesión expirada,
  permisos, conexión, 500) muestran mensajes amigables, nunca el detalle
  técnico.
- Si el registro se completa, el formulario se limpia y aparece una
  confirmación.

## Panel de resumen

- Consume `GET /api/incidents/summary` y muestra el total, los totales por
  estado y los desgloses por estado, categoría, origen y sede, con su
  porcentaje.
- Mientras carga muestra un indicador. Si la carga falla (sin conexión,
  error del servidor o falta de permisos), muestra un mensaje amigable y un
  botón "Reintentar" dentro del panel, sin afectar al resto de la página.
- Con la base vacía muestra todas las métricas en cero y un aviso.
- El botón "Actualizar" vuelve a consultar las métricas.

## Validación

Desde la raiz:

```bash
node --test uis/backoffice/incidents-manager/tests/incidents-api.test.mjs
```

Desde esta aplicacion:

```bash
npm run lint
npm run build
```
