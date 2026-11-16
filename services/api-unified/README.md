# Brasaland Unified API

Aplicación FastAPI que consolida los cinco dominios actuales
(auth, suppliers, incidents, inventory, talent) en un solo servicio.
Reemplaza a los proyectos `api-auth`, `api-suppliers`, `api-incidents`,
`api-inventory` y `api-talent`, que han sido eliminados.

## Requisitos y configuración

- Python 3.14 o superior.
- Instalar las dependencias declaradas en `pyproject.toml` desde la raíz
  (por ejemplo, con `uv sync --project services/api-unified`). `uv` necesita
  resolver `incidents-analysis` desde el paquete local del monorepo.
- Configurar `JWT_SECRET` y `DATABASE_URL` en el entorno o en
  `services/api-unified/.env`. El inventario conserva su conexión PostgreSQL.
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

La app combina rutas de auth, suppliers, incidents, inventory y talent. Las
rutas de negocio se copian desde cada backend para mantener sus contratos. Los
servicios de dominio sustituyen la consulta HTTP a `api-auth` por una
dependencia de identidad en proceso; talento conserva la restricción de roles
admin/manager.

## Tests

```sh
uv sync --project services/api-unified --group test
uv run --project services/api-unified --group test -- python -m unittest discover -s services/api-unified/tests -v
```

## Alcance y limitaciones de esta etapa

- No se requiere ninguno de los servicios legacy para funcionar.
- No se migra ni cambia TinyDB o PostgreSQL.
- La app importa los módulos legacy en aislamiento para evitar las colisiones
  de nombres genéricos (`auth`, `main`, `models`, `database`). Este adaptador es
  transitorio; el siguiente paso arquitectónico es extraer routers y lógica a
  paquetes de dominio con imports explícitos.
- El arranque ejecuta el `create_all` existente de inventario; requiere una
  `DATABASE_URL` válida y acceso a la base configurada.
- El launcher y los rewrites del frontend aún no apuntan a esta API. No hacer
  el cambio de tráfico hasta probar contratos, auth y persistencias en un
  entorno con dependencias y base de datos configuradas.

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