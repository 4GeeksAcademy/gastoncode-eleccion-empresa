# Analizador de incidencias de Brasaland

Aplicacion Next.js para analizar CSV historicos y exportar sus metricas.
El analisis no importa registros al gestor de incidencias.

## Ejecutar

Desde la raiz del monorepo:

```bash
npm run backoffice:setup
npm run backoffice:dev
```

Acceder a http://localhost:3000/incidents-analyzer. El dashboard comparte
origen y sesion con esta aplicacion, publicada con `basePath: "/incidents-analyzer"`.
La vista de analisis esta en `/incidents-analyzer/incidents`.
Sin sesion se redirige al login del dashboard y se conserva la ruta de retorno.
El enlace "Backoffice" vuelve al dashboard con una navegacion completa.

Para iniciar solo esta UI, usar `npm run dev:incidents` (puerto 3002).
Seguir usando el origen publico del dashboard; acceder directamente al puerto
3002 no comparte su almacenamiento de sesion. Deben estar disponibles el
dashboard, api-auth (8001) y api-incidents (8002).

El dashboard reenvia la UI y sus assets mediante `INCIDENTS_UI_URL`
(`http://localhost:3002` por defecto). La UI admite `AUTH_API_URL`
(`http://127.0.0.1:8001`) e `INCIDENTS_API_URL` (`http://127.0.0.1:8002`)
para sus rewrites de API. No requiere variables `NEXT_PUBLIC` para el acceso integrado.

## Contrato y errores

Todas las solicitudes incluyen el JWT de `auth-shared`:

1. `POST /api/incidents/analyze` envia el archivo como multipart y obtiene `analysis_id`.
2. `GET /api/incidents/results/{analysis_id}` obtiene y valida el resultado completo.
3. `GET /api/incidents/results/export?analysis_id=...` descarga el analisis seleccionado.

Los errores de archivo se muestran con el mensaje de validacion de la API.
Un 401 invalida la sesion solo si el token rechazado sigue siendo el actual.
Un 403, un fallo de red o un 503 de identidad se muestran sin borrar el token.
Las respuestas incompletas o mal formadas no se renderizan como resultados.

## Validacion

Desde la raiz:

```bash
node --test uis/backoffice/incidents-analyzer/tests/incidents-api.test.mjs
npm run lint -w incidents-analyzer
npm exec -w incidents-analyzer -- tsc --noEmit --incremental false
npm run build -w incidents-analyzer
```

Las pruebas del cliente simulan red y almacenamiento; verifican subida,
consulta, exportacion, errores, sesiones y configuracion de rutas.
El contrato HTTP real se prueba con bases temporales en
`services/api-incidents/tests/test_auth.py`.
