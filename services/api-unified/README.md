# Brasaland Unified API

Aplicación FastAPI paralela para comenzar la consolidación de los cinco
servicios actuales. En esta fase reutiliza las aplicaciones existentes y sus
persistencias, sin retirarlas ni cambiar sus despliegues.

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

Desde la raíz del monorepo:

```sh
uv run --project services/api-unified uvicorn main:app \
  --app-dir services/api-unified --reload --port 8010
```

O desde `services/api-unified`:

```sh
uv run uvicorn main:app --reload --port 8010
```

La app combina rutas de auth, suppliers, incidents, inventory y talent. Las
rutas de negocio se copian desde cada backend para mantener sus contratos. Los
servicios de dominio sustituyen la consulta HTTP a `api-auth` por una
dependencia de identidad en proceso; talento conserva la restricción de roles
admin/manager.

## Alcance y limitaciones de esta etapa

- Los cinco servicios originales permanecen intactos y se pueden ejecutar por
  separado.
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