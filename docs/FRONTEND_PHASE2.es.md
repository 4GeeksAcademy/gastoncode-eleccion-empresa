# Fase 2: frontend unico de transicion

Fecha de validacion: 2026-11-14.
Revision inicial de aplicaciones: `5eb3ba92e0d8f17bb7e237644f6799ef95027e4c`.

## Resultado y condicion de entrega

Se implemento `uis/platform` con App Router, website y dashboard en paginas
separadas, conservando las siete aplicaciones originales. La aplicacion nueva
compila y funciona localmente con las dependencias ya instaladas.

**La integracion reproducible de dependencias queda pendiente.** La politica
organizativa excluye el lockfile raiz y parte del contenido instalado. No se
intento eludirla, no se actualizo ese archivo ni se ejecuto una instalacion de
dependencias del repositorio. No se afirma que `npm ci` funcione desde cero con
el nuevo workspace hasta que un responsable autorizado sincronice el lockfile
en un entorno permitido.

El desarrollador autorizo expresamente los manifiestos raiz/nuevo y el puerto
3007. Tambien aprobo adelantar un puente minimo de autenticacion de la fase 3,
para que el dashboard nuevo no quedara sin acceso real. No se migraron los
modulos de negocio ni las APIs.

## Aplicacion y rutas

```text
uis/platform/
  src/app/
    layout.tsx
    globals.css
    (public)/
      layout.tsx
      page.tsx                       /
      application/page.tsx           /application
    (backoffice)/
      layout.tsx
      backoffice/page.tsx             /backoffice
      login/page.tsx                  /login
      register/page.tsx               /register
      forgot-password/page.tsx        /forgot-password
      reset-password/page.tsx         /reset-password
      account/layout.tsx
      account/page.tsx                /account
      account/profile/page.tsx        /account/profile
      account/change-password/page.tsx
                                      /account/change-password
```

Los grupos entre parentesis no forman parte de las URLs. Hay un solo layout
raiz con `html` y `body`; los layouts de grupo no anidan documentos HTML.
Las diez rutas de pagina se compilan en una aplicacion, ademas del 404 de Next.

### Reutilizacion sin duplicar flujos

- Las rutas del website reutilizan sus paginas y componentes originales.
- Se extrajeron metadatos/JSON-LD a `uis/website/lib/site-metadata.ts`.
- Se sustituyeron siete imports ambiguos `@/components/...` por imports relativos
  en cuatro archivos del website. Su aplicacion standalone sigue compilando.
- El catalogo del dashboard se extrajo a `components/dashboard-home.tsx`.
  La pagina original lo usa sin opciones y mantiene sus enlaces relativos;
  platform configura el origen de los modulos originales.
- Las vistas de login, registro, recuperacion, reset y cuenta se reutilizan,
  no se implementa un segundo cliente HTTP o una segunda gestion de tokens.
- El SVG publico se conserva tambien en el `public` de platform para mantener
  la URL `/logo-brasaland.svg`.

Aliases nuevos:

| Alias | Destino |
| --- | --- |
| `@/*` | `uis/platform/src/*` |
| `@website/*` | `uis/website/*` |
| `@dashboard/*` | `uis/backoffice/dashboard-backoffice/src/app/*` |
| `@auth/*` | `uis/backoffice/auth-shared/*` |

Esta reutilizacion implica que el nuevo frontend aun depende de fuentes de
las aplicaciones originales. No se deben borrar esas carpetas durante esta fase.

## Stack y estilos

| Herramienta | Declaracion nueva |
| --- | --- |
| Next.js / eslint-config-next | 16.3.1 |
| React / React DOM | 19.2.8 |
| TypeScript | 6.0.3, alineado con la raiz instalada |
| ESLint | 9.39.5 |
| Tailwind CSS | 4.3.3 |
| Plugin PostCSS Tailwind | Rango 4, como en el dashboard original |

Se reutilizan versiones disponibles, sin actualizar las dependencias de las
aplicaciones originales. Estas mantienen sus manifiestos y sus diferencias
previas; no se afirma haber homogeneizado globalmente sus versiones.
La resolucion exacta del plugin y del arbol completo queda sujeta al lockfile
pendiente. Algunos manifiestos instalados tambien fueron denegados por la
politica y no se consultaron mediante otras herramientas.

Tailwind y el tema compartido se cargan una vez. Los `@source` incluyen las
vistas reutilizadas fuera de platform para no perder sus utilidades.
Los estilos de grupo usan CSS Modules:

