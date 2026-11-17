# Despliegue Docker en VPS

El stack de producción contiene dos servicios: `frontend` (Next.js standalone,
puerto interno 3007) y `api` (FastAPI, puerto interno 8005). Compose publica el
frontend únicamente en `127.0.0.1:3007` para que un proxy inverso instalado en
el VPS pueda terminar TLS y enrutar el dominio. La API no publica puertos al
host; solo es accesible desde la red privada de Compose.

## Preparar el VPS

1. Instalar Docker Engine y el plugin Docker Compose.
2. Clonar la revisión que se desea desplegar.
3. Crear `.env` en la raíz del repositorio, con permisos restringidos. Como
   mínimo, incluir:

   ```dotenv
   JWT_SECRET=un-secreto-largo-aleatorio
   DATABASE_URL=postgresql://usuario:clave@host:5432/base?sslmode=require
   FRONTEND_URL=https://app.ejemplo.com
   ```

   `DATABASE_URL` debe permitir las operaciones requeridas por SQLModel durante
   el startup (incluida la creación inicial de tablas). No usar secretos reales
   en Git ni en argumentos de build. `RESEND_API_KEY` es opcional; sin ella el
   servicio de restablecimiento de contraseña no enviará email. Si se usa,
   configurar también `RESEND_FROM_ADDRESS` según el dominio verificado.

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

   `docker compose up --build` construye las dos imágenes en el VPS y las
   inicia; no se requiere publicar la API.

## Datos y actualizaciones

Los archivos TinyDB de auth, proveedores e incidencias se guardan en el volumen
nombrado `api-data`, montado en `/data`. El volumen persiste al recrear
contenedores. Respaldarlo antes de actualizaciones y probar la restauración.
No escalar varias réplicas de la API compartiendo TinyDB: no ofrece coordinación
transaccional entre procesos o contenedores. Inventario persiste en PostgreSQL
indicado por `DATABASE_URL`.

Para desplegar una nueva revisión, conservar el volumen y ejecutar
`docker compose up -d --build`. Para una parada sin borrar datos, ejecutar
`docker compose down`; **no** usar `docker compose down -v` salvo que se quiera
eliminar también el volumen de datos.

## Configuración de build de Next.js

Los rewrites del App Router se serializan en el build de Next.js. El Dockerfile
construye la plataforma con `UNIFIED_API_URL=http://api:8005`, resoluble solo
dentro de la red de Compose. No cambiarlo a `localhost` ni intentar corregirlo
solo en el `.env` de runtime del frontend.

El puerto 3007 está limitado a loopback para un proxy que corre directamente en
el host. Si el proxy inverso también corre en Docker, habrá que conectarlo a la
red de Compose y ajustar la publicación del frontend (y la topología de red)
antes del despliegue.