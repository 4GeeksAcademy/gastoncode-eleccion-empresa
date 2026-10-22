# Brasaland Incidents API

Backend FastAPI para analizar archivos CSV de incidencias de Brasaland.

## Modelo del gestor centralizado

`models.py` define `Incident` con Pydantic, sin cambiar los endpoints del
analizador ni su almacenamiento. `POST /api/incidents` registra incidencias;
la edición general y el borrado quedan pendientes.
`GET /api/incidents` permite consultar las incidencias. El seed descrito abajo incorpora
persistencia local para los registros importados.

- `id`: UUID v4 generado por instancia.
- `title` y `description`: textos obligatorios, no vacíos ni compuestos solo
  por espacios. Se conserva el texto original.
- `category`: obligatorio; `equipment_failure`, `supply_issue`,
  `customer_complaint`, `staff_issue`, `facility_issue`, `pos_system`,
  `delivery_issue` u `other`.
- `status`: `open` (predeterminado), `in_progress`, `resolved` o `discarded`.
- `origin`: obligatorio; `customer`, `branch` o `internal`.
- `branch`: uno de los 14 locales definidos en
  [el contexto del gestor](../../CONTEXT-brasaland.es.md), o `central`
  (predeterminado). El origen `branch` exige un local específico.
- `created_at` y `updated_at`: fechas con zona horaria, generadas en UTC e
  iguales al crear. Se admiten fechas explícitas para recuperar registros o
  importar históricos; se normalizan a UTC y se exige `updated_at >= created_at`.

No se aceptan valores nulos ni campos adicionales. Las instancias son inmutables:
para actualizar se usa `incident.update(...)` y se guarda la nueva instancia
devuelta. Este método revalida los datos, conserva `id` y `created_at` y genera
`updated_at` automáticamente. Permite mantener el estado actual o las transiciones
`open → in_progress`, `open → discarded`, `in_progress → resolved` e
`in_progress → discarded`; no permite reabrir estados finales.
No usar `model_copy(update=...)` para cambios de negocio, porque Pydantic no
valida esos cambios.

```python
from models import Incident

incident = Incident(
    title="Horno fuera de servicio",
    description="El horno principal no enciende.",
    category="equipment_failure",
    origin="branch",
    branch="medellin_centro",
)
incident = incident.update(status="in_progress")
document = incident.model_dump(mode="json")  # UUID y fechas serializables a JSON
```

### Pruebas del modelo

Desde la raíz del monorepo, con las dependencias del servicio disponibles:

```bash
python -m unittest discover -s services/api-incidents/tests -v
```

## Seed de incidencias

Desde la raíz del monorepo, usando Python con las dependencias del servicio:

```bash
python scripts/seed_incidents.py
# Rutas alternativas para una carga local:
python scripts/seed_incidents.py --csv /ruta/incidencias.csv --db /ruta/incidents.json
python -m unittest discover -s scripts/tests -p 'test_seed_incidents.py' -v
```

Por defecto lee `scripts/incidents-brasaland.csv` con soporte UTF-8 BOM y escribe
en `services/api-incidents/incidents.json`, tabla `incidents`, separada de los
análisis CSV existentes. No versionar la base generada.

Por cada fila transforma primero los campos según el contexto, reutiliza
`validate_row` del analizador, valida el modelo `Incident`, comprueba duplicados
y finalmente inserta. Conserva la descripción literal, recorta el título a
120 caracteres y convierte la fecha a medianoche UTC para ambas marcas de tiempo.
Los registros importados tienen origen `customer`.

La idempotencia usa `incident_id` como clave principal, registrada únicamente
en la tabla auxiliar `incident_seed_sources`, no en el documento `Incident`.
Sin identificador se compara `title + created_at`. Conforme al contexto,
se permite ID ausente y se usa `central` para sedes ausentes o desconocidas;
las demás reglas legacy siguen aplicándose, incluida la puntuación obligatoria
para `CLOSED`. Un identificador presente pero inválido se rechaza.

El script informa las filas descartadas sin imprimir descripciones ni datos
de clientes. El resumen incluye filas leídas, insertadas, duplicadas y
descartadas, más conteos por estado y categoría **de las filas insertadas en esa
ejecución**. Los errores de archivo o estructura producen una salida distinta
de cero; las filas inválidas se reportan y no detienen las siguientes.

Ejecutar una sola instancia del seed y sin otros escritores sobre el archivo:
TinyDB no ofrece transacciones entre la inserción y el registro de su clave
legacy ni coordinación entre procesos. Una interrupción entre ambas escrituras
requiere revisar la carga antes de repetirla.

