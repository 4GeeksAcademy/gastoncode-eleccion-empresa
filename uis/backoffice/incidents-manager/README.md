# Gestor de incidencias (backoffice)

Aplicación Next.js para registrar incidencias de Brasaland en
`services/api-incidents`. Por ahora incluye la vista del formulario de
registro; el panel de resumen se añadirá más adelante.

## Ejecutar

Requiere `api-auth` en el puerto 8001 e `api-incidents` en el 8002, ambos
con el mismo `JWT_SECRET`.

```bash
npm install            # desde la raíz del monorepo
npm run dev:incidents-manager
```

La app queda en http://localhost:3004. Next.js redirige `/api/auth`,
`/api/users` y `/api/profiles` a `AUTH_API_URL` y `/api/incidents` a
`INCIDENTS_API_URL`. Ambas variables son opcionales y por defecto usan
`http://127.0.0.1:8001` y `http://127.0.0.1:8002`.

## Vistas

- `/login`: inicio de sesión con una cuenta del backoffice; reutiliza `auth-shared`.
- `/`: formulario de registro, protegido por sesión.

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

## Validación

```bash
npm run lint
npm run build
```
