# Carpeta `scripts`

Esta carpeta contiene **scripts auxiliares** del monorepo: automatizaciones de desarrollo, utilidades de mantenimiento, tareas repetitivas (setup, lint, migraciones, generación de datos, etc.) y tooling interno.

- **Propósito principal**: agrupar herramientas de soporte que no pertenecen a una app/agente/pipeline específico, pero facilitan el trabajo del equipo.
- **Recomendación**: documenta cada script (qué hace, parámetros, requisitos, ejemplos de uso) y procura que sean reproducibles (y seguros) en distintos entornos.

## Linea base previa a la unificacion

La [linea base de fase 1](../docs/BASELINE_PHASE1.es.md) documenta rutas, permisos,
resultados, defectos previos, aislamiento y comandos de reproduccion.

- `baseline-checks.mjs`: inventario de paginas, versiones, pruebas, lint y builds;
  requiere `BASELINE_PYTHON` y una salida fuera del repositorio. No instala paquetes
  y devuelve error si falla alguna comprobacion.
- `baseline-uis.mjs`: inicia solo las siete UIs ya compiladas en loopback, verifica
  disponibilidad y guarda logs fuera del repositorio. No inicia las APIs.
- `baseline-browser.test.mjs`: captura vistas reales en escritorio/movil con APIs
  sinteticas, registra enlaces/desbordamientos y verifica rutas y guards.
  Requiere `BASELINE_OUTPUT`, Playwright y las UIs iniciadas.
- `baseline-recovery.py`: ensayo offline de copia, corrupcion y restauracion de
  cuatro archivos TinyDB generados temporalmente. No acepta bases existentes.

`platform.browser.test.mjs` valida el frontend unificado en 3007: website,
dashboard, sesion/cuenta y los cinco modulos reales. Comprueba navegacion SPA,
roles, acceso directo/recarga, escrituras con contratos existentes, upload y
descarga CSV, logout entre pestanas y aislamiento de estilos/tema. Usa APIs
sinteticas y permite guardar 46 capturas fuera del repositorio con
`PLATFORM_OUTPUT`. Comparte fixtures sinteticos con la linea base mediante
`backoffice-fixtures.mjs`.

`platform-proxy.test.mjs` comprueba el transporte HTTP real desde platform a
cinco servidores sinteticos locales: rutas exactas/subrutas, query, Bearer,
PATCH JSON, multipart, descarga, 401 y `platform-check`. Requiere platform ya
iniciado y los puertos **8000-8004 libres**; rechaza puertos ocupados y cierra
los servidores que crea. No ejecutarlo contra una plataforma conectada a APIs
reales ni simultaneamente con el launcher integrado.

```bash
npm run build:platform
npm run start -w brasaland-platform
# En otra terminal, solo con las APIs reales detenidas:
node scripts/browser-tests.mjs scripts/platform.browser.test.mjs
node --test scripts/platform-proxy.test.mjs
```

`PLATFORM_URL` permite cambiar el origen (3007 por defecto). Para las pruebas de
proxy, el build debe usar los destinos locales predeterminados.
Los resultados y limites se documentan en el
[informe de fase 3](../docs/FRONTEND_PHASE3.es.md).

## Launcher unificado

`node scripts/backoffice.mjs platform-dev` inicia platform y las cinco APIs:
seis procesos, puertos 3007 y 8000-8004, sin UIs originales ni website separado.
Requiere los entornos existentes y la configuracion de base de datos de las APIs.
`platform-check` verifica su disponibilidad y las respuestas protegidas sin
token. Ambos modos conservan `dev`, `check`, `setup` y `admin` originales.

La prueba de ciclo de vida en `backoffice.test.mjs` utiliza ejecutables/servidores
sinteticos temporales para comprobar arranque y cierre sin acceder a bases,
correo o proveedores. Necesita 3007 y 8000-8004 libres.

## Pruebas de navegador con instalacion temporal

`browser-tests.mjs` instala Playwright 1.58.2 y Chromium fuera del repositorio,
en un directorio temporal exclusivo. Ejecuta `node --test` y elimina la
instalacion tanto al terminar correctamente como si falla.
No modifica manifiestos, locks ni las dependencias del workspace.

Requiere Node.js 22+, npm, acceso a los registros de npm y las descargas de
Playwright, y las bibliotecas del sistema necesarias para Chromium.
No instala paquetes del sistema operativo ni inicia las aplicaciones.

Con el dashboard iniciado:

```bash
node scripts/browser-tests.mjs
```

Se pueden pasar opciones de `node --test` y archivos concretos. Para comprobar
sesion y tarifas, iniciar dashboard (3000), proveedores (3001) y gestor (3004):

```bash
node scripts/browser-tests.mjs scripts/medium-priority.browser.test.mjs
```

Estas pruebas interceptan la API y no crean registros en las bases reales.
`DASHBOARD_URL` permite cambiar el origen publico (por defecto
`http://localhost:3000`). Las opciones deben preceder a los archivos:

```bash
node scripts/browser-tests.mjs --test-name-pattern='expiration|logout' uis/backoffice/dashboard-backoffice/tests/auth-browser.test.mjs
```

El script no elimina evidencias generadas por las pruebas. SIGINT/SIGTERM
interrumpe el comando activo y ejecuta la limpieza; SIGKILL o una caida del
sistema no permiten garantizar esa limpieza.
