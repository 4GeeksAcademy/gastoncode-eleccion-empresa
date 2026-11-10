import assert from "node:assert/strict";
import test, { before, after, beforeEach, afterEach } from "node:test";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.DASHBOARD_URL ?? "http://localhost:3000";
const zone = "/talent-pipeline-tracker";
const tokenKey = "brasaland.backoffice.token";
let browser;
let context;
let page;
let role;
let records;
let notes;
let calls;
let expired;
let unavailable;
let errors;

before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });
beforeEach(async () => {
  context = await browser.newContext({ viewport: { width: 1365, height: 1000 } });
  role = "manager";
  records = Array.from({ length: 12 }, (_, index) => ({
    id: `candidate-${index + 1}`, full_name: `Synthetic Candidate ${String(index + 1).padStart(2, "0")}`,
    email: `synthetic-${index + 1}@example.com`, phone: "0000000000", position: "Cocina",
    status: "received", stage: "pending", experience_years: 2,
    applied_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z",
    linkedin_url: null, cv_url: "https://example.com/synthetic-cv", notes_count: 0,
  }));
  notes = [];
  calls = [];
  errors = [];
  expired = false;
  unavailable = false;
  await context.route("https://playground.4geeks.com/**", async (route) => {
    errors.push("Unexpected direct provider request");
    await route.abort();
  });
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/auth/me") return route.fulfill({ json: {
      id: "fixture-user", email: "fixture@example.com", role, profile: null,
    } });
    if (url.pathname === "/api/auth/login") return route.fulfill({ json: { access_token: "replacement-token", token_type: "bearer" } });
    if (!url.pathname.startsWith("/api/talent/")) return route.fulfill({ status: 404, json: {} });
    calls.push({ pathname: url.pathname, method: request.method(), body: request.postDataJSON() });
    assert.match(request.headers().authorization, /^Bearer (fixture|replacement)-token$/);
    if (expired) return route.fulfill({ status: 401, json: {} });
    if (unavailable) return route.fulfill({ status: 503, json: {} });
    if (url.pathname === "/api/talent/records") {
      if (request.method() === "POST") {
        const record = { ...records[0], ...request.postDataJSON(), id: "candidate-created" };
        records.push(record);
        return route.fulfill({ status: 201, json: record });
      }
      const query = url.searchParams;
      const filtered = records.filter((record) =>
        (!query.get("search") || record.full_name.includes(query.get("search")))
        && (!query.get("stage") || record.stage === query.get("stage"))
        && (!query.get("status") || record.status === query.get("status")));
      const currentPage = Number(query.get("page") || 1);
      const limit = Number(query.get("limit") || 9);
      return route.fulfill({ json: { total: filtered.length, page: currentPage, limit, data: filtered.slice((currentPage - 1) * limit, currentPage * limit) } });
    }
    const match = url.pathname.match(/^\/api\/talent\/records\/([^/]+)(?:\/notes(?:\/([^/]+))?)?$/);
    const record = records.find((item) => item.id === match?.[1]);
    if (!record) return route.fulfill({ status: 404, json: {} });
    if (url.pathname.includes("/notes")) {
      if (request.method() === "POST") {
        notes.push({ id: "note-demo", record_id: record.id, ...request.postDataJSON(), created_at: "2026-11-10T10:00:00Z" });
        return route.fulfill({ status: 201, json: { message: "Nota agregada" } });
      }
      if (request.method() === "DELETE") {
        notes = notes.filter((note) => note.id !== match[2]);
        return route.fulfill({ status: 204 });
      }
      return route.fulfill({ json: notes });
    }
    if (request.method() === "PATCH") {
      Object.assign(record, request.postDataJSON());
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: record });
  });
  page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && new URL(response.url()).pathname.includes("/_next/")) errors.push(`Asset HTTP ${response.status()}`);
  });
});
afterEach(async () => {
  await context.close();
  assert.deepEqual(errors, []);
});

async function authorize() {
  await context.addInitScript(({ key }) => {
    if (!sessionStorage.getItem("talent-fixture")) {
      localStorage.setItem(key, "fixture-token");
      sessionStorage.setItem("talent-fixture", "1");
    }
  }, { key: tokenKey });
}

async function login() {
  await page.locator("#auth-email").fill("fixture@example.com");
  await page.locator("#auth-password").fill("synthetic-password");
  await page.getByRole("button", { name: /^Iniciar sesi/ }).click();
}

