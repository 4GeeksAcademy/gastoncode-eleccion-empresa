# Auditoría de Serialización — API Unified

> **Fecha:** 2026-11-17
> **Objetivo:** Documentar cada endpoint del backend (ruta, método, propósito) y evaluar si utiliza `response_model`, clasificando su estado de serialización.

---

## Leyenda de clasificación

| Estado | Descripción |
|---|---|
| ✅ **Ya serializado** | Tiene `response_model` explícito y el esquema es apropiado. |
| ⚠️ **Parcialmente serializado** | Tiene un modelo de respuesta pero sin `response_model` explícito, o el esquema no cubre todos los campos que necesita el cliente. |
| ❌ **Sin serializar** | Devuelve un `dict` crudo, objeto ORM o TinyDB doc sin tipado. |
| ➖ **Sin contenido (204)** | Endpoint que deliberadamente no retorna cuerpo (204 No Content). |

---

## Módulo: Auth (`/auth`, `/users`, `/profiles`)

### Autenticación — `auth.py` (prefix `/auth`)

| # | Método | Ruta | Propósito | `response_model` | Estado |
|---|---|---|---|---|---|
| 1 | `POST` | `/auth/login` | Iniciar sesión con email+password, devuelve JWT | ❌ No | ❌ **Sin serializar** |
| 2 | `GET` | `/auth/me` | Obtener datos del usuario autenticado + perfil | ❌ No | ❌ **Sin serializar** |
| 3 | `POST` | `/auth/forgot-password` | Enviar email con enlace de restablecimiento | ❌ No | ❌ **Sin serializar** |
| 4 | `POST` | `/auth/reset-password` | Restablecer contraseña mediante token | ❌ No | ❌ **Sin serializar** |
| 5 | `POST` | `/auth/change-password` | Cambiar contraseña (autenticado) | ❌ No | ❌ **Sin serializar** |

**Nota:** Todos los endpoints de auth devuelven `dict` sin validación de salida. Aunque `ForgotPasswordRequest`, `ResetPasswordRequest`, `ChangePasswordRequest` existen como Pydantic *de entrada*, no hay modelos de respuesta. El endpoint `/auth/me` mezcla datos de usuario y perfil en un diccionario sin forma definida.

### Usuarios — `users.py` (prefix `/users`)

| # | Método | Ruta | Propósito | `response_model` | Estado |
|---|---|---|---|---|---|
| 6 | `POST` | `/users` | Registrar un nuevo usuario | ❌ No | ❌ **Sin serializar** |
| 7 | `GET` | `/users` | Listar todos los usuarios (admin/manager) | ❌ No | ❌ **Sin serializar** |
| 8 | `POST` | `/users/display-names` | Obtener nombres mostrables por lista de IDs | ❌ No | ❌ **Sin serializar** |
| 9 | `GET` | `/users/{user_id}` | Obtener un usuario por ID | ❌ No | ❌ **Sin serializar** |
| 10 | `PUT` | `/users/{user_id}` | Actualizar un usuario | ❌ No | ❌ **Sin serializar** |
| 11 | `DELETE` | `/users/{user_id}` | Eliminar un usuario | ❌ No | ❌ **Sin serializar** |

**Nota:** La función helper `public_user(user: dict) -> dict` estandariza la respuesta a 5 campos (`id`, `email`, `is_active`, `role`, `created_at`), pero no hay un modelo Pydantic de respuesta. Los endpoints `POST /users` y `DELETE /users` devuelven `dict` sin estructura definida. `display-names` retorna una lista de diccionarios sin tipado.

### Perfiles — `profiles.py` (prefix `/profiles`)

| # | Método | Ruta | Propósito | `response_model` | Estado |
|---|---|---|---|---|---|
| 12 | `GET` | `/profiles/me` | Obtener el perfil del usuario autenticado | ❌ No | ❌ **Sin serializar** |
| 13 | `PUT` | `/profiles/me` | Actualizar el perfil del usuario autenticado | ❌ No | ❌ **Sin serializar** |

**Nota:** Retornan directamente el documento de TinyDB (`dict` crudo). `ProfileUpdate` existe como modelo de entrada pero no hay modelo de respuesta.

---

## Módulo: Suppliers (`/suppliers`)

### `suppliers/router.py` (prefix `/suppliers`)

