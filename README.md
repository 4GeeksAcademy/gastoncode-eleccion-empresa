# Brasaland Digital

Brasaland Digital is a monorepo of web interfaces, an API, and operational tools supporting the modernization of Brasaland's internal workflows. Brasaland operates restaurants in Colombia and Florida. This repository contains functional prototypes for selected business domains; **it is not a complete platform and is not production-ready**.

## Current scope and status

The integrated local setup consists of a web platform and an API:

- **Web platform:** Next.js app in `uis/platform`, served on port 3007. It includes a public website, protected dashboard, authentication and account pages, suppliers, incident analysis and management, inventory, and a talent-tracking prototype.
- **Unified API:** FastAPI app in `services/api-unified`, served on port 8005. It groups authentication, suppliers, incidents, inventory, and talent domains.
- **Replenishment tool:** local planner that accepts a validated inventory CSV and produces deterministic suggestions for human review. It does not forecast demand, select suppliers, or place orders.

The platform proxies `/api/*` requests to the unified API. The development launcher starts two processes (frontend and API), not the former separate servers per domain.

### Capabilities and limitations by domain

| Domain | Observed scope | Important limitations |
| --- | --- | --- |
| Authentication and accounts | Registration, sign-in, profiles, roles, and password change/reset flows. | JWT and local data; password-reset email delivery requires optional Resend configuration. |
| Suppliers | UI and API to query and maintain supplier records. | Local TinyDB persistence; not a shared transactional database or a purchase-order workflow. |
| Incidents | Incident management, filters and summary; CSV file analysis. | Local TinyDB persistence; no general operational telemetry pipeline. |
| Inventory | Products, inbound/outbound movements, and history; stock is derived from movements. | Supabase PostgreSQL; tables are created at service startup and there are no versioned migrations. Isolated tests do not validate real Supabase writes or concurrency. |
| Talent | Candidate tracking through an adapter to an external prototype. | Synthetic data only; no local persistence, vacancies, or onboarding implementation. |
| Replenishment | Quantity suggestions from CSV. | Deterministic calculation, requires human review, and does not place orders. |

The repository does **not yet implement** a database shared across all domains, point-of-sale integration, an integrated sales/telemetry pipeline, digital ordering, CRM, full people management, or a training platform. These are future goals or areas of work and must not be inferred from the repository structure.

## Documentation status convention

This documentation distinguishes the current product from plans using these categories:

- **Implemented:** functionality exists in current code; related tests may cover only part of its flow.
- **Limited / prototype:** an implementation exists, but has persistence, integration, validation, or operational constraints.
- **Proposed / pending:** a future goal or design, not a capability currently available.

The existence of a route, module, folder, or architecture proposal does not by itself prove that a business workflow is complete or ready for operational use. Refer to the current testing guides for claims about validation.

## Technology stack

- **Frontend:** Next.js 16.3.1, React 19.2.8, TypeScript 6, and Tailwind CSS 4.
- **Backend:** Python 3.14 or later, FastAPI, Pydantic, and Uvicorn.
- **Persistence:** local TinyDB for authentication, suppliers, and incidents; SQLModel and PostgreSQL (Supabase) for inventory.
- **Authentication:** JWT (HS256) and bcrypt. Resend is optional for sending password-reset emails.
- **Tooling:** npm, `uv`, pytest, Jest, and Playwright-based browser tests.

## Requirements

