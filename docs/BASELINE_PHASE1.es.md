# Linea base previa a la unificacion

Fecha de ejecucion: 2026-11-14.
Revision de las aplicaciones: `5eb3ba92e0d8f17bb7e237644f6799ef95027e4c`.

## Alcance y resultado

Se completo la fase 1: inventario de rutas y permisos, ejecucion de pruebas
existentes, compilaciones, referencias visuales y ensayo de recuperacion con
datos sinteticos. No se unificaron aplicaciones, modificaron servicios,
actualizaron dependencias del repositorio ni migraron datos.

La linea base queda **registrada con defectos previos, no completamente verde**.
Los fallos no se corrigieron ni se marcaron como esperados para ocultarlos.
Los comandos de comprobacion conservan codigo de salida distinto de cero cuando
una validacion falla.

La futura arquitectura acordada sigue siendo: website en `/`, dashboard en
`/backoffice`, modulos conservando sus URLs, frontend unico en `uis/platform`,
backend FastAPI modular separado y piloto por HTTPS/IP. Ninguno de estos
cambios de arquitectura pertenece a esta fase.

## Entorno y aislamiento

- Host de validacion: Ubuntu 24.04, x86_64; no es el VPS Ubuntu 22.04 de 1 GB.
- Node.js 24.22.2, npm 11.19.1, Python 3.14.2 y uv 0.13.8.
- Next.js 16.3.1, salvo talento 16.3.0; React 19.2.8.
- Playwright 1.58.2 y Chromium 145.0.7632.6.
- Dependencias Python instaladas desde los cinco manifiestos y sus grupos de
  pruebas en un entorno temporal comun; cada suite se ejecuto en un proceso
  separado y desde su directorio. No equivale a validar cinco locks originales.
- El inventario de versiones resueltas se conserva en las evidencias. Entre
  ellas: FastAPI 0.163.0, Pydantic 2.14.3, SQLModel 0.0.50 y TinyDB 4.9.0.
- No se instalaron paquetes globales ni del sistema. Las bibliotecas faltantes
  de Chromium se descargaron y extrajeron temporalmente, usando
  `LD_LIBRARY_PATH`.
- No se iniciaron las APIs ni se llamo a Supabase, Resend o al proveedor de
  talento. Las pruebas existentes de APIs usan mocks, TinyDB temporal y SQLite.
- Las siete UIs se iniciaron en modo produccion, enlazadas a loopback, y se
  verifico HTTP 200 antes del navegador. Se detuvieron al finalizar la
  validacion y se comprobo que los puertos 3000-3006 quedaron libres.
- No se ejecutaron seeds sobre datos existentes ni se copiaron bases reales.

La documentacion del Next.js instalado esta restringida por la politica de
contenido de la organizacion. No se intento acceder por vias alternativas ni
se modifico codigo de las aplicaciones.

## Inventario actual: siete aplicaciones y 28 paginas

Los prefijos de `basePath` se incluyen en las URLs de esta tabla. Las paginas
auxiliares de proveedores pertenecen a su servidor independiente; el origen
integrado sirve login y registro desde el dashboard.

| Aplicacion / puerto | Paginas actuales |
| --- | --- |
| Website / 3006 | `/`, `/application` |
| Dashboard / 3000 | `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account`, `/account/profile`, `/account/change-password` |
| Proveedores / 3001 | `/` (redirige a `/suppliers`), `/suppliers`, `/login` y `/register` (redirigen al dashboard) |
| Analizador / 3002 | `/incidents-analyzer`, `/incidents-analyzer/incidents` |
| Gestor / 3004 | `/incidents-manager`, `/incidents-manager/incidents`, `/incidents-manager/summary`, `/incidents-manager/login` |
| Inventario / 3005 | `/inventory-management` (redirige a productos), `/inventory-management/products`, `/inventory-management/inbound`, `/inventory-management/outbound`, `/inventory-management/orders`, `/inventory-management/login` |
| Talento / 3003 | `/talent-pipeline-tracker`, `/talent-pipeline-tracker/candidates/[id]` |