| # | Método | Ruta | Propósito | `response_model` | Estado |
|---|---|---|---|---|---|
| 14 | `POST` | `/suppliers` | Crear un nuevo proveedor | `SupplierResponse` | ✅ **Ya serializado** |
| 15 | `GET` | `/suppliers` | Listar todos los proveedores | `list[SupplierResponse]` | ✅ **Ya serializado** |
| 16 | `GET` | `/suppliers/search` | Buscar proveedores por país/categorías | `list[SupplierResponse]` | ✅ **Ya serializado** |
| 17 | `GET` | `/suppliers/{supplier_id}` | Obtener un proveedor por ID | `SupplierResponse` | ✅ **Ya serializado** |
| 18 | `PATCH` | `/suppliers/{supplier_id}/rate` | Actualizar tarifa del proveedor | `SupplierResponse` | ✅ **Ya serializado** |
| 19 | `PATCH` | `/suppliers/{supplier_id}/status` | Actualizar estado del proveedor | `SupplierResponse` | ✅ **Ya serializado** |
| 20 | `DELETE` | `/suppliers/{supplier_id}` | Eliminar un proveedor | ❌ No | ❌ **Sin serializar** |

**Nota:** El módulo Suppliers es el mejor serializado. Todos los endpoints CRUD (excepto DELETE) usan `response_model=SupplierResponse` con `ConfigDict(extra="forbid")`. El DELETE devuelve un `dict` simple (`{"message": "Supplier deleted"}`) — podría beneficiarse de un modelo genérico `MessageResponse`.

---

## Módulo: Incidents (`/api`)

### `incidents/router.py` (prefix `/api`)

| # | Método | Ruta | Propósito | `response_model` | Estado |
|---|---|---|---|---|---|
| 21 | `GET` | `/api/incidents` | Listar incidentes (con filtros opcionales) | ❌ No | ❌ **Sin serializar** |
| 22 | `POST` | `/api/incidents` | Crear un nuevo incidente | ❌ No | ❌ **Sin serializar** |
| 23 | `PATCH` | `/api/incidents/{incident_id}/status` | Actualizar estado del incidente (vía query param) | ❌ No | ❌ **Sin serializar** |
| 24 | `PATCH` | `/api/incidents/{incident_id}` | Actualizar estado del incidente (vía body) | ❌ No | ❌ **Sin serializar** |
| 25 | `DELETE` | `/api/incidents/{incident_id}` | Eliminar un incidente (solo admin) | ❌ No | ❌ **Sin serializar** |
| 26 | `GET` | `/api/incidents/summary` | Obtener resumen estadístico de incidentes | ⚠️ Implícito | ⚠️ **Parcialmente serializado** |
| 27 | `POST` | `/api/incidents/analyze` | Subir CSV para análisis de incidentes | `AnalysisResponse` | ✅ **Ya serializado** |
| 28 | `GET` | `/api/incidents/analyze` | Listar análisis realizados | `list[AnalysisListItem]` | ✅ **Ya serializado** |
| 29 | `GET` | `/api/incidents/analyze/{analysis_id}` | Obtener un análisis por ID | `AnalysisResponse` | ✅ **Ya serializado** |

**Nota:** Los endpoints de incidentes (21–25) devuelven `dict` crudos provenientes de archivos JSON. Aunque `Incident`, `IncidentCreate`, `IncidentStatusUpdate` existen como modelos Pydantic de *entrada*, no se usan para serializar la salida. El GET `/api/incidents/summary` retorna una instancia de `IncidentSummary` (Pydantic) pero sin `response_model` explícito ni return type annotation — FastAPI lo serializa correctamente pero no queda documentado en OpenAPI. Los endpoints de análisis (27–29) están correctamente serializados.

---

## Módulo: Inventory (`/inventory`)

### `inventory/router.py` (prefix `/inventory`)

| # | Método | Ruta | Propósito | `response_model` | Estado |
|---|---|---|---|---|---|
| 30 | `GET` | `/inventory/products` | Listar ingredientes (con stock actual) | `list[IngredientResponse]` | ✅ **Ya serializado** |
| 31 | `POST` | `/inventory/products` | Crear un nuevo ingrediente | `IngredientResponse` | ✅ **Ya serializado** |
| 32 | `GET` | `/inventory/products/{ingredient_id}` | Obtener ingrediente por ID | `IngredientResponse` | ✅ **Ya serializado** |
| 33 | `POST` | `/inventory/orders/inbound` | Registrar entrada de stock (inbound) | `IngredientOrderResponse` | ✅ **Ya serializado** |
| 34 | `POST` | `/inventory/orders/outbound` | Registrar salida de stock (outbound) | `IngredientOrderResponse` | ✅ **Ya serializado** |
| 35 | `GET` | `/inventory/orders` | Listar órdenes (inbound + outbound) | `list[IngredientOrderResponse]` | ✅ **Ya serializado** |

