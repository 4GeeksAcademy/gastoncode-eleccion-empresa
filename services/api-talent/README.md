# API de talento

Adaptador FastAPI del prototipo de candidaturas. Solo para datos sinteticos:
no usar datos, CV ni notas de personas reales. No almacena candidatos localmente
ni implementa vacantes u onboarding.

## Ejecutar

Requiere Python >=3.12 y uv. Desde la raiz:

```bash
uv sync --project services/api-talent --group test
uv run --directory services/api-talent --no-sync uvicorn main:app --host 127.0.0.1 --port 8004
```

Configurar JWT_SECRET con el mismo valor de api-auth y mantener api-auth
disponible. No publicar secretos. El launcher configura ambos automaticamente.

| Variable | Valor por defecto | Uso |
| --- | --- | --- |
| JWT_SECRET | Sin valor | Verificacion del JWT; sin configurar, solicitudes protegidas devuelven 503 |
| AUTH_SERVICE_URL | http://127.0.0.1:8001 | Identidad vigente mediante /auth/me |
| TRACKER_API_URL | https://playground.4geeks.com/tracker/api/v1 | Proveedor del prototipo, solo en servidor |

El JWT de Brasaland nunca se envia al proveedor. Este proxy no garantiza
privacidad, aislamiento ni permanencia de datos en 4Geeks. Aprobar esas
propiedades o sustituir el proveedor antes de usar datos reales.

## Contrato

El dashboard publica `/api/talent/*`; el servicio recibe `/talent/*`.
Todas las operaciones de dominio requieren cuenta activa con rol admin o manager.

| Metodo | Ruta del servicio | Resultado |
| --- | --- | --- |
| GET | / | Salud del proceso, sin consultar servicios externos |
| GET | /talent/records | {total, page, limit, data}; filtros status, stage y search; page >=1, limit entre 1 y 1000 |
| POST | /talent/records | Candidatura creada, HTTP 201 |
| GET | /talent/records/{id} | Detalle de candidatura |
| PATCH | /talent/records/{id} | Estado y etapa actualizados, HTTP 204 |
| GET | /talent/records/{id}/notes | Lista normalizada de notas |
| POST | /talent/records/{id}/notes | Nota agregada, HTTP 201 |
| DELETE | /talent/records/{id}/notes/{noteId} | Nota eliminada, HTTP 204 |

Estados: received, in_progress, selected, discarded. Etapas: pending, review,
personal_interview, technical_interview, offer_presented. Alta: full_name, email,
phone, position, cv_url y experience_years; linkedin_url es opcional. URLs HTTP/HTTPS,
experiencia entera de 0 a 100 y notas de 1 a 5000 caracteres. PATCH requiere status y stage.

Errores: 401 sesion invalida, 403 rol no permitido, 422 entrada invalida, 503 si
identidad o proveedor no responden y 502 si el proveedor devuelve datos invalidos
o falla su autenticacion. Se conservan 400, 404 y 409 externos con mensajes
genericos. No se devuelven payloads ni detalles internos de errores.

## Pruebas aisladas

```bash
uv run --directory services/api-talent --group test python -m unittest discover -s tests -v
```

TestClient y transportes simulados: no consulta auth real ni 4Geeks y no modifica
bases. Cubre contratos, roles de todas las operaciones, cuenta invalidada, caida
de identidad, validaciones y no reenvio del JWT.