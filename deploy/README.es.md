# Despliegue piloto en VPS

Este despliegue prepara dos imágenes y dos contenedores permanentes: cuatro
procesos Next.js sobre Node/Alpine y tres procesos FastAPI sobre Python 3.14.
Nginx y Certbot se instalan en el VPS, fuera de Compose. No incluye inventario,
talento ni el analizador de incidencias.

**No está validado para producción todavía.** Aún deben probarse las imágenes
publicadas y Nginx en el VPS. La instalación npm de esta construcción informó
27 vulnerabilidades: una crítica, 25 moderadas y una baja. El informe no
identifica aquí cuáles afectan al runtime; investigarlas y resolverlas o aceptar
el riesgo explícitamente antes de habilitar producción. El build frontend usa
`npm install --package-lock=false`, igual que el lanzador de desarrollo: las
dependencias transitivas pueden cambiar entre builds. El lockfile y la
documentación local de Next.js están restringidos por la política de exclusión.
El catálogo sigue mostrando los módulos excluidos; Nginx responde 410 al
acceder a sus rutas. El formulario público conserva su comportamiento actual:
muestra una confirmación sin guardar ni enviar datos.

Las imágenes `1.0.0` se construyeron para `linux/amd64` y se probaron
localmente con datos temporales: las cuatro UIs, registro pendiente, activación
del primer administrador, login y operaciones de proveedores e incidencias.
También se comprobó la sintaxis HTTPS de Nginx con un certificado de prueba.
Estas pruebas no validan el certificado real, su renovación ni el VPS.

## Direcciones y red

- Web: `https://206.189.176.237:3000`.
- Backoffice: `https://206.189.176.237:8000`.
- Nginx escucha en los puertos públicos 80, 3000 y 8000; el 80 se usa para
  validación ACME y redirige el resto del tráfico a la web.
- Compose publica exclusivamente en loopback `13006` para la web y `13000`
  para el dashboard. Nginx reenvía a esos puertos; las APIs no se publican.
- Proveedores y gestor de incidencias comparten origen y sesión con el
  dashboard. No publicar directamente sus puertos.

Abrir los tres puertos públicos en el firewall sin perder acceso SSH. La IP debe
seguir asignada al VPS y ser accesible desde Internet. Los archivos Nginx
contienen esa IP: si cambia, hay que actualizarlos y emitir otro certificado.

## Variables de entorno

El operador prepara `.env` en el directorio de Compose, con permisos
restrictivos; nunca se copia a las imágenes. No usar secretos de desarrollo.

| Variable | Requisito |
| --- | --- |
| `JWT_SECRET` | Obligatoria. Clave aleatoria fuerte, compartida solo por las tres APIs; conservarla de forma segura. |
| `BACKOFFICE_URL` | Opcional; por defecto `https://206.189.176.237:8000`. Incluye esquema y puerto, sin barra final. |
| `RESEND_API_KEY` | Necesaria para enviar correos de recuperación. Sin ella, el servicio registra una advertencia y no los envía. |
| `RESEND_FROM_ADDRESS` | Remitente verificado en Resend; por defecto `onboarding@resend.dev`. |

El secreto queda accesible a quienes administran Docker o el entorno del
contenedor. `BACKOFFICE_URL` se usa tanto en la imagen frontend como en auth:
si cambia, reconstruir la imagen frontend. Las URLs internas se fijan en
Compose y durante el build; no deben apuntar a la IP pública.

Compose fija `REQUIRE_ACCOUNT_APPROVAL=true`: el registro público crea cuentas
inactivas y un administrador debe habilitarlas. La interfaz actual no explica
que la cuenta está pendiente y redirige al login; comunicar este paso a los
usuarios por un canal operativo. Las cuentas ya existentes no se desactivan
automáticamente y deben revisarse antes del despliegue. El registro tampoco
verifica la propiedad del correo.

## Nginx y certificado para la IP en Ubuntu 22.04

