# Brasaland Digital

Brasaland Digital es un monorepo de interfaces web, una API y herramientas operativas para apoyar la modernización de los procesos internos de Brasaland, una cadena de restaurantes con operaciones en Colombia y Florida. El repositorio contiene prototipos funcionales para algunos dominios del negocio; **no es una plataforma completa ni está preparada para producción**.

## Estado y alcance

La ejecución local integrada combina una plataforma web y una API:

- **Plataforma web:** aplicación Next.js en `uis/platform`, disponible en el puerto 3007. Incluye sitio público, dashboard protegido, autenticación y cuentas, proveedores, análisis y gestión de incidencias, inventario y un prototipo de seguimiento de talento.
- **API unificada:** aplicación FastAPI en `services/api-unified`, disponible en el puerto 8005. Agrupa los dominios de autenticación, proveedores, incidencias, inventario y talento.
- **Herramienta de reposición:** planificador local que recibe un CSV de inventario validado y genera sugerencias deterministas para revisión humana. No pronostica demanda, elige proveedores ni realiza pedidos.

La plataforma enruta las solicitudes `/api/*` a la API unificada. El launcher de desarrollo inicia dos procesos (frontend y API), no los antiguos servidores separados por dominio.

### Funciones y limitaciones por dominio

| Dominio | Alcance observado | Limitaciones importantes |
| --- | --- | --- |
| Autenticación y cuentas | Registro, inicio de sesión, perfiles, roles y flujos de cambio/restablecimiento de contraseña. | JWT y datos locales; el envío de correo de restablecimiento depende de la configuración opcional de Resend. |
| Proveedores | Interfaz y API para consultar y mantener registros de proveedores. | Persistencia TinyDB local; no constituye una base transaccional compartida ni un flujo de órdenes de compra. |
| Incidencias | Gestión de incidencias, filtros y resumen; análisis de archivos CSV. | Persistencia TinyDB local; no integra un pipeline general de telemetría operacional. |
| Inventario | Productos, entradas, salidas e historial; el stock se calcula a partir de movimientos. | PostgreSQL de Supabase; las tablas se crean al iniciar el servicio y no hay migraciones versionadas. Las pruebas aisladas no validan escrituras ni concurrencia real en Supabase. |
| Talento | Seguimiento de candidaturas mediante un adaptador a un prototipo externo. | Solo datos sintéticos; no hay persistencia local, vacantes ni onboarding implementados. |
| Reposición | Sugerencias de cantidades desde CSV. | Cálculo determinista, requiere revisión humana y no realiza compras. |

El repositorio **no implementa aún** una base de datos compartida para todos los dominios, integración con sistemas de punto de venta, un pipeline integrado de ventas/telemetría, pedidos digitales, CRM, gestión completa de personas ni una plataforma de formación. Estos son objetivos o áreas futuras, no capacidades que deban inferirse de la estructura del repositorio.

## Criterio de estado documental

Para distinguir el producto actual de los planes, esta documentación usa las siguientes categorías:

- **Implementado:** existe una función en el código actual; las pruebas relacionadas pueden cubrir solo parte del flujo.
- **Limitado / prototipo:** existe una implementación, pero tiene restricciones de persistencia, integración, validación u operación que deben considerarse.
- **Propuesto / pendiente:** es un objetivo o diseño futuro y no debe presentarse como disponible hoy.

La existencia de una ruta, módulo, carpeta o propuesta de arquitectura no demuestra por sí sola que un caso de negocio esté completo o listo para uso operativo. Las afirmaciones sobre validación deben consultarse en las guías de pruebas vigentes.

## Stack tecnológico

- **Frontend:** Next.js 16.3.1, React 19.2.8, TypeScript 6 y Tailwind CSS 4.
- **Backend:** Python 3.14 o posterior, FastAPI, Pydantic y Uvicorn.
- **Persistencia:** TinyDB local para autenticación, proveedores e incidencias; SQLModel y PostgreSQL (Supabase) para inventario.
- **Autenticación:** JWT (HS256) y bcrypt. Resend es opcional para enviar correos de restablecimiento de contraseña.
- **Herramientas:** npm, `uv`, pytest, Jest y pruebas de navegador basadas en Playwright.

## Requisitos

