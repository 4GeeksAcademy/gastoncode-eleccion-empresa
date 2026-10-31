# Brasaland Digital

Brasaland Digital is a monorepo of web interfaces, APIs, and operational tools for modernizing the restaurant chain’s internal workflows. It currently includes a coordinated backoffice for authentication, supplier management, incident handling, and inventory management, plus separate prototypes and utilities for talent tracking, CSV analysis, and inventory replenishment.

This repository contains working prototypes, not a production-ready unified platform. The applications and APIs remain separate: auth, suppliers, and incidents use local TinyDB files, while the inventory API uses PostgreSQL in Supabase.

## What’s included

- **Integrated backoffice:** dashboard and account management, supplier catalog, incident registration and summaries, CSV incident analysis, and inventory management (products/stock, inbound/outbound movements, and order history). The launcher starts four APIs (auth, suppliers, incidents, inventory) and five UIs (dashboard, suppliers, incident manager, incident analyzer, inventory).
- **Backend APIs:** FastAPI services for authentication, suppliers, incidents, and inventory. Authentication uses JWT; each API enforces its own authorization checks. Inventory stores products and movements in Supabase PostgreSQL and derives stock from those movements.
- **Talent pipeline tracker:** a separate Next.js interface; it is not started by the integrated backoffice launcher.
- **Inventory replenishment planner:** a deterministic local CSV tool that suggests quantities for human review. It does not forecast demand, select suppliers, or submit orders.
- **Static website prototypes, shared UI/types/utilities, data and analysis packages, scripts, and project documentation.**

The repository does not yet provide an operational database shared across all domains, a unified deployment, or an integrated sales and telemetry pipeline. See [project status](./memory-bank/progress.md) and the [architecture proposal](./docs/ARCHITECTURE_PROPOSAL.md) for current scope and future plans.

## Requirements