`routes.json`, generado por la herramienta, conserva aplicacion, puerto, ruta,
archivo de origen y SHA-256 de cada pagina. Es un inventario de paginas, no de
endpoints API, assets o rutas internas generadas por Next.js.

### Navegacion y comportamiento que deben preservarse

1. El dashboard actual ocupa `/` en el puerto 3000 y requiere sesion. El
   website ocupa `/` en el puerto 3006 y es publico.
2. Las cinco tarjetas del catalogo abren proveedores, analizador, gestor,
   inventario y talento bajo el origen del dashboard. Se comprobo el recorrido
   de ida y vuelta al dashboard en navegador.
3. La navegacion entre aplicaciones usa recargas completas. Los `Link` internos
   de las zonas con `basePath` reciben actualmente su prefijo automaticamente.
4. El login y registro centralizados, la recuperacion y el reset mantienen sus
   URLs actuales. Los accesos anonimos a vistas privadas conservan el pathname
   en `next`, sin datos de query ni fragmento durante la invalidacion.
5. Se conserva `brasaland.backoffice.token`, validacion de cuenta vigente,
   invalidacion por 401, conservacion del token ante caidas temporales y logout
   sincronizado entre pestanas. Las pruebas existentes cubren estos escenarios.
6. La UI y API de incidencias permiten operar a cualquier usuario autenticado;
   las transiciones finales no son reversibles.
7. El stock se deriva de movimientos: vacio, bajo hasta 50 inclusive y suficiente
   por encima de 50. Las capturas incluyen ejemplos con 0, 25 y 100 unidades.
8. El historial de inventario obtiene los nombres de autores mediante
   `/api/users/display-names`; no basta con simular solo `/api/inventory`.
9. Talento consulta desde cliente, requiere admin/manager y utiliza filtros,
   paginacion, detalle, cambios y notas. La suite existente no completa todo el
   flujo por el fallo de selector descrito mas abajo.
10. El formulario del website valida y muestra confirmacion local sin enviar
    solicitudes API. Una prueba nueva verifica expresamente ese comportamiento;
    no debe interpretarse como entrega real de un contacto.

### Matriz de permisos

| Area | Anonimo | user | manager | admin |
| --- | --- | --- | --- | --- |
| Website y formulario | Publico | Publico | Publico | Publico |
| Dashboard, cuenta y perfil propio | Login | Permitido | Permitido | Permitido |
| Directorio de usuarios | Denegado | Denegado | Lectura | Lectura y administracion |
| Consultar proveedores | Denegado | Permitido | Permitido | Permitido |
| Crear, modificar o eliminar proveedores | Denegado | Denegado | Permitido | Permitido |
| Gestor y analizador de incidencias | Denegado | Permitido | Permitido | Permitido |
| Productos e historial de inventario | Denegado | Permitido | Permitido | Permitido |
| Entradas y salidas de inventario | Denegado | Denegado | Permitido | Permitido |
| Talento, incluidas consultas | Denegado | Denegado | Permitido | Permitido |

Los endpoints de usuarios conservan reglas de propietario o administrador.
Cambiar rol o estado de otra cuenta requiere admin; manager no obtiene
controles para editar el directorio. Los guards cliente no sustituyen los
permisos de las APIs.

Fuentes principales: [autenticacion](../uis/backoffice/auth-shared/),
[usuarios](../services/api-auth/users.py),
[proveedores](../services/api-suppliers/routers/suppliers.py),
[incidencias](../services/api-incidents/main.py),
[inventario](../services/api-inventory/routers/inventory.py) y
[talento](../services/api-talent/auth.py).

## Validaciones

