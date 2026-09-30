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
- `api-auth` y `api-suppliers` declaran TinyDB para persistir datos en archivos JSON. Autenticación también usa JWT con algoritmo HS256, OAuth2 bearer y verificación de contraseñas bcrypt; las dependencias incluyen `python-jose`, `python-dotenv` y `python-multipart`.
- `api-suppliers` declara Pydantic con soporte de email. `api-incidents` declara un conjunto mínimo de dependencias: FastAPI, Uvicorn y `python-multipart`.
- La raíz define scripts de npm para iniciar cada interfaz, así como tareas de build y lint de los workspaces. El manifiesto raíz declara TypeScript 6 y `uv`; las aplicaciones frontend declaran TypeScript 5.
- El repositorio también contiene utilidades y tipos compartidos en `src/`, `packages/` y `shared/`, además de áreas para datos, agentes, skills, MCP y workflows.

## Decisiones de arquitectura observables

- **Aplicaciones de backoffice separadas:** cada área funcional tiene su propia aplicación Next.js y ciclo de desarrollo. El tema visual se comparte como paquete del workspace.
- **Servicios backend por dominio:** autenticación, proveedores e incidencias están separados en carpetas y tienen manifiestos de dependencias propios.
- **Persistencia JSON con TinyDB en algunos servicios:** autenticación y proveedores almacenan sus datos localmente en archivos JSON; no dependen de una base de datos relacional común en su configuración actual.
- **Autenticación basada en tokens:** `api-auth` emite JWT bearer de corta duración configurable por entorno e incluye el rol del usuario en el token. La autorización puede limitar endpoints por roles.
- **Propuesta, aún no asumida como implementada:** `docs/ARCHITECTURE_PROPOSAL.md` recomienda una API central FastAPI en capas, con routers, servicios, repositorios, modelos y dominios para locales, ventas, proveedores, clientes, personal y formación. También propone SQLAlchemy, PostgreSQL, migraciones, telemetría y WebSockets; esos elementos deben tratarse como diseño futuro, no como stack confirmado por los manifiestos revisados.

## Restricciones y riesgos técnicos identificados

- **Versión de Python elevada:** los manifiestos de `api-auth` y `api-suppliers` requieren Python `>=3.14`. Los entornos de desarrollo y despliegue deben satisfacer esa versión; puede reducir compatibilidad con plataformas que aún no la ofrezcan.
- **Persistencia local no adecuada como base compartida de producción:** los archivos TinyDB están ligados al sistema de archivos de cada servicio. No ofrecen por sí solos una base central para varias instancias y requieren atención específica para concurrencia, copias de seguridad, recuperación y despliegue.
- **Integración de datos aún por resolver:** aplicaciones y servicios están separados, y no se observa en sus manifiestos un contrato de API compartido ni una base de datos común. Para ofrecer dashboards integrados será necesario definir contratos, identidad de entidades y estrategia de sincronización.
- **Versiones frontend no totalmente alineadas:** Next.js no está exactamente en la misma versión en todas las aplicaciones, y la raíz declara TypeScript 6 mientras los paquetes de interfaz declaran TypeScript 5. Conviene fijar una política de versiones y verificar builds reproducibles del workspace.
- **Configuración sensible requerida:** la autenticación necesita `JWT_SECRET` en el entorno. Debe proveerse mediante un gestor de secretos en despliegues y no incluirse en el repositorio.
- **Complejidad multinacional del dominio:** datos y reportes deberán tratar explícitamente COP y USD, zonas horarias, idiomas y diferencias legales y laborales entre Colombia y Estados Unidos. No se debe asumir que conversión de moneda, reglas de fechas o políticas son iguales para todos los locales.
- **Despliegue y operación no unificados:** los manifiestos muestran scripts de desarrollo, build y lint por aplicación, pero no definen por sí solos una estrategia común de despliegue, observabilidad, migraciones o recuperación. Esas decisiones siguen pendientes de documentar y validar.

## Criterios para decisiones futuras

- Mantener contratos de datos explícitos entre las interfaces y los servicios, con tipos compartidos cuando corresponda.
- Sustituir la persistencia local por almacenamiento transaccional compartido antes de depender de múltiples instancias o de datos operativos críticos.
- Acordar versiones soportadas de Python, Node.js, Next.js y TypeScript y fijarlas en los entornos de CI y despliegue.
- Diseñar los modelos y reportes teniendo en cuenta país, moneda, idioma y zona horaria desde el inicio.
- Tratar las capacidades de IA, automatización y tiempo real como integraciones de la plataforma, no como sustitutos de fuentes de datos confiables ni de controles de acceso.