- Node.js 22 or later and npm.
- [uv](https://docs.astral.sh/uv/) for Python environments.
- Python 3.14 or later for `api-auth`; Python 3.12 or later for `api-suppliers`, `api-incidents`, and `api-inventory`.

Python environments are managed separately for each API. The integrated development launcher supplies a shared local `JWT_SECRET`; it does not write a `.env` file. For a standalone service setup, configure its required environment variables as described in that service’s README.

## Start the integrated backoffice

From the repository root:

```bash
npm run backoffice:setup
npm run backoffice:dev
```

Open **<http://localhost:3000>**. The dashboard is the public origin for the integrated experience and shared session:

- `/` — dashboard and account access
- `/suppliers` — supplier management
- `/incidents-manager` — incident registration and summary
- `/incidents-analyzer` — upload and analyze incident CSV files
- `/inventory-management` — protected inventory pages: products, inbound orders, outbound orders, and order history

The launcher starts nine processes and requires ports **3000, 3001, 3002, 3004, 3005, 8000, 8001, 8002, and 8003** to be free. Port 3005 serves the inventory UI behind the dashboard rewrite; port 8003 serves its API. Stop it with `Ctrl+C`; if one process exits unexpectedly, the launcher stops the group. Do not access the separate UI ports directly when you need the dashboard’s shared session.

`backoffice:setup` installs the npm workspace and syncs all four API environments. It does not seed or replace application data. By default, local TinyDB files are retained between runs. Inventory requires `DATABASE_URL` for its Supabase PostgreSQL database; keep it in the root environment (for example, `.env`) or process environment and never commit or publish it. TLS is required by default. The launcher’s local JWT secret storage is for development only, not production secret management.

To check that the integrated services and selected dashboard proxies respond while the stack is running:

```bash
npm run backoffice:check
```

The check is not a substitute for functional tests or a permissions review. For persistent data, first-admin setup, port details, session behavior, and operational cautions, see the [integrated backoffice guide](./docs/BACKOFFICE_INTEGRATION.es.md).

### Create the first administrator

1. Start the integrated backoffice and register an account at `/register`.
2. Stop the processes with `Ctrl+C`.
3. Promote that existing account while the APIs are stopped:

   ```bash
   npm run backoffice:admin -- user@example.com
   ```

4. Restart the backoffice and sign in.

This command does not create an account. Access to the local terminal and data files is equivalent to administrative access.

## Run individual interfaces

The following root scripts start only their respective Next.js interfaces; they do **not** start the APIs they depend on:

```bash
npm run dev:dashboard
npm run dev:suppliers
npm run dev:incidents
npm run dev:incidents-manager
npm run dev:inventory-management
npm run dev:talent
```

The talent tracker runs on port 3003 and is not part of the integrated dashboard/session. For the usual integrated workflow, use `npm run backoffice:dev` instead. Each UI and API has its own README with standalone configuration and details.

## Tests and quality checks

Root workspace scripts are available for build and lint:

```bash
npm run build
npm run lint
```

Examples of focused test commands from the repository root:

```bash
# Integrated launcher and dashboard/API client tests
node --test scripts/backoffice.test.mjs uis/backoffice/dashboard-backoffice/tests/auth-api.test.mjs uis/backoffice/incidents-analyzer/tests/incidents-api.test.mjs uis/backoffice/incidents-manager/tests/incidents-api.test.mjs

# Authentication API logic tests (pytest; run from the service directory)
uv sync --project services/api-auth --group test
cd services/api-auth
uv run pytest
cd ../..

# Shared auth and inventory TypeScript tests
npx jest --coverage

# Incidents API tests (PYTHONPATH is needed for the local analysis package)
uv sync --project services/api-incidents --group test
PYTHONPATH="$PWD" uv run --project services/api-incidents --group test -- python -m unittest discover -s services/api-incidents/tests -v

# Inventory replenishment planner tests
python3 -m unittest discover -s .agents/skills/replenishment-planner/tests -v

# Inventory API unit tests (uses isolated SQLite; no Supabase writes)
uv sync --project services/api-inventory --group test
uv run --directory services/api-inventory --group test pytest
```

For browser tests, start the relevant UI(s) first and use `node scripts/browser-tests.mjs`; the runner installs Playwright and Chromium in a temporary location. See [`scripts/README.es.md`](./scripts/README.es.md) and the [integration guide](./docs/BACKOFFICE_INTEGRATION.es.md) for test prerequisites and isolation guidance.

See [`TESTING.md`](./TESTING.md) for focused test commands and setup details. Jest covers `uis/backoffice/auth-shared` and the inventory API client/stock helpers.

## Repository map

```text
.
├── agents/                         # Agent templates and tool guidance
├── data/                           # Raw, processed, pipeline, and evaluation data areas
├── docs/                           # Architecture and integration documentation
├── packages/                       # Python analysis package and shared package areas
├── scripts/                        # Backoffice launcher, seeds, analysis, and test tools
├── services/                       # FastAPI: auth, suppliers, incidents, inventory
├── uis/
│   ├── backoffice/                  # Dashboard, suppliers, incidents, talent interfaces
│   └── website/                     # Static website prototypes
├── .agents/skills/                  # Operational skills, including replenishment planner
├── src/ and shared/                 # Shared types, utilities, and conventions
└── workflows/, mcps/, infra/        # Automation, MCP, and infrastructure work areas
```

## Data and security notes

- TinyDB files used by auth, suppliers, and incidents are local to each service and are not a shared transactional database. Inventory instead uses Supabase PostgreSQL; its tables are currently created at startup with SQLModel `create_all` (no versioned migrations yet).
- Inventory stock is derived as inbound quantity minus outbound quantity; `current_stock` is not stored independently. Unit tests substitute isolated SQLite and do not validate Supabase schema changes, production permissions, or concurrent operations. A manual `SELECT 1` connectivity check with TLS confirmed connection only; it did not exercise business writes.
- The integrated launcher preserves local data and uses the same JWT secret for the related APIs. Keep secrets out of source control; configure production secrets through an appropriate secret manager.
- Avoid using real or sensitive data in development and tests. Use isolated database paths for tests and seeds.
- The replenishment planner produces suggestions only. A responsible person must review them before any purchasing decision.

For business context, see [`memory-bank/projectbrief.md`](./memory-bank/projectbrief.md) and [`memory-bank/CONTEXT-brasaland-briefing.es.md`](./memory-bank/CONTEXT-brasaland-briefing.es.md).