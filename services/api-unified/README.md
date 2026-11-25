# Brasaland Unified API

Aplicación modular FastAPI que sirve los dominios de auth, suppliers, incidents,
inventory y talent. En el desarrollo integrado, `scripts/backoffice.mjs` inicia
esta API junto con `uis/platform`, que proxifica sus rutas de navegador.

## Requisitos y configuración

- Python 3.14 o superior.
- Instalar las dependencias declaradas en `pyproject.toml` desde la raíz
  (por ejemplo, con `uv sync --project services/api-unified`). `uv` necesita
  resolver `incidents-analysis` desde el paquete local del monorepo.
- Configurar `JWT_SECRET` en el entorno o en `services/api-unified/.env`.
  `DATABASE_URL` permite conectar inventario a PostgreSQL; la inicialización de
  tablas no requiere una base cuando no hay URL configurada, pero las rutas de
  inventario sí la necesitan.
- Opcional: `CORS_ORIGINS`, `AUTH_DB_PATH`, `SUPPLIERS_DB_PATH`,
  `ANALYSES_DB_PATH`, `INCIDENTS_DB_PATH` y la configuración del proveedor de
  talento. Las bases TinyDB mantienen sus valores predeterminados originales.

## Ejecución local

Desde la raíz del monorepo, usando el launcher (recomendado):

```sh
node scripts/backoffice.mjs setup
node scripts/backoffice.mjs dev
```

La API unificada se inicia en el puerto **8005** junto con el frontend (3007).

O desde la raíz del monorepo directamente:

```sh
uv run --project services/api-unified uvicorn main:app \
  --app-dir services/api-unified --reload --port 8005
```

O desde `services/api-unified`:

```sh
uv run uvicorn main:app --reload --port 8005
```

La app registra routers modulares en `app/main.py`. Sus prefijos directos
incluyen `/auth`, `/suppliers`, `/api/incidents`, `/inventory` y `/talent`;
la plataforma ofrece aliases `/api/*` mediante rewrites. Talento conserva la
restricción de roles admin/manager.

## Tests

```sh
uv sync --project services/api-unified --group test
uv run --project services/api-unified --group test -- pytest services/api-unified/tests -v
```

## Alcance y limitaciones de esta etapa

- No se migra ni cambia TinyDB o PostgreSQL.
- Los dominios están organizados como módulos en `app/modules/` y sus routers
  se registran en `app/main.py`.
- El arranque intenta el `create_all` existente de inventario cuando hay una
  `DATABASE_URL` configurada; sin URL no crea tablas. No hay migraciones
  versionadas.
- Auth, proveedores e incidencias conservan TinyDB local; inventario conserva
  PostgreSQL y talento usa el adaptador a proveedor externo. La API es unificada,
  pero la persistencia no es compartida entre dominios.

## Validación

Desde la raíz:

```sh
python3 -m py_compile services/api-unified/main.py \
  services/api-unified/app/main.py \
  services/api-unified/tests/test_app.py
uv run --project services/api-unified --group test pytest \
  services/api-unified/tests
```

La prueba funcional requiere instalar el grupo de dependencias y proveer
variables de entorno de prueba; no se debe usar una base de producción.
La guía transversal de rutas, persistencia y relación entre frontend y API está
en [`docs/ARCHITECTURE_CURRENT.md`](../../docs/ARCHITECTURE_CURRENT.md).