- Website conserva tipografia del sistema y su esquema de controles nativos.
- Backoffice conserva Geist/Geist Mono y el tema oscuro.
- El scroll snap del website se limita a su grupo mediante un selector de
  presencia; no se aplica a cuenta o dashboard aunque la hoja quede cargada.
- El proveedor de autenticacion solo se monta en el grupo backoffice: el
  website no consulta identidad ni muestra estados de sesion.
- El JSON-LD publico y la indexacion del website se separan de los metadatos
  `noindex, nofollow` del grupo backoffice.

La documentacion local instalada de Next.js esta restringida. Se consulto la
documentacion publica oficial de route groups, CSS y configuracion Turbopack,
sin intentar reconstruir archivos excluidos.

## Puente minimo de autenticacion aprobado

`AuthProvider` admite un `homePath` opcional y acotado a `/` o `/backoffice`.
Su valor predeterminado sigue siendo `/`, por lo que las aplicaciones originales
conservan su comportamiento.

Solo platform configura `/backoffice`. El guard, el formulario de autenticacion,
el enlace del header y la invalidacion de sesion usan ese destino:

1. Sin sesion, `/backoffice` lleva a `/login?next=%2Fbackoffice`.
2. El login sin `next`, con `/` o con un destino rechazado termina en
   `/backoffice`, no en el website.
3. Las rutas de cuenta mantienen sus URLs.
4. Un 401 borra el token y conserva solo el pathname permitido para el login.
5. Un fallo temporal de identidad muestra un error y permite reintentar sin
   borrar el token.
6. El logout conserva el comportamiento compartido: borra el token y abre login.

Se conserva `brasaland.backoffice.token`; no hay JWT nuevos, tokens en URLs,
cookies nuevas ni relajacion de permisos. Los permisos reales siguen
correspondiendo a las APIs.

### APIs y modulos durante la transicion

Platform reenvia solamente `/api/auth`, `/api/users` y `/api/profiles`, incluidas
sus subrutas, a `AUTH_API_URL`.

Los cinco modulos permanecen en el backoffice original:

- `/suppliers`
- `/incidents-analyzer`
- `/incidents-manager`
- `/inventory-management`
- `/talent-pipeline-tracker`

Las tarjetas apuntan al origen original. Si se introduce una de esas rutas en
platform, hay una redireccion temporal 307 al mismo pathname/query en ese
origen. No se presentan como modulos migrados.

**No hay sesion compartida entre puertos.** `localhost:3000` y `localhost:3007`
son origenes diferentes; puede ser necesario autenticarse en ambos. Dentro del
backoffice original se conserva su navegacion actual, incluido el retorno a su
dashboard original. No se transfieren credenciales ni tokens entre origenes.

## Ejecucion con las dependencias existentes

Desde la raiz:

```bash
npm run dev:platform
```

Website: `http://localhost:3007/`.
Dashboard: `http://localhost:3007/backoffice`.

Para produccion local:

```bash
npm run lint:platform
npm run build:platform
npm run typecheck:platform
npm run start -w brasaland-platform
```

| Variable del servidor | Valor predeterminado | Uso |
| --- | --- | --- |
| `AUTH_API_URL` | `http://localhost:8001` | API de identidad, usuarios y perfiles |
| `LEGACY_BACKOFFICE_URL` | `http://localhost:3000` | Catalogo y redirecciones a modulos originales |

Estas variables no llevan prefijo `NEXT_PUBLIC_`. Sus valores deben estar
definidos durante el build de produccion porque las redirecciones/rewrites y
el catalogo se generan en esa fase; cambiarlas solo al arrancar no basta.

Platform no inicia APIs. El launcher `backoffice:dev` permanece sin cambios:
cinco APIs y seis UIs. El website original sigue en 3006 y platform en 3007.
El script raiz `dev`, que usa `dev:*`, incluye ahora tambien platform.

## Validacion

Las pruebas se realizaron en el host de desarrollo Ubuntu 24.04, no en el VPS
objetivo. No hubo conexiones a bases reales, correo o al proveedor de talento.

| Comprobacion | Resultado |
| --- | --- |
| Build de platform | Correcto, diez rutas de pagina |
| Builds de las siete aplicaciones originales | 7/7 correctos |
| Lint de las ocho interfaces | 8/8 correctos, sin advertencias |
| Tipos de platform | `next typegen` y `tsc --noEmit`, correctos |
| Navegacion compartida focalizada | 31/31 pruebas Jest correctas |
| Jest completo | 61 pruebas: 58 correctas y los 3 fallos previos |
| Node: clientes y launcher | 59 pruebas: 56 correctas, 2 fallidas previas y 1 omitida |
| Browser nuevo de platform | 35/35 correctas, incluidas 22 capturas |
| Browser de linea base original | 80 pruebas: 77 correctas y los mismos 3 fallos previos |
| Proxy HTTP real hacia stub sintetico | Correcto: 401, Bearer, subrutas, query y payload PATCH |

