# Instrucciones para agentes

## Lectura obligatoria al inicio de cada sesión

Antes de planificar o modificar código, leer estos documentos en orden:

1. `memory-bank/projectbrief.md` para conocer el negocio, los objetivos y los problemas que aborda el proyecto.
2. `memory-bank/techContext.md` para conocer el stack, las decisiones técnicas y las restricciones identificadas.
3. `memory-bank/progress.md` para conocer el estado actual y los próximos pasos acordados.
4. `memory-bank/CONTEXT-brasaland-briefing.es.md` para consultar el contexto detallado de la empresa y sus áreas.

Si un documento falta o está vacío, indicarlo y no completar sus datos por suposición. Después, leer el README, las instrucciones locales `AGENTS.md` y el código relevante para la tarea. Las instrucciones locales aplicables se suman a estas reglas; no se deben ignorar ni reemplazar. En las aplicaciones Next.js, seguir además las instrucciones locales para consultar la documentación de la versión instalada antes de cambiar código.

## Flujo obligatorio antes de cada commit

Este flujo aplica antes de cualquier commit autorizado. Estas instrucciones no autorizan al agente a crear commits: hacerlo solo si el desarrollador lo solicita explícitamente.

1. **Confirmar autorización y estado inicial.** Verificar que el desarrollador pidió el commit y revisar `git status --short`. Identificar cambios previos o ajenos y preservarlos; nunca asumir que pertenecen a la tarea.
2. **Revisar el alcance del cambio.** Inspeccionar el diff completo y confirmar que solo incluye archivos necesarios para la tarea. No usar `git add .` ni incluir cambios ajenos o generados.
3. **Ejecutar validaciones pertinentes.** Correr pruebas, lint y build relevantes para los archivos afectados. Si no existe una validación aplicable, anotarlo; si falla, corregir o informar el fallo antes del commit, sin ocultarlo.
4. **Actualizar y comprobar documentación.** Actualizar los documentos afectados cuando cambien comportamiento, configuración o estado del proyecto; confirmar que las instrucciones y ejemplos sigan siendo correctos.
5. **Revisar seguridad y artefactos.** Comprobar que el cambio no incluya secretos, datos privados, dependencias no autorizadas, resultados generados ni archivos protegidos. Ejecutar `git diff --check` para detectar errores de whitespace.
6. **Preparar y verificar el contenido exacto.** Añadir solo las rutas previstas, revisar `git diff --cached` y `git status --short`, y volver a ejecutar `git diff --cached --check`. Confirmar que el contenido staged coincide con el cambio validado. Solo entonces realizar el commit explícitamente solicitado.

## Rutas protegidas

No modificar estas rutas sin confirmación explícita del desarrollador en la solicitud actual. La confirmación permite únicamente el cambio solicitado; no autoriza modificaciones colaterales.

- **Contexto y fuentes del proyecto:** `company-choice.md`, `memory-bank/**`, `evidencia/**` y `data/raw/**`.
- **Contratos compartidos:** `packages/shared/**`, `src/types/**` y `shared/**`.
- **Dependencias y configuración global:** `package.json`, `package-lock.json`, `**/package.json`, `**/pyproject.toml`, `**/requirements*.txt`, archivos de lock, `.gitignore` y `infra/**`.
- **Configuración de entorno:** `.env`, `.env.*` y cualquier archivo con credenciales, tokens, claves o secretos. No mostrar ni copiar secretos a logs, documentación o respuestas. Esto también aplica a `.env.example`: modificarlo requiere confirmación.
- **Estas instrucciones:** `AGENTS.md` y cualquier `AGENTS.md` local.

La lectura de estas rutas no requiere confirmación. Si una tarea parece necesitar un cambio protegido, explicar qué ruta y por qué, y solicitar confirmación antes de editarla.

## Archivos generados o de terceros

No editar manualmente ni versionar artefactos generados o dependencias instaladas, por ejemplo `.git/**`, `node_modules/**`, `**/.next/**`, `**/*.egg-info/**`, `.venv/**` y `**/__pycache__/**`. Si hace falta actualizar alguno, usar el comando o proceso que lo genera y revisar cuidadosamente el resultado; nunca alterar el contenido vendorizado para implementar lógica del proyecto.