test("talent workflow preserves the origin, supports mutations and fits desktop/mobile", async () => {
  await authorize();
  await page.goto(`${base}${zone}`);
  await page.getByRole("heading", { name: "Synthetic Candidate 01", exact: true }).waitFor();
  await page.screenshot({ path: "/tmp/brasaland-talent-desktop.png", fullPage: true });
  await page.getByRole("link", { name: "Siguiente", exact: true }).click();
  await page.getByRole("heading", { name: "Synthetic Candidate 10", exact: true }).waitFor();
  assert.equal(new URL(page.url()).pathname, zone);
  await page.getByRole("link", { name: "Anterior", exact: true }).click();
  await page.getByPlaceholder("Buscar por nombre o puesto").fill("Candidate 01");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await page.getByRole("heading", { name: "Synthetic Candidate 01", exact: true }).waitFor();
  assert.equal(new URL(page.url()).searchParams.get("page"), "1");
  await page.getByPlaceholder("Buscar por nombre o puesto").fill("");
  await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await page.getByText("Ingresar nueva candidatura", { exact: true }).click();
  for (const [field, value] of Object.entries({ full_name: "Synthetic New Candidate", email: "synthetic-new@example.com", phone: "0000000000", position: "Cocina", cv_url: "https://example.com/synthetic-cv", experience_years: "2" })) {
    await page.locator(`input[name="${field}"]`).fill(value);
  }
  await page.getByRole("button", { name: "Crear candidatura", exact: true }).click();
  await page.getByText("Candidatura creada exitosamente.", { exact: true }).waitFor();
  assert.equal(calls.filter((call) => call.method === "POST" && call.pathname === "/api/talent/records").length, 1);
  await page.getByRole("heading", { name: "Synthetic Candidate 01", exact: true }).click();
  await page.waitForURL(`${base}${zone}/candidates/candidate-1`);
  await page.locator("#new-note").waitFor();
  const updated = page.waitForResponse((response) => response.request().method() === "GET" && new URL(response.url()).pathname === "/api/talent/records/candidate-1");
  await page.getByRole("combobox").selectOption("stage:review");
  await updated;
  await page.locator("#new-note").fill("Synthetic interview note");
  await page.getByRole("button", { name: "Agregar nota", exact: true }).click();
  await page.getByText("Synthetic interview note", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await page.getByText("Synthetic interview note", { exact: true }).waitFor({ state: "hidden" });
  await page.getByRole("link", { name: "Volver", exact: true }).click();
  await page.waitForURL(`${base}${zone}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("heading", { name: "Synthetic Candidate 01", exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await page.screenshot({ path: "/tmp/brasaland-talent-mobile.png", fullPage: true });
  await page.getByRole("link", { name: "Backoffice", exact: true }).click();
  await page.waitForURL(`${base}/`);
});

test("anonymous deep link requests no candidate data and returns after login", async () => {
  await page.goto(`${base}${zone}/candidates/candidate-1?private=drop#notes`);
  await page.waitForURL((url) => url.pathname === "/login");
  assert.equal(new URL(page.url()).searchParams.get("next"), `${zone}/candidates/candidate-1`);
  assert.equal(calls.length, 0);
  await login();
  await page.waitForURL(`${base}${zone}/candidates/candidate-1`);
  await page.locator("#new-note").waitFor();
  await page.getByRole("button", { name: "Cerrar sesion", exact: true }).click();
  await page.waitForURL(`${base}/login`);
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), tokenKey), null);
});

test("user role is denied before querying talent data", async () => {
  role = "user";
  await authorize();
  await page.goto(`${base}${zone}`);
  await page.getByRole("alert").filter({ hasText: "No tienes permiso" }).waitFor();
  assert.equal(calls.length, 0);
});

test("expiration preserves the detail destination and temporary failures preserve the token", async () => {
  await authorize();
  unavailable = true;
  await page.goto(`${base}${zone}/candidates/candidate-1`);
  await page.getByRole("button", { name: "Reintentar", exact: true }).waitFor();
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), tokenKey), "fixture-token");
  unavailable = false;
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await page.locator("#new-note").waitFor();
  expired = true;
  await page.getByRole("combobox").selectOption("status:in_progress");
  await page.waitForURL((url) => url.pathname === "/login");
  assert.equal(new URL(page.url()).searchParams.get("next"), `${zone}/candidates/candidate-1`);
  expired = false;
  await login();
  await page.waitForURL(`${base}${zone}/candidates/candidate-1`);
  await page.locator("#new-note").waitFor();
});