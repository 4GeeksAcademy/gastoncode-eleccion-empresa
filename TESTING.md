# Pruebas

## API de autenticación (Python)

Requiere Python 3.14+ y `uv`. Desde la raíz del monorepo, prepara las dependencias. Ejecuta pytest desde el directorio del servicio para limitar la colección a esta API:

```bash
uv sync --project services/api-auth --group test
cd services/api-auth
uv run pytest
```

La suite invoca la lógica de los endpoints directamente (sin probar el transporte ni la serialización HTTP), utiliza una base TinyDB temporal y no llama a servicios de correo externos.

## Lógica de autenticación (TypeScript)

Requiere Node.js y las dependencias npm instaladas desde la raíz:

```bash
npm install
npx jest --coverage
```

Jest descubre pruebas en `uis/backoffice/auth-shared` y `lib/`. Incluye pruebas de navegación/guard de autenticación, cliente de inventario (cabeceras Bearer, payload e historial) y clasificación de stock; las pruebas simulan `fetch` y el almacenamiento local del navegador. La cobertura HTML se genera en `coverage/`. El comando existente es `npm run test:auth:ts` (el nombre se conserva por compatibilidad aunque ya cubre también `lib/`); para una ejecución serial se puede usar `npm run test:auth:ts -- --runInBand`.

Las comprobaciones de integración de las UIs de inventario son independientes:

```bash
npm run lint -w inventory-management
npm run build -w inventory-management
```

La compilación valida tipos y rutas de la aplicación; las pruebas Jest no reemplazan una prueba E2E con servicios y base de datos reales.
