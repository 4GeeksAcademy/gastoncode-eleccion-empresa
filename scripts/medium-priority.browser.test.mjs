import assert from "node:assert/strict";
import test, { before, after, beforeEach, afterEach } from "node:test";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.DASHBOARD_URL ?? "http://localhost:3000";
const tokenKey = "brasaland.backoffice.token";
const user = { id: "fixture-id", email: "fixture@example.test", role: "manager", profile: null };
let browser;
let context;
let page;
let expired;
let created;
let errors;

before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });
beforeEach(async () => {
  context = await browser.newContext();
  expired = false;
  created = [];
  errors = [];
  await context.addInitScript(({ key }) => {
    if (!sessionStorage.getItem("fixture-initialized")) {
      localStorage.setItem(key, "fixture-token");
      sessionStorage.setItem("fixture-initialized", "1");
    }
  }, { key: tokenKey });
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/auth/me") return route.fulfill({ json: user });
    if (pathname === "/api/auth/login") return route.fulfill({ json: {
      access_token: "replacement-token", token_type: "bearer",
    } });
    if (pathname === "/api/incidents/summary") {
      return route.fulfill({ status: expired ? 401 : 200, json: expired ? { detail: "Expired" } : {
        total: 0, by_status: {}, by_category: {}, by_origin: {}, by_branch: {},
      } });
    }
    if (pathname === "/api/suppliers") {
      if (expired) return route.fulfill({ status: 401, json: { detail: "Expired" } });
      if (request.method() === "POST") {
        const input = request.postDataJSON();
        created.push(input);
        return route.fulfill({ status: 201, json: { ...input, id: 1 } });
      }
      return route.fulfill({ json: [] });
    }
    return route.fulfill({ status: 404, json: { detail: "Unexpected endpoint" } });
  });
  page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
});
afterEach(async () => {
  await context.close();
  assert.deepEqual(errors, []);
});

test("manager expiration retains summary pathname only and returns there after login", async () => {
  await page.goto(`${base}/incidents-manager/summary?private=drop#section`);
  await page.getByRole("button", { name: "Actualizar", exact: true }).waitFor();
  expired = true;
  await page.getByRole("button", { name: "Actualizar", exact: true }).click();
  await page.locator("#auth-email").waitFor();
  assert.equal(new URL(page.url()).search, "?next=%2Fincidents-manager%2Fsummary");
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), tokenKey), null);
  expired = false;
  await page.locator("#auth-email").fill("fixture@example.test");
  await page.locator("#auth-password").fill("fixture-password");
  await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
  await page.waitForURL(`${base}/incidents-manager/summary`);
  await page.getByRole("button", { name: "Actualizar", exact: true }).waitFor();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await page.waitForURL(`${base}/login`);
});

test("direct manager login preserves only safe incidents subroutes", async () => {
  await page.goto(`${base}/incidents-manager/login?next=%2Fincidents-manager%2Fsummary%3Fprivate%3Ddrop%23section`);
  await page.waitForURL((url) =>
    url.pathname === "/login" && url.searchParams.get("next") === "/incidents-manager/summary",
  );

  await page.goto(`${base}/incidents-manager/login?next=https%3A%2F%2Fevil.example%2Flanding`);
  await page.waitForURL((url) =>
    url.pathname === "/login" && url.searchParams.get("next") === "/incidents-manager",
  );
});

test("supplier 401 is invalidation, not voluntary logout", async () => {
  await page.goto(`${base}/suppliers?private=drop`);
  await page.getByRole("button", { name: /Nuevo proveedor/ }).waitFor();
  expired = true;
  await page.reload();
  await page.locator("#auth-email").waitFor();
  assert.equal(new URL(page.url()).search, "?next=%2Fsuppliers");
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), tokenKey), null);
});

test("supplier creation accepts cents and blocks values below one cent or fractional cents", async () => {
  await page.goto(`${base}/suppliers`);
  await page.getByRole("button", { name: /Nuevo proveedor/ }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Synthetic supplier");
  await page.getByRole("button", { name: "carne", exact: true }).click();
  const rate = page.getByLabel("Tarifa por unidad", { exact: true });
  assert.equal(await rate.getAttribute("step"), "0.01");
  assert.equal(await rate.getAttribute("min"), "0.01");
  for (const value of ["0", "-1", "0.001", "12.501"]) {
    await rate.fill(value);
    assert.equal(await rate.evaluate((input) => input.checkValidity()), false, value);
    await page.getByRole("button", { name: "Crear proveedor", exact: true }).click();
    assert.equal(created.length, 0);
  }
  await rate.fill("12.50");
  assert.equal(await rate.evaluate((input) => input.checkValidity()), true);
  const response = page.waitForResponse((result) =>
    new URL(result.url()).pathname === "/api/suppliers" && result.request().method() === "POST");
  await page.getByRole("button", { name: "Crear proveedor", exact: true }).click();
  assert.equal((await response).status(), 201);
  assert.equal(created.length, 1);
  assert.equal(created[0].rate_per_unit, 12.5);
});
