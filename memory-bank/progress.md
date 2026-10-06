# Avance del proyecto y próximos pasos

## Evaluación general

El proyecto se encuentra en una **etapa intermedia de prototipos funcionales por dominio**. La estructura general y el contexto de Brasaland están documentados, y ya hay aplicaciones web, servicios y una herramienta local de reposición con flujos de negocio concretos. Sin embargo, no se observa todavía una plataforma integrada con datos compartidos ni despliegue común; las pruebas existentes cubren la herramienta de reposición, no los flujos de las APIs o las interfaces. El estado no debe considerarse producción.

La evaluación es cualitativa, no un porcentaje: el repositorio contiene entregables ejecutables en áreas específicas, pero quedan pendientes aspectos transversales necesarios para operar los dominios como un sistema coherente.

## Estado por área

| Área | Estado observado | Pendiente principal |
| --- | --- | --- |
| Documentación y estructura | Brief del negocio, contexto técnico y propuesta de arquitectura presentes; carpetas organizadas por dominios. | Mantener la documentación alineada con el código efectivamente desplegado. |
| Backoffice | Aplicaciones Next.js para dashboard, proveedores, incidencias y seguimiento de talento. La aplicación de proveedores contiene flujos de consulta, búsqueda, alta y cambios de proveedores. | Validar cada flujo de extremo a extremo y conectar los indicadores con fuentes de datos operativas consistentes. |
| Autenticación | API FastAPI para registro, login, consulta/edición de perfiles y gestión de usuarios; JWT bearer, hash bcrypt, roles y validación de cuenta activa. La lista de usuarios se limita a admin/manager, y los cambios de rol o estado requieren admin. | Revisar permisos y manejo de secretos, integrar de forma uniforme con las interfaces y añadir pruebas de seguridad. `api-auth` requiere Python `>=3.14`. |
| Proveedores | API FastAPI con operaciones de consulta, búsqueda y mantenimiento de proveedores, tarifas y estado; usa JWT/RBAC y TinyDB local. Su manifiesto y README requieren Python 3.12+. | Acordar contrato con la interfaz, persistencia apta para uso compartido e historial/auditoría de cambios; faltan pruebas del flujo. |
| Incidencias | API FastAPI protegida con JWT compartido con `api-auth`; valida CSV (incluidos formato, UTF-8 y máximo de 10 MB), persiste análisis en TinyDB, usa caché LRU thread-safe de hasta 100 elementos y permite consultar/exportar por UUID. | Definir concurrencia y operación entre instancias, retención/recuperación de resultados y completar pruebas del flujo. El manifiesto requiere Python 3.12+. |
| Reposición | Skill local `.agents/skills/replenishment-planner/` con cálculo determinista desde CSV validado, salida de recomendaciones y errores, y suite de pruebas `unittest`. Requiere revisión humana y no envía pedidos. | Validar el cálculo con datos operativos aprobados y decidir si debe integrarse con APIs o interfaces; no estima demanda ni sustituye compras. |
| Talento | Hay una interfaz y componentes para candidatos y seguimiento de procesos. | Confirmar el alcance funcional, definir API y persistencia, y completar pruebas e integración si corresponde al alcance aprobado. |
| Datos, telemetría e IA | Existen carpetas de trabajo y documentación de arquitectura para estos temas. | No se identifica aún un pipeline integrado de ventas/telemetría, una base central ni workflows de producción en el contenido revisado. |
| Pruebas y despliegue | Hay una suite `unittest` para el planificador de reposición, además de scripts de build/lint del workspace web y guías de ejecución de servicios. | No se identifican pruebas automatizadas para APIs o interfaces ni una estrategia común de CI. No se ve un despliegue integrado configurado. |

## Próximos pasos

1. **Acordar el alcance del siguiente incremento.** Priorizar los casos de negocio que deben funcionar primero, sus usuarios responsables y criterios verificables de aceptación. El abastecimiento/proveedores y la visibilidad operativa son buenos candidatos por su relación directa con los problemas descritos en el brief.
2. **Establecer una línea base técnica reproducible.** Definir y validar en desarrollo y CI las versiones soportadas por servicio: `api-auth` requiere Python `>=3.14`, mientras `api-suppliers` y `api-incidents` requieren `>=3.12`. La discrepancia documental previa de proveedores quedó alineada.
3. **Definir contratos e integración entre módulos.** Documentar esquemas, errores, autenticación, roles, URLs por entorno y propiedad de cada dato. Verificar conjuntamente la interfaz de proveedores, las APIs de proveedores/autenticación y el análisis de incidencias.
4. **Resolver persistencia y consistencia de datos.** Decidir qué servicios compartirán almacenamiento y cómo manejar migraciones, identificadores, monedas, fechas y zonas horarias. Planificar la salida de TinyDB antes de usar estos datos para operación concurrente o crítica.
5. **Ampliar pruebas automatizadas por flujo.** La skill de reposición ya tiene una suite `unittest`; cubrir también validaciones y permisos de las APIs, operaciones de proveedores, análisis/exportación CSV y las interacciones principales de las interfaces. Incorporar lint, build y tests a integración continua.
6. **Completar la primera experiencia integrada.** Conectar los datos de los módulos priorizados a un dashboard con indicadores definidos, filtros por local/país y estados de error/carga; validar que los totales y monedas sean coherentes.
7. **Preparar operación segura y mantenible.** Definir configuración por entorno, gestión de secretos, logs, métricas, copias de seguridad, restauración y despliegue. Validar límites de carga y retención para archivos y resultados de análisis.
8. **Ampliar gradualmente a otros dominios.** Una vez estabilizada la base transversal, abordar inventario y órdenes de compra, gestión de personas, formación/calidad y experiencia digital del cliente según prioridad de negocio.

## Condiciones para considerar listo el siguiente incremento

- Los flujos acordados funcionan desde la interfaz hasta el servicio y la persistencia, en un entorno reproducible.
- Hay pruebas automáticas para reglas principales, validaciones y autorización, y los checks pasan en CI.
- Los datos se conservan y pueden recuperarse después de reiniciar servicios; los permisos y secretos están configurados de forma segura.
- Las cifras presentadas tienen definiciones documentadas y son coherentes por local, país, moneda y periodo.
- La documentación de ejecución, configuración y limitaciones coincide con el comportamiento real.