| Validacion | Resultado |
| --- | --- |
| Lint | 7/7 interfaces, correcto |
| Build de produccion | 7/7 interfaces, correcto |
| Node: launcher y clientes | 59 pruebas: 56 correctas, 2 fallidas, 1 omitida |
| Jest: auth e inventario | 52 pruebas: 49 correctas, 3 fallidas |
| Browser: conjunto completo | 80 pruebas: 77 correctas, 3 fallidas |
| Browser: nuevas comprobaciones de baseline | 51/51 correctas, incluidas las 46 capturas |
| Browser: suites existentes seleccionadas | 29 pruebas: 26 correctas, 3 fallidas |
| Python auth | 34 correctas |
| Python proveedores | 8 correctas |
| Python incidencias | 32 correctas |
| Python inventario | 10 correctas, SQLite aislado |
| Python talento | 9 correctas, proveedor simulado |
| Seed de incidencias | 8 correctas, fixtures temporales |
| Planificador de reposicion | 7 correctas |
| Recuperacion sintetica | 4 archivos restaurados y verificados |

El lifecycle completo de once procesos esta omitido deliberadamente. No se
ejecuto `backoffice:setup`, que prepararia entornos del repositorio, ni se uso el
launcher con bases reales. Las filas de desglose browser forman parte de las
80 pruebas, no se suman nuevamente. El comando browser devolvio error por los
tres fallos existentes documentados; las 51 comprobaciones nuevas pasaron.

### Fallos previos identificados

| Identificador | Evidencia y alcance |
| --- | --- |
| BASE-01 | Dos pruebas Node del cliente auth esperan textos sin tildes; el codigo devuelve mensajes acentuados de sesion expirada y respuesta JSON no valida. |
| BASE-02 | Tres casos Jest esperan mensajes sin tildes para respuesta no valida, accion no permitida y servicio temporalmente fallido. El codigo devuelve textos acentuados. |
| BASE-03 | Browser: registro duplicado espera el detalle de email duplicado, pero la UI muestra el mensaje generico de validacion. |
| BASE-04 | Browser: credenciales incorrectas espera un mensaje de credenciales, pero la UI muestra el texto generico de sesion expirada o no valida. |
| BASE-05 | Browser talento: `input[name="email"]` coincide con el alta y con el filtro. Playwright rechaza el selector ambiguo; el resto de ese flujo no queda validado. |
| BASE-06 | Gestor de incidencias, movil 390 px: registro, listado y resumen tienen documento de 590 px. La barra `navLinks` y controles de sesion sobresalen 200 px. |

BASE-01 y BASE-02 son discrepancias observadas entre pruebas y textos, no prueba
de un defecto de autorizacion. BASE-03 y BASE-04 requieren decidir por separado
el contrato de mensajes. BASE-05 limita lo que se puede afirmar del flujo
completo de talento. No se corrigio ninguno en esta fase.

### Requisito de configuracion observado

`NEXT_PUBLIC_DASHBOARD_URL=http://localhost:3000` debe estar definido para el
login auxiliar de inventario en este entorno. Sin ese valor, su redireccion
relativa puede permanecer dentro del `basePath`. Se recompilo inventario con
el valor usado por el launcher y se comprobo el destino centralizado.

La raiz de inventario puede responder HTTP 200 durante su redireccion de
navegacion. Se verifica el destino efectivo en navegador, no se presupone que
toda redireccion App Router tenga necesariamente un 307 HTTP.

## Referencias visuales

- 23 vistas/estados, cada uno a 1365 x 1000 y 390 x 844: **46 PNG**.
- Incluyen website, formulario, login, registro, recuperacion, reset con/sin
  token, dashboard, cuenta, perfil, cambio de clave y todas las subrutas de negocio.
- Las paginas son reales; las APIs estan interceptadas con fixtures sinteticos.
- Locale `es-CO`, zona UTC, reloj fijo y movimiento reducido.
- Las imagenes externas del website se sustituyen por un placeholder local
  determinista; no son una referencia del contenido fotografico remoto.
- `visual.json` conserva enlaces reales, titulos, dimensiones, elementos que
  sobresalen y excepciones. `index.html` permite recorrer la galeria.
