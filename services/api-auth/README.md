# API de autenticación

Servicio REST construido con FastAPI para registrar usuarios, iniciar sesión y gestionar los perfiles asociados. La autenticación usa tokens JWT y los datos se persisten en una base TinyDB local.

## Requisitos

- Python `>=3.14` (según `pyproject.toml`).
- Dependencias instaladas con `uv` o `pip`.
- Una variable `JWT_SECRET` definida antes de iniciar el servicio.

## Puesta en marcha

Desde este directorio (`services/api-auth`):

```bash
# Con uv, usando el lockfile del servicio
uv sync
export JWT_SECRET="cambia-esta-clave-en-desarrollo"
uv run uvicorn main:app --reload
```

Con un entorno virtual existente:

```bash
pip install -e .
export JWT_SECRET="cambia-esta-clave-en-desarrollo"
python -m uvicorn main:app --reload
```

El servicio queda disponible en `http://localhost:8000`.

### Configuración

| Variable | Obligatoria | Valor por defecto | Descripción |
| --- | --- | --- | --- |
| `JWT_SECRET` | Sí | Sin valor | Clave usada para firmar y validar los JWT. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `30` | Duración del token de acceso en minutos. |

La aplicación carga también un archivo `.env` situado en el directorio de trabajo desde el que se ejecuta.

## Documentación interactiva

FastAPI expone automáticamente:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Esquema OpenAPI: `http://localhost:8000/openapi.json`

## Persistencia

TinyDB crea el archivo `data/db.json` relativo al directorio de este servicio. Las tablas utilizadas son:

- `users`: identificador, email, hash de contraseña, estado, rol y fecha de creación.
- `profiles`: perfil vinculado mediante `user_id`, con nombre, teléfono y dirección.

El servicio crea el directorio `data` automáticamente al arrancar. Las contraseñas nunca se devuelven: se almacenan como hashes bcrypt.

## Autenticación y autorización

1. Registrar un usuario con `POST /users`.
2. Iniciar sesión con `POST /auth/login`, enviando el email en el campo OAuth2 `username`.
3. Enviar el token recibido en las rutas protegidas:

```http
Authorization: Bearer <access_token>
```

El JWT contiene `sub` (ID de usuario), `email`, `role` y `exp`. Los roles disponibles son `admin`, `manager` y `user`.

| Operación | Sin token | Usuario autenticado | Admin |
| --- | --- | --- | --- |
| Registrar usuario | Sí | Sí | Sí |
| Iniciar sesión | Sí | Sí | Sí |
| Consultar o editar el propio perfil | No | Sí | Sí |
| Listar usuarios | No | Sí | Sí |
| Consultar, editar o eliminar un usuario | No | Solo el propio usuario | Cualquier usuario |
| Cambiar el rol de un usuario | No | No | Sí |

## Endpoints

### `GET /`

Comprobación sencilla de disponibilidad.

**Respuesta `200 OK`:**

```json
{
	"message": "API funcionando"
}
```

### `POST /users` — Registrar usuario

No requiere autenticación. El usuario se crea con rol `user` y estado activo, y se crea su perfil en la misma operación.

**Body (`application/json`):**

```json
{
	"email": "ana@example.com",
	"password": "una-clave-segura",
	"name": "Ana Pérez",
	"phone": "+57 300 000 0000",
	"address": "Bogotá"
}
```

`email` y `password` son obligatorios. `name`, `phone` y `address` son opcionales.

**Respuesta `200 OK`:**

```json
{
	"user": {
		"id": "2a1c7f2e-5a6a-4d52-9e0d-1a2b3c4d5e6f",
		"email": "ana@example.com",
		"is_active": true,
		"role": "user",
		"created_at": "2026-09-14T12:00:00+00:00"
	},
	"profile": {
		"id": "3b2d8e3f-6b7b-4e63-af1e-2b3c4d5e6f70",
		"user_id": "2a1c7f2e-5a6a-4d52-9e0d-1a2b3c4d5e6f",
		"name": "Ana Pérez",
		"phone": "+57 300 000 0000",
		"address": "Bogotá"
	}
}
```

