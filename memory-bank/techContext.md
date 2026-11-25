# Contexto técnico

## Topología vigente

- La plataforma web integrada es `uis/platform`, una aplicación Next.js 16 App Router, servida localmente en el puerto 3007.
- La API integrada vive en `services/api-unified` (FastAPI/Uvicorn, puerto 8005) e incluye routers de auth, proveedores, incidencias, inventario y talento.
- `scripts/backoffice.mjs` prepara/inicia la API unificada y la plataforma: dos procesos de aplicación, no cinco APIs y seis UIs.
- La plataforma reescribe aliases `/api/*` a la API unificada. Para inventario el prefijo API directo es `/inventory/*`; incidencias usa `/api/incidents/*`; demás prefijos son `/auth/*`, `/suppliers/*` y `/talent/*`.
- En Docker Compose hay dos servicios (`api`, `frontend`) en red privada. Solo el frontend se publica en `127.0.0.1:${FRONTEND_PORT:-3007}` para un proxy inverso del host; el frontend se construye con `UNIFIED_API_URL=http://api:8005`. Esta topología de ejemplo no certifica preparación para producción.

## Persistencia, configuración y límites

- Auth, proveedores, incidentes y resultados de análisis usan archivos TinyDB/JSON bajo rutas configurables. Compose los monta en `/data` mediante el volumen `api-data`; TinyDB no ofrece coordinación transaccional entre réplicas.
- Inventario usa SQLModel y PostgreSQL mediante `DATABASE_URL`; el stock se calcula como entradas menos salidas. `create_all` se ejecuta al iniciar solo si hay URL; sin ella la API puede iniciar, pero las rutas de inventario no funcionan. No hay migraciones versionadas y la concurrencia PostgreSQL real no está demostrada por tests SQLite.
- Talento proxifica el tracker externo configurado por `TRACKER_API_URL` (por defecto playground de 4Geeks), cachea GET en memoria durante 30 segundos y no persiste candidatos localmente; usar solo datos sintéticos.
- Reposición es una CLI independiente en `.agents/skills/replenishment-planner/`, con CSV de entrada/salida y revisión humana; no tiene UI/API ni emite órdenes.
- `JWT_SECRET` es obligatorio para arrancar la API. `FRONTEND_URL`, Resend y `TRACKER_API_URL` habilitan comportamientos opcionales/externos. Compose declara `.env` como `env_file`, por lo que se debe crear el archivo al usar Compose.

## Versiones y pruebas observadas

- Consultar los manifiestos actuales para versiones precisas: Node 22 en Docker, Python 3.14 en la imagen backend y versiones de Next.js/TypeScript en `uis/platform/package.json` y el manifiesto raíz.
- La API dispone de smoke tests con TestClient, TinyDB temporal y SQLite temporal; las pruebas de inventario cliente/stock son Jest. Browser/proxy tests incluyen simulaciones de upstream y no certifican proveedores ni bases reales.
- Reposición tiene tests unittest; el seed de incidencias tiene tests Python. La prueba opcional del ciclo de vida del launcher (`BACKOFFICE_LIFECYCLE=1`) puede estar desalineada con su texto de salida actual y debe comprobarse antes de considerarla validación.
- La guía de comandos y aislamiento de suites está en `TESTING.md`; la matriz por dominio en `docs/DOMAIN_REFERENCE.md`.

## Riesgos y criterios de evolución

- Compose no aporta por sí solo alta disponibilidad, observabilidad completa, backups/restauración verificados, migraciones, gestión endurecida de secretos ni certificación de seguridad. La guía es `docs/DOCKER_DEPLOYMENT.md`.
- TinyDB es almacenamiento local, no un datastore compartido para réplicas o datos críticos. Respaldar y probar restauración de TinyDB y PostgreSQL por separado.
- La arquitectura objetivo de `docs/ARCHITECTURE_PROPOSAL.md` sigue siendo una propuesta. No atribuir al sistema actual integraciones de POS, ventas/telemetría, CRM, HRIS, formación o pedidos digitales.
- Mantener contratos explícitos, identidad de entidades y criterios multinacionales para moneda, zona horaria, idioma y legislación al evolucionar los módulos.
