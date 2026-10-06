# Contexto técnico

## Stack utilizado hasta el momento

### Interfaces web

- El backoffice está organizado como workspaces de npm en `uis/backoffice/` y contiene aplicaciones separadas para dashboard, proveedores, análisis de incidencias y seguimiento de talento.
- Las aplicaciones usan Next.js 16.3.x y React 19.2.x. Los manifiestos declaran TypeScript 5, Tailwind CSS 4 y ESLint 9.
- Las aplicaciones de dashboard, proveedores e incidencias declaran Next.js 16.3.1; el tracker de talento declara 16.3.0.
- `uis/backoffice/shared/` provee el paquete visual compartido `@brasaland/theme`.
- Los scripts de desarrollo asignan los puertos 3000 a 3003, uno por aplicación.

### Servicios y herramientas

- Los servicios backend están escritos en Python y usan FastAPI con Uvicorn como servidor ASGI.
- `api-auth`, `api-suppliers` y `api-incidents` declaran TinyDB para persistir datos en archivos JSON. Autenticación usa JWT con algoritmo HS256, OAuth2 bearer y contraseñas bcrypt; las dependencias incluyen `python-jose`, `python-dotenv` y `python-multipart`.
- `api-suppliers` declara Pydantic con soporte de email. `api-incidents` usa además `python-dotenv`, `python-jose` y TinyDB, y consume la lógica CSV del paquete local `packages/incidents_analysis`.
- La skill `.agents/skills/replenishment-planner/` incluye un script determinista basado en `Decimal` y una suite `unittest`. Calcula sugerencias de reposición a partir de un CSV de inventario validado; no pronostica demanda ni realiza pedidos.
- La raíz define scripts de npm para iniciar cada interfaz, así como tareas de build y lint de los workspaces. El manifiesto raíz declara TypeScript 6 y `uv`; las aplicaciones frontend declaran TypeScript 5.
- El repositorio también contiene utilidades y tipos compartidos en `src/`, `packages/` y `shared/`, además de áreas para datos, agentes, skills, MCP y workflows.

## Decisiones de arquitectura observables

- **Aplicaciones de backoffice separadas:** cada área funcional tiene su propia aplicación Next.js y ciclo de desarrollo. El tema visual se comparte como paquete del workspace.
- **Servicios backend por dominio:** autenticación, proveedores e incidencias están separados en carpetas y tienen manifiestos de dependencias propios.
- **Persistencia JSON con TinyDB:** autenticación, proveedores e incidencias guardan datos localmente en archivos JSON; no dependen de una base de datos relacional común. Incidencias conserva los análisis en TinyDB y mantiene una caché LRU thread-safe limitada a 100 elementos.
- **Autenticación basada en tokens:** `api-auth` emite JWT bearer de duración configurable por entorno e incluye el rol del usuario. Revalida que la cuenta exista y esté activa al autenticar cada solicitud; las rutas aplican permisos de propietario, administrador o roles permitidos según operación. Incidencias verifica el JWT compartiendo `JWT_SECRET`.
- **Propuesta, aún no asumida como implementada:** `docs/ARCHITECTURE_PROPOSAL.md` recomienda una API central FastAPI en capas, con routers, servicios, repositorios, modelos y dominios para locales, ventas, proveedores, clientes, personal y formación. También propone SQLAlchemy, PostgreSQL, migraciones, telemetría y WebSockets; esos elementos deben tratarse como diseño futuro, no como stack confirmado por los manifiestos revisados.

## Restricciones y riesgos técnicos identificados

- **Versiones de Python diferentes por servicio:** `api-auth` requiere Python `>=3.14`, mientras `api-suppliers` y `api-incidents` requieren `>=3.12`. Los entornos deben respetar la versión de cada servicio; no hay todavía una política común documentada.
- **Persistencia local no adecuada como base compartida de producción:** los archivos TinyDB están ligados al sistema de archivos de cada servicio. No ofrecen por sí solos una base central para varias instancias y requieren atención específica para concurrencia, copias de seguridad, recuperación y despliegue. La caché de incidencias tampoco sustituye su persistencia ni coordina varias instancias.
- **Integración de datos aún por resolver:** aplicaciones y servicios están separados, y no se observa en sus manifiestos un contrato de API compartido ni una base de datos común. Para ofrecer dashboards integrados será necesario definir contratos, identidad de entidades y estrategia de sincronización.
- **Versiones frontend no totalmente alineadas:** Next.js no está exactamente en la misma versión en todas las aplicaciones, y la raíz declara TypeScript 6 mientras los paquetes de interfaz declaran TypeScript 5. Conviene fijar una política de versiones y verificar builds reproducibles del workspace.
- **Configuración sensible requerida:** la autenticación necesita `JWT_SECRET` en el entorno. Debe proveerse mediante un gestor de secretos en despliegues y no incluirse en el repositorio.
- **Complejidad multinacional del dominio:** datos y reportes deberán tratar explícitamente COP y USD, zonas horarias, idiomas y diferencias legales y laborales entre Colombia y Estados Unidos. No se debe asumir que conversión de moneda, reglas de fechas o políticas son iguales para todos los locales.
- **Despliegue y operación no unificados:** los manifiestos muestran scripts de desarrollo, build y lint por aplicación, pero no definen por sí solos una estrategia común de despliegue, observabilidad, migraciones o recuperación. Esas decisiones siguen pendientes de documentar y validar.

## Criterios para decisiones futuras

- Mantener contratos de datos explícitos entre las interfaces y los servicios, con tipos compartidos cuando corresponda; la skill de reposición es un cálculo local por CSV y no está integrada como API ni como flujo de compras.
- Sustituir la persistencia local por almacenamiento transaccional compartido antes de depender de múltiples instancias o de datos operativos críticos.
- Acordar versiones soportadas de Python, Node.js, Next.js y TypeScript y fijarlas en los entornos de CI y despliegue.
- Diseñar los modelos y reportes teniendo en cuenta país, moneda, idioma y zona horaria desde el inicio.
- Tratar las capacidades de IA, automatización y tiempo real como integraciones de la plataforma, no como sustitutos de fuentes de datos confiables ni de controles de acceso.