Las filas focalizadas no se suman nuevamente a las suites completas.
Las pruebas Python no se repitieron: no hubo cambios de servicios o persistencia.
Sus 108 resultados de fase 1 son historicos, no una nueva ejecucion de fase 2.

Se comprobo la convivencia de las ocho UIs en 3000-3007 mediante HTTP 200.
Las capturas de platform abarcan once vistas/estados, en 1365 x 1000 y 390 x 844,
sin desbordamiento horizontal en ninguno de esos 22 casos.

Se compararon esas 22 capturas con las mismas vistas de las aplicaciones
originales recompiladas, con igual navegador, fixtures, fecha y viewport:
**22/22 PNG identicos byte por byte**. La comparacion detecto inicialmente
pequenas diferencias en controles nativos y glifos de fallback; se corrigio
el alcance de `color-scheme` y la cadena de fuentes del layout nuevo.
Esto verifica esos estados sinteticos, no todos los estados posibles de la UI.
El manifiesto de comparacion se conserva con las evidencias.

Frente a las capturas historicas congeladas de fase 1, 44/46 PNG de las
aplicaciones originales son identicos. Los otros dos mantienen sus dimensiones:
listado de incidencias movil difiere en 28 pixeles del borde derecho, y reset
movil en 10 pixeles junto al borde de inputs. Se conservan las mediciones;
no se afirma identidad absoluta de las 46 referencias historicas.

Para probar el proxy se compilo temporalmente con una API sintetica en loopback
38101. Se verifico el transporte HTTP, sin sustituir el proxy por mocks del
navegador. El build final vuelve a la configuracion predeterminada de desarrollo.

Los fallos previos se detallan en la [fase 1](./BASELINE_PHASE1.es.md).
En la primera ejecucion se observo ademas una carrera de navegacion intermitente
en la prueba existente `direct manager login`; paso en la ejecucion final. No
se modifico esa prueba para ocultarla.

El primer ensayo browser se interrumpio tras detectar errores en los
fixtures nuevos: nombre incorrecto del boton de login y resembrado del token
al recargar. Tambien se acoto el selector del error para no confundirlo con
el anunciador accesible de Next.js. Se corrigieron los fixtures y se repitio
la suite nueva completa; no se cambiaron mensajes ni comportamiento de la
aplicacion para hacerla pasar.

### Repetir navegador

Con platform compilada e iniciada y Playwright/Chromium disponibles:

```bash
PLAYWRIGHT_MODULE=/ruta/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/ruta/browsers \
PLATFORM_OUTPUT=/ruta/externa/evidencias \
node --test --test-concurrency=1 scripts/platform.browser.test.mjs
```

`PLATFORM_OUTPUT` es opcional; si se usa, debe estar fuera del repositorio.
Genera 22 PNG, `visual.json` e `index.html`. Las APIs se simulan y el trafico
externo se bloquea, sustituyendo imagenes remotas por placeholders.
La suite comprueba rutas publicas, guard, login y destinos rechazados, cuenta,
logout, 401, reintento tras 503, catalogo, redirecciones y confirmacion local
del formulario publico.

Las bibliotecas faltantes de Chromium se descargaron y extrajeron en un
directorio temporal, sin instalar paquetes del sistema. Un hook del gestor de
paquetes intento limpiar su cache global y fue rechazado por permisos; no se
modificaron paquetes globales. Las herramientas temporales se eliminaron al
cerrar la validacion. Se detuvieron los ocho servidores UI y se comprobo que
los puertos 3000-3007 y el puerto sintetico 38101 quedaron libres.

## Pendiente antes de una entrega reproducible

1. Sincronizar el lockfile con autorizacion y acceso adecuados.
2. Verificar una instalacion limpia y repetir build/lint/tipos.
3. Completar en la fase 3 la navegacion objetivo bajo un unico origen.
4. Migrar los modulos en la fase 4, retirando entonces las redirecciones
   temporales y sus dependencias de las aplicaciones originales.
5. Resolver por separado los defectos previos de la linea base.

No se modificaron servicios, datos reales, archivos de entorno, instrucciones
locales, contratos protegidos ni `memory-bank`. No se desplego en VPS, Docker
o HTTPS, y no se crearon commits.
