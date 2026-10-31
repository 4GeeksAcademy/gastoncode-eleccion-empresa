# Brasaland Inventory API

FastAPI service for inventory. TinyDB remains owned by `api-auth`; this API validates JWTs against `/auth/me` and stores only the external auth UUID as `user_uuid`. Products and order history are stored in Supabase PostgreSQL through SQLModel. No users are replicated and stock is never persisted: `current_stock = SUM(entries) - SUM(exits)`.

## Configuration

Set `DATABASE_URL` to the Supabase PostgreSQL connection URI. The service enables `sslmode=require` when no SSL mode was supplied. Set the same `JWT_SECRET` as auth and `AUTH_SERVICE_URL` (defaults to `http://127.0.0.1:8001`). Never commit these values.

## Run

```sh
cd services/api-inventory
uv sync --group test
uv run uvicorn main:app --reload --port 8003
```

Tables are created at startup for this prototype. Use a reviewed migration strategy before applying schema changes to shared/production environments.

## Demo seed

The seed accepts two UUIDs from existing TinyDB auth users at runtime; it never stores them in source:

```sh
uv run python seed.py --inbound-user-uuid <existing-tinydb-uuid> --outbound-user-uuid <existing-tinydb-uuid>
```

It inserts the six required ingredients, four entries, and three exits only when the ingredient table is empty. Falda de ternera stock after seed is 72 kg.

## Routes

All routes are registered under `/inventory`. Reads require authentication; writes require `admin` or `manager`.

- `GET /inventory/products` and `GET /inventory/products/{ingredient_id}`: ingredient plus calculated stock.
- `POST /inventory/products`: create an ingredient (stock is not accepted or stored).
- `POST /inventory/orders/inbound`: add a supplier delivery.
- `POST /inventory/orders/outbound`: record consumption or waste; rejects insufficient stock with HTTP 400.
- `GET /inventory/orders`: combined order history with ingredient names.

Run tests with `uv run pytest` from this directory. Tests use isolated SQLite and mock authenticated users; no Supabase connection is required.
