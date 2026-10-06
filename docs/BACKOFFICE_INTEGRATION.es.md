# Backoffice integrado en desarrollo

## Arranque

Requisitos: Node.js 22 o superior, npm y uv. Auth requiere Python >=3.14;
suppliers requiere >=3.12. uv prepara entornos independientes por servicio.

Desde la raiz:

```bash
npm run backoffice:setup
npm run backoffice:dev
```

Abrir http://localhost:3000. Login, registro y cuentas pertenecen al dashboard;
proveedores se sirve en `/suppliers` desde una app Next.js independiente.
El lanzador no incluye incidencias ni talento y nunca ejecuta seeds.
`setup` instala las versiones declaradas, no corrige automaticamente vulnerabilidades.

| Proceso | Puerto local | Directorio |
| --- | --- | --- |
| API auth | 8001 | services/api-auth |
| API suppliers | 8000 | services/api-suppliers |
| Dashboard y gateway | 3000 | uis/backoffice/dashboard-backoffice |
| Interfaz proveedores | 3001 | uis/backoffice/suppliers-management |

Los cuatro puertos deben estar libres. El lanzador rechaza conflictos sin
detener procesos existentes. Ctrl+C cierra los cuatro procesos; si uno falla,
se cierra el conjunto. Espera disponibilidad hasta 120 segundos.
Los logs se identifican por servicio.

```bash
npm run backoffice:check
```

Este comando comprueba disponibilidad y el proxy auth, no reemplaza pruebas
funcionales ni una revision de permisos.

## Identidad y datos

El lanzador entrega el mismo `JWT_SECRET` a ambas APIs. Usa el valor del entorno
si existe; de lo contrario genera una clave local persistente en
`~/.local/state/brasaland/<hash-del-workspace>/jwt-secret`, con permisos 0600.
No escribe archivos `.env` ni muestra la clave. No usar este mecanismo local
como gestion de secretos de produccion. Borrar la clave invalida tokens anteriores.

Por defecto se conservan `services/api-auth/data/db.json` y
`services/api-suppliers/db.json`. `AUTH_DB_PATH` y `SUPPLIERS_DB_PATH` permiten
elegir archivos alternativos. Las pruebas deben usar bases aisladas, no copiar
ni reemplazar los datos habituales. TinyDB sigue siendo almacenamiento local,
no una base transaccional para multiples instancias.

Para el primer administrador:

1. Levantar el conjunto y registrar una cuenta en `/register`.
2. Detener el conjunto con Ctrl+C.
3. Ejecutar `npm run backoffice:admin -- email-de-la-cuenta`.
4. Reiniciar y volver a iniciar sesion.

La promocion exige una cuenta activa existente; no crea credenciales. Rechaza
la operacion mientras las APIs estan activas para evitar escrituras concurrentes.
El acceso local al terminal y las bases concede privilegios de administracion.

## Origen y sesion

Usar siempre el origen publico del dashboard. Acceder directamente al puerto
3001 mantiene otro origen de localStorage y no proporciona sesion compartida.

- Dashboard reenvia `/suppliers` a la otra app y `/suppliers-static/*` a sus assets.
- `/api/auth`, `/api/users` y `/api/profiles` se reenvian a auth.
- `/api/suppliers` y subrutas se reenvian a suppliers.
- Ambas apps usan `uis/backoffice/auth-shared` con wrappers compatibles.
- La clave de localStorage es `brasaland.backoffice.token`; las sesiones previas
  de las apps separadas requieren volver a iniciar sesion.
- La navegacion entre zonas es completa, no una transicion de Next Link.
- El logout elimina el token y se sincroniza entre pestanas del mismo origen.
- Suppliers consulta `/auth/me` con el token antes de autorizar: cambios de rol,
  borrado o desactivacion se aplican en la siguiente llamada protegida.
- Si auth no responde, suppliers deniega la operacion con 503; no confia en un
  rol antiguo ni elimina el token por una caida temporal del servicio.

El JWT sigue siendo accesible a JavaScript y no tiene refresh ni revocacion
individual. Un origen compartido amplifica el impacto de XSS entre modulos.
El frontend oculta escritura a `user`; FastAPI aplica los permisos efectivos.

## Verificacion

```bash
node --test scripts/backoffice.test.mjs uis/backoffice/dashboard-backoffice/tests/auth-api.test.mjs
uv run --directory services/api-suppliers --no-sync python -m unittest discover -s tests -v
npm run lint -w dashboard-backoffice
npm run lint -w suppliers-backoffice
npm run build -w dashboard-backoffice
npm run build -w suppliers-backoffice
```

Detener desarrollo antes de compilar. Para E2E real, iniciar con archivos
TinyDB dentro de /tmp y ejecutar `scripts/backoffice-browser.test.mjs` con
`BACKOFFICE_TEST_AUTH_DB` apuntando exactamente al archivo usado por auth.
Playwright se obtiene externamente via `PLAYWRIGHT_MODULE`; no es dependencia
del workspace. La prueba crea fixtures, comprueba roles y elimina admin al final.
Las capturas permanecen en /tmp.

Con los cuatro puertos libres, `BACKOFFICE_LIFECYCLE=1 node --test
scripts/backoffice.test.mjs` valida arranque y cierre coordinado por SIGINT.
Esta prueba se omite en la ejecucion habitual para no interferir con servicios activos.

La auditoria npm detecto vulnerabilidades en dependencias actuales, incluida
severidad critica en Next.js. Resolverlas requiere un incremento de actualizacion
y nueva validacion; esta integracion no aplica `audit fix --force`.