**Nota:** El módulo Inventory está completamente serializado. Todos los endpoints usan `response_model` con esquemas apropiados y `ConfigDict(extra="forbid")`. Los modelos de base de datos son SQLModel, y los de respuesta son Pydantic independientes, lo que garantiza que no se exponen campos internos. Además, la función helper `_ingredient_response` construye correctamente la respuesta incluyendo `current_stock` calculado.

---

## Módulo: Talent (`/talent`)

### `talent/router.py` (prefix `/talent`)

| # | Método | Ruta | Propósito | `response_model` | Estado |
|---|---|---|---|---|---|
| 36 | `GET` | `/talent/records` | Listar registros de candidatos | `RecordsResponse` | ✅ **Ya serializado** |
| 37 | `POST` | `/talent/records` | Crear un nuevo candidato | `CandidateDetail` | ✅ **Ya serializado** |
| 38 | `GET` | `/talent/records/{record_id}` | Obtener un candidato por ID | `CandidateDetail` | ✅ **Ya serializado** |
| 39 | `PATCH` | `/talent/records/{record_id}` | Actualizar un candidato | N/A (204) | ➖ **Sin contenido (204)** |
| 40 | `GET` | `/talent/records/{record_id}/notes` | Listar notas de un candidato | `list[Note]` | ✅ **Ya serializado** |
| 41 | `POST` | `/talent/records/{record_id}/notes` | Agregar una nota a un candidato | ❌ No | ❌ **Sin serializar** |
| 42 | `DELETE` | `/talent/records/{record_id}/notes/{note_id}` | Eliminar una nota de un candidato | N/A (204) | ➖ **Sin contenido (204)** |

**Nota:** Los endpoints GET y POST de records están correctamente serializados. El `PATCH /records/{record_id}` retorna 204 No Content (correcto). Sin embargo, `POST /records/{record_id}/notes` devuelve un `dict` simple (`{"message": "Nota agregada"}`). Los modelos `Note`, `Candidate`, `CandidateDetail`, `RecordsResponse` están bien definidos con `coerce_numbers_to_str=True`.

---

## Health — definidos en `main.py`

| # | Método | Ruta | Propósito | `response_model` | Estado |
|---|---|---|---|---|---|
| 43 | `GET` | `/` | Health check básico | ❌ No | ❌ **Sin serializar** |
| 44 | `GET` | `/health` | Health check detallado | ❌ No | ❌ **Sin serializar** |

**Nota:** Endpoints triviales de salud. Devuelven `dict` fijo con `{"status": "ok", "service": "brasaland-unified-api"}`. Son aceptables como están, pero podrían tener un `HealthResponse` para consistencia.

---

## Resumen General

| Módulo | ✅ Serializados | ⚠️ Parciales | ❌ Sin serializar | ➖ 204 (correcto) | Total endpoints |
|---|---|---|---|---|---|
| **Auth** (`/auth`, `/users`, `/profiles`) | 0 | 0 | 13 | 0 | 13 |
| **Suppliers** (`/suppliers`) | 6 | 0 | 1 | 0 | 7 |
| **Incidents** (`/api`) | 3 | 1 | 5 | 0 | 9 |
| **Inventory** (`/inventory`) | 6 | 0 | 0 | 0 | 6 |
| **Talent** (`/talent`) | 5 | 0 | 1 | 2 | 8 |
| **Health** (`/`, `/health`) | 0 | 0 | 2 | 0 | 2 |
| **Total** | **20** | **1** | **22** | **2** | **45** |

### Estado general
- **✅ Ya serializados:** 20 endpoints (44 %)
- **⚠️ Parcialmente serializados:** 1 endpoint (2 %)
- **❌ Sin serializar:** 22 endpoints (49 %)
- **➖ 204 sin cuerpo (correcto):** 2 endpoints (4 %)

