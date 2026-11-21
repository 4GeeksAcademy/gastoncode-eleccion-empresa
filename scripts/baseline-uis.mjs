import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, realpath } from "node:fs/promises";
import path from "node:path";
import { assertPortAvailable, root } from "./backoffice.mjs";

if (!process.argv[2]) throw new Error("Indica un directorio de logs fuera del repositorio.");
await mkdir(process.argv[2], { recursive: true });
const output = await realpath(process.argv[2]);
const repository = await realpath(root);
if (output === repository || output.startsWith(`${repository}${path.sep}`)) {
  throw new Error("Los logs deben estar fuera del repositorio.");
}
const applications = [
  ["dashboard-backoffice", 3000, "/login"],
  ["suppliers-backoffice", 3001, "/suppliers"],
  ["incidents-analyzer", 3002, "/incidents-analyzer"],
  ["talent-pipeline-tracker", 3003, "/talent-pipeline-tracker"],
  ["incidents-manager", 3004, "/incidents-manager"],
  ["inventory-management", 3005, "/inventory-management/products"],
  ["brasaland-website", 3006, "/"],
];
for (const [, port] of applications) await assertPortAvailable(port);
const children = [];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (!child.pid) continue;
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch (error) {
      if (error.code !== "ESRCH") {
        console.error(`No se pudo detener el grupo ${child.pid}: ${error.message}`);
        process.exitCode = 1;
      }
    }
  }
}
process.once("SIGINT", () => stop(0));
process.once("SIGTERM", () => stop(0));
for (const [application] of applications) {
  const log = createWriteStream(path.join(output, `${application}.log`));
  const child = spawn("npm", ["run", "start", "-w", application, "--", "--hostname", "127.0.0.1"], {
    cwd: root,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.once("error", (error) => { console.error(error.message); stop(1); });
  child.once("exit", () => { if (!stopping) { console.error(`${application} termino inesperadamente.`); stop(1); } });
}
try {
  for (const [application, port, route] of applications) {
    let ready = false;
    for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}${route}`, { signal: AbortSignal.timeout(2000) });
        if (response.ok) { ready = true; break; }
      } catch (error) {
        if (attempt === 59) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error(`${application} no esta disponible.`);
    console.log(`READY ${application} http://127.0.0.1:${port}${route}`);
  }
} catch (error) {
  console.error(error.message);
  stop(1);
}
