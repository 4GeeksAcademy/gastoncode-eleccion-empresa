# Avance del proyecto y próximos pasos

## Evaluación general

El proyecto se encuentra en una **etapa intermedia de prototipos funcionales por dominio**. La estructura general y el contexto de Brasaland están documentados, y ya hay aplicaciones web y servicios con flujos de negocio concretos. Sin embargo, no se observa todavía una plataforma integrada con datos compartidos, pruebas automatizadas y despliegue común; por ello, el estado no debe considerarse producción.

La evaluación es cualitativa, no un porcentaje: el repositorio contiene entregables ejecutables en áreas específicas, pero quedan pendientes aspectos transversales necesarios para operar los dominios como un sistema coherente.

## Estado por área

| Área | Estado observado | Pendiente principal |
| --- | --- | --- |
| Documentación y estructura | Brief del negocio, contexto técnico y propuesta de arquitectura presentes; carpetas organizadas por dominios. | Mantener la documentación alineada con el código efectivamente desplegado. |
| Backoffice | Aplicaciones Next.js para dashboard, proveedores, incidencias y seguimiento de talento. La aplicación de proveedores contiene flujos de consulta, búsqueda, alta y cambios de proveedores. | Validar cada flujo de extremo a extremo y conectar los indicadores con fuentes de datos operativas consistentes. |
| Autenticación | API FastAPI para usuarios y perfiles, con JWT bearer, hash de contraseñas y roles. | Revisar permisos, manejo de secretos, integración uniforme con todas las interfaces y pruebas de seguridad. |
| Proveedores | API FastAPI con operaciones de consulta, búsqueda y mantenimiento de proveedores, tarifas y estado; usa TinyDB. | Acordar contrato con la interfaz, persistencia apta para uso compartido e historial/auditoría de cambios. |
| Incidencias | API que recibe CSV, analiza su contenido y permite exportar resultados. El último resultado se mantiene en memoria del proceso. | Persistir resultados, definir comportamiento con solicitudes simultáneas y completar pruebas del flujo de análisis. |
| Talento | Hay una interfaz y componentes para candidatos y seguimiento de procesos. | Confirmar el alcance funcional, definir API y persistencia, y completar pruebas e integración si corresponde al alcance aprobado. |
| Datos, telemetría e IA | Existen carpetas de trabajo y documentación de arquitectura para estos temas. | No se identifica aún un pipeline integrado de ventas/telemetría, una base central ni workflows de producción en el contenido revisado. |
| Pruebas y despliegue | Hay scripts de build y lint en el workspace web y guías de ejecución de servicios. | No se encontraron archivos de pruebas con convenciones habituales `test_*.py`, `*.test.*` o `*.spec.*`; falta verificar y establecer una estrategia automatizada común. No se ve un despliegue integrado configurado. |

## Próximos pasos

1. **Acordar el alcance del siguiente incremento.** Priorizar los casos de negocio que deben funcionar primero, sus usuarios responsables y criterios verificables de aceptación. El abastecimiento/proveedores y la visibilidad operativa son buenos candidatos por su relación directa con los problemas descritos en el brief.
2. **Establecer una línea base técnica reproducible.** Alinear versiones y corregir discrepancias documentales. En particular, `api-suppliers/README.md` menciona Python 3.12 mientras que su `pyproject.toml` requiere Python `>=3.14`; definir la versión soportada y validarla en desarrollo y CI.
3. **Definir contratos e integración entre módulos.** Documentar esquemas, errores, autenticación, roles, URLs por entorno y propiedad de cada dato. Verificar conjuntamente la interfaz de proveedores, las APIs de proveedores/autenticación y el análisis de incidencias.
4. **Resolver persistencia y consistencia de datos.** Decidir qué servicios compartirán almacenamiento y cómo manejar migraciones, identificadores, monedas, fechas y zonas horarias. Planificar la salida de TinyDB antes de usar estos datos para operación concurrente o crítica.
5. **Añadir pruebas automatizadas por flujo.** Cubrir validaciones y permisos de las APIs, operaciones de proveedores, análisis y exportación CSV, y las interacciones principales de las interfaces. Incorporar los checks de lint, build y tests a integración continua.
6. **Completar la primera experiencia integrada.** Conectar los datos de los módulos priorizados a un dashboard con indicadores definidos, filtros por local/país y estados de error/carga; validar que los totales y monedas sean coherentes.
7. **Preparar operación segura y mantenible.** Definir configuración por entorno, gestión de secretos, logs, métricas, copias de seguridad, restauración y despliegue. Validar límites de carga y retención para archivos y resultados de análisis.
8. **Ampliar gradualmente a otros dominios.** Una vez estabilizada la base transversal, abordar inventario y órdenes de compra, gestión de personas, formación/calidad y experiencia digital del cliente según prioridad de negocio.

## Condiciones para considerar listo el siguiente incremento

- Los flujos acordados funcionan desde la interfaz hasta el servicio y la persistencia, en un entorno reproducible.
- Hay pruebas automáticas para reglas principales, validaciones y autorización, y los checks pasan en CI.
- Los datos se conservan y pueden recuperarse después de reiniciar servicios; los permisos y secretos están configurados de forma segura.
- Las cifras presentadas tienen definiciones documentadas y son coherentes por local, país, moneda y periodo.
- La documentación de ejecución, configuración y limitaciones coincide con el comportamiento real.