### Observaciones clave

1. **Auth** es el módulo más crítico: 13 endpoints sin ningún tipo de serialización de salida. Los datos de usuario (incluyendo contraseñas hasheadas) nunca se exponen porque la función `public_user()` filtra campos, pero sería más seguro y mantenible tener modelos de respuesta explícitos.

2. **Suppliers** e **Inventory** son los módulos ejemplares: todos los endpoints (salvo DELETE en suppliers) usan `response_model` con esquemas estrictos (`extra="forbid"`).

3. **Incidents** tiene una división clara: los endpoints de análisis (CSV) están bien serializados, pero los endpoints CRUD de incidentes devuelven JSON crudo sin validación de salida.

4. **Talent** delega en un tracker externo. Los endpoints GET están serializados; el `POST /notes` devuelve un mensaje suelto sin modelo.

5. **Recomendación prioritaria:** Crear modelos de respuesta para el módulo **Auth** (especialmente `/auth/me`, `/users` y `/profiles/me`) que son los que más consume el frontend. Luego **Incidents CRUD** y los mensajes sueltos (`DELETE` suppliers, `POST /notes`, health).

---

## Cambios realizados (2026-11-17)

Se implementaron las correcciones de serialización para todos los endpoints sin serializar o parcialmente serializados. A continuación se detallan los cambios por archivo.

### Archivos creados

| Archivo | Contenido |
|---|---|
| `app/modules/schemas.py` | Esquemas compartidos: `MessageResponse` y `HealthResponse` |
| `app/modules/auth/schemas.py` | Esquemas de respuesta para Auth/Users/Profiles: `TokenResponse`, `MeResponse`, `ProfileResponse`, `UserResponse`, `RegisterResponse`, `DisplayNameItem` |

### Archivos modificados

#### 1. `app/modules/auth/auth.py`

| Endpoint | Cambio |
|---|---|
| `POST /auth/login` | Añadido `response_model=TokenResponse` — solo `access_token` + `token_type`, nunca expone email ni password |
| `GET /auth/me` | Añadido `response_model=MeResponse` — devuelve `id`, `email`, `role`, `profile` (objeto anidado `ProfileResponse`) |
| `POST /auth/forgot-password` | Añadido `response_model=MessageResponse` |
| `POST /auth/reset-password` | Añadido `response_model=MessageResponse` |
| `POST /auth/change-password` | Añadido `response_model=MessageResponse` |

**Decisiones de diseño:**
- `TokenResponse` incluye solo `access_token` y `token_type` — nunca el email ni contraseña del usuario.
- `MeResponse` incluye `profile` como objeto anidado `ProfileResponse` completo, porque el frontend necesita nombre, teléfono y dirección del perfil del usuario logueado.
- Los endpoints de contraseña retornan `MessageResponse` genérico para no filtrar información sobre la existencia del email.

#### 2. `app/modules/auth/users.py`

| Endpoint | Cambio |
|---|---|
| `POST /users` | Añadido `response_model=RegisterResponse` con `status_code=201` — devuelve `UserResponse` + `ProfileResponse` planos |
| `GET /users` | Añadido `response_model=list[UserResponse]` — solo `id`, `email`, `is_active`, `role`, `created_at` |
| `POST /users/display-names` | Añadido `response_model=list[DisplayNameItem]` — solo `id` + `display_name` |
| `GET /users/{user_id}` | Añadido `response_model=UserResponse` |
| `PUT /users/{user_id}` | Añadido `response_model=UserResponse` |
| `DELETE /users/{user_id}` | Añadido `response_model=MessageResponse` |

**Decisiones de diseño:**
- `UserResponse` no incluye `hashed_password`, `password_changed_at` ni ningún campo sensible.
- `RegisterResponse` devuelve `user` y `profile` como objetos planos separados (no anidados dentro de user), para que el frontend pueda consumirlos directamente sin desanidar.
- `DisplayNameItem` es una proyección mínima: solo `id` + `display_name`. No se devuelve el objeto de perfil completo porque no se necesita.
- `UserUpdate` (input) permite `password` y `role`, mientras que `UserResponse` (output) nunca los expone.

#### 3. `app/modules/auth/profiles.py`

| Endpoint | Cambio |
|---|---|
| `GET /profiles/me` | Añadido `response_model=ProfileResponse` — devuelve `id`, `user_id`, `name`, `phone`, `address` |
| `PUT /profiles/me` | Añadido `response_model=ProfileResponse` |

