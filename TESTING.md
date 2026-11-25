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
# Prueba normal; la prueba de ciclo de vida real es opcional y usa puertos 3007/8005:
node --test scripts/backoffice.test.mjs
```

El navegador usa APIs sinteticas: no necesita las UIs originales ni APIs
reales. La suite contiene 72 casos de navegador; 23 rutas se prueban en dos
tamaños de viewport, lo que representa 46 casos y posibles capturas.
Los demás casos cubren flujos de autenticación, navegación y operaciones de
módulo. Puede guardar capturas con
`PLATFORM_OUTPUT=/ruta/fuera/del/repositorio`. La suite HTTP crea una API
sintetica unificada y contiene 19 casos: siete recursos probados con dos
sufijos cada uno (14), más cinco pruebas HTTP/check. No debe ejecutarse junto a la API
real. Para probar el launcher con `node --test scripts/backoffice.test.mjs`,
detener tambien platform: su prueba sintetica de ciclo de vida reserva 3007 y 8005.

No hay un informe de fase versionado en `docs/` en este momento. Los casos,
requisitos y límites vigentes se describen en este archivo y en
[`scripts/README.es.md`](./scripts/README.es.md). La instalación reproducible
desde un lockfile debe validarse por separado antes de afirmar que `npm ci`
funciona en un entorno limpio.

## API unificada (Python)

Requiere Python 3.14+ y `uv`. Desde la raíz del monorepo:

```bash
uv sync --project services/api-unified --group test
uv run --project services/api-unified --group test -- pytest services/api-unified/tests -v
```

La suite está escrita para pytest y ejecuta pruebas de humo sobre la aplicación
unificada con almacenes temporales/configuración de prueba; no requiere
servicios por dominio separados. No la ejecutes contra bases con datos reales.

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
