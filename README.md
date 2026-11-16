# Brasaland Digital

Brasaland Digital is a monorepo of web interfaces, APIs, and operational tools for modernizing the restaurant chain's internal workflows. It includes a unified backoffice platform for authentication, suppliers, incidents, inventory, and a synthetic-data talent tracking prototype, plus inventory replenishment utilities.

This repository contains working prototypes, not a production-ready deployment. A single Next.js App Router frontend (`uis/platform`) combines the website, protected dashboard, authentication/account pages, and all five business modules. A single unified FastAPI backend (`services/api-unified`) consolidates auth, suppliers, incidents, inventory, and talent API routes on one port. Auth, suppliers, and incidents use local TinyDB files, while the inventory API uses PostgreSQL in Supabase. The legacy Next.js and FastAPI projects have been removed — only the unified frontend and unified API remain.

## What’s included

- **Unified frontend:** website, dashboard and account management, suppliers, incidents, CSV incident analysis, inventory, and talent, served by one Next.js process on port 3007.
- **Unified API:** FastAPI service consolidating auth, suppliers, incidents, inventory, and talent routes on port 8005. Authentication uses JWT (HS256); each domain enforces its own authorization checks. Inventory stores products and movements in Supabase PostgreSQL and derives stock from those movements.
- **Talent pipeline tracker:** integrated at `/talent-pipeline-tracker`, restricted to admin/manager. Its API adapter uses the external 4Geeks prototype: synthetic data only, no local candidate persistence, vacancies, or onboarding.
- **Inventory replenishment planner:** a deterministic local CSV tool that suggests quantities for human review. It does not forecast demand, select suppliers, or submit orders.
- **Static website prototypes, shared UI/types/utilities, data and analysis packages, scripts, and project documentation.**

The repository does not yet provide an operational database shared across all domains, a unified deployment, or an integrated sales and telemetry pipeline. See [project status](./memory-bank/progress.md) and the [architecture proposal](./docs/ARCHITECTURE_PROPOSAL.md) for current scope and future plans.

## Requirements

- Node.js 22 or later and npm.
- [uv](https://docs.astral.sh/uv/) for Python environments (Python 3.14 or later).

The unified API (`services/api-unified`) manages its Python environment via `uv`. The integrated development launcher supplies a shared local `JWT_SECRET`; it does not write a `.env` file.

## Unified frontend and API

`uis/platform` uses App Router and runs alongside the original interfaces on
**<http://localhost:3007>**:

- `/` and `/application`: public website, without initializing backoffice auth.
- `/backoffice`: protected dashboard.
- `/login`, `/register`, `/forgot-password`, `/reset-password`, and `/account/*`:
  reused authentication and account views, with `/backoffice` as the new home.
- `/suppliers`, `/incidents-analyzer`, `/incidents-manager`,
  `/inventory-management`, and `/talent-pipeline-tracker`: real App Router
  modules, including their existing subroutes. No original UI server is needed.

All backoffice routes share one session provider. Module links stay on port
3007 and return to `/backoffice`; `/` remains the public website.

The unified API serves all backend routes on port 8005 under `/api/*`,
proxied automatically by Next.js rewrites.

### Starting the stack

```bash
# Setup (install dependencies):
node scripts/backoffice.mjs setup

# Development mode (starts unified API on 8005 + platform on 3007):
node scripts/backoffice.mjs dev

# Health check while the stack is running:
node scripts/backoffice.mjs check

# Create the first administrator (stop the stack first):
node scripts/backoffice.mjs admin user@example.com

# Or start only the frontend (APIs must be available separately):
npm run dev:platform
```

The launcher starts two processes and requires ports **8005 and 3007** to be
free. `Ctrl+C` closes both. It does not configure or migrate a database.
Inventory still needs `DATABASE_URL` for its Supabase PostgreSQL connection.

Frontend-only commands do not start APIs. The server-side proxy forwards
`/api/*` requests to `http://127.0.0.1:8005`.

### Create the first administrator

1. Start the stack and register an account at `/register`.
2. Stop the processes with `Ctrl+C`.
3. Promote that existing account while the APIs are stopped:

   ```bash
   node scripts/backoffice.mjs admin user@example.com
   ```

4. Restart and sign in.

This command does not create an account. Access to the local terminal and data files is equivalent to administrative access.

## Tests and quality checks

Root workspace scripts are available for build and lint:

```bash
npm run build
npm run lint
```

Examples of focused test commands from the repository root:

```bash
# Unified API smoke tests (isolated; no legacy dependencies)
uv sync --project services/api-unified --group test
uv run --project services/api-unified --group test -- python -m unittest discover -s services/api-unified/tests -v

# Launcher lifecycle and proxy tests
node --test scripts/backoffice.test.mjs
node --test scripts/platform-proxy.test.mjs

# Shared auth and inventory TypeScript tests
npx jest --coverage

# Browser tests (start platform first):
node scripts/browser-tests.mjs scripts/platform.browser.test.mjs
```

For browser tests, start the relevant UI(s) first and use `node scripts/browser-tests.mjs`; the runner installs Playwright and Chromium in a temporary location. See [`scripts/README.es.md`](./scripts/README.es.md) for test prerequisites and isolation guidance.

See [`TESTING.md`](./TESTING.md) for focused test commands and setup details. Jest covers the inventory API client and stock helpers.

**Dependency integration note:** organizational content exclusions have historically prevented updating the root lockfile. No repository dependency installation or clean `npm ci` validation was performed for this transition. An authorized maintainer must reconcile the lockfile in a permitted environment before relying on a clean install.

See the [phase 3 report](./docs/FRONTEND_PHASE3.es.md) for implementation,
verification results, remaining limitations, and browser test instructions.

## Repository map

```text
.
├── agents/                         # Agent templates and tool guidance
├── data/                           # Raw, processed, pipeline, and evaluation data areas
├── docs/                           # Architecture and integration documentation
├── packages/                       # Python analysis package and shared package areas
├── scripts/                        # Backoffice launcher, seeds, analysis, and test tools
├── services/api-unified/           # FastAPI unified backend (port 8005)
├── uis/platform/                   # Next.js unified frontend (port 3007)
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