**Decisiones de diseño:**
- `ProfileResponse` NO incluye `user_id` como clave foránea expuesta a menos que el cliente lo necesite (sí se incluye porque el frontend puede necesitar correlacionar perfiles).
- `ProfileUpdate` (input) solo permite `name`, `phone`, `address`. No es posible escribir `user_id` ni `id` desde el input.

#### 4. `app/modules/incidents/models.py`

| Cambio | Detalle |
|---|---|
| Se eliminó la clase `Incident` (schema de entrada no usado como modelo de respuesta) | — |
| Se creó `IncidentResponse` como reemplazo | `created_at` y `updated_at` tipados como `float` (Unix timestamp, que es lo que realmente se almacena) |

#### 5. `app/modules/incidents/router.py`

| Endpoint | Cambio |
|---|---|
| `GET /api/incidents` | Añadido `response_model=list[IncidentResponse]` |
| `POST /api/incidents` | Añadido `response_model=IncidentResponse` con `status_code=201` |
| `PATCH /api/incidents/{incident_id}/status` | Añadido `response_model=IncidentResponse` |
| `PATCH /api/incidents/{incident_id}` | Añadido `response_model=IncidentResponse` |
| `DELETE /api/incidents/{incident_id}` | Añadido `response_model=IncidentResponse` |
| `GET /api/incidents/summary` | Añadido `response_model=IncidentSummary` explícito |

**Decisiones de diseño:**
- `IncidentResponse` incluye `resolution_comment` como `Optional[str]` para que sea omitido cuando no exista.
- Los campos `category`, `branch`, `origin`, `status` se devuelven como `str` (no como enum) para coincidir con los valores que el frontend ya espera.
- Se importa `IncidentResponse` en lugar del antiguo `Incident` para no romper otras referencias.

#### 6. `app/modules/suppliers/router.py`

| Endpoint | Cambio |
|---|---|
| `DELETE /suppliers/{supplier_id}` | Añadido `response_model=MessageResponse` |

#### 7. `app/modules/talent/router.py`

| Endpoint | Cambio |
|---|---|
| `POST /talent/records/{record_id}/notes` | Añadido `response_model=MessageResponse` |

#### 8. `app/main.py`

| Endpoint | Cambio |
|---|---|
| `GET /` | Añadido `response_model=HealthResponse` — tipado `status` + `service` |
| `GET /health` | Añadido `response_model=HealthResponse` |

### Resumen del impacto

| Métrica | Antes | Después | Diferencia |
|---|---|---|---|
| Endpoints ✅ Ya serializados | 20 (44 %) | **43 (96 %)** | +23 |
| Endpoints ⚠️ Parciales | 1 (2 %) | **0 (0 %)** | -1 |
| Endpoints ❌ Sin serializar | 22 (49 %) | **0 (0 %)** | -22 |
| Endpoints ➖ 204 (correcto) | 2 (4 %) | **2 (4 %)** | — |

**Total endpoints con `response_model` explícito: 43 de 45 (los 2 restantes son 204 No Content, que es correcto).**

### Principios aplicados

1. **Separación input/output:** Cada endpoint de escritura (POST, PATCH, PUT) tiene un esquema de entrada separado de su esquema de respuesta. Nunca se reutiliza el esquema de respuesta como input.

2. **Proyecciones mínimas:** Los endpoints de listado devuelven solo los campos que los clientes necesitan. Ejemplo: `DisplayNameItem` solo tiene `id` y `display_name`.

3. **Sin exposición de datos sensibles:** `hashed_password`, `password_changed_at`, tokens internos, claves foráneas de sistema (`doc_id` de TinyDB) nunca aparecen en los modelos de respuesta.

4. **Relaciones explícitas:** Cuando se necesita una relación en la respuesta, se decide caso por caso:
   - `/auth/me` → `ProfileResponse` anidado completo (el frontend lo necesita).
   - `/users` → perfil NO incluido; el frontend debe llamar a `/profiles/me` o a `display-names`.
   - `RegisterResponse` → `user` y `profile` como objetos planos separados.

5. **Input validation con `extra="forbid"`:** Todos los modelos de entrada nuevos utilizan `ConfigDict(extra="forbid")` para rechazar campos inesperados.