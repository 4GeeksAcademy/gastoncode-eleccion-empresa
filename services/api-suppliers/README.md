# Suppliers API — Brasaland

API de gestión de proveedores para **Brasaland**, cadena de restaurantes de parrilla con locales en Colombia y Estados Unidos.

Para desarrollo integrado, usar `npm run backoffice:setup` y
`npm run backoffice:dev` desde la raiz. Ver la
[guia de integracion](../../docs/BACKOFFICE_INTEGRATION.es.md).
El lanzador entrega la misma clave JWT a auth y suppliers; no hay clave por defecto.
`AUTH_SERVICE_URL` apunta a auth en el puerto 8001. Suppliers reconsulta
`/auth/me` antes de autorizar y devuelve 503 si no puede validar la identidad.
`SUPPLIERS_DB_PATH` permite datos aislados; por defecto se conserva `db.json`.

---

## Índice

- [Visión general](#visión-general)
- [Ejecución](#ejecución)
- [Autenticación](#autenticación)
- [Roles y permisos](#roles-y-permisos)
- [Categorías de insumos](#categorías-de-insumos)
- [Campos comunes](#campos-comunes)
- [Endpoints](#endpoints)
  - [GET / — Health check](#get----health-check)
  - [GET /suppliers — Listar proveedores](#get-suppliers--listar-proveedores)
  - [GET /suppliers/search — Buscar proveedores](#get-supplierssearch--buscar-proveedores)
  - [GET /suppliers/{id} — Detalle de proveedor](#get-suppliersid--detalle-de-proveedor)
  - [POST /suppliers — Crear proveedor](#post-suppliers--crear-proveedor)
  - [PATCH /suppliers/{id}/rate — Actualizar tarifa](#patch-suppliersidrate--actualizar-tarifa)
  - [PATCH /suppliers/{id}/status — Cambiar estado](#patch-suppliersidstatus--cambiar-estado)
  - [DELETE /suppliers/{id} — Eliminar proveedor](#delete-suppliersid--eliminar-proveedor)
- [Códigos de error](#códigos-de-error)
- [Flujos de uso típicos](#flujos-de-uso-típicos)

---

## Visión general

La API permite al equipo de operaciones de Brasaland gestionar el catálogo completo de proveedores desde una única interfaz. El Departamento de Compras y Proveedores puede consultar, filtrar y actualizar los proveedores de manera práctica y centralizada.

**Alcance operativo:**

- Registrar un nuevo proveedor homologado.
- Consultar proveedores activos.
- Filtrar por categoría de insumo (carne, verduras, bebidas, empaques, limpieza, carbón, etc.).
- Actualizar tarifas cuando se renegocian contratos.
- Suspender proveedores que incumplen entregas.

---

## Dependencias

El proyecto se ejecuta con **Python 3.12** y las siguientes librerías:

| Librería       | Versión | Propósito                                 |
| -------------- | ------- | ----------------------------------------- |
| `fastapi`      | ≥0.141  | Framework web para construir la API REST  |
| `uvicorn`      | ≥0.52   | Servidor ASGI para servir la aplicación   |
| `pydantic`     | ≥2.13   | Validación de esquemas y modelos de datos |
| `tinydb`       | ≥4.9    | Base de datos NoSQL embebida (JSON)       |
| `python-jose`  | ≥3.5    | Codificación y verificación de tokens JWT |
| `python-dotenv`| ≥1.2    | Carga de variables de entorno desde .env  |


---

## Ejecución

### 1. Iniciar el servidor

```bash
# Desde la raíz del repositorio
python -m uvicorn services.api-suppliers.main:app --reload

# O directamente desde services/api-suppliers
cd services/api-suppliers
uvicorn main:app --reload
```

La API queda disponible en `http://localhost:8000`
Documentación interactiva (Swagger): `http://localhost:8000/docs`

### 2. Poblar la base de datos

```bash
# Desde el directorio services/api-suppliers
cd services/api-suppliers
python seed.py

# O desde la raíz del repositorio
python services/api-suppliers/seed.py
```

> **Nota:** La base de datos se crea automáticamente al iniciar el servidor. El seed solo es necesario la primera vez o para reiniciar los datos de ejemplo (15 proveedores). Si la tabla no está vacía, el seed la omite automáticamente.

### 3. Variables de entorno

Fuera del lanzador, define `JWT_SECRET` con la misma clave de auth y
`AUTH_SERVICE_URL=http://localhost:8001`. No hay clave JWT predeterminada.
El lanzador integrado configura ambos valores sin modificar archivos `.env`.

> El `.env` ya está en `.gitignore` para evitar commits accidentales.

---

## Autenticación

Todos los endpoints —excepto el health check (`GET /`)— requieren un token JWT válido. El token debe enviarse en el header `Authorization` con el esquema **Bearer**:

```
Authorization: Bearer <token>
```

### Tokens de prueba

Obtener tokens desde `POST /auth/login` con una cuenta activa real de auth.
Una firma JWT valida no basta: suppliers tambien verifica que la cuenta exista,
este activa y conserve el rol necesario en `/auth/me`.

El JWT se valida con **HS256** y la clave compartida. El rol y el estado
efectivos se consultan en auth, no se toman como actuales por estar en el token.

---

## Roles y permisos

La API implementa control de acceso basado en roles (RBAC). Cada usuario autenticado tiene un `role` que determina qué operaciones puede realizar:

| Rol       | Lectura (GET) | Escritura (POST/PATCH/DELETE) |
| --------- | :-----------: | :---------------------------: |
| `admin`   | ✅            | ✅                            |
| `manager` | ✅            | ✅                            |
| *otros*   | ✅            | ❌ (403 Forbidden)            |

- **Usuarios sin rol o con rol desconocido:** pueden consultar (GET) pero reciben **403 Forbidden** al intentar crear, modificar o eliminar.
- **Lectura pública protegida:** todos los GET requieren token válido; si el token falta o es inválido se devuelve **401 Unauthorized**.

---

## Categorías de insumos

Brasaland clasifica a sus proveedores según el tipo de insumo que suministran:

| Categoría                 | Descripción                                |
| ------------------------- | ------------------------------------------ |
| `carne`                   | Res, cerdo, pollo — insumo principal       |
| `verduras_y_hortalizas`   | Verduras frescas para guarniciones         |
| `salsas_y_condimentos`    | Salsas, aderezos, especias                 |
| `bebidas`                 | Gaseosas, jugos, aguas                     |
| `lacteos`                 | Quesos, cremas, leche                      |
| `packaging`               | Cajas, bolsas, servilletas, envases        |
| `productos_limpieza`      | Insumos de limpieza e higiene              |
| `carbon_y_combustible`    | Carbón para parrillas, combustible         |

---

## Campos comunes

### SupplierCreateInput / SupplierResponse

| Campo           | Tipo                          | Obligatorio | Descripción                                              |
| --------------- | ----------------------------- | ----------- | -------------------------------------------------------- |
| `name`          | `string`                      | Sí          | Nombre del proveedor                                     |
| `country`       | `"Colombia" \| "USA"`         | Sí          | País de operación                                        |
| `categories`    | `string[]` (ver lista arriba) | Sí          | Categorías de insumos que suministra. Mínimo 1.          |
| `rate_per_unit` | `number > 0`                  | Sí          | Tarifa por unidad                                         |
| `currency`      | `"COP" \| "USD"`              | Sí          | Moneda de la tarifa                                      |
| `status`        | `"active" \| "suspended"`     | Sí          | Estado operativo                                         |
| `contact_email` | `string \| null`              | No          | Correo de contacto                                       |
| `notes`         | `string \| null`              | No          | Observaciones (horarios, condiciones, alertas)           |
| `updated_at`    | `string \| null`              | No          | Timestamp ISO 8601 de última actualización (solo respuesta) |

---

## Endpoints

### `GET /` — Health check

Verifica que la API esté operativa.

**Respuesta 200:**

```json
{
  "message": "API working"
}
```

---

### `GET /suppliers` — Listar proveedores

> 🔒 Requiere autenticación · **Cualquier rol**

Devuelve el catálogo completo de proveedores registrados.

**Respuesta 200:**

```json
[
  {
    "id": 1,
    "name": "Carnes del Valle S.A.S.",
    "country": "Colombia",
    "categories": ["carne"],
    "rate_per_unit": 28500.0,
    "currency": "COP",
    "status": "active",
    "contact_email": "ventas@carnesdelvalle.co",
    "notes": "Proveedor principal de res y cerdo para Medellín. Entrega martes y viernes.",
    "updated_at": null
  }
]
```

---

### `GET /suppliers/search` — Buscar proveedores

> 🔒 Requiere autenticación · **Cualquier rol**

Filtra proveedores por país y/o categorías. Útil para que cada local encuentre rápidamente a sus proveedores habilitados.

**Parámetros query** (todos opcionales):

| Parámetro    | Tipo     | Ejemplo                          | Descripción                                             |
| ------------ | -------- | -------------------------------- | ------------------------------------------------------- |
| `country`    | `string` | `Colombia`                       | Filtrar por país                                        |
| `categories` | `string` | `carne,bebidas`                  | Filtrar por una o más categorías separadas por coma     |

> **Multi-categoría:** El parámetro `categories` acepta múltiples valores separados por coma (ej. `carne,bebidas`). El filtro devuelve proveedores que coincidan con **al menos una** de las categorías indicadas (OR lógico).

**Ejemplos de uso:**

```bash
# Proveedores colombianos de carne
GET /suppliers/search?country=Colombia&categories=carne

# Proveedores de carne o bebidas en cualquier país
GET /suppliers/search?categories=carne,bebidas

# Todos los proveedores de empaques (sin importar país)
GET /suppliers/search?categories=packaging

# Solo proveedores en USA
GET /suppliers/search?country=USA

# Sin filtros — equivale a GET /suppliers
GET /suppliers/search
```

**Respuesta 200:**

```json
[
  {
    "id": 1,
    "name": "Carnes del Valle S.A.S.",
    "country": "Colombia",
    "categories": ["carne"],
    "rate_per_unit": 28500.0,
    "currency": "COP",
    "status": "active",
    "contact_email": "ventas@carnesdelvalle.co",
    "notes": "Proveedor principal de res y cerdo para Medellín. Entrega martes y viernes.",
    "updated_at": null
  }
]
```

---

### `GET /suppliers/{supplier_id}` — Detalle de proveedor

> 🔒 Requiere autenticación · **Cualquier rol**

Obtiene la información completa de un proveedor por su ID.

**Parámetros ruta:**

| Parámetro      | Tipo  | Ejemplo |
| -------------- | ----- | ------- |
| `supplier_id`  | `int` | `1`     |

**Respuesta 200:**

```json
{
  "id": 1,
  "name": "Carnes del Valle S.A.S.",
  "country": "Colombia",
  "categories": ["carne"],
  "rate_per_unit": 28500.0,
  "currency": "COP",
  "status": "active",
  "contact_email": "ventas@carnesdelvalle.co",
  "notes": "Proveedor principal de res y cerdo para Medellín. Entrega martes y viernes.",
  "updated_at": null
}
```

**Respuesta 404:**

```json
{
  "detail": "Supplier not found"
}
```

---

### `POST /suppliers` — Crear proveedor

> 🔒 Requiere autenticación · **Roles:** `admin` o `manager`

Registra un nuevo proveedor en el sistema. Brasaland lo usa cuando un restaurante incorpora un nuevo aliado comercial.

**Body (application/json):**

```json
{
  "name": "Avícola del Campo",
  "country": "Colombia",
  "categories": ["carne"],
  "rate_per_unit": 15200.0,
  "currency": "COP",
  "status": "active",
  "contact_email": "contacto@avicolacampo.co",
  "notes": "Proveedor de pollo. Entrega lunes y jueves."
}
```

**Respuesta 200:**

```json
{
  "id": 16,
  "name": "Avícola del Campo",
  "country": "Colombia",
  "categories": ["carne"],
  "rate_per_unit": 15200.0,
  "currency": "COP",
  "status": "active",
  "contact_email": "contacto@avicolacampo.co",
  "notes": "Proveedor de pollo. Entrega lunes y jueves.",
  "updated_at": "2026-08-19T12:00:00+00:00"
}
```

> El campo `updated_at` se asigna automáticamente al momento de creación.

**Respuesta 422 (error de validación):**

```json
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "name"],
      "msg": "Field required",
      "input": null
    }
  ]
}
```

> FastAPI/Pydantic devuelve automáticamente errores 422 con el detalle de cada campo que falla, incluyendo tipo de error, ubicación y mensaje.

---

### `PATCH /suppliers/{supplier_id}/rate` — Actualizar tarifa

> 🔒 Requiere autenticación · **Roles:** `admin` o `manager`

Actualiza únicamente la tarifa por unidad de un proveedor. Brasaland lo usa cuando se renegocia un contrato o cambia el precio de mercado del insumo.

**Parámetros ruta:**

| Parámetro      | Tipo  | Ejemplo |
| -------------- | ----- | ------- |
| `supplier_id`  | `int` | `1`     |

**Body (application/json):**

```json
{
  "rate_per_unit": 31000.0
}
```

**Respuesta 200:**

```json
{
  "id": 1,
  "name": "Carnes del Valle S.A.S.",
  "country": "Colombia",
  "categories": ["carne"],
  "rate_per_unit": 31000.0,
  "currency": "COP",
  "status": "active",
  "contact_email": "ventas@carnesdelvalle.co",
  "notes": "Proveedor principal de res y cerdo para Medellín. Entrega martes y viernes.",
  "updated_at": "2026-08-19T12:05:00+00:00"
}
```

> El campo `updated_at` se actualiza automáticamente reflejando la fecha y hora del cambio.

**Respuesta 404:**

```json
{
  "detail": "Supplier not found"
}
```

---

### `PATCH /suppliers/{supplier_id}/status` — Cambiar estado

> 🔒 Requiere autenticación · **Roles:** `admin` o `manager`

Activa o suspende un proveedor. Brasaland lo usa cuando un proveedor incumple entregas (pasa a `suspended`) o cuando se levanta una suspensión tras regularizar la situación.

**Parámetros ruta:**

| Parámetro      | Tipo  | Ejemplo |
| -------------- | ----- | ------- |
| `supplier_id`  | `int` | `7`     |

**Body (application/json):**

```json
{
  "status": "suspended"
}
```

**Respuesta 200:**

```json
{
  "id": 7,
  "name": "Limpiahogar Profesional",
  "country": "Colombia",
  "categories": ["productos_limpieza"],
  "rate_per_unit": 7600.0,
  "currency": "COP",
  "status": "suspended",
  "contact_email": "limpiahogar@promail.co",
  "notes": "Suspendido por incumplimiento en entregas. En revisión por Lucía.",
  "updated_at": "2026-08-19T12:10:00+00:00"
}
```

> El cambio de estado también actualiza `updated_at` automáticamente.

**Respuesta 404:**

```json
{
  "detail": "Supplier not found"
}
```

---

### `DELETE /suppliers/{supplier_id}` — Eliminar proveedor

> 🔒 Requiere autenticación · **Roles:** `admin` o `manager`

Elimina un proveedor del sistema. Esta operación es definitiva, por lo que Brasaland la usa solo cuando un proveedor ya no trabaja con la cadena y no se espera que vuelva.

**Parámetros ruta:**

| Parámetro      | Tipo  | Ejemplo |
| -------------- | ----- | ------- |
| `supplier_id`  | `int` | `16`    |

**Respuesta 200:**

```json
{
  "message": "Supplier deleted",
  "id": 16
}
```

**Respuesta 404:**

```json
{
  "detail": "Supplier not found"
}
```

---

## Códigos de error

| Código | Significado                     | Cuándo ocurre                                      |
| ------ | ------------------------------- | -------------------------------------------------- |
| 200    | OK                              | Operación exitosa                                  |
| 401    | No autorizado                   | Token JWT faltante, inválido o expirado            |
| 403    | Prohibido                       | Token válido pero el rol no tiene permisos         |
| 404    | No encontrado                   | El `supplier_id` no existe en la base de datos      |
| 422    | Error de validación             | Datos inválidos en el body (Pydantic validation)    |
| 500    | Error interno                   | Fallo inesperado del servidor (contactar al equipo técnico) |

### Errores de autenticación

**401 Unauthorized** — Token faltante o inválido:

```json
{
  "detail": "Not authenticated"
}
```

```json
{
  "detail": "Token inválido o expirado"
}
```

**403 Forbidden** — Sin permisos suficientes:

```json
{
  "detail": "No posees los permisos necesarios para realizar esta acción"
}
```

> FastAPI devuelve errores **422** automáticamente con el detalle del campo que falló cuando el payload no cumple con el esquema definido. Los errores **401** y **403** son intencionales y provienen del módulo de autenticación.

---

## Esquema de la base de datos

La API utiliza **TinyDB** —una base de datos NoSQL embebida en JSON— almacenada en el archivo `db.json`. Cada proveedor se guarda como un documento en la tabla `suppliers`.

### Estructura del documento

```json
{
  "name": "Carnes del Valle S.A.S.",
  "country": "Colombia",
  "categories": ["carne"],
  "rate_per_unit": 28500.0,
  "currency": "COP",
  "status": "active",
  "contact_email": "ventas@carnesdelvalle.co",
  "notes": "Proveedor principal de res y cerdo para Medellín. Entrega martes y viernes.",
  "updated_at": "2026-10-02T22:30:42.193121+00:00"
}
```

> TinyDB asigna automáticamente un `doc_id` numérico (comienza en 1) que la API expone como `id`. La tabla `suppliers` se crea en el primer acceso.

---

## Flujos de uso típicos

### 👤 Como encargado de compras (rol `manager`)

```bash
# 1. Obtener token (simulado — en producción lo entrega el servicio de auth)
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."

# 2. Ver todos los proveedores activos
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/suppliers

# 3. Buscar proveedores colombianos de carne
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8000/suppliers/search?country=Colombia&categories=carne'

# 4. Buscar proveedores de bebidas o lácteos
curl -H "Authorization: Bearer $TOKEN" \
  'http://localhost:8000/suppliers/search?categories=bebidas,lacteos'

# 5. Ver detalle de un proveedor
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/suppliers/1

# 6. Crear un nuevo proveedor
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Avícola del Campo",
    "country": "Colombia",
    "categories": ["carne"],
    "rate_per_unit": 15200.0,
    "currency": "COP",
    "status": "active",
    "contact_email": "contacto@avicolacampo.co",
    "notes": "Proveedor de pollo. Entrega lunes y jueves."
  }' \
  http://localhost:8000/suppliers

# 7. Actualizar tarifa tras renegociación
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rate_per_unit": 31000.0}' \
  http://localhost:8000/suppliers/1/rate

# 8. Suspender proveedor por incumplimiento
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "suspended"}' \
  http://localhost:8000/suppliers/7/status

# 9. Eliminar proveedor que ya no trabaja con la cadena
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/suppliers/16
```

### 🔐 Errores comunes de autenticación

```bash
# Sin token — 401
curl http://localhost:8000/suppliers
# → {"detail":"Not authenticated"}

# Token inválido — 401
curl -H "Authorization: Bearer token-invalido" http://localhost:8000/suppliers/1
# → {"detail":"Token inválido o expirado"}

# Token válido pero sin permisos de escritura — 403
curl -X DELETE -H "Authorization: Bearer $TOKEN_READONLY" http://localhost:8000/suppliers/1
# → {"detail":"No posees los permisos necesarios para realizar esta acción"}
```

---

*Documentación generada a partir del código fuente de la aplicación. Todas las rutas, payloads y códigos de respuesta reflejan el contrato real del servicio.*