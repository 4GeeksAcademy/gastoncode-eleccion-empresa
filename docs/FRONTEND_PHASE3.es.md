# Fase 3: autenticacion, navegacion y migracion de modulos

## Resultado y alcance autorizado

Se completo la integracion de autenticacion y navegacion de fase 3. En la
consulta de alcance, se eligio **migrar ya los cinco modulos**, adelantando
tambien la integracion frontend prevista para fase 4, en lugar de introducir
proxies multizona temporales.

`uis/platform` sirve el website, dashboard, cuenta y los cinco modulos con un
solo proceso Next.js App Router en 3007. No necesita servidores UI en 3000-3006.
Las cinco APIs siguen separadas; su consolidacion no forma parte de este cambio.
No se eliminaron aplicaciones originales ni se hicieron commits.

La migracion integra rutas, layouts, componentes y clientes en el mismo build:
las paginas de platform reutilizan directamente las implementaciones originales.
No hay iframes, proxies a UIs ni copias paralelas de logica de negocio. Los
archivos reutilizados permanecen en sus carpetas originales para conservar la
compatibilidad durante la transicion. Mover esas carpetas o retirar los siete
proyectos originales es una limpieza posterior, no un requisito de ejecucion.

## Rutas y composicion

| Area | Rutas |
| --- | --- |
| Website publico | `/`, `/application` |
| Dashboard | `/backoffice` |
| Autenticacion | `/login`, `/register`, `/forgot-password`, `/reset-password` |
| Cuenta | `/account`, `/account/profile`, `/account/change-password` |
| Proveedores | `/suppliers` |
| Analizador | `/incidents-analyzer`, `/incidents-analyzer/incidents` |
| Gestor | `/incidents-manager`, `/incidents-manager/incidents`, `/incidents-manager/summary` |
| Inventario | `/inventory-management`, `/inventory-management/products`, `/inventory-management/inbound`, `/inventory-management/outbound`, `/inventory-management/orders` |
| Talento | `/talent-pipeline-tracker`, `/talent-pipeline-tracker/candidates/[id]` |

El build contiene **25 rutas de pagina mas la 404**, contando tres entradas de
redireccion: inventario raiz lleva a productos; los aliases
`/inventory-management/login` e `/incidents-manager/login` llevan al login
central con `next` validado, incluidos parametros repetidos o no permitidos.

- El grupo publico conserva su layout, metadatos/JSON-LD y formulario sin
  inicializar autenticacion. El formulario mantiene su confirmacion local:
  no se implemento envio de contactos.
- El grupo backoffice mantiene **un unico `AuthProvider`**. Login, registro y
  recuperacion no pasan por el guard de los modulos.
- Un layout de modulos impide montar contenido sin sesion. Talento restringe
  admin/manager; inventario distingue lectura y escritura segun subruta.
- Las tarjetas y enlaces internos usan App Router, con prefijos completos.
  Los enlaces de retorno llevan a `/backoffice`, no al website.
- Talento conserva sus estados de loading/error y su detalle dinamico.

### Sesion y permisos

Se conserva el token `brasaland.backoffice.token`, los contratos y los permisos
actuales. No se crean cookies, JWT adicionales ni tokens en URLs.

`AuthProvider` admite `internalNavigation`, desactivado por defecto. Platform lo
activa; las aplicaciones originales siguen usando su navegacion multizona.
`ModuleLink` aplica el prefijo del modulo solo en platform: evita duplicar el
`basePath` de las aplicaciones originales. Los imports ambiguos `@/` de los
modulos reutilizados pasan a relativos para resolver los mismos archivos en
ambas compilaciones.

El login sin destino, con `/` o con un destino rechazado termina en
`/backoffice`. Un `next` permitido puede volver a una subruta de modulo sin
recargar el documento ni volver a validar la identidad. El guard y los 401
conservan solo el pathname permitido para la redireccion; descartan query/hash,
igual que antes. El cierre de sesion borra el token y se sincroniza entre
pestanas. Un fallo temporal de identidad permite reintentar sin borrar el token.

La navegacion entre los cinco modulos y el dashboard se verifico con una marca
del documento conservada y **una sola peticion `/api/auth/me`**. Las APIs siguen
siendo la autoridad de permisos: los guards de UI no sustituyen su autorizacion.

### Estilos y fuentes

Platform genera Tailwind una sola vez, incluyendo las fuentes de proveedores
y talento. Las hojas CSS planas se adaptan en `src/styles/` bajo `@scope` por
modulo, conservando clases, media queries y apariencia. Se sustituyen html/body
por la raiz local y se distinguen los nombres de animaciones. Las aplicaciones
originales mantienen sus hojas globales.

