# Brasaland Incidents API

Backend FastAPI para analizar archivos CSV de incidencias de Brasaland.

## Requisitos

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) como gestor de paquetes
- El servicio **`api-auth`** ejecutándose (emite los tokens JWT necesarios)

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/` | No | Health check básico |
| `GET` | `/health` | No | Health check con estadísticas (caché y persistencia) |
| `POST` | `/api/incidents/analyze` | JWT | Sube un CSV y devuelve el `analysis_id` |
| `GET` | `/api/incidents/results/{analysis_id}` | JWT | Obtiene el análisis completo por ID |
| `GET` | `/api/incidents/results/export?analysis_id=...` | JWT | Exporta resultados como CSV descargable |

### Endpoints públicos

- **`GET /`** → `{"message": "Brasaland Incidents API is running"}`
- **`GET /health`** → Información del estado del servicio, cantidad de análisis en caché y persistidos.

### Endpoints protegidos (requieren autenticación)

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

Obtiene el análisis completo en JSON. El `analysis_id` debe ser un **UUID v4** válido (de lo contrario responde **422**). Si no existe, responde **404**.

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

| Código | Significado |
|--------|-------------|
| 400 | Error de validación (archivo vacío, extensión, CSV inválido, decodificación) |
| 401 | Token JWT faltante, inválido o expirado |
| 403 | Token válido pero sin permisos suficientes |
| 404 | `analysis_id` no encontrado |
| 413 | Archivo excede el tamaño máximo (10 MB) |
| 415 | Tipo de archivo no soportado |
| 422 | `analysis_id` no es un UUID v4 válido |
| 500 | Error interno del servidor (logeado) |
