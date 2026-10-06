import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { root } from "./backoffice.mjs";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const origin = "http://localhost:3000";
const database = process.env.BACKOFFICE_TEST_AUTH_DB;
if (!database || !path.resolve(database).startsWith(`${os.tmpdir()}/`)) {
  throw new Error("BACKOFFICE_TEST_AUTH_DB debe apuntar a la base aislada del lanzador dentro de /tmp.");
}

async function request(route, token, method = "GET", data) {
  return fetch(`${origin}/api${route}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { "Content-Type": "application/json" } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  });
}

async function apiLogin(account) {
  const response = await fetch(`${origin}/api/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: account.email, password: account.password }),
  });
  assert.equal(response.status, 200);
  return (await response.json()).access_token;
}

test("one origin, one login, permissions, revocation and logout across both applications", async () => {
  const accounts = [];
  let adminToken;
  let supplierId;
  let browser;
  try {
    for (const role of ["admin", "manager", "user"]) {
      const account = { role, email: `integration-${role}-${crypto.randomUUID()}@example.test`, password: crypto.randomUUID() };
      const created = await request("/users", null, "POST", { email: account.email, password: account.password, name: "Integration Fixture" });
      assert.equal(created.status, 200);
      account.id = (await created.json()).user.id;
      accounts.push(account);
    }
    const promoted = spawnSync("uv", ["run", "--no-sync", "python", "-c",
      "import json,sys;from tinydb import TinyDB,Query;db=TinyDB(sys.argv[1]);table=db.table('users');[(table.update({'role':account['role']},Query().id==account['id'])) for account in json.loads(sys.argv[2])];db.close()",
      database, JSON.stringify(accounts.map(({ id, role }) => ({ id, role })))], { cwd: path.join(root, "services/api-auth"), encoding: "utf8" });
    assert.equal(promoted.status, 0, promoted.stderr);
    adminToken = await apiLogin(accounts[0]);
    const managerToken = await apiLogin(accounts[1]);
    const userToken = await apiLogin(accounts[2]);
    assert.equal((await request("/suppliers", userToken)).status, 200);
    const supplier = { name: `Integration Supplier ${crypto.randomUUID()}`, country: "Colombia", categories: ["carne"], rate_per_unit: 10, currency: "COP", status: "active" };
    assert.equal((await request("/suppliers", userToken, "POST", supplier)).status, 403);
    const createdSupplier = await request("/suppliers", managerToken, "POST", supplier);
    assert.equal(createdSupplier.status, 200);
    supplierId = (await createdSupplier.json()).id;

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    const responses = [];
    context.on("page", (page) => page.on("pageerror", (error) => errors.push(error.message)));
    const page = await context.newPage();
    page.on("response", (response) => {
      if (new URL(response.url()).pathname === "/api/auth/me") responses.push([response.status(), response.headers()["content-type"]]);
    });
    page.on("requestfailed", (request) => {
      if (new URL(request.url()).pathname.startsWith("/api/") && request.failure()?.errorText !== "net::ERR_ABORTED") {
        errors.push(`${new URL(request.url()).pathname}: ${request.failure()?.errorText}`);
      }
    });
    await page.goto(`${origin}/suppliers`);
    await page.waitForURL((url) => url.pathname === "/login" && url.searchParams.get("next") === "/suppliers");
    await page.getByLabel("Email", { exact: true }).fill(accounts[1].email);
    await page.getByLabel("Contrase\u00f1a", { exact: true }).fill(accounts[1].password);
    await page.getByRole("button", { name: "Iniciar sesi\u00f3n", exact: true }).click();
    try {
      await page.getByRole("heading", { name: supplier.name }).waitFor({ timeout: 10000 });
    } catch (error) {
      console.error("Integration diagnostic:", page.url(), await page.locator("body").innerText(), errors);
      throw error;
    }
    assert.equal(new URL(page.url()).origin, origin);
    await page.getByRole("button", { name: "+ Nuevo proveedor" }).waitFor();
    const token = await page.evaluate(() => localStorage.getItem("brasaland.backoffice.token"));
    assert.ok(token);
    await page.getByRole("link", { name: /backoffice/i }).click();
    await page.getByRole("heading", { name: "Servicios del backoffice" }).waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem("brasaland.backoffice.token")), token);
    await page.locator('a[href="/suppliers"]').click();
    try {
      await page.getByRole("heading", { name: supplier.name }).waitFor({ timeout: 10000 });
    } catch (error) {
      console.error("Cross-zone diagnostic:", page.url(), await page.locator("body").innerText(), errors, responses);
      throw error;
    }
    await page.screenshot({ path: "/tmp/brasaland-unified-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 375, height: 812 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: "/tmp/brasaland-unified-mobile.png", fullPage: true });

    assert.equal((await request(`/users/${accounts[1].id}`, adminToken, "PUT", { role: "user" })).status, 200);
    assert.equal((await request(`/suppliers/${supplierId}/rate`, managerToken, "PATCH", { rate_per_unit: 11 })).status, 403);
    await page.reload();
    await page.getByRole("heading", { name: supplier.name }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Nuevo proveedor/ }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Actualizar tarifa" }).count(), 0);
    assert.equal((await request(`/users/${accounts[1].id}`, adminToken, "PUT", { is_active: false })).status, 200);
    assert.equal((await request("/suppliers", managerToken)).status, 401);
    await page.reload();
    await page.locator("#auth-email").waitFor();
    assert.equal(await page.evaluate(() => localStorage.getItem("brasaland.backoffice.token")), null);

    await page.getByLabel("Email", { exact: true }).fill(accounts[0].email);
    await page.getByLabel("Contrase\u00f1a", { exact: true }).fill(accounts[0].password);
    await page.getByRole("button", { name: "Iniciar sesi\u00f3n", exact: true }).click();
    await page.getByRole("button", { name: /Cerrar sesi|Salir/ }).waitFor();
    const otherTab = await context.newPage();
    await otherTab.goto(`${origin}/suppliers`);
    await otherTab.getByRole("heading", { name: supplier.name }).waitFor();
    await page.getByRole("button", { name: /Cerrar sesi|Salir/ }).click();
    await otherTab.locator("#auth-email").waitFor();
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser?.close();
    if (adminToken) {
      if (supplierId) assert.equal((await request(`/suppliers/${supplierId}`, adminToken, "DELETE")).status, 200);
      for (const account of [...accounts.slice(1), accounts[0]].filter(Boolean)) {
        assert.equal((await request(`/users/${account.id}`, adminToken, "DELETE")).status, 200);
      }
    }
  }
});