El reset de los tres modulos sin Tailwind neutraliza preflight tambien en los
controles nativos, sin desactivar las utilidades de otras areas. Hanken Grotesk
y Libre Caslon permanecen limitadas a sus modulos; website y dashboard conservan
sus fuentes. El fondo del documento se adapta solo cuando hay backoffice.

El modo claro de talento modifica su contenedor, no el html de platform. Su
paleta local deriva de los valores del tema compartido; debe mantenerse
sincronizada si estos cambian. En el tracker original el hook sigue usando
html. Asi se evita incluso el cambio transitorio de tema al volver al dashboard.
Las adaptaciones CSS locales tambien deben revisarse cuando cambien los estilos
originales. Se requieren navegadores con soporte de CSS `@scope`; se verifico
Chromium 145, no una matriz completa de motores/versiones.

## APIs y ejecucion

Se eliminan las redirecciones de platform hacia el backoffice original y la
dependencia de `LEGACY_BACKOFFICE_URL`. Solo se mantienen proxies de APIs:

| Variable del servidor | Destino predeterminado (anterior) | Rutas en platform |
| --- | --- | --- |
| `UNIFIED_API_URL` | `http://127.0.0.1:8005` | `/api/*` completo (auth, suppliers, incidents, inventory, talent) |

> Las variables individuales [`AUTH_API_URL`, `SUPPLIERS_API_URL`, `INCIDENTS_API_URL`,
> `INVENTORY_API_URL`, `TALENT_API_URL`] eran el destino de los servicios legacy,
> ahora eliminados. El frontend actual usa `UNIFIED_API_URL` o el rewrite
> predeterminado hacia el puerto 8005.

Estas variables no son publicas. Deben configurarse **antes del build** de
produccion; cambiarlas solo al arrancar no actualiza los rewrites compilados.
No se uso un proxy generico de `/api/*` que pudiera enviar identidad a otro
dominio por error.

Con los entornos existentes y la configuracion de APIs disponible:

```bash
# Un frontend y una API unificada, sin servicios legacy:
node scripts/backoffice.mjs dev
# En otra terminal:
node scripts/backoffice.mjs check
```

Website: `http://localhost:3007/`. Dashboard:
`http://localhost:3007/backoffice`. Requiere libres 3007 y 8005.
`Ctrl+C` cierra los dos procesos. El modo conserva la configuracion local de
JWT del launcher; no prepara bases ni sustituye gestion de secretos productiva.
Inventario sigue necesitando la configuracion PostgreSQL de su API.

Para ejecutar solo el frontend:

```bash
npm run dev:platform
# O produccion local, con APIs disponibles por separado:
npm run typecheck:platform
npm run lint:platform
npm run build:platform
npm run start -w brasaland-platform
```

Los modos `dev`, `check`, `setup` y `admin` siguen disponibles.

## Validacion y evidencias

Se uso el host de desarrollo, no el VPS objetivo. El navegador fue Playwright
1.58.2 con Chromium 145.0.7632.6. Se interceptaron las APIs con datos sinteticos;
la prueba de transporte uso cinco servidores HTTP sinteticos reales. No hubo
conexiones a bases reales, correo ni al proveedor externo de talento.

| Comprobacion | Resultado |
| --- | --- |
| Build de platform y siete UIs originales | 8/8 correctos |
| Lint de las ocho UIs | 8/8 correctos |
| Tipos de platform | `next typegen` y `tsc --noEmit`, correctos |
| Navegador de platform | 72/72 correctas; 46 capturas de 23 vistas/estados |
| HTTP real y diagnostico unificado | 19/19 correctas |
| Ejecucion final combinada de integracion | **91/91 correctas** |
| Browser original, incluida la linea base | 80 casos: 77 correctos y los mismos 3 fallos previos |
| Jest completo | 61 casos: 58 correctos y los mismos 3 fallos previos |
| Node: clientes y launcher | 60 casos: 57 correctos, 2 fallos previos y 1 omitido |
| Ciclo de vida unificado sintetico | Correcto; incluido en las 60 pruebas Node |

No sumar otra vez las filas incluidas en otras suites. No se repitieron pruebas
Python: no cambiaron APIs ni persistencia. Los 108 resultados Python de fase 1
son historicos, no resultados nuevos.

La suite de platform comprueba:

- acceso anonimo a todas las vistas protegidas sin peticiones de negocio;
- entrada directa y recarga de las doce vistas de modulo;
- dashboard -> cinco modulos -> dashboard sin recarga ni nueva identidad;
- prefijos de subrutas, filtro conservado al paginar talento y sesion unica;
- roles, logout entre pestanas, 401, error temporal/reintento y `next` seguro;
- creacion de proveedor, alta/cambio de estado de incidencia, upload/resultados/
  descarga CSV, entrada/salida de inventario y alta/etapa/nota de talento;
