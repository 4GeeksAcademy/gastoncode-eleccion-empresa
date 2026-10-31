# Backoffice integrado en desarrollo

## Arranque

Requisitos: Node.js 22 o superior, npm y uv. Auth requiere Python >=3.14;
suppliers, incidents e inventory requieren >=3.12. uv prepara entornos independientes por servicio.

Desde la raiz:

```bash
npm run backoffice:setup
npm run backoffice:dev
```

Abrir http://localhost:3000. Login, registro y cuentas pertenecen al dashboard;
proveedores se sirve en `/suppliers` y el gestor de incidencias en
`/incidents-manager`; el analizador CSV se sirve en `/incidents-analyzer`.
Cada interfaz es una app Next.js independiente.
El lanzador no incluye talento y nunca ejecuta seeds.
`setup` instala las versiones declaradas, no corrige automaticamente vulnerabilidades.

| Proceso | Puerto local | Directorio |
| --- | --- | --- |
| API auth | 8001 | services/api-auth |
| API suppliers | 8000 | services/api-suppliers |
| Dashboard y gateway | 3000 | uis/backoffice/dashboard-backoffice |
| Interfaz proveedores | 3001 | uis/backoffice/suppliers-management |
| API incidents | 8002 | services/api-incidents |
| API inventory | 8003 | services/api-inventory |
| Gestor de incidencias | 3004 | uis/backoffice/incidents-manager |
| Analizador CSV | 3002 | uis/backoffice/incidents-analyzer |

Los ocho puertos deben estar libres. El lanzador rechaza conflictos sin
detener procesos existentes. Ctrl+C cierra todos los procesos; si uno falla,
se cierra el conjunto. Espera disponibilidad hasta 120 segundos.
Los logs se identifican por servicio.

```bash
npm run backoffice:check
```

Este comando comprueba disponibilidad, proxies de auth e incidencias, y que
`GET /inventory/products` rechace una solicitud sin token con HTTP 401. No
reemplaza pruebas funcionales ni una revision de permisos.

## Identidad y datos

El lanzador entrega el mismo `JWT_SECRET` a las cuatro APIs. A la API de
incidencias le añade `PYTHONPATH` con la raíz del monorepo para resolver
`packages.incidents_analysis`. Usa el valor del entorno
si existe; de lo contrario genera una clave local persistente en
`~/.local/state/brasaland/<hash-del-workspace>/jwt-secret`, con permisos 0600.
No escribe archivos `.env` ni muestra la clave. No usar este mecanismo local
como gestion de secretos de produccion. Borrar la clave invalida tokens anteriores.

La API de inventario usa `DATABASE_URL` para conectarse a PostgreSQL de Supabase;
la variable se hereda del entorno del lanzador. Si la URL no especifica un modo
SSL, el servicio fuerza `sslmode=require`. No incluir ni publicar el valor de la
URL. Productos y movimientos se guardan en PostgreSQL; el stock se calcula como
la suma de entradas menos salidas y no se almacena por separado. La API crea las
tablas al arrancar (`SQLModel.metadata.create_all`): no hay migraciones
versionadas todavía, por lo que no se debe tratar este mecanismo como proceso
de despliegue de producción. El seed de inventario es independiente del
lanzador y requiere UUID de usuarios existentes; el launcher no ejecuta seeds.

Por defecto se conservan `services/api-auth/data/db.json`,
`services/api-suppliers/db.json` y `services/api-incidents/incidents.json` /
`analyses.json`. `AUTH_DB_PATH`, `SUPPLIERS_DB_PATH`, `INCIDENTS_DB_PATH` y
`ANALYSES_DB_PATH` permiten elegir archivos alternativos. Las pruebas deben usar bases aisladas, no copiar
ni reemplazar los datos habituales. TinyDB sigue siendo almacenamiento local,
no una base transaccional para multiples instancias.
La API de incidencias se ejecuta con `--workers 1`: un lock por proceso
serializa las lecturas y escrituras de los analisis, incluidas las estadisticas
de health. No ejecutar varias instancias sobre los mismos archivos ni escribir
desde scripts externos mientras esta en marcha. El lock no coordina procesos.

Para el primer administrador:

1. Levantar el conjunto y registrar una cuenta en `/register`.
2. Detener el conjunto con Ctrl+C.
3. Ejecutar `npm run backoffice:admin -- email-de-la-cuenta`.
4. Reiniciar y volver a iniciar sesion.

La promocion exige una cuenta activa existente; no crea credenciales. Rechaza
la operacion mientras las APIs estan activas para evitar escrituras concurrentes.
El acceso local al terminal y las bases concede privilegios de administracion.

## Origen y sesion

Usar siempre el origen publico del dashboard. Acceder directamente al puerto
3001, 3002 o 3004 mantiene otro origen de localStorage y no proporciona sesion compartida.

