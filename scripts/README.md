# `scripts` folder

This folder contains **helper scripts** for the monorepo: development automation, maintenance utilities, repetitive tasks (setup, lint, migrations, data generation, etc.), and internal tooling.

- **Main purpose**: group support tools that do not belong to a specific app, agent, or pipeline but make the team’s work easier.
- **Recommendation**: document each script (what it does, parameters, requirements, usage examples) and keep them reproducible (and safe) across environments.

> _Spanish version: [README.es.md](./README.es.md)._

## Temporary browser test runner

Run `node scripts/browser-tests.mjs` with the dashboard already running.
The command installs Playwright 1.58.2 and Chromium in a private temporary
directory, runs the dashboard browser tests and removes that installation on
success or failure. It does not change workspace dependencies or install OS
packages. Internet access and Chromium system libraries are required.

To select tests, pass Node test options followed by file paths:

```bash
node scripts/browser-tests.mjs scripts/medium-priority.browser.test.mjs
```

That regression file requires dashboard, suppliers and incidents-manager UIs
running; API responses are intercepted, so real databases are not used.
See the [Spanish guide](./README.es.md) for configuration and cleanup limits.