- formas exactas de payload y Bearer, usando datos y respuestas sinteticas;
- ausencia de fugas de CSS/tema al volver al dashboard y website.

Las 19 pruebas de transporte verifican rutas exactas y subrutas de los siete
recursos, query, Authorization, PATCH, multipart, descarga CSV, 401 y
`platform-check`. Este ultimo tambien se ejercito con las APIs sinteticas.
El arranque/cierre del nuevo launcher se verifico con ejecutables temporales
que representan sus seis servicios; no se arranco el stack con bases reales.

### Comparacion visual

Se capturaron 1365 x 1000 y 390 x 844, con la misma fecha, fixtures y navegador,
y se compararon contra las siete UIs originales recompiladas:

- **40/46 PNG identicos byte por byte.**
- Los dos dashboards difieren por el nuevo subtitulo que informa que las
  herramientas comparten aplicacion y sesion; no cambian sus dimensiones.
- Listado y resumen del gestor movil difieren en 28 pixeles cada uno, en el
  borde derecho del enlace fuera del viewport.
- Login y reset movil difieren en 20 y 10 pixeles respectivamente, junto a
  bordes de inputs. Las dimensiones son iguales.

Se conserva el desbordamiento previo del gestor movil: documento de 590 px
para viewport de 390 px, en sus tres vistas. Se verifica que no crezca; no se
oculta ni se presenta como resuelto. Las otras capturas no introducen
desbordamientos. No se afirma identidad visual universal o en todos los estados.

La primera comparacion detecto alteraciones reales de preflight; se corrigieron
titulos, interlineado, controles nativos y fondo fuera del viewport antes de
la validacion final. Tambien se detecto una dependencia de configuracion del
inventario original: su entrada auxiliar requiere `NEXT_PUBLIC_DASHBOARD_URL`
absoluto en el build integrado. Se recompilo con `http://localhost:3000` y la
suite original volvio a sus tres fallos conocidos, sin cambiar esa app.

Los logs y ambas galerias quedan fuera del repositorio en las evidencias de la
sesion, junto con `integration-final.log`, `original-browser-final.log`,
`visual-comparison.json` y el resumen. Se conservan tambien intentos intermedios;
los resultados finales son los indicados arriba.
El caso de subnavegacion se amplio con un filtro no vacio y se repitio de
forma focalizada: correcto, registrado en `navigation-final.log`; sigue siendo
uno de los 72 casos, no una prueba adicional para sumar.

### Reproduccion aislada

Con platform compilado e iniciado y las APIs reales detenidas:

```bash
PLATFORM_OUTPUT=/ruta/fuera/del/repositorio \
  node scripts/browser-tests.mjs scripts/platform.browser.test.mjs
node --test scripts/platform-proxy.test.mjs
```

El segundo comando necesita 8005 libre y los destinos locales
predeterminados en el build. No usarlo junto al launcher real. El runner de
navegador instala herramientas temporales, no dependencias del repositorio, y
necesita las bibliotecas de Chromium. En esta ejecucion se descargaron y
extrajeron bibliotecas en un directorio temporal sin instalarlas en el sistema.
Para el ciclo de vida sintetico, detener tambien platform:

```bash
node --test scripts/backoffice.test.mjs
```

## Limites y siguientes pasos

1. **Lockfile pendiente:** sigue excluido por la politica organizativa. No se
   accedio, modifico ni se intento eludir esa exclusion. No cambiaron
   manifiestos ni dependencias del repositorio. La instalacion limpia y `npm ci`
   siguen sin acreditarse hasta que un responsable autorizado lo sincronice.
2. Los fallos previos no se corrigieron: dos discrepancias de mensajes en Node,
   tres en Jest, y en browser registro duplicado/credenciales mas el selector
   ambiguo de email de la prueba antigua de talento. Las pruebas nuevas de
   talento acotan el formulario para no repetir esa ambiguedad.
3. Las escrituras verificadas son flujos frontend con APIs sinteticas y
   transporte HTTP con stubs. No acreditan E2E con persistencia real, carga,
   disponibilidad de terceros ni aislamiento de una base productiva.
4. No se modificaron Supabase, esquemas, TinyDB, datos brutos, contratos
   protegidos, entorno, infraestructura, instrucciones ni `memory-bank`.
   Su documentacion de estado protegida no se actualizo sin autorizacion.
5. Quedan la consolidacion FastAPI de fase 5, integracion real controlada,
   sincronizacion del lockfile, retirada coordinada de proyectos originales,
   contenedores y despliegue. No se probo capacidad en el VPS de 1 GB ni HTTPS.