**Errores:** `400` si el email ya está registrado; `422` si el cuerpo no cumple el esquema.

### `POST /auth/login` — Iniciar sesión

Recibe `application/x-www-form-urlencoded` mediante el flujo OAuth2 Password. Aunque el campo se llama `username`, debe contener el email.

```bash
curl -X POST http://localhost:8000/auth/login \
	-H "Content-Type: application/x-www-form-urlencoded" \
	-d "username=ana@example.com&password=una-clave-segura"
```

**Respuesta `200 OK`:**

```json
{
	"access_token": "eyJhbGciOiJIUzI1NiIs...",
	"token_type": "bearer"
}
```

**Errores:** `401` si el email o la contraseña son incorrectos.

### `GET /auth/me` — Usuario actual

Requiere Bearer token. Devuelve los datos públicos del usuario y su perfil.

```bash
curl http://localhost:8000/auth/me \
	-H "Authorization: Bearer <access_token>"
```

**Errores:** `401` si falta el token, es inválido o está expirado, o si el usuario ya no existe.

### `GET /profiles/me` — Consultar perfil propio

Requiere autenticación y devuelve `id`, `user_id`, `name`, `phone` y `address`.

**Errores:** `401` sin un token válido; `404` si no existe el perfil.

### `PUT /profiles/me` — Editar perfil propio

Requiere autenticación. Todos los campos son opcionales; los campos omitidos no se modifican.

```bash
curl -X PUT http://localhost:8000/profiles/me \
	-H "Authorization: Bearer <access_token>" \
	-H "Content-Type: application/json" \
	-d '{"name":"Ana María Pérez","phone":"+57 301 000 0000"}'
```

**Body (`application/json`):** `name`, `phone` y `address`, todos de tipo `string` y opcionales.

### `GET /users` — Listar usuarios

Requiere autenticación. Devuelve una lista de usuarios públicos. Actualmente cualquier usuario autenticado puede consultar la lista; no se filtra por rol.

### `GET /users/{user_id}` — Consultar usuario

Requiere autenticación. Un usuario puede consultar su propio registro y un admin puede consultar cualquiera.

**Errores:** `403` si no es el propietario ni admin; `404` si el usuario no existe.

### `PUT /users/{user_id}` — Editar usuario

Requiere autenticación y autorización de propietario o admin.

**Body (`application/json`):**

```json
{
	"email": "nuevo-email@example.com",
	"password": "nueva-clave",
	"role": "manager",
	"is_active": true
}
```

Todos los campos son opcionales. Solo un admin puede cambiar `role`; los roles permitidos son `admin`, `manager` y `user`. El cambio de contraseña vuelve a generar el hash bcrypt.

**Errores:** `400` si el email ya pertenece a otro usuario; `403` si no tiene permiso o intenta cambiar un rol sin ser admin; `422` si el body no es válido.

### `DELETE /users/{user_id}` — Eliminar usuario

Requiere autenticación y autorización de propietario o admin. Elimina el usuario y su perfil asociado.

**Respuesta `200 OK`:**

```json
{
	"message": "Usuario eliminado"
}
```

**Errores:** `403` si no tiene permiso; `404` si el usuario no existe.

## Errores comunes

| Código | Situación |
| --- | --- |
| `400` | Email duplicado o credenciales de registro no aceptables. |
| `401` | Falta el token, el JWT es inválido/expiró o las credenciales de login no coinciden. |
| `403` | El usuario autenticado no tiene permisos para el recurso. |
| `404` | Usuario o perfil inexistente. |
| `422` | Error de validación de FastAPI/Pydantic. |

Las respuestas de error siguen el formato habitual de FastAPI:

```json
{
	"detail": "Descripción del error"
}
```

## CORS

La configuración actual permite cualquier origen, método y cabecera (`allow_origins=["*"]`). Antes de publicar el servicio, conviene sustituir esta configuración por una lista explícita de orígenes confiables.
