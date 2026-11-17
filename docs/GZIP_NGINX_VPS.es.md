# Habilitar compresión Gzip en Nginx para el stack Brasaland (VPS)

## Índice

1. [¿Qué es gzip y por qué usarlo?](#1-qué-es-gzip-y-por-qué-usarlo)
2. [Beneficios potenciales](#2-beneficios-potenciales)
3. [Requisitos previos](#3-requisitos-previos)
4. [Paso a paso — Configuración de gzip en Nginx](#4-paso-a-paso--configuración-de-gzip-en-nginx)
   - [4.1 Conectar al VPS por SSH](#41-conectar-al-vps-por-ssh)
   - [4.2 Localizar la configuración de Nginx activa](#42-localizar-la-configuración-de-nginx-activa)
   - [4.3 Hacer copia de seguridad](#43-hacer-copia-de-seguridad)
   - [4.4 Configurar gzip](#44-configurar-gzip)
   - [4.5 Probar la sintaxis y recargar Nginx](#45-probar-la-sintaxis-y-recargar-nginx)
5. [Verificar que gzip funciona](#5-verificar-que-gzip-funciona)
6. [Solución de problemas comunes](#6-solución-de-problemas-comunes)
7. [Referencias](#7-referencias)

---

## 1. ¿Qué es gzip y por qué usarlo?

Gzip es un algoritmo de compresión sin pérdida que Nginx puede aplicar **sobre la
marcha** a las respuestas HTTP antes de enviarlas al cliente (navegador, app
móvil, etc.). El cliente indica que acepta contenido comprimido mediante el
encabezado `Accept-Encoding: gzip`, y el servidor responde con
`Content-Encoding: gzip`.

En el contexto de este proyecto (Brasaland), el frontend Next.js sirve páginas
HTML, CSS, JavaScript, JSON (desde la API vía proxy) y ocasionalmente XML o SVG.
Comprimir estos recursos reduce el peso de las respuestas entre un 60–85 %,
acelerando la descarga y mejorando la experiencia del usuario, especialmente
en conexiones móviles o con ancho de banda limitado.

---

## 2. Beneficios potenciales

| Beneficio | Impacto estimado |
|---|---|
| **Reducción del ancho de banda** | Las respuestas HTML/JSON pueden pasar de ~100 KB a ~15-25 KB (hasta un 80 % menos). |
| **Menor tiempo de carga (TTFB)** | El navegador recibe el primer byte comprimido más rápido porque se transmite menos datos. |
| **Mejora en PageSpeed / Lighthouse** | La compresión es uno de los factores puntuados por los tests de rendimiento. |
| **Ahorro en datos móviles** | Usuarios con planes limitados descargan menos MB por sesión. |
| **Menor latencia en respuestas JSON** | Las respuestas de la API (`/api/*`) también se comprimen si el proxy inverso las procesa. |
| **Bajo costo computacional** | Nginx comprime con nivel 1–6 usando muy poca CPU. En un VPS moderno el impacto es imperceptible. |

> **Nota sobre la API**: La API FastAPI corre en el contenedor `api` (puerto
> 8005) y **no publica puertos al host**. Solo Nginx tiene acceso a ella a
> través del proxy inverso. Si se desea comprimir las respuestas JSON de la API,
> basta con que Nginx (que actúa de proxy) comprima antes de enviar al cliente;
> no hace falta tocar el backend.

---

## 3. Requisitos previos

- Acceso SSH al VPS.
- Nginx instalado y funcionando, sirviendo como proxy inverso para el stack
  Docker de Brasaland (tal como se describe en `docs/DOCKER_DEPLOYMENT.md`).
- Permisos de `sudo` (o ser root) para editar archivos de configuración de
  Nginx y recargar el servicio.

---

## 4. Paso a paso — Configuración de gzip en Nginx

### 4.1 Conectar al VPS por SSH

```bash
ssh usuario@tuservidor.com
```

### 4.2 Localizar la configuración de Nginx activa

Lo más habitual es que la configuración del sitio esté en:

```bash
# Sitios habilitados (debian/ubuntu)
ls -la /etc/nginx/sites-enabled/

# O configuración principal
cat /etc/nginx/nginx.conf
```

Para este proyecto, el archivo relevante suele ser
`/etc/nginx/sites-enabled/brasaland` o similar. Identifícalo con:

```bash
grep -rl 'proxy_pass.*127.0.0.1:3007' /etc/nginx/
```

Ese archivo contiene el `server {}` que enruta hacia el contenedor del
frontend. Ahí es donde aplicaremos los cambios.

### 4.3 Hacer copia de seguridad

Siempre antes de modificar configuración de Nginx:

```bash
# Copia del sitio concreto
sudo cp /etc/nginx/sites-enabled/brasaland.conf /etc/nginx/sites-enabled/brasaland.conf.bak.$(date +%Y%m%d)

# O copia de toda la carpeta
sudo cp -r /etc/nginx /etc/nginx.bak.$(date +%Y%m%d)
```

### 4.4 Configurar gzip

Edita el archivo de configuración del sitio (o el `nginx.conf` general, según
prefieras). Con tu editor favorito:

```bash
sudo nano /etc/nginx/sites-enabled/brasaland.conf
```

Dentro del bloque `http {}` o directamente dentro del bloque `server {}`,
añade las directivas de gzip. **Opción recomendada** — ponlas en el bloque
`server {}` para que solo afecten a este dominio:

```nginx
server {
    # ... tu configuración existente (listen, server_name, ssl, etc.) ...

    # ─── Gzip ───────────────────────────────────────────────────────
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_min_length 256;

    # Tipos MIME que se comprimen (los más comunes en este proyecto)
    gzip_types
        text/plain
        text/html
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml
        application/xml+rss
        application/atom+xml
        application/rss+xml
        application/ld+json
        application/vnd.api+json
        application/geo+json
        image/svg+xml
        image/x-icon
        font/ttf
        font/otf
        font/woff
        font/woff2;

    # No comprimir si el cliente es un navegador antiguo (IE6)
    gzip_disable "msie6";

    # ... resto de la configuración (location /, location /api/, etc.) ...
}
```

> **Si prefieres aplicar gzip globalmente** (a todos los sitios que sirve este
> Nginx), coloca las directivas dentro del bloque `http {}` en
> `/etc/nginx/nginx.conf` o en un archivo separado incluido desde `http {}`:
> ```nginx
> # /etc/nginx/conf.d/gzip.conf
> gzip on;
> gzip_vary on;
> ...
> ```
> Luego asegúrate de que `nginx.conf` tenga `include /etc/nginx/conf.d/*.conf;`
> (suele venir por defecto).

#### Explicación de cada directiva

| Directiva | Valor | Qué hace |
|---|---|---|
| `gzip on;` | — | Activa la compresión. |
| `gzip_vary on;` | — | Añade `Vary: Accept-Encoding` para que las cachés intermedias sepan que la respuesta varía según si el cliente soporta gzip. |
| `gzip_proxied any;` | `any` | Comprime también respuestas provenientes de un proxy (en nuestro caso, el backend FastAPI). Sin esto, Nginx no comprimiría las respuestas que él mismo obtiene del contenedor `api`. |
| `gzip_comp_level 5;` | 1–9 | Nivel de compresión. 1 = rápido, 9 = máximo comprimido. 5 es un buen equilibrio. |
| `gzip_min_length 256;` | bytes | Solo comprime respuestas de más de 256 bytes. Las respuestas muy pequeñas no merecen la pena comprimirlas. |
| `gzip_types …;` | — | Lista de tipos MIME que se comprimirán. Incluye JSON (crítico para la API), CSS, JS, fuentes y SVG. |
| `gzip_disable "msie6";` | — | Desactiva gzip para IE6 (que tenía bugs con la compresión). |

### 4.5 Probar la sintaxis y recargar Nginx

```bash
# Verificar que la configuración es correcta
sudo nginx -t

# Si responde "syntax is ok" y "test is successful", recargar:
sudo systemctl reload nginx

# O alternativamente:
sudo nginx -s reload
```

Si `nginx -t` reporta errores, revisa el archivo. Los errores más comunes son
olvidar un punto y coma (`;`) al final de cada directiva, o tener dos bloques
`server {}` con el mismo `server_name` sin un `default_server`.

---

## 5. Verificar que gzip funciona

### 5.1 Desde el propio VPS (curl)

```bash
curl -H "Accept-Encoding: gzip" -I https://tudominio.com/
```

Busca en la respuesta:

```
content-encoding: gzip
```

Si aparece, la compresión está activa.

### 5.2 Ver tamaño comprimido vs. descomprimido

```bash
# Sin compresión (simulado con --compressed false, pidiendo sin gzip)
curl -s -o /dev/null -w "%%{size_download}" https://tudominio.com/

# Con compresión
curl -s --compressed -o /dev/null -w "%%{size_download}" https://tudominio.com/
```

La segunda cifra debería ser significativamente menor.

### 5.3 Desde el navegador

Abre la página en Chrome/Chromium y:

1. Abre **Inspeccionar** → pestaña **Red**.
2. Carga la página.
3. Haz clic en cualquier recurso (HTML, CSS, JS).
4. Busca el encabezado de respuesta `content-encoding: gzip`.

En la columna **Tamaño** también verás dos cifras: (comprimido / descomprimido).

### 5.4 Prueba online

Herramientas como [gzipwtf.com](https://gzipwtf.com) o
[checkgzipcompression.com](https://checkgzipcompression.com) permiten verificar
desde fuera si un dominio sirve contenido comprimido.

---

## 6. Solución de problemas comunes

### "La página no se ve bien después de activar gzip"

Causa posible: algún tipo MIME necesario no está en `gzip_types`. Añade
`text/html` (debería estar siempre), `application/json`, etc. La lista
recomendada del paso 4.4 cubre todos los tipos que sirve este proyecto.

### "gzip no comprime las respuestas JSON de la API"

Revisa que `gzip_proxied any;` esté presente. Si falta, Nginx no comprime las
respuestas que vienen del backend proxy (puerto 8005). También verifica que
`application/json` esté en `gzip_types`.

### "Hay un error `unknown directive "gzip"`"

Tu Nginx puede haber sido compilado sin el módulo `ngx_http_gzip_module__static`.
Verifica con:

```bash
nginx -V 2>&1 | grep -- '--without-http_gzip_module'
```

Si aparece, necesitas compilar Nginx con el módulo o instalar una versión que lo
incluya (la mayoría de los paquetes `nginx` estándar lo incluyen).

### "La CPU del VPS sube mucho"

Reduce `gzip_comp_level` a 2 o 3. La diferencia de compresión entre nivel 2 y
nivel 6 es pequeña (~5 %), pero el coste de CPU es notablemente menor. También
puedes aumentar `gzip_min_length` a 1024 para evitar comprimir respuestas
pequeñas.

### "No sé qué archivo está sirviendo mi sitio Nginx"

Ejecuta:

```bash
nginx -T | grep -A 20 'server_name.*tudominio'
```

Eso imprime el bloque `server` que coincide con tu dominio.

---

## 7. Referencias

- [Module ngx_http_gzip_module — Nginx docs](https://nginx.org/en/docs/http/ngx_http_gzip_module.html)
- [Testing gzip compression — Better Stack](https://betterstack.com/community/guides/scaling-nginx/nginx-gzip/)
- [Docker Deployment (este proyecto)](./DOCKER_DEPLOYMENT.md)
- [Arquitectura del proyecto](../README.es.md)

---

> **Resumen**: Con unos 10 minutos y 15 líneas de configuración, puedes reducir
> el ancho de banda de tu VPS entre un 60 % y un 80 %, mejorar la velocidad de
> carga percibida por los usuarios y obtener mejor puntuación en tests de
> rendimiento. La compresión gzip es una de las optimizaciones de más alto
> retorno con el menor esfuerzo.