- Node.js 22 o posterior y npm.
- Python 3.14 o posterior.
- [`uv`](https://docs.astral.sh/uv/) para gestionar el entorno de Python.
- La API requiere `JWT_SECRET`; el launcher de desarrollo lo genera y conserva localmente si no está definido. `DATABASE_URL` solo es necesaria para inicializar y utilizar el módulo de inventario; sin ella la API puede iniciar, pero las rutas de inventario no podrán acceder a la base. No uses una base de producción para pruebas.

El launcher genera y conserva un secreto JWT local si `JWT_SECRET` no está definido en el entorno; no crea un archivo `.env`. Para desplegar, gestiona los secretos mediante un mecanismo apropiado y no los guardes en Git.

## Inicio local

Desde la raíz del repositorio:

```bash
# Instalar dependencias
node scripts/backoffice.mjs setup

# Iniciar API (8005) y plataforma web (3007)
node scripts/backoffice.mjs dev

# Comprobar disponibilidad y respuestas protegidas
node scripts/backoffice.mjs check
```

El launcher requiere libres los puertos **8005** y **3007**. `Ctrl+C` detiene los procesos. El comando `setup` instala dependencias, pero no migra ni inicializa una base separada; el servicio de inventario sí ejecuta la creación de tablas existente al iniciar. Para ejecutar solo el frontend, usa `npm run dev:platform`; la API debe estar disponible por separado en el destino configurado.

### Rutas principales

- `/` y `/application`: sitio público.
- `/backoffice`: dashboard protegido.
- `/login`, `/register`, `/forgot-password`, `/reset-password` y `/account/*`: autenticación y cuenta.
- `/suppliers`: proveedores.
- `/incidents-analyzer`: análisis CSV de incidencias.
- `/incidents-manager`: gestión de incidencias.
- `/inventory-management`: inventario.
- `/talent-pipeline-tracker`: seguimiento de talento con datos sintéticos.

Las secciones del backoffice comparten la sesión de la plataforma. La API dispone de documentación OpenAPI en `/docs` mientras está en ejecución; las rutas de negocio se montan en el servicio unificado y el frontend las proxifica bajo `/api/*`.

La [referencia funcional por módulo](./docs/DOMAIN_REFERENCE.md) detalla rutas UI/API, roles, persistencia, límites conocidos y cobertura de pruebas. La [arquitectura actual](./docs/ARCHITECTURE_CURRENT.md) describe la topología sin duplicar ese inventario.

## Pruebas y calidad

Comandos principales desde la raíz:

```bash
# Build y lint de los workspaces configurados
npm run build
npm run lint

# Typecheck de la plataforma
npm run typecheck:platform

# Suite de la API unificada (usa pytest)
uv sync --project services/api-unified --group test
uv run --project services/api-unified --group test -- pytest services/api-unified/tests -v

# Pruebas del launcher y del proxy
node --test scripts/backoffice.test.mjs
node --test scripts/platform-proxy.test.mjs

# Pruebas TypeScript
npx jest --coverage

# Pruebas de navegador de la plataforma (iniciar la plataforma primero)
node scripts/browser-tests.mjs scripts/platform.browser.test.mjs
```

Consulta [`TESTING.md`](./TESTING.md) para requisitos y aislamiento de las suites, y [`scripts/README.es.md`](./scripts/README.es.md) para el runner de navegador. Las pruebas aisladas no equivalen a una validación de producción: en particular, las pruebas de inventario no verifican escrituras, esquema o concurrencia de Supabase.

## Despliegue

Existe una configuración Docker Compose y una guía de topología de ejemplo para VPS: [`docs/DOCKER_DEPLOYMENT.md`](./docs/DOCKER_DEPLOYMENT.md). Compose no demuestra preparación para producción. La guía documenta configuración, persistencia y límites operativos; antes de cualquier uso con datos importantes se deben verificar seguridad, respaldos/restauración, migraciones y operaciones PostgreSQL.

La arquitectura efectivamente implementada, incluyendo la relación entre rutas del frontend, prefijos de API y persistencia por dominio, está descrita en [Arquitectura actual](./docs/ARCHITECTURE_CURRENT.md). La [propuesta de arquitectura futura](./docs/ARCHITECTURE_PROPOSAL.md) es un documento de diseño y no describe capacidades ya disponibles.

## Mapa del repositorio

```text
.
├── services/api-unified/     # API FastAPI (auth, suppliers, incidents, inventory, talent)
├── uis/platform/             # Plataforma Next.js (puerto 3007)
├── packages/                 # Paquetes, incluido el análisis de incidencias
├── lib/, src/, shared/       # Clientes, tipos y utilidades compartidas
├── scripts/                  # Launcher, pruebas, seeds y herramientas
├── data/                     # Áreas de datos y pipelines
├── .agents/skills/           # Skills operativas; incluye planificador de reposición
├── docs/                     # Arquitectura actual, dominios, propuesta y guías
└── memory-bank/              # Contexto y estado del proyecto
```

## Documentación relacionada

- [Guía de pruebas](./TESTING.md)
- [Arquitectura actual](./docs/ARCHITECTURE_CURRENT.md)
- [Despliegue Docker](./docs/DOCKER_DEPLOYMENT.md)
- [Propuesta de arquitectura futura](./docs/ARCHITECTURE_PROPOSAL.md) — propuesta, no descripción de lo ya implementado.
- [Contexto de negocio](./memory-bank/CONTEXT-brasaland-briefing.es.md)
- [Brief del proyecto](./memory-bank/projectbrief.md) y [estado del proyecto](./memory-bank/progress.md); pueden contener contexto histórico y deben contrastarse con el código actual.
