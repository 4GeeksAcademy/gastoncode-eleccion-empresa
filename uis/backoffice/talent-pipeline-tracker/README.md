## Pipeline de talento integrado

Prototipo de candidaturas, solo para datos sinteticos. Incluye listado, filtros,
paginacion, alta, detalle, cambios de etapa/estado y notas; no vacantes ni onboarding.

Desde la raiz, usar `npm run backoffice:setup` y `npm run backoffice:dev`.
Abrir http://localhost:3000/talent-pipeline-tracker. La UI escucha en 3003 con
basePath `/talent-pipeline-tracker`; usar el origen del dashboard para compartir
sesion. `npm run dev:talent` inicia solo la interfaz, no las APIs.

Requiere api-auth (8001) y api-talent (8004), con JWT_SECRET compartido entre
servicios. Solo admin/manager pueden consultar o modificar candidaturas.
AuthProvider y AuthGuard son compartidos. Tras expirar la sesion, el login conserva
solo el pathname; un cierre voluntario no conserva destino. Un 401 tardio no borra
una sesion nueva, y un 403 o fallo temporal conserva la sesion.

Consultas cliente despues del guard, sin candidatos en SSR. Todas las llamadas
usan `/api/talent/*`, Bearer y no-store. Las mutaciones reconsultan datos.
Backoffice y Cuenta usan navegacion completa; los enlaces internos usan Next Link.

TALENT_UI_URL y TALENT_API_URL configuran el gateway. AUTH_API_URL y TALENT_API_URL
configuran los rewrites locales. NEXT_PUBLIC_TRACKER_API_URL ya no se usa; el
proveedor se configura solo en api-talent mediante TRACKER_API_URL.
Ver [contrato y limites](../../../services/api-talent/README.md).

Verificacion desde la raiz:

```bash
node --test uis/backoffice/talent-pipeline-tracker/tests/talent-api.test.mjs
npm run lint -w talent-pipeline-tracker
npm run build -w talent-pipeline-tracker
node scripts/browser-tests.mjs scripts/talent.browser.test.mjs
```

Detener desarrollo antes del build. La prueba de navegador necesita dashboard y
tracker iniciados y las bibliotecas de Chromium; simula las APIs, sin escribir
en 4Geeks. Las capturas, cuando puede ejecutarse, quedan en
`/tmp/brasaland-talent-desktop.png` y `/tmp/brasaland-talent-mobile.png`.
