# `scripts` folder

This folder contains helper scripts for development, testing, and maintenance. Unless a command says otherwise, run it from the repository root.

- **Main purpose**: group support tools that do not belong to a specific app, agent, or pipeline but make the team’s work easier.
- **Recommendation**: document each script (what it does, parameters, requirements, usage examples) and keep them reproducible (and safe) across environments.

> _Spanish version: [README.es.md](./README.es.md)._

## Development launcher

`backoffice.mjs` prepares and coordinates the two processes of the integrated
application: the FastAPI service (`services/api-unified`, port 8005) and the
Next.js platform (`uis/platform`, port 3007).

```bash
node scripts/backoffice.mjs setup
node scripts/backoffice.mjs dev
node scripts/backoffice.mjs check
node scripts/backoffice.mjs admin user@example.com
```

`setup` installs dependencies; `dev` starts the API and platform; `check`
checks service availability and protected proxies without a token; `admin`
promotes an existing account and requires the API to be stopped. Ports 8005 and
3007 must be free for `dev` and for the optional real lifecycle test
(`BACKOFFICE_LIFECYCLE=1`). The development launcher creates and reuses a local
JWT secret if `JWT_SECRET` is not provided.

## Browser and proxy tests

`platform.browser.test.mjs` exercises the unified platform on port 3007. It
intercepts API responses with synthetic data; do not point it at real databases.
Start the platform first:

```bash
npm run build:platform
npm run start -w brasaland-platform
# In another terminal
node scripts/browser-tests.mjs scripts/platform.browser.test.mjs
```

`platform-proxy.test.mjs` checks HTTP forwarding from the frontend to a synthetic
API on port 8005. It requires the platform to be running with local rewrites and
port 8005 free; do not run it while a real API is using that port:

```bash
node --test scripts/platform-proxy.test.mjs
```

The browser runner installs Playwright 1.58.2 and Chromium in a temporary
directory, then removes them on success or failure. It does not change workspace
dependencies or install OS packages. Internet access and the system libraries
required by Chromium are needed. `PLATFORM_URL` can change the web origin
(default `http://localhost:3007`).

## Launcher tests

```bash
node --test scripts/backoffice.test.mjs
```

The normal test uses synthetic services. The optional real lifecycle test
(`BACKOFFICE_LIFECYCLE=1`) starts the API and platform, uses ports 3007 and 8005,
and writes temporary SQLite/TinyDB files. Ensure the ports are free and do not
run it alongside real services.

The `baseline-*` scripts belong to a historical evaluation of separate UIs and
do not describe the current integrated topology. The old report is not kept in
`docs/`. For current tests, use `platform.browser.test.mjs`,
`platform-proxy.test.mjs`, and [`TESTING.md`](../TESTING.md). See the
[Spanish guide](./README.es.md) for the same requirements and isolation limits.
