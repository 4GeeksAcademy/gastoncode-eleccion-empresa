import { spawn } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const services = [
  { name: "unified-api", cwd: "services/api-unified", command: "uv", args: ["run", "--no-sync", "uvicorn", "app.main:create_app", "--factory", "--host", "127.0.0.1", "--port", "8005"], port: 8005, health: "http://127.0.0.1:8005/health" },
  { name: "platform", cwd: ".", command: "npm", args: ["run", "dev:platform"], port: 3007, health: "http://127.0.0.1:3007/" },
];

export async function assertPortAvailable(port) {
  await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", () => reject(new Error(`Puerto ${port} ocupado; detiene el servicio existente antes de iniciar.`)));
    server.listen(port, () => server.close(resolve));
  });
}

function run(command, args, cwd = root) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} termino con codigo ${code}`)));
  });
}

async function secret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const workspaceId = createHash("sha256").update(root).digest("hex").slice(0, 12);
  const directory = path.join(os.homedir(), ".local", "state", "brasaland", workspaceId);
  const file = path.join(directory, "jwt-secret");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  try {
    await writeFile(file, randomBytes(32).toString("hex"), { mode: 0o600, flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  const value = (await readFile(file, "utf8")).trim();
  if (!value) throw new Error("La clave local esta vacia; configura JWT_SECRET en el entorno.");
  return value;
}

async function health(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
}

export async function main(action) {
  const activeServices = services;
  const frontendUrl = "http://127.0.0.1:3007";
  if (action === "admin") {
    const email = process.argv[3];
    if (!email) throw new Error("Uso: npm run backoffice:admin -- email-de-cuenta-existente");
    await assertPortAvailable(8005);
    await run("uv", ["run", "--no-sync", "python", "-m", "app.modules.auth.promote_admin", email], path.join(root, "services/api-unified"));
    return;
  }
  if (action === "setup") {
    await run("npm", ["install", "--package-lock=false"]);
    await run("uv", ["sync"], path.join(root, "services/api-unified"));
    console.log("Entorno preparado. No se modificaron bases ni se ejecutaron seeds.");
    return;
  }
  if (action === "check") {
    for (const service of activeServices) {
      await health(service.health);
      console.log(`OK ${service.name}`);
    }
    const response = await fetch(`${frontendUrl}/api/auth/me`, { signal: AbortSignal.timeout(5000) });
    if (response.status !== 401) throw new Error("Proxy auth: esperaba 401 sin token");
    const incidents = await fetch(`${frontendUrl}/api/incidents/summary`, { signal: AbortSignal.timeout(5000) });
    if (incidents.status !== 401) throw new Error("Proxy incidencias: esperaba 401 sin token");
    const inventory = await fetch(`${frontendUrl}/api/inventory/products`, { signal: AbortSignal.timeout(5000) });
    if (inventory.status !== 401) throw new Error("Proxy inventario: esperaba 401 sin token");
    const talent = await fetch(`${frontendUrl}/api/talent/records`, { signal: AbortSignal.timeout(5000) });
    if (talent.status !== 401) throw new Error("Proxy talento: esperaba 401 sin token");
    console.log("OK proxy talento protegido");
    console.log("OK proxy incidencias");
    console.log("OK proxy inventario protegido");
    console.log("OK proxy auth. Las pruebas funcionales requieren cuentas de prueba aisladas.");
    return;
  }
  if (action !== "dev") throw new Error("Uso: backoffice.mjs setup|dev|check|admin");
  for (const service of activeServices) await assertPortAvailable(service.port);
  const env = {
    ...process.env,
    JWT_SECRET: await secret(),
    UNIFIED_API_URL: "http://127.0.0.1:8005",
    NEXT_PUBLIC_SUPPLIERS_UI_URL: "/suppliers",
  };
  const children = [];
  let stopping = false;
  let readiness;
  const stop = (code) => {
    if (stopping) return;
    stopping = true;
    clearTimeout(readiness);
    process.exitCode = code;
    for (const child of children) {
      try { process.kill(-child.pid, "SIGTERM"); } catch {}
    }
  };
  process.once("SIGINT", () => stop(0));
  process.once("SIGTERM", () => stop(0));
  for (const service of activeServices) {
    const child = spawn(service.command, service.args, { cwd: path.join(root, service.cwd), env: { ...env, ...service.env }, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    children.push(child);
    for (const stream of [child.stdout, child.stderr]) {
      stream.on("data", (data) => process.stdout.write(`[${service.name}] ${data}`));
    }
    child.once("error", (error) => { console.error(`${service.name}: ${error.message}`); stop(1); });
    child.once("exit", () => { if (!stopping) { console.error(`${service.name} se detuvo; cerrando el conjunto.`); stop(1); } });
  }
  const deadline = Date.now() + 120000;
  const verify = async () => {
    if (stopping) return;
    try {
      await Promise.all(activeServices.map((service) => health(service.health)));
      console.log(`Plataforma lista: http://localhost:3007 (website: /; dashboard: /backoffice; API unificada en :8005). Ctrl+C cierra los ${activeServices.length} procesos.`);
    } catch {
      if (stopping) return;
      if (Date.now() >= deadline) { console.error("El conjunto no estuvo disponible en 120 segundos."); stop(1); }
      else readiness = setTimeout(verify, 1500);
    }
  };
  void verify();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2]).catch((error) => { console.error(error.message); process.exitCode = 1; });
}