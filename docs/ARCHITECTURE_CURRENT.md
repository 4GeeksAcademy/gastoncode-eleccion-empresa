# Arquitectura actual — Brasaland Digital

> Esta guía describe la implementación observable en el repositorio. No sustituye la [propuesta de arquitectura futura](./ARCHITECTURE_PROPOSAL.md) ni implica preparación para producción. Mantén la distinción entre capacidades implementadas, prototipos con limitaciones y propuestas pendientes.

## Vista general

El desarrollo integrado utiliza dos procesos principales:

```text
Navegador
   │ HTTP :3007
   ▼
uis/platform — Next.js App Router
   ├── Sitio público y backoffice con sesión compartida
   └── rewrites /api/*
          │ UNIFIED_API_URL (por defecto http://127.0.0.1:8005)
          ▼
services/api-unified — FastAPI / Uvicorn :8005
   ├── auth       ── TinyDB local
   ├── suppliers  ── TinyDB local
   ├── incidents  ── TinyDB local + paquete incidents_analysis
   ├── inventory  ── SQLModel ── PostgreSQL (Supabase)
   └── talent     ── adaptador HTTP a proveedor externo
```

`scripts/backoffice.mjs` coordina estos dos procesos para desarrollo. En Docker Compose, el frontend y la API se ejecutan en contenedores separados conectados por la red privada de Compose; el frontend se publica en `127.0.0.1:3007` para un proxy inverso del host y la API no publica puerto al host. Véase [despliegue Docker](./DOCKER_DEPLOYMENT.md).

Un único origen web y una API unificada no significan que todos los dominios compartan persistencia: los servicios mantienen mecanismos distintos y no hay una base operativa común para todos ellos.

Para consultar por dominio las rutas UI/API concretas, autorización, límites y cobertura de pruebas conocida, véase la [referencia funcional por módulo](./DOMAIN_REFERENCE.md).

## Plataforma web

`uis/platform` es una aplicación Next.js App Router. Su configuración de rewrites lleva los endpoints públicos `/api/*` al servicio unificado. `UNIFIED_API_URL` se lee en la configuración de Next.js; en el despliegue Docker se fija durante el build como `http://api:8005`, nombre del servicio de Compose.

Rutas de alto nivel observadas:

