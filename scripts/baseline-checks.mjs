import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputArgument = process.argv[2];
if (!outputArgument || !process.env.BASELINE_PYTHON) {
  throw new Error("Uso: BASELINE_PYTHON=/ruta/python node scripts/baseline-checks.mjs /salida/fuera/del/repo");
}
await mkdir(outputArgument, { recursive: true });
const output = await realpath(outputArgument);
const repository = await realpath(root);
if (output === repository || output.startsWith(`${repository}${path.sep}`)) {
  throw new Error("La salida debe estar fuera del repositorio.");
}

const applications = [
  ["dashboard-backoffice", "uis/backoffice/dashboard-backoffice/src/app", "", 3000],
  ["suppliers-backoffice", "uis/backoffice/suppliers-management/src/app", "", 3001],
  ["incidents-analyzer", "uis/backoffice/incidents-analyzer/src/app", "/incidents-analyzer", 3002],
  ["incidents-manager", "uis/backoffice/incidents-manager/src/app", "/incidents-manager", 3004],
  ["inventory-management", "uis/backoffice/inventory-management/src/app", "/inventory-management", 3005],
  ["talent-pipeline-tracker", "uis/backoffice/talent-pipeline-tracker/app", "/talent-pipeline-tracker", 3003],
  ["brasaland-website", "uis/website/app", "", 3006],
];
const routes = [];
for (const [application, directory, prefix, port] of applications) {
  for (const entry of await readdir(path.join(root, directory), { recursive: true })) {
    if (path.basename(entry) !== "page.tsx") continue;
    const source = `${directory}/${entry}`;
    const segment = path.dirname(entry) === "." ? "" : `/${path.dirname(entry)}`;
    routes.push({
      application, port, route: `${prefix}${segment}` || "/", source,
      sha256: createHash("sha256").update(await readFile(path.join(root, source))).digest("hex"),
    });
  }
}
routes.sort((a, b) => a.application.localeCompare(b.application) || a.route.localeCompare(b.route));
await writeFile(path.join(output, "routes.json"), `${JSON.stringify(routes, null, 2)}\n`);

const environment = {
  ...process.env,
  PYTHONDONTWRITEBYTECODE: "1",
  PYTHON_DOTENV_DISABLED: "1",
  PYTHONPATH: root,
  BACKOFFICE_LIFECYCLE: "0",
  JWT_SECRET: "baseline-synthetic-not-for-production",
  RESEND_API_KEY: "",
  AUTH_SERVICE_URL: "http://127.0.0.1:1",
  AUTH_API_URL: "http://127.0.0.1:1",
  TRACKER_API_URL: "http://127.0.0.1:1",
  DATABASE_URL: "postgresql+psycopg://synthetic:synthetic@127.0.0.1:1/synthetic",
  AUTH_DB_PATH: path.join(output, "synthetic-auth.json"),
  SUPPLIERS_DB_PATH: path.join(output, "synthetic-suppliers.json"),
  INCIDENTS_DB_PATH: path.join(output, "synthetic-incidents.json"),
  ANALYSES_DB_PATH: path.join(output, "synthetic-analyses.json"),
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_DASHBOARD_URL: "http://localhost:3000",
};
const python = process.env.BASELINE_PYTHON;
const commands = [
  ["revision", "git", ["rev-parse", "HEAD"]],
  ["npm-versions", "npm", ["ls", "--workspaces", "--depth=0", "--json"]],
  ["python-versions", python, ["-c", "from importlib.metadata import distributions; print('\\n'.join(sorted(f'{d.name}=={d.version}' for d in distributions())))"]],
  ["node-tests", process.execPath, ["--test", "--test-reporter=tap",
    "scripts/backoffice.test.mjs",
    "uis/backoffice/dashboard-backoffice/tests/auth-api.test.mjs",
    "uis/backoffice/incidents-analyzer/tests/incidents-api.test.mjs",
    "uis/backoffice/incidents-manager/tests/incidents-api.test.mjs",
    "uis/backoffice/talent-pipeline-tracker/tests/talent-api.test.mjs"]],
  ["jest", "npm", ["run", "test:auth:ts", "--", "--runInBand", "--coverage=false"]],
  ["auth", python, ["-m", "pytest", "-q", "-p", "no:cacheprovider"], "services/api-auth"],
  ["suppliers", python, ["-m", "unittest", "discover", "-s", "tests", "-v"], "services/api-suppliers"],
  ["incidents", python, ["-m", "unittest", "discover", "-s", "tests", "-v"], "services/api-incidents"],
  ["inventory", python, ["-m", "pytest", "-q", "-p", "no:cacheprovider"], "services/api-inventory"],
  ["talent", python, ["-m", "unittest", "discover", "-s", "tests", "-v"], "services/api-talent"],
  ["seed", python, ["-m", "unittest", "discover", "-s", "scripts/tests", "-v"]],
  ["replenishment", python, ["-m", "unittest", "discover", "-s", ".agents/skills/replenishment-planner/tests", "-v"]],
  ["recovery", python, ["scripts/baseline-recovery.py"]],
  ["lint", "npm", ["run", "lint"]],
  ...applications.map(([application]) => [`build-${application}`, "npm", ["run", "build", "-w", application]]),
];
const results = [];
for (const [name, command, args, directory = "."] of commands) {
  const started = Date.now();
  const log = [];
  const result = await new Promise((resolve) => {
    const child = spawn(command, args, { cwd: path.join(root, directory), env: environment });
    child.stdout.on("data", (chunk) => log.push(chunk));
    child.stderr.on("data", (chunk) => log.push(chunk));
    child.once("error", (error) => {
      log.push(Buffer.from(`${error.message}\n`));
      resolve({ exitCode: null, error: error.message });
    });
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
  });
  await writeFile(path.join(output, `${name}.log`), Buffer.concat(log));
  results.push({ name, command, args, cwd: directory, ...result, durationMs: Date.now() - started });
  await writeFile(path.join(output, "checks.json"), `${JSON.stringify({
    generatedAt: new Date().toISOString(), node: process.version, routes: routes.length, results,
  }, null, 2)}\n`);
  console.log(`${name}: ${result.exitCode === 0 ? "PASS" : "FAIL"} (${Date.now() - started} ms)`);
}
if (results.some(({ exitCode }) => exitCode !== 0)) process.exitCode = 1;