Estos comandos suponen que los archivos están en `~/brasaland/deploy/`. La
emisión y renovación necesitan conectividad pública por el puerto 80. Revisar
las configuraciones Nginx existentes para evitar conflictos antes de instalar
la configuración nueva.

1. Instalar Nginx y Certbot mediante snap, y comprobar que Certbot sea **5.4 o
   posterior** para usar `webroot` con direcciones IP:

   ```sh
   sudo apt update
   sudo apt install -y nginx snapd
   sudo snap install certbot --classic
   /snap/bin/certbot --version
   sudo systemctl enable --now nginx
   ```

2. Desde `~/brasaland`, preparar el sitio inicial y validar la configuración:

   ```sh
   cd ~/brasaland
   sudo mkdir -p /var/www/brasaland-acme
   sudo install -m 0644 deploy/nginx-http.conf /etc/nginx/conf.d/brasaland.conf
   sudo nginx -t
   sudo systemctl reload nginx
   ```

   La configuración inicial devuelve 503 salvo para ACME. Si `nginx -t`
   informa de un conflicto, resolverlo antes de recargar; no eliminar otros
   sitios sin revisarlos.
3. Emitir el certificado indicando un correo de operación válido en la variable
   de shell `CERTBOT_EMAIL`:

   ```sh
   sudo /snap/bin/certbot certonly --webroot --webroot-path /var/www/brasaland-acme \
     --preferred-profile shortlived --ip-address 206.189.176.237 \
     --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email --non-interactive \
     --deploy-hook "systemctl reload nginx"
   ```

4. Sustituir la configuración inicial por la HTTPS; no activar ambas:

   ```sh
   sudo install -m 0644 deploy/nginx-https.conf /etc/nginx/conf.d/brasaland.conf
   sudo nginx -t
   sudo systemctl reload nginx
   ```

5. Comprobar que el temporizador de Certbot esté habilitado y se ejecute al
   menos dos veces al día. Probar renovación y hook, y monitorizar la expiración:

   ```sh
   systemctl list-timers --all | grep certbot
   sudo /snap/bin/certbot renew --dry-run --run-deploy-hooks
   ```