| Ruta | Función |
| --- | --- |
| `/`, `/application` | Sitio público |
| `/backoffice` | Dashboard protegido |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/account/*` | Autenticación y cuenta |
| `/suppliers` | Proveedores |
| `/incidents-analyzer` | Análisis CSV de incidencias |
| `/incidents-manager` | Gestión de incidencias |
| `/inventory-management` | Inventario y movimientos |
| `/talent-pipeline-tracker` | Seguimiento de talento con datos sintéticos |

El estado de sesión del backoffice se comparte desde la plataforma. El frontend es un único proceso; los módulos de negocio no requieren iniciar los antiguos servidores de UI por dominio.

## API unificada

La aplicación vive en `services/api-unified/app/`. `app/main.py` crea FastAPI, configura CORS y manejadores de errores, registra routers y prepara las tablas de inventario durante el startup. `main.py` en la raíz del servicio es el entry point de compatibilidad para Uvicorn.

Los routers y prefijos registrados actualmente incluyen:

| Dominio | Prefijo de API principal | Persistencia o dependencia |
| --- | --- | --- |
| Autenticación y usuarios | `/auth/*` | TinyDB local; JWT HS256 y bcrypt |
| Proveedores | `/suppliers/*` | TinyDB local |
| Incidencias y análisis CSV | `/api/incidents/*` | TinyDB local; análisis CSV con `packages/incidents_analysis` |
| Inventario | `/inventory/*` | SQLModel y PostgreSQL mediante `DATABASE_URL` |
| Talento | `/talent/*` | Proxy/adaptador al tracker externo; sin persistencia local de candidatos |
| Salud | `/` y `/health` | Respuestas de salud de la API |

El frontend publica aliases bajo `/api/`: `/api/auth/*`, `/api/users/*`, `/api/profiles/*`, `/api/suppliers/*`, `/api/incidents/*`, `/api/inventory/*` y `/api/talent/*`. Estos aliases se traducen mediante rewrites a los prefijos de API anteriores; por eso las rutas de API directa y las rutas usadas por el navegador no siempre tienen el mismo prefijo. La descripción exacta de las operaciones está disponible en `/docs` y `/openapi.json` con la API ejecutándose.

### Autenticación y autorización

La API emite tokens bearer JWT con HS256. La dependencia de autenticación valida el token, comprueba que el usuario exista y que la cuenta esté activa. Las operaciones aplican controles por rol en cada dominio; por ejemplo, ciertas escrituras requieren `admin` o `manager`. El frontend actúa como proxy HTTP y reenvía las llamadas de cliente a la API.

### Persistencia y límites

- Auth, proveedores e incidencias conservan datos en archivos TinyDB, configurables mediante `AUTH_DB_PATH`, `SUPPLIERS_DB_PATH`, `ANALYSES_DB_PATH` e `INCIDENTS_DB_PATH`. En Compose, esos archivos se almacenan bajo `/data` en el volumen `api-data`.
- Incidencias incluye tanto la gestión de registros como el análisis de CSV. Esos datos no constituyen un pipeline de ventas ni telemetría de locales.
- Inventario persiste productos y movimientos en PostgreSQL; el stock se deriva de entradas menos salidas. La inicialización actual usa `SQLModel.metadata.create_all`, sin migraciones versionadas.
- Talento reenvía operaciones al tracker externo usando configuración de servidor. Está limitado al uso con datos sintéticos y no guarda candidatos en una base local.
- TinyDB y el almacenamiento PostgreSQL son separados; no hay transacciones compartidas ni consistencia global entre dominios.

Estas decisiones son adecuadas para el prototipado actual, pero requieren revisión antes de operar con datos críticos, varias réplicas o flujos concurrentes. Las pruebas con bases aisladas no acreditan la operación contra Supabase.

## Configuración principal

- `JWT_SECRET`: requerido por la API; en desarrollo el launcher puede crear y reutilizar un secreto local fuera del repositorio.
- `DATABASE_URL`: necesaria para inicializar y usar el módulo de inventario con PostgreSQL; su ausencia no impide el startup de la API si no se usa ese módulo.
- `UNIFIED_API_URL`: destino de rewrites de Next.js; local por defecto `http://127.0.0.1:8005`, en Compose se pasa en build como `http://api:8005`.
- `AUTH_DB_PATH`, `SUPPLIERS_DB_PATH`, `ANALYSES_DB_PATH`, `INCIDENTS_DB_PATH`: ubicación de archivos TinyDB.
- `CORS_ORIGINS`: orígenes permitidos por FastAPI.
- Variables de correo y del tracker externo: opcionales, según funciones habilitadas; no incluir sus valores en documentación o Git.

La guía de inicio local está en el [README del repositorio](../README.es.md); las variables de despliegue y la topología Docker se describen en [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md).

## Ejecución y pruebas

Desde la raíz, el launcher recomendado es:

```sh
node scripts/backoffice.mjs setup
node scripts/backoffice.mjs dev
node scripts/backoffice.mjs check
```

Pruebas de la API unificada:

```sh
uv sync --project services/api-unified --group test
uv run --project services/api-unified --group test -- pytest services/api-unified/tests -v
```

Las pruebas de navegador y proxy tienen diferentes requisitos de servicios y puertos. Consulta [`TESTING.md`](../TESTING.md) antes de ejecutarlas; no apuntes las pruebas a una base o instancia con datos reales.

## Diferencia respecto a la propuesta futura

`ARCHITECTURE_PROPOSAL.md` describe una posible arquitectura de dominios y capacidades adicionales, como ventas, locales, clientes, formación y telemetría. Esos dominios y capacidades no se deben atribuir a la API actual a menos que el código y las pruebas se actualicen para confirmarlos.
