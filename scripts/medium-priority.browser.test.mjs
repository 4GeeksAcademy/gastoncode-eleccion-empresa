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
let incidents;
let failStatusUpdate;
let errors;

before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });
beforeEach(async () => {
  context = await browser.newContext();
  expired = false;
  created = [];
  incidents = [];
  failStatusUpdate = false;
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
      const by_status = { open: 0, in_progress: 0, resolved: 0, discarded: 0 };
      const by_category = { equipment_failure: 0, supply_issue: 0, customer_complaint: 0, staff_issue: 0, facility_issue: 0, pos_system: 0, delivery_issue: 0, other: 0 };
      const by_origin = { customer: 0, branch: 0, internal: 0 };
      const by_branch = { central: 0, medellin_centro: 0, medellin_laureles: 0, medellin_envigado: 0, medellin_bello: 0, medellin_itagui: 0, bogota_chapinero: 0, bogota_usaquen: 0, cali_granada: 0, barranquilla_norte: 0, miami_doral: 0, miami_hialeah: 0, miami_kendall: 0, orlando_international: 0, fort_lauderdale: 0 };
      for (const incident of incidents) {
        by_status[incident.status]++;
        by_category[incident.category]++;
        by_origin[incident.origin]++;
        by_branch[incident.branch]++;
      }
      return route.fulfill({ status: expired ? 401 : 200, json: expired ? { detail: "Expired" } : {
        total: incidents.length, by_status, by_category, by_origin, by_branch,
      } });
    }
    if (pathname === "/api/incidents") {
      if (expired) return route.fulfill({ status: 401, json: { detail: "Expired" } });
      if (request.method() === "POST") {
        const input = request.postDataJSON();
        created.push(input);
        const incident = { ...input, id: `incident-${incidents.length + 1}`, status: "open", created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        incidents.push(incident);
        return route.fulfill({ status: 201, json: incident });
      }
      const query = new URL(request.url()).searchParams;
      const result = incidents.filter((incident) =>
        (!query.has("status") || incident.status === query.get("status"))
        && (!query.has("origin") || incident.origin === query.get("origin"))
        && (!query.has("branch") || incident.branch === query.get("branch")),
      );
      return route.fulfill({ json: result });
    }
    const statusMatch = pathname.match(/^\/api\/incidents\/([^/]+)\/status$/);
    if (statusMatch) {
      if (expired) return route.fulfill({ status: 401, json: { detail: "Expired" } });
      if (failStatusUpdate) return route.fulfill({ status: 409, json: { detail: "Invalid transition" } });
      const incident = incidents.find((item) => item.id === statusMatch[1]);
      if (!incident) return route.fulfill({ status: 404, json: { detail: "Missing" } });
      incident.status = request.postDataJSON().status;
      incident.updated_at = new Date().toISOString();
      return route.fulfill({ json: incident });
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

test("incident registration, listing, filters, status updates and summary stay integrated", async () => {
  await page.goto(`${base}/incidents-manager`);
  await page.getByRole("heading", { name: "Registrar incidencia" }).waitFor();
  await page.getByLabel("Título *").fill("Browser integration incident");
  await page.getByLabel("Descripción *").fill("Incident created by the integration browser test.");
  await page.getByLabel("Categoría *").selectOption("equipment_failure");
  await page.getByRole("radio", { name: "Equipo interno" }).check();
  await page.getByLabel("Sede *").selectOption("central");
  await page.getByRole("button", { name: "Registrar incidencia" }).click();
  await page.getByText("Incidencia registrada correctamente.").waitFor();
  assert.equal(created.length, 1);

  await page.getByRole("link", { name: "Incidencias", exact: true }).click();
  await page.getByRole("heading", { name: "Browser integration incident" }).waitFor();
  const listResponse = page.waitForResponse((response) =>
    new URL(response.url()).pathname === "/api/incidents" && response.request().method() === "GET");
  await page.getByLabel("Estado", { exact: true }).selectOption("open");
  assert.equal((await listResponse).status(), 200);
  await page.getByRole("heading", { name: "Browser integration incident" }).waitFor();
  await page.getByLabel("Estado", { exact: true }).selectOption("");
  await page.getByRole("heading", { name: "Browser integration incident" }).waitFor();

  failStatusUpdate = true;
  await page.getByLabel("Cambiar estado de Browser integration incident").selectOption("in_progress");
  await page.getByRole("status").filter({ hasText: "estado anterior se ha restaurado" }).waitFor();
  assert.equal(await page.getByLabel("Cambiar estado de Browser integration incident").inputValue(), "open");

  failStatusUpdate = false;
  await page.getByLabel("Cambiar estado de Browser integration incident").selectOption("in_progress");
  await page.getByText("Estado de «Browser integration incident» actualizado a En curso.").waitFor();
  assert.equal(await page.getByLabel("Cambiar estado de Browser integration incident").inputValue(), "in_progress");

  await page.getByRole("link", { name: "Resumen", exact: true }).click();
  await page.getByRole("button", { name: "Actualizar", exact: true }).waitFor();
  assert.equal(await page.locator(".metricTotal strong").textContent(), "1");
  assert.equal(await page.locator(".metrics").getByText("En curso").count(), 1);
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
