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

`platform.browser.test.mjs` valida el frontend unificado de transicion en el
puerto 3007: website, dashboard protegido, puente de sesion/cuenta y enlaces a
los modulos originales. Usa APIs sinteticas y permite guardar 22 capturas fuera
del repositorio con `PLATFORM_OUTPUT`. Requisitos y resultados en el
[informe de fase 2](../docs/FRONTEND_PHASE2.es.md).

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
