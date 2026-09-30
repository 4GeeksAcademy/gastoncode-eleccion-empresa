---
description: "Guía transversal para cambios en el monorepo Brasaland Digital."
applyTo: "**"
---

# Guía de trabajo para Brasaland Digital

Esta regla se aplica a todos los archivos del monorepo. Complementa `AGENTS.md` y las instrucciones locales; no las reemplaza. Si las reglas locales de un área son más específicas, respétalas junto con esta guía.

## Contexto y alcance

- Al iniciar una sesión, sigue el orden de lectura del memory bank especificado en `AGENTS.md`. Usa ese contexto para entender el problema de negocio antes de elegir una solución técnica.
- Brasaland opera restaurantes en Colombia y Florida. Considera explícitamente local, país, moneda, idioma y zona horaria cuando afecten al caso de uso; no infieras tasas de conversión ni reglas operativas ausentes de los datos.
- Mantén los cambios acotados a la tarea. Revisa el código y la documentación del dominio afectado antes de modificarlo; no supongas que la presencia de una carpeta significa que su funcionalidad está terminada o integrada.
- Distingue capacidades implementadas de propuestas. La arquitectura de `docs/ARCHITECTURE_PROPOSAL.md` es una propuesta: no describas SQLAlchemy, PostgreSQL, WebSockets ni una API central como capacidades actuales sin verificar que se hayan incorporado.

## Límites del monorepo

- Las interfaces de backoffice son aplicaciones Next.js independientes en `uis/backoffice/`; el paquete visual compartido está en `uis/backoffice/shared/`. Reutiliza sus componentes y patrones cuando corresponda y evita acoplar aplicaciones mediante rutas o estado implícitos.
- Los servicios Python bajo `services/` son dominios separados. `api-auth` y `api-suppliers` usan TinyDB local; no trates esos archivos como una base de datos compartida ni como persistencia escalable para múltiples instancias.
- Respeta los contratos existentes entre interfaces, servicios, `packages/`, `src/` y `shared/`. Los cambios a contratos o dependencias compartidas requieren especial cuidado y siguen sujetos a las confirmaciones indicadas en `AGENTS.md`.
- `data/`, `evidencia/`, `memory-bank/`, `skills/`, `agents/`, `mcps/` y `workflows/` tienen propósitos distintos. No muevas, sobrescribas ni conviertas datos, evidencia o documentación de referencia en artefactos generados.

## Implementación y calidad

- Formula un objetivo de cambio verificable y conserva el comportamiento existente fuera de ese objetivo. Evita añadir dependencias o capas de arquitectura si la tarea puede resolverse con las convenciones del módulo afectado.
- Para cambios en una interfaz o servicio, valida el flujo en su límite: datos de entrada, reglas de negocio, errores y salida. Para integraciones entre módulos, comprueba ambos lados del contrato.
- Añade o actualiza pruebas para las reglas modificadas. Ejecuta las pruebas, lint y build más pertinentes al alcance; informa cualquier validación que no se haya podido ejecutar y no presentes un prototipo como listo para producción.
- Protege credenciales y datos personales. No registres secretos ni expongas datos de clientes o empleados en ejemplos, fixtures, logs o respuestas. Usa únicamente datos sintéticos en pruebas.
- En recomendaciones de compras o inventario, separa cálculos y sugerencias de decisiones humanas: no envíes pedidos ni modifiques existencias sin autorización y un flujo aprobado.
- Mantén la documentación del módulo coherente con el comportamiento real. Al cambiar un contrato, configuración o limitación, actualiza la documentación pertinente sin alterar documentos protegidos fuera de la autorización dada.

## Instrucciones específicas

- Antes de cambiar una aplicación Next.js, sigue su `AGENTS.md` local y consulta la documentación de la versión instalada indicada allí.
- Antes de editar archivos protegidos, gestionar dependencias o crear commits, sigue las confirmaciones y el flujo obligatorio definidos en `AGENTS.md`.