Los certificados de Let's Encrypt para IP duran unas 160 horas, por lo que un
fallo de renovación requiere atención inmediata. Certbot obtiene el
certificado, pero Nginx debe cargarlo y recargarse tras cada renovación.
Referencia: [Let's Encrypt: certificados IP con Certbot](https://letsencrypt.org/2026/03/11/shorter-certs-certbot/).

La configuración limita intentos de login, recuperación y registro por IP;
usuarios detrás de una misma IP comparten el límite. Ajustar los límites a la
carga del piloto. El access log configurado omite query strings, pero revisar
también políticas de retención y logs de errores antes de usar datos reales.

## Publicar las imágenes en Docker Hub

Las imágenes para Linux AMD64 están etiquetadas como
`gastoncode15/brasaland-frontend:1.0.0` y
`gastoncode15/brasaland-backend:1.0.0`. En el equipo donde fueron construidas:

```sh
docker image inspect gastoncode15/brasaland-frontend:1.0.0 >/dev/null
docker image inspect gastoncode15/brasaland-backend:1.0.0 >/dev/null
docker login --username gastoncode15
docker push gastoncode15/brasaland-frontend:1.0.0
docker push gastoncode15/brasaland-backend:1.0.0
```

Autenticarse de forma interactiva con las credenciales o un token de Docker Hub;
no incluir tokens en comandos, archivos del repositorio ni logs. Confirmar en
Docker Hub que los dos repositorios y sus etiquetas se publicaron, y anotar los
digests devueltos por `docker push`. Las etiquetas pueden reasignarse: para
posteriores cambios, publicar una nueva versión en lugar de sobrescribir `1.0.0`.

## Descargar y arrancar en el VPS

1. Instalar [Docker Engine y el plugin Compose para Ubuntu](https://docs.docker.com/engine/install/ubuntu/).
   Desde el equipo que contiene este repositorio, reemplazar `USUARIO_VPS` por
   el usuario SSH y copiar únicamente los archivos necesarios:

   ```sh
   ssh USUARIO_VPS@206.189.176.237 'mkdir -p ~/brasaland/deploy'
   scp compose.yaml USUARIO_VPS@206.189.176.237:~/brasaland/
   scp deploy/nginx-http.conf deploy/nginx-https.conf \
     USUARIO_VPS@206.189.176.237:~/brasaland/deploy/
   ```

   En el VPS, preparar el `.env` en `~/brasaland` con las variables descritas
   arriba y ejecutar `chmod 600 .env`. Para imágenes privadas, hacer
   `docker login` en el VPS con una credencial de lectura de Docker Hub.
2. Desde el directorio que contiene `compose.yaml`:

   ```sh
   docker compose config --quiet
   docker compose pull
   docker compose up -d --no-build
   docker compose ps
   ```

3. Configurar Nginx y Certbot como se indica arriba. Comprobar que la web
   responda y que la API de identidad rechace una solicitud sin token:

   ```sh
   curl --fail --silent --show-error https://206.189.176.237:3000/ -o /dev/null
   curl --silent --show-error -o /dev/null -w '%{http_code}\n' \
     https://206.189.176.237:8000/api/auth/me
   ```

   La segunda petición debe mostrar `401`. Comprobar también los flujos y
   condiciones de aceptación antes de habilitar datos reales.

No ejecutar `docker compose config` sin `--quiet` en logs compartidos: puede
mostrar variables sensibles. `--no-build` es importante para usar las imágenes
descargadas en lugar de construirlas en el VPS. Supervisor reinicia los procesos
que terminan y los healthchecks comprueban los siete servidores; un estado
`unhealthy` de Docker no reinicia automáticamente el contenedor. Configurar
alertas y comprobar también los flujos funcionales.

## Primer administrador

1. Registrar una cuenta desde el backoffice.
2. Detener ambos contenedores antes de modificar TinyDB:

   ```sh
   docker compose stop frontend backend
   ```

3. Ejecutar el script sobre el mismo volumen, usando el correo de la cuenta
   existente en una variable de shell `ADMIN_EMAIL`:

   ```sh
   docker compose run --rm --no-deps \
     --entrypoint /app/services/api-auth/.venv/bin/python backend \
     /app/services/api-auth/promote_admin.py --activate "$ADMIN_EMAIL"
   ```

4. Reiniciar con `docker compose up -d` y volver a iniciar sesión. La promoción
   activa la cuenta existente y no crea otra. Posteriormente, un administrador
   puede activar las cuentas pendientes desde la gestión de usuarios. El acceso
   a los volúmenes o al terminal del VPS equivale a acceso administrativo;
   protegerlo y no ejecutar el script mientras auth u otro proceso escriba en
   el archivo.

## Datos y criterios de aceptación

Los volúmenes `auth-data`, `suppliers-data` e `incidents-data` conservan las
bases entre recreaciones. No eliminarlos con `docker compose down -v`. Antes de
actualizar, detener todos los escritores y hacer copias consistentes y
cifradas fuera del VPS; probar periódicamente la restauración en un entorno
aislado. No ejecutar seeds o scripts de promoción simultáneamente con las APIs.

TinyDB sigue sin transacciones ni coordinación entre procesos. Usar una
instancia y un worker por API; los bloqueos nuevos de auth y proveedores son
solo por proceso. Las copias y los bloqueos no sustituyen una base transaccional
para operación crítica o múltiples instancias.

Antes de habilitar usuarios reales, comprobar el certificado y su renovación,
login/registro, permisos, sesión compartida, proveedores e incidencias,
recuperación por correo, reinicio y restauración de los tres volúmenes. Probar
concurrencia y carga esperada, caída individual de cada proceso, healthchecks,
logs y alertas. Las comprobaciones de salud HTTP no prueban escritura en disco.
