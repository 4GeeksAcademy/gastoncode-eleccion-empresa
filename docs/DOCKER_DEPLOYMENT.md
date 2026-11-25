# Despliegue Docker Compose en VPS (configuración de ejemplo)

Este documento describe la topología implementada en `compose.yaml`; **no
certifica que la aplicación esté preparada para producción**. Compose ejecuta
dos servicios: `frontend` (Next.js standalone, puerto interno 3007) y `api`
(FastAPI, puerto interno 8005). Publica el frontend únicamente en
`127.0.0.1:3007`, para que un proxy inverso instalado en el host pueda terminar
TLS y enrutar el dominio. La API no publica puertos al host y solo es accesible
desde la red privada de Compose. La configuración no proporciona por sí sola
operación endurecida, alta disponibilidad, monitorización, gestión de secretos
ni una estrategia completa de respaldo y restauración.

## Preparar el VPS

1. Instalar Docker Engine y el plugin Docker Compose.
2. Clonar la revisión que se desea desplegar.
3. Crear `.env` en la raíz del repositorio, con permisos restringidos. Compose
   lo requiere porque `api` declara `env_file`. Para arrancar la API se requiere
   `JWT_SECRET`; `DATABASE_URL` solo es necesaria si se habilita/usa inventario:

   ```dotenv
   JWT_SECRET=un-secreto-largo-aleatorio
   # Necesaria para el módulo de inventario; omitir si no se usa inventario.
   DATABASE_URL=postgresql://usuario:clave@host:5432/base?sslmode=require
   # Opcional; ajustar si se habilita recuperación por correo en otro dominio.
   FRONTEND_URL=https://app.ejemplo.com
   ```

   Si se configura `DATABASE_URL`, la API ejecuta `SQLModel.metadata.create_all`
   al arrancar; no hay migraciones versionadas. Verificar previamente acceso,
   permisos, TLS y compatibilidad de la base. No usar secretos reales en Git ni
   en argumentos de build. `RESEND_API_KEY` y `RESEND_FROM_ADDRESS` son
   opcionales; sin API key no se envían correos de restablecimiento.
   `TRACKER_API_URL` es opcional y por defecto apunta al playground público de
   4Geeks, no a un proveedor operacional. Configurar `CORS_ORIGINS` según la
   topología/uso previsto; revisar la configuración de seguridad antes de
   exponer la aplicación.

4. Configurar el proxy inverso del VPS para enviar el tráfico HTTPS del dominio
   a `http://127.0.0.1:3007`. El proxy debe conservar el host y los encabezados
   `X-Forwarded-Proto`/`X-Forwarded-For`.
5. Arrancar o actualizar el stack:

   ```sh
   docker compose config --quiet
   docker compose up -d --build
   docker compose ps
   docker compose logs -f api frontend
   ```

   `docker compose up -d --build` construye las dos imágenes en el VPS y las
   inicia en segundo plano; no se requiere publicar la API. Los healthchecks solo verifican
   disponibilidad HTTP básica, no dependencias, integridad de datos ni
   preparación para tráfico de producción.

## Datos y actualizaciones

Los archivos TinyDB de auth, perfiles/tokens de recuperación, proveedores,
incidencias y análisis se guardan en el volumen nombrado `api-data`, montado en
`/data`. El volumen persiste al recrear contenedores, pero no es un backup. Los
análisis/incidencias usan cachés en memoria, y TinyDB no ofrece coordinación
transaccional entre procesos o contenedores: no escalar varias réplicas de la
API compartiendo estos archivos. Inventario persiste por separado en PostgreSQL
indicado por `DATABASE_URL`.

Antes de cualquier uso con datos importantes, definir y ensayar un procedimiento
de respaldo/restauración que incluya **ambos** almacenes: una copia consistente
del volumen `api-data` y un backup PostgreSQL (por ejemplo `pg_dump`, con
credenciales gestionadas fuera del repositorio). Como mínimo:

1. Definir frecuencia, retención, cifrado, acceso restringido y ubicación fuera
   del VPS; registrar responsables y objetivos de recuperación.
2. Para una copia consistente de TinyDB, detener la API durante la copia o usar
   un procedimiento de snapshot que garantice consistencia. No asumir que
   copiar archivos mientras se escriben es seguro.
3. Respaldar PostgreSQL con herramientas del proveedor/`pg_dump` y conservar el
   método/versión de restauración.
4. Restaurar periódicamente ambos almacenes en un entorno aislado y comprobar
   que la API, los datos de usuario y los movimientos de inventario funcionan.
   Un backup que no se ha restaurado de prueba no es una estrategia verificada.

Para desplegar una nueva revisión, revisar cambios y compatibilidad, respaldar
ambos almacenes, conservar el volumen y ejecutar `docker compose up -d --build`.
No existe un proceso de migración versionada ni rollback de esquema para
inventario; `create_all` no sustituye migraciones. Para una parada sin borrar
datos, ejecutar `docker compose down`; **no** usar `docker compose down -v`
salvo que se quiera eliminar también el volumen de datos.

## Configuración de build de Next.js

Los rewrites del App Router se serializan en el build de Next.js. El Dockerfile
construye la plataforma con `UNIFIED_API_URL=http://api:8005`, resoluble solo
dentro de la red de Compose. No cambiarlo a `localhost` ni intentar corregirlo
solo en el `.env` de runtime del frontend.

El puerto 3007 está limitado a loopback para un proxy que corre directamente en
el host. Si el proxy inverso también corre en Docker, habrá que conectarlo a la
red de Compose y ajustar la publicación del frontend (y la topología de red)
antes del despliegue.

## Límites y comprobaciones antes de operación real

- No hay certificación de seguridad, pruebas de carga, alta disponibilidad,
   observabilidad/alertas completas ni validación de recuperación ante desastre.
- TinyDB local no es multi-réplica; el tracker por defecto es un servicio
   externo de playground con datos sintéticos; restablecimiento por correo no
   funciona sin Resend configurado.
- La API puede iniciar sin `DATABASE_URL`, pero las rutas de inventario fallarán
   al usar la base si no hay una URL válida. Las pruebas disponibles usan datos
   temporales/SQLite y no certifican escrituras ni concurrencia en PostgreSQL de
   producción.
- Revisar HTTPS, cabeceras y límites del proxy, exposición de `/docs`, política
   de CORS, rotación de secretos, permisos de archivos, actualizaciones de
   imágenes/dependencias, backups y restauración. Compose no implementa estos
   procesos de forma completa.

La descripción por módulo de rutas UI/API, roles, persistencia y cobertura está
en [referencia funcional por módulo](./DOMAIN_REFERENCE.md). La arquitectura
efectiva se documenta en [ARCHITECTURE_CURRENT.md](./ARCHITECTURE_CURRENT.md).