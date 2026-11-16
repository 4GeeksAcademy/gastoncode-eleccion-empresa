# Pruebas

## Frontend unificado

Con las dependencias existentes, desde la raiz:

```bash
npm run typecheck:platform
npm run lint:platform
npm run build:platform
npm run start -w brasaland-platform
# En otra terminal:
node scripts/browser-tests.mjs scripts/platform.browser.test.mjs
# Solo con 8005 libre y destino local en el build:
node --test scripts/platform-proxy.test.mjs
```

El navegador usa APIs sinteticas: no necesita las UIs originales ni APIs
reales. La suite contiene 72 casos y puede guardar 46 capturas con
`PLATFORM_OUTPUT=/ruta/fuera/del/repositorio`. La suite HTTP crea una API
sintetica unificada y contiene 19 casos; no debe ejecutarse junto a la API
real. Para probar el launcher con `node --test scripts/backoffice.test.mjs`,
detener tambien platform: su prueba sintetica de ciclo de vida reserva 3007 y 8005.

Resultados, diferencias visuales y fallos previos:
[informe de fase 3](./docs/FRONTEND_PHASE3.es.md).
El lockfile sigue pendiente de sincronizacion por un responsable autorizado;
esta fase no acredita una instalacion limpia mediante `npm ci`.

## API unificada (Python)

Requiere Python 3.14+ y `uv`. Desde la raíz del monorepo:

```bash
uv sync --project services/api-unified --group test
uv run --project services/api-unified --group test -- python -m unittest discover -s services/api-unified/tests -v
```

La suite ejecuta tests de humo sobre la aplicacion unificada de forma aislada,
sin depender de los servicios legacy eliminados.

## Lógica de autenticación (TypeScript)

Requiere Node.js y las dependencias npm instaladas desde la raíz:

```bash
npm install
npx jest --coverage
```

Jest descubre pruebas en `lib/`. Incluye pruebas del cliente de inventario
(cabeceras Bearer, payload e historial) y clasificación de stock; las pruebas
simulan `fetch` y el almacenamiento local del navegador. La cobertura HTML se
genera en `coverage/`.

## Talento integrado

```bash
node --test scripts/backoffice.test.mjs
uv sync --project services/api-unified --group test
uv run --project services/api-unified --group test -- python -m unittest discover -s services/api-unified/tests -v
node scripts/browser-tests.mjs scripts/platform.browser.test.mjs
```