- Node.js 22 or later and npm.
- Python 3.14 or later.
- [`uv`](https://docs.astral.sh/uv/) to manage the Python environment.
- The API requires `JWT_SECRET`; the development launcher creates and retains it locally if it is not set. `DATABASE_URL` is only required to initialize and use the inventory module; without it the API can start, but inventory routes cannot access their database. Do not use a production database for tests.

The launcher creates and retains a local JWT secret if `JWT_SECRET` is not set in the environment; it does not create a `.env` file. For deployment, manage secrets with an appropriate mechanism and do not commit them to Git.

## Run locally

From the repository root:

```bash
# Install dependencies
node scripts/backoffice.mjs setup

# Start API (8005) and web platform (3007)
node scripts/backoffice.mjs dev

# Check service availability and protected responses
node scripts/backoffice.mjs check
```

The launcher requires ports **8005** and **3007** to be free. Press `Ctrl+C` to stop both processes. `setup` installs dependencies but does not migrate or initialize a separate database; the inventory service does run its existing table-creation logic at startup. To run only the frontend, use `npm run dev:platform`; the API must be available separately at the configured destination.

### Main routes

- `/` and `/application`: public website.
- `/backoffice`: protected dashboard.
- `/login`, `/register`, `/forgot-password`, `/reset-password`, and `/account/*`: authentication and account pages.
- `/suppliers`: suppliers.
- `/incidents-analyzer`: incident CSV analysis.
- `/incidents-manager`: incident management.
- `/inventory-management`: inventory.
- `/talent-pipeline-tracker`: talent tracking with synthetic data.

Backoffice sections share the platform session. The API exposes OpenAPI documentation at `/docs` while running; business routes are mounted on the unified service and proxied by the frontend under `/api/*`.

The [module functional reference](./docs/DOMAIN_REFERENCE.md) documents UI/API routes, roles, persistence, known limitations, and test coverage. The [current architecture](./docs/ARCHITECTURE_CURRENT.md) describes topology without duplicating that inventory.

## Tests and quality checks

Main commands from the repository root:

```bash
# Build and lint configured workspaces
npm run build
npm run lint

# Platform typecheck
npm run typecheck:platform

# Unified API suite (uses pytest)
uv sync --project services/api-unified --group test
uv run --project services/api-unified --group test -- pytest services/api-unified/tests -v

# Launcher and proxy tests
node --test scripts/backoffice.test.mjs
node --test scripts/platform-proxy.test.mjs

# TypeScript tests
npx jest --coverage

# Platform browser tests (start the platform first)
node scripts/browser-tests.mjs scripts/platform.browser.test.mjs
```

See [`TESTING.md`](./TESTING.md) for suite prerequisites and isolation, and [`scripts/README.es.md`](./scripts/README.es.md) for the browser runner. Isolated tests are not equivalent to production validation: in particular, inventory tests do not verify Supabase writes, schema, or concurrency.

## Deployment

A Docker Compose setup and example VPS topology are documented at [`docs/DOCKER_DEPLOYMENT.md`](./docs/DOCKER_DEPLOYMENT.md). Compose does not demonstrate production readiness. The guide documents configuration, persistence, and operational limits; verify security, backups/restoration, migrations, and PostgreSQL operations before using important data.

The architecture currently implemented, including the relationship between frontend routes, API prefixes, and per-domain persistence, is documented in [Current architecture](./docs/ARCHITECTURE_CURRENT.md). The [future architecture proposal](./docs/ARCHITECTURE_PROPOSAL.md) is a design document, not a description of capabilities already available.

## Repository map

```text
.
├── services/api-unified/     # FastAPI API (auth, suppliers, incidents, inventory, talent)
├── uis/platform/             # Next.js platform (port 3007)
├── packages/                 # Packages, including incident analysis
├── lib/, src/, shared/       # Clients, types, and shared utilities
├── scripts/                  # Launcher, tests, seeds, and tools
├── data/                     # Data and pipeline areas
├── .agents/skills/           # Operational skills, including replenishment planner
├── docs/                     # Current architecture, domain reference, proposal, and guides
└── memory-bank/              # Business context and project status
```

## Related documentation

- [Testing guide](./TESTING.md)
- [Current architecture](./docs/ARCHITECTURE_CURRENT.md)
- [Docker deployment](./docs/DOCKER_DEPLOYMENT.md)
- [Future architecture proposal](./docs/ARCHITECTURE_PROPOSAL.md) — a proposal, not a description of what is implemented.
- [Business context](./memory-bank/CONTEXT-brasaland-briefing.es.md)
- [Project brief](./memory-bank/projectbrief.md) and [project status](./memory-bank/progress.md); they may contain historical context and should be checked against current code.
