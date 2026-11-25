# Carpeta `scripts`

Esta carpeta reúne herramientas para desarrollo, pruebas y mantenimiento del monorepo. Los scripts se ejecutan desde la raíz, salvo que el propio comando indique otra cosa.

## Launcher de desarrollo

`backoffice.mjs` prepara y coordina los dos procesos de la aplicación integrada: la API FastAPI (`services/api-unified`, puerto 8005) y la plataforma Next.js (`uis/platform`, puerto 3007).

```bash
node scripts/backoffice.mjs setup
node scripts/backoffice.mjs dev
node scripts/backoffice.mjs check
node scripts/backoffice.mjs admin usuario@ejemplo.com
```

`setup` instala las dependencias; `dev` inicia la API y la plataforma; `check` comprueba disponibilidad y proxies protegidos sin token; `admin` promueve una cuenta ya registrada y requiere que la API esté detenida. Los puertos 8005 y 3007 deben estar libres para `dev` y la prueba de ciclo de vida real, que es opcional (`BACKOFFICE_LIFECYCLE=1`). El launcher de desarrollo genera y reutiliza un secreto JWT local cuando no se proporciona `JWT_SECRET`.

## Pruebas de la plataforma

`platform.browser.test.mjs` ejecuta pruebas de navegador para la plataforma unificada en 3007. Usa respuestas sintéticas interceptadas y no debe crear datos en bases reales. Inicia la plataforma antes de ejecutarla:

```bash
npm run build:platform
npm run start -w brasaland-platform
# En otra terminal
node scripts/browser-tests.mjs scripts/platform.browser.test.mjs
```

`platform-proxy.test.mjs` comprueba el transporte HTTP real del frontend a un servidor API sintético en 8005. Requiere que la plataforma esté iniciada con rewrites locales y que no haya una API real ocupando el puerto. No la ejecutes contra una plataforma conectada a servicios con datos reales:

```bash
node --test scripts/platform-proxy.test.mjs
```

`PLATFORM_URL` permite cambiar el origen web (por defecto `http://localhost:3007`). El runner instala Playwright 1.58.2 y Chromium en una ubicación temporal; requiere internet y las bibliotecas del sistema necesarias para Chromium. No instala paquetes del sistema ni modifica los manifiestos del workspace.

## Pruebas del launcher

```bash
node --test scripts/backoffice.test.mjs
```

La prueba normal verifica la configuración con servicios sintéticos. La prueba de ciclo de vida de la aplicación real es opcional (`BACKOFFICE_LIFECYCLE=1`), inicia la API y platform, usa puertos 3007 y 8005 y escribe bases SQLite/TinyDB temporales. No la ejecutes con esos puertos ocupados ni junto con servicios reales.

Los scripts `baseline-*` corresponden a una evaluación histórica de interfaces separadas; no describen la topología integrada actual. No se conserva en `docs/` el informe de baseline enlazado anteriormente. Para pruebas actuales, usa `platform.browser.test.mjs`, `platform-proxy.test.mjs` y la guía [`TESTING.md`](../TESTING.md).