## Requisitos

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) como gestor de paquetes
- El servicio **`api-auth`** ejecutándose (emite los tokens JWT necesarios)

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/` | No | Health check básico |
| `GET` | `/health` | No | Health check con estadísticas (caché y persistencia) |
| `GET` | `/api/incidents` | JWT | Lista incidencias con filtros opcionales |
| `POST` | `/api/incidents` | JWT | Registra una incidencia con estado `open` |
| `GET` | `/api/incidents/summary` | JWT | Totales por estado, categoría, origen y sede |
| `GET` | `/api/incidents/{id}` | JWT | Detalle de una incidencia; 404 si no existe |
| `PATCH` | `/api/incidents/{id}/status` | JWT | Actualiza únicamente el estado |
| `POST` | `/api/incidents/analyze` | JWT | Sube un CSV y devuelve el `analysis_id` |
| `GET` | `/api/incidents/results/{analysis_id}` | JWT | Obtiene el análisis completo por ID |
| `GET` | `/api/incidents/results/export?analysis_id=...` | JWT | Exporta resultados como CSV descargable |

### Endpoints públicos

- **`GET /`** → `{"message": "Brasaland Incidents API is running"}`
- **`GET /health`** → Información del estado del servicio, cantidad de análisis en caché y persistidos.

### Endpoints protegidos (requieren autenticación)

#### `GET /api/incidents`

Devuelve una lista JSON de incidencias de la tabla `incidents` en
`incidents.json`, el mismo destino predeterminado del seed. Sin filtros devuelve
todas; sin coincidencias devuelve `[]`.

Acepta los parámetros opcionales `status`, `origin`, `branch` y `category`,
con los valores permitidos por el modelo `Incident`. Los filtros se combinan
con AND y coincidencia exacta. Un valor no permitido, incluido un parámetro
vacío, devuelve **400**.

Ejemplo: `/api/incidents?status=open&origin=customer&branch=central&category=customer_complaint`.

Los UUID y fechas se serializan como cadenas JSON. La consulta abre el archivo
por solicitud para reflejar cargas del seed completadas sin reiniciar el servicio.
No ejecutar el seed simultáneamente con otros escritores.

#### `POST /api/incidents`

Recibe un JSON con `title`, `description`, `category`, `origin` y `branch`,
todos obligatorios. No acepta otros campos: `id`, `created_at` y `updated_at`
se generan automáticamente y `status` siempre se registra como `open`.
Devuelve **201** con la incidencia creada.

Los datos inválidos devuelven **400** con el campo afectado, por ejemplo
`body.branch` si `origin=branch` y `branch=central`.

#### `GET /api/incidents/summary`

Requiere JWT. Devuelve `total` (cantidad total de incidencias) y los objetos
`by_status`, `by_category`, `by_origin` y `by_branch`, cuyas claves son los
valores del modelo y cuyos valores son conteos enteros. Incluye todos los
valores permitidos, también los que tienen cero incidencias.

Lee la misma tabla `incidents` que el listado y el seed, sin aplicar filtros.
La suma de cada agrupación coincide con `total`. Si la tabla está vacía,
`total` y todos los conteos son cero. Los cambios de estado completados
se reflejan en la siguiente consulta.

#### `GET /api/incidents/{id}`

Devuelve un objeto JSON con todos los campos de `Incident`, consultando la
misma tabla que el listado y el seed. Requiere autenticación JWT.
El identificador debe ser un UUID v4; un formato inválido devuelve **400**.
Si el UUID es válido pero la incidencia no existe, devuelve **404** con
`{"detail": "No se encontro una incidencia con el ID proporcionado."}`.

#### `PATCH /api/incidents/{id}/status`

Requiere JWT y un cuerpo JSON como `{"status": "in_progress"}`. `status` es
obligatorio; no se aceptan otros campos. Devuelve **200** con la incidencia
actualizada y persiste únicamente `status` y `updated_at`.

Reutiliza las transiciones del modelo: `open → in_progress/discarded` e
`in_progress → resolved/discarded`. `resolved` y `discarded` son finales.
Una transición no permitida devuelve **409** sin modificar el registro.
Enviar el estado actual devuelve **200** sin cambios, incluida la fecha.
Un UUID válido inexistente devuelve **404**; un UUID, estado o cuerpo inválido
devuelve **400**.

Las lecturas y actualizaciones de incidencias comparten un lock dentro del
proceso para evitar carreras entre solicitudes. Esta protección no coordina
varios procesos: usar un solo worker y no ejecutar el seed en paralelo.

#### `POST /api/incidents/analyze`

Sube un archivo CSV para analizar. Validaciones aplicadas:

| Validación | Código HTTP | Condición |
|-----------|-------------|-----------|
| Archivo sin nombre | 400 | `filename` vacío |
| Extensión no `.csv` | 415 | Extensión distinta a `.csv` |
| Archivo vacío | 400 | Contenido de 0 bytes |
| Supera 10 MB | 413 | Lectura en chunks con aborto temprano |
| Codificación no UTF-8 | 400 | Error de decodificación |
| CSV inválido / columnas faltantes | 400 | Error de parseo o validación |

Respuesta exitosa (200):

```json
{
  "analysis_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
}
```

#### `GET /api/incidents/results/{analysis_id}`

Obtiene el análisis completo en JSON. El `analysis_id` debe ser un **UUID v4** válido (de lo contrario responde **400**). Si no existe, responde **404**.

#### `GET /api/incidents/results/export?analysis_id=...`

Descarga los resultados como un archivo CSV con cabecera `Content-Disposition: attachment`.

## Formato del CSV de entrada

El archivo debe contener **obligatoriamente** estas columnas:

| Columna | Formato / Validación |
|---------|---------------------|
| `incident_id` | `BRS-` seguido de 6 dígitos (ej: `BRS-000001`) |
| `date` | Fecha en formato `YYYY-MM-DD` |
| `location_id` | Código de ubicación válido (`COL-01`…`COL-10`, `FLA-01`…`FLA-04`) |
| `category` | Una de: `CUSTOMER_COMPLAINT`, `EQUIPMENT`, `SUPPLY`, `FOOD_QUALITY`, `STAFF` |
| `description` | Texto de al menos 5 caracteres |
| `status` | `OPEN`, `CLOSED` o `DISCARDED` |
| `customer_id` | Opcional. Si se informa, debe ser `CLI-` seguido de 6 dígitos |
| `satisfaction_score` | Entero entre 1 y 5. Obligatorio si `status=CLOSED` |
| `reporter_id` | `MGR-` seguido de 2 o más dígitos (ej: `MGR-01`, `MGR-100`) |

El CSV puede incluir **BOM (UTF-8)** al inicio (común en archivos exportados desde Excel).

## Autenticación

Esta API delega la autenticación al servicio **`api-auth`** mediante tokens JWT compartidos.

### Obtener un token

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@brasaland.com&password=secreta"
```

