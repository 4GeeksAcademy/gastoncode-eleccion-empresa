# Suppliers API — Brasaland

API de gestión de proveedores para **Brasaland**, cadena de restaurantes de parrilla con locales en Colombia y Estados Unidos.

---

## Índice

- [Visión general](#visión-general)
- [Ejecución](#ejecución)
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

| Librería                            | Versión | Propósito                                  |
| ----------------------------------- | ------- | ------------------------------------------ |
| `fastapi`                           | ≥0.141  | Framework web para construir la API REST   |
| `uvicorn`                           | ≥0.52   | Servidor ASGI para servir la aplicación    |
| `pydantic`                          | ≥2.13   | Validación de esquemas y modelos de datos  |
| `pydantic_core`                     | ≥2.46   | Core de Pydantic (validaciones internas)   |
| `starlette`                         | ≥1.6    | Base sobre la que corre FastAPI            |
| `tinydb`                            | ≥4.9    | Base de datos NoSQL embebida (JSON)        |
| `email_validator`                   | ≥2.3    | Validación de correos electrónicos         |
| `idna`                              | ≥3.18   | Resolución de dominios IDN (email)         |
| `typing_extensions`                 | ≥4.16   | Utilidades adicionales de tipado           |


---

## Ejecución

```bash
# Desde la raíz del repositorio
python -m uvicorn services.api.main:app --reload

# La API queda disponible en
http://localhost:8000

# Documentación interactiva (OpenAPI / Swagger)
http://localhost:8000/docs

# Poblar base de datos con datos de base
python -m services.api.seed
```

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

Filtra proveedores por país y/o categoría. Útil para que cada local encuentre rápidamente a sus proveedores habilitados.

**Parámetros query** (todos opcionales):

| Parámetro    | Tipo     | Ejemplo              | Descripción                                      |
| ------------ | -------- | -------------------- | ------------------------------------------------ |
| `country`    | `string` | `Colombia`           | Filtrar por país                                 |
| `categories` | `string` | `carne`              | Filtrar por categoría (match si alguna coincide) |

**Ejemplos de uso:**

```bash
# Proveedores colombianos de carne
GET /suppliers/search?country=Colombia&categories=carne

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

**Respuesta 201:**

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

---

### `PATCH /suppliers/{supplier_id}/rate` — Actualizar tarifa

Actualiza únicamente la tarifa por unidad de un proveedor. Brasaland lo usa cuando se renegocia un contrato o cambia el precio de mercado del insumo. Solo se envía el campo que se desea modificar.

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
| 404    | No encontrado                   | El `supplier_id` no existe en la base de datos      |
| 422    | Error de validación             | Datos inválidos en el body (Pydantic validation)    |

> FastAPI devuelve errores 422 automáticamente con el detalle del campo que falló cuando el payload no cumple con el esquema definido.

---

*Documentación generada a partir del esquema OpenAPI de la aplicación. Todas las rutas, payloads y códigos de respuesta reflejan el contrato real del servicio.*