import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log("Uso: node scripts/browser-tests.mjs [opciones de node --test] [archivos]");
  console.log("Por defecto ejecuta auth-browser.test.mjs. Inicia las UIs antes de ejecutar.");
  console.log("Instala Playwright 1.58.2 y Chromium en un directorio temporal y los elimina al terminar.");
} else {
  let directory;
  let child;
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
    child?.kill("SIGTERM");
  };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);

  function run(command, parameters, env = process.env) {
    if (interrupted) throw new Error("Pruebas interrumpidas.");
    return new Promise((resolve, reject) => {
      child = spawn(command, parameters, { cwd: root, env, stdio: "inherit" });
      child.once("error", reject);
      child.once("close", (code, signal) => {
        child = undefined;
        if (code === 0) resolve();
        else reject(new Error(`${command} termino con ${signal ?? `codigo ${code}`}.`));
      });
    });
  }

  try {
    directory = await mkdtemp(path.join(os.tmpdir(), "brasaland-browser-tests-"));
    const env = {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: path.join(directory, "browsers"),
      PLAYWRIGHT_MODULE: path.join(directory, "node_modules/playwright/index.mjs"),
    };
    await run("npm", [
      "install", "--prefix", directory, "--no-package-lock", "--no-audit",
      "--no-fund", "--ignore-scripts", "playwright@1.58.2",
    ], env);
    await run(process.execPath, [
      path.join(directory, "node_modules/playwright/cli.js"), "install", "chromium",
    ], env);
    await run(process.execPath, [
      "--test", ...(args.length ? args : ["uis/backoffice/dashboard-backoffice/tests/auth-browser.test.mjs"]),
    ], env);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    console.error("Si Chromium no puede iniciarse, revisa las bibliotecas del sistema; este comando no instala paquetes del SO.");
    process.exitCode = interrupted ? 130 : 1;
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", interrupt);
    if (directory) {
      await rm(directory, { recursive: true, force: true });
      console.log("Instalacion temporal de Playwright y Chromium eliminada.");
    }
  }
}