- Los desbordamientos se registran como hallazgos; capturar una pagina no
  significa aprobar su UX. No se ejecuta una comparacion pixel a pixel.

Las referencias abarcan las vistas principales, no todos los estados posibles,
modales, roles, temas o combinaciones de filtros. No son pruebas E2E con las
bases y proveedores reales.

## Datos sinteticos y recuperacion

[baseline-recovery.py](../scripts/baseline-recovery.py) genera cuatro TinyDB
nuevas en un directorio temporal exclusivo, con usuarios/perfiles ficticios,
proveedor, incidencia y analisis minimos. No contienen credenciales ni datos de
personas reales y no son un seed completo de negocio.

El ensayo:

1. Cierra los escritores.
2. Copia los archivos y comprueba SHA-256.
3. Simula corrupcion de los originales sinteticos.
4. Restaura a otro directorio.
5. Comprueba SHA-256 y contenido de las tablas con TinyDB.
6. Elimina exclusivamente el directorio temporal creado por el ensayo.

Esto verifica una copia offline de fixtures, **no un backup de produccion**.
Antes de trasladar datos reales habra que autorizar una copia consistente de
los archivos efectivos con las APIs detenidas, guardar permisos y configuracion
de forma segura y ensayar la restauracion en un entorno aislado.

PostgreSQL/Supabase y el proveedor de talento quedan fuera de este ensayo. No
se ejecutaron `pg_dump`, restauraciones ni operaciones sobre sus datos.

## Reproducir

Con las dependencias npm existentes y un Python que tenga los requisitos de
los manifiestos y sus grupos de test:

```bash
BASELINE_PYTHON=/ruta/entorno/bin/python \
  node scripts/baseline-checks.mjs /ruta/externa/checks
```

La herramienta no instala dependencias. Genera inventario, versiones,
`checks.json` y un log por comando; sigue recogiendo resultados tras un fallo,
pero devuelve error al final si algun comando fallo. Los builds generan sus
artefactos normales de Next.js. Detener los servidores antes de ejecutarlos.

Despues de los builds, con puertos 3000-3006 libres:

```bash
node scripts/baseline-uis.mjs /ruta/externa/servers
```

Mantener ese proceso activo solo durante la comprobacion. Inicia exclusivamente
las UIs de produccion en loopback, verifica disponibilidad y no inicia APIs.
En otra terminal, con Playwright/Chromium y sus bibliotecas disponibles:

```bash
BASELINE_OUTPUT=/ruta/externa/visual \
PLAYWRIGHT_MODULE=/ruta/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/ruta/browsers \
node --test --test-concurrency=1 --test-reporter=tap \
  scripts/baseline-browser.test.mjs \
  uis/backoffice/dashboard-backoffice/tests/auth-browser.test.mjs \
  scripts/medium-priority.browser.test.mjs \
  scripts/talent.browser.test.mjs
```

El script nuevo intercepta APIs y bloquea trafico externo del navegador.
Las suites existentes seleccionadas tambien simulan sus APIs; no incluir
`scripts/backoffice-browser.test.mjs`, que requiere APIs y bases de prueba
reales aisladas. Los scripts existentes pueden guardar capturas adicionales
en `/tmp`; las 46 referencias oficiales se guardan en `BASELINE_OUTPUT`.

Finalizar el proceso de UIs al terminar. Para repetir solo el ensayo offline:

```bash
/ruta/entorno/bin/python scripts/baseline-recovery.py
```

## Entrada a la fase 2

La referencia tecnica y visual ya permite comparar la migracion. No debe
presentarse como una certificacion funcional completa o de produccion.
Antes de exigir una CI completamente verde hay que resolver, o aceptar
explicitamente y por separado, los fallos previos documentados.

No se han validado el VPS, consumo con 1 GB, Docker, HTTPS por IP, renovacion de
certificados, correo real, concurrencia PostgreSQL ni todo el ciclo de los once
procesos. Son trabajos posteriores, no resultados implicitos de estos builds.
