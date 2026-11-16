import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { assertPortAvailable, root, services } from "./backoffice.mjs";

test("launcher contains unified API and platform with unique ports", () => {
  assert.deepEqual(services.map((service) => service.port), [8005, 3007]);
  assert.equal(new Set(services.map((service) => service.port)).size, 2);
  assert.equal(services[0].cwd, "services/api-unified");
  assert.equal(services[0].health, "http://127.0.0.1:8005/health");
  assert.deepEqual(services[0].args.slice(-2), ["--port", "8005"]);
  assert.equal(services[1].health, "http://127.0.0.1:3007/");
  assert.equal(services[1].args[0], "run");
});

test("occupied ports are rejected without stopping the existing server", async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    await assert.rejects(assertPortAvailable(server.address().port), /ocupado/);
    assert.equal(server.listening, true);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("launcher starts platform and unified API, then SIGINT closes the set", { timeout: 30000 }, async () => {
  for (const service of services) await assertPortAvailable(service.port);
  const directory = await mkdtemp(path.join(os.tmpdir(), "brasaland-platform-lifecycle-"));
  const executable = `#!/usr/bin/env node
const {createServer} = require("node:http");
const args = process.argv.slice(2);
const port = args.includes("--port") ? Number(args[args.indexOf("--port") + 1]) : 3007;
if (!args.includes("--port") && args.join(" ") !== "run dev:platform") process.exit(2);
createServer((req, res) => res.end("synthetic service")).listen(port, "127.0.0.1");
`;
  for (const name of ["npm", "uv"]) await writeFile(path.join(directory, name), executable, { mode: 0o700 });
  const coordinator = spawn(process.execPath, ["scripts/backoffice.mjs", "dev"], {
    cwd: root,
    env: { ...process.env, PATH: `${directory}${path.delimiter}${process.env.PATH}`, JWT_SECRET: "synthetic-lifecycle-secret" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let ready = false;
  const finished = new Promise((resolve, reject) => {
    coordinator.once("error", reject);
    coordinator.once("exit", (code) => {
      if (!ready || code !== 0) reject(new Error(`Platform lifecycle failed: ${output}`));
      else resolve();
    });
  });
  for (const stream of [coordinator.stdout, coordinator.stderr]) stream.on("data", (chunk) => {
    output += chunk;
    if (!ready && output.includes("Plataforma lista:")) {
      ready = true;
      coordinator.kill("SIGINT");
    }
  });
  try {
    await finished;
    assert.match(output, /los 2 procesos/);
    for (const service of services) await assertPortAvailable(service.port);
  } finally {
    if (coordinator.exitCode === null) {
      coordinator.kill("SIGTERM");
      await new Promise((resolve) => coordinator.once("close", resolve));
    }
    await rm(directory, { recursive: true, force: true });
  }
});

test("SIGINT closes all services", { skip: process.env.BACKOFFICE_LIFECYCLE !== "1", timeout: 150000 }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "brasaland-lifecycle-"));
  const coordinator = spawn(process.execPath, ["scripts/backoffice.mjs", "dev"], {
    cwd: root,
    env: {
      ...process.env,
      AUTH_DB_PATH: path.join(directory, "auth.json"),
      SUPPLIERS_DB_PATH: path.join(directory, "suppliers.json"),
      INCIDENTS_DB_PATH: path.join(directory, "incidents.json"),
      ANALYSES_DB_PATH: path.join(directory, "analyses.json"),
      DATABASE_URL: `sqlite:///${path.join(directory, "inventory.db")}`,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let ready = false;
  const finished = new Promise((resolve, reject) => {
    coordinator.once("error", reject);
    coordinator.once("exit", (code) => {
      if (!ready || code !== 0) reject(new Error(`Lifecycle fallo: ${output.slice(-4000)}`));
      else resolve();
    });
  });
  for (const stream of [coordinator.stdout, coordinator.stderr]) {
    stream.on("data", (data) => {
      output += data;
      if (!ready && output.includes("Backoffice listo:")) {
        ready = true;
        coordinator.kill("SIGINT");
      }
    });
  }
  try {
    await finished;
    for (const service of services) await assertPortAvailable(service.port);
  } finally { if (coordinator.exitCode === null) coordinator.kill("SIGTERM"); }
});