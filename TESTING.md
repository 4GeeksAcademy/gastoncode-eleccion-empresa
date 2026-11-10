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

## Talento integrado

```bash
node --test scripts/backoffice.test.mjs uis/backoffice/dashboard-backoffice/tests/auth-api.test.mjs uis/backoffice/talent-pipeline-tracker/tests/talent-api.test.mjs
uv sync --project services/api-talent --group test
uv run --directory services/api-talent --group test python -m unittest discover -s tests -v
npm run lint -w talent-pipeline-tracker
npm run build -w talent-pipeline-tracker
node scripts/browser-tests.mjs scripts/talent.browser.test.mjs
```

La API simula identidad y proveedor; el cliente simula fetch y localStorage.
El navegador requiere dashboard y tracker iniciados, simula las APIs y genera
capturas en /tmp. No envía candidatos a 4Geeks ni toca bases reales. Chromium
necesita sus bibliotecas del sistema: la ejecución actual quedó bloqueada por
libatk-1.0.so.0 ausente. Detener desarrollo antes del build.
