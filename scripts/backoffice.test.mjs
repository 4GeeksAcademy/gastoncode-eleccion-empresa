import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { assertPortAvailable, root, services } from "./backoffice.mjs";

test("launcher contains exactly two APIs and two UIs with unique ports", () => {
  assert.deepEqual(services.map((service) => service.port), [8001, 8000, 3000, 3001]);
  assert.equal(new Set(services.map((service) => service.port)).size, 4);
  assert.equal(services[0].cwd, "services/api-auth");
  assert.equal(services[1].cwd, "services/api-suppliers");
});

test("occupied ports are rejected without stopping the existing server", async () => {
  const server = net.createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  try {
    await assert.rejects(assertPortAvailable(server.address().port), /ocupado/);
    assert.equal(server.listening, true);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test("SIGINT closes all four services", { skip: process.env.BACKOFFICE_LIFECYCLE !== "1", timeout: 150000 }, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "brasaland-lifecycle-"));
  const coordinator = spawn(process.execPath, ["scripts/backoffice.mjs", "dev"], {
    cwd: root,
    env: { ...process.env, AUTH_DB_PATH: path.join(directory, "auth.json"), SUPPLIERS_DB_PATH: path.join(directory, "suppliers.json") },
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