### Usar el token

```bash
curl -X POST http://localhost:8002/api/incidents/analyze \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@incidencias.csv"
```

### Variables de entorno requeridas

| Variable | Descripción |
|----------|-------------|
| `JWT_SECRET` | Secreto compartido con `api-auth` para firmar/verificar tokens JWT |

Sin `JWT_SECRET`, el servidor no arranca.

## Configuración adicional

| Variable | Default | Descripción |
|----------|---------|-------------|
| `CORS_ORIGINS` | `*` | Orígenes CORS permitidos. Múltiples separados por coma. Si se deja vacío, no se permitirá ningún origen. |
| `UVICORN_RELOAD` | `0` | Activar (`1`, `true`, `yes`) recarga automática del servidor al cambiar archivos. |

## Ejecutar

```bash
# Sincronizar dependencias
cd services/api-incidents
uv sync

# Crear archivo .env con JWT_SECRET
echo "JWT_SECRET=mi-secreto-compartido" > .env

# Ejecutar servidor
uv run uvicorn main:app --host 0.0.0.0 --port 8002

# O mediante main.py (lee .env automáticamente)
uv run python main.py
```

> **Nota**: El flag `--reload` se controla con la variable `UVICORN_RELOAD=1` en lugar de pasarse como argumento.

## Arquitectura

```
┌──────────────┐     JWT (Bearer)     ┌──────────────────┐
│   api-auth   │ ◄──────────────────► │  api-incidents   │
│  :8000       │   mismo JWT_SECRET   │  :8002           │
└──────────────┘                      │                  │
                                      │  ┌────────────┐  │
                                      │  │ TinyDB     │  │
                                      │  │ analyses   │  │
                                      │  └────────────┘  │
                                      │  ┌────────────┐  │
                                      │  │ Caché LRU  │  │
                                      │  │ (100 max)  │  │
                                      │  └────────────┘  │
                                      └──────────────────┘
                                              │
                                              ▼
                                   ┌──────────────────┐
                                   │ incidents_analysis│
                                   │ (paquete local)    │
                                   └──────────────────┘
```

## Dependencias

- El paquete local **`packages/incidents_analysis`** se resuelve automáticamente mediante un archivo `.pth` en el virtualenv (`monorepo.pth`).
- Persistencia de análisis vía **TinyDB** (`analyses.json`).
- Caché **LRU** en memoria con **threading.Lock** para acceso rápido thread-safe (máximo 100 análisis).
- Autenticación JWT delegada mediante **`python-jose[cryptography]`** y **`python-dotenv`**.

## Control de errores

Los errores de validación de solicitudes devuelven **400** con una lista de
campos y mensajes, sin incluir los valores recibidos ni detalles internos:

```json
{
  "detail": [
    {"field": "body.status", "message": "Este campo es obligatorio."}
  ]
}
```

Los campos de filtros usan el prefijo `query.`, los identificadores de ruta
`path.` y los campos del cuerpo `body.`. Los errores de contenido del CSV
se identifican como `body.file`; la validación manual del analizador identifica
`analysis_id`. Los errores internos de validación de datos persistidos o de la
respuesta siguen devolviendo **500** genérico, no **400**.

| Código | Significado |
|--------|-------------|
| 400 | Error de validación de campos, UUID, filtros, cuerpo o contenido del CSV |
| 401 | Token JWT faltante, inválido o expirado |
| 403 | Token válido pero sin permisos suficientes |
| 404 | Incidencia o `analysis_id` no encontrado |
| 409 | Transición de estado no permitida |
| 413 | Archivo excede el tamaño máximo (10 MB) |
| 415 | Tipo de archivo no soportado |
| 500 | Error interno del servidor (logeado) |