- Dashboard reenvia `/suppliers` a la otra app y `/suppliers-static/*` a sus assets.
- `/api/auth`, `/api/users`, `/api/profiles`, `/auth/forgot-password`, `/auth/reset-password` y `/auth/change-password` se reenvian a auth (cubiertos por el patrón `/api/auth/:path*`).
- `/api/suppliers` y subrutas se reenvian a suppliers.
- Dashboard reenvia `/incidents-manager` y subrutas (incluidos sus assets, por
  `basePath`) al gestor de incidencias, y `/api/incidents` y subrutas a la API
  de incidencias.
- Dashboard reenvia `/incidents-analyzer` y subrutas (incluidos sus assets)
  a `INCIDENTS_UI_URL` (`http://localhost:3002` por defecto).
- Las cuatro apps usan `uis/backoffice/auth-shared`.
- La clave de localStorage es `brasaland.backoffice.token`; las sesiones previas
  de las apps separadas requieren volver a iniciar sesion.
- La navegacion entre zonas es completa, no una transicion de Next Link.
- El logout elimina el token y se sincroniza entre pestanas del mismo origen.
- Una invalidacion de sesion conserva solo el pathname validado en
  `/login?next=...`, nunca query ni fragmento. Un cierre voluntario va a
  `/login` sin retorno; el guard no compite con esa redireccion.
- El gestor compara el token de cada solicitud con el actual antes de
  invalidarlo: un 401 tardio no elimina una sesion nueva.
- Suppliers, incidents e inventory consultan `/auth/me` con el token antes de autorizar: cambios de rol,
  borrado o desactivacion se aplican en la siguiente llamada protegida.
- Si auth no responde, los servicios deniegan la operacion con 503; no confian en un
  rol antiguo ni eliminan el token por una caida temporal del servicio.

El JWT sigue siendo accesible a JavaScript y no tiene refresh ni revocacion
individual. Un origen compartido amplifica el impacto de XSS entre modulos.
El frontend de proveedores oculta escritura a `user`; FastAPI aplica los permisos
efectivos. Incidencias conserva sus permisos: sus operaciones requieren una
cuenta activa, sin restricciones nuevas por rol.

El analizador sube el CSV autenticado, obtiene el `analysis_id`, consulta el
resultado completo y exporta usando ese identificador y el mismo token.
Analizar no inserta incidencias en el gestor; para importar historicos existe
el seed independiente.

## Verificacion

```bash
node --test scripts/backoffice.test.mjs uis/backoffice/dashboard-backoffice/tests/auth-api.test.mjs uis/backoffice/incidents-analyzer/tests/incidents-api.test.mjs uis/backoffice/incidents-manager/tests/incidents-api.test.mjs
uv run --directory services/api-suppliers --no-sync python -m unittest discover -s tests -v
npm run lint -w dashboard-backoffice
npm run lint -w suppliers-backoffice
npm run lint -w incidents-manager
npm run lint -w incidents-analyzer
npm run build -w dashboard-backoffice
npm run build -w suppliers-backoffice
npm run build -w incidents-manager
npm run build -w incidents-analyzer
```

Detener desarrollo antes de compilar. Para E2E real, iniciar con archivos
TinyDB dentro de /tmp y ejecutar `scripts/backoffice-browser.test.mjs` con
`BACKOFFICE_TEST_AUTH_DB` apuntando exactamente al archivo usado por auth.
Playwright se obtiene externamente via `PLAYWRIGHT_MODULE`; no es dependencia
del workspace. La prueba crea fixtures, comprueba roles y elimina admin al final.
Las capturas permanecen en /tmp.

Con las UIs ya iniciadas, se puede automatizar la instalacion externa de
Playwright y Chromium (con limpieza al terminar):

```bash
node scripts/browser-tests.mjs
node scripts/browser-tests.mjs scripts/medium-priority.browser.test.mjs
```

La primera orden prueba el dashboard; la segunda requiere tambien proveedores
y gestor. Ambas interceptan la API y no modifican bases reales. Cubren retorno
tras expiracion, logout y tarifas de alta con centavos. Requisitos y limites
en [scripts](../scripts/README.es.md#pruebas-de-navegador-con-instalacion-temporal).

Con los ocho puertos libres y `DATABASE_URL` configurada, `BACKOFFICE_LIFECYCLE=1 node --test
scripts/backoffice.test.mjs` valida arranque y cierre coordinado por SIGINT.
Esta prueba se omite en la ejecucion habitual para no interferir con servicios activos. El
test configura bases temporales (SQLite para inventario y archivos TinyDB
aislados para los demás servicios), no escribe en Supabase. Para la suite propia
de inventario, ejecutar desde la raíz:

```bash
uv sync --project services/api-inventory --group test
uv run --directory services/api-inventory --group test pytest
```

Las 10 pruebas usan SQLite en memoria y autenticación simulada; no validan
escrituras, migraciones ni concurrencia sobre Supabase. La comprobación manual
de conectividad realizada consistió en `SELECT 1` con TLS activo y no prueba el
flujo de negocio sobre la base remota.

La auditoria npm detecto vulnerabilidades en dependencias actuales, incluida
severidad critica en Next.js. Resolverlas requiere un incremento de actualizacion
y nueva validacion; esta integracion no aplica `audit fix --force`.