# Pruebas

## API de autenticación (Python)

Requiere Python 3.14+ y `uv`. Desde la raíz del monorepo, prepara las dependencias. Ejecuta pytest desde el directorio del servicio para limitar la colección a esta API:

```bash
uv sync --project services/api-auth --group test
cd services/api-auth
uv run pytest
```

La suite invoca la lógica de los endpoints directamente (sin probar el transporte ni la serialización HTTP), utiliza una base TinyDB temporal y no llama a servicios de correo externos.

## Lógica de autenticación (TypeScript)

Requiere Node.js y las dependencias npm instaladas desde la raíz:

```bash
npm install
npx jest --coverage
```

Jest está limitado al paquete `uis/backoffice/auth-shared`; las pruebas simulan `fetch` y el almacenamiento local del navegador. La cobertura HTML se genera en `coverage/auth-shared/`. También se puede usar `npm run test:auth:ts`.
