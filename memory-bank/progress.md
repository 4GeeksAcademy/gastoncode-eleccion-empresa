# Avance del proyecto y próximos pasos

## Evaluación general

El proyecto continúa en etapa de prototipos funcionales por dominio. La topología ejecutable integrada consta de una plataforma Next.js (`uis/platform`) y una API FastAPI (`services/api-unified`), complementadas por herramientas locales como el planificador de reposición. Esta integración no implica una plataforma de datos compartida ni preparación para producción: algunos dominios usan TinyDB local, inventario usa PostgreSQL separado y talento depende de un proveedor externo. La cobertura automatizada es parcial y no valida todos los sistemas reales.

## Estado actual

| Área | Estado observado | Pendiente principal |
| --- | --- | --- |
| Plataforma/API | Next.js en el puerto 3007 y API unificada FastAPI en 8005; aliases `/api/*` proxificados por Next. Compose define `frontend` y `api`, con API privada y frontend en loopback. | Endurecimiento operacional, observabilidad, operación y evaluación de readiness; Compose es topología de ejemplo, no certificación de producción. |
| Auth y cuentas | Registro/login, perfiles, usuarios, roles, cambios y reset de contraseña; TinyDB y JWT. Resend es opcional. | Validar entrega real de correo, permisos/seguridad y procesos operativos de secretos. |
| Proveedores e incidencias | UI y API; TinyDB local. Incidencias incluye CRUD/summary y análisis CSV; permisos de API por rol. | Persistencia multi-instancia, mayor cobertura de autorización, concurrencia y recuperación. |
| Inventario | Productos y movimientos con stock derivado; SQLModel/PostgreSQL mediante `DATABASE_URL`; sesiones autenticadas y escritores admin/manager. | No hay migraciones versionadas. Tests con SQLite no prueban Supabase ni concurrencia PostgreSQL real. |
| Talento | UI y adaptador al tracker externo (default playground), admin/manager; sin persistencia local de candidatos. | Validar upstream y privacidad antes de cualquier dato real; actualmente usar datos sintéticos. |
| Reposición | CLI que calcula recomendaciones desde CSV; tests unittest. | Revisión humana requerida; no estima demanda ni hace pedidos, y no está integrada en UI/API. |
| Pruebas/documentación | API smoke tests, Jest, browser/proxy mocks y pruebas de scripts/CSV; guías de ejecución, arquitectura, despliegue y referencia modular. | Suites aisladas no demuestran operación externa/producción; revisar cobertura de extremo a extremo y mantener documentación ligada al código. |
| Datos/otros dominios | Hay áreas y propuestas para ventas, telemetría, marketing, personas y formación. | No atribuirles capacidad integrada: no se observa pipeline operacional compartido para esos dominios. |

## Próximos pasos

1. Priorizar casos de negocio y criterios de aceptación con responsables.
2. Definir contratos e identidad de datos entre dominios y países.
3. Resolver persistencia compartida, migraciones, copias y recuperación antes de datos críticos o múltiples réplicas.
4. Ampliar pruebas de autorización, flujos UI/API y operación PostgreSQL; separar explícitamente pruebas simuladas de validación de proveedores y bases reales.
5. Acordar versiones soportadas y una estrategia de CI reproducible.
6. Definir seguridad y operación (secretos, logs/alertas, HTTPS, backups/restauración probados, despliegue y rollback) antes de declarar readiness.
7. Validar las integraciones externas (correo, tracker) con entornos controlados y datos apropiados.
8. Integrar gradualmente proveedores, inventario y analítica operacional si responden a prioridades aprobadas, sin presentar las propuestas futuras como funcionalidades ya disponibles.

## Documentación de referencia

- `docs/ARCHITECTURE_CURRENT.md`: topología que muestra el código actual.
- `docs/DOMAIN_REFERENCE.md`: rutas, roles, persistencia, límites y cobertura conocida por módulo.
- `docs/DOCKER_DEPLOYMENT.md`: Compose/VPS, configuración, persistencia, backups y límites operativos.
- `TESTING.md`: comandos, requisitos y aislamiento de las suites.

La evaluación es cualitativa; el número de rutas, archivos o pruebas no equivale a completitud del producto ni a readiness para producción.
