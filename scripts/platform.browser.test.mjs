import assert from "node:assert/strict";
import { mkdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import test, { after, before } from "node:test";
import { root } from "./backoffice.mjs";
import { tokenKey, timestamp, profile, user, supplier, incident, products, candidate } from "./backoffice-fixtures.mjs";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.PLATFORM_URL ?? "http://localhost:3007";
const views = [
  ["website", "/", false], ["application", "/application", false],
  ["dashboard", "/backoffice", true], ["login", "/login", false],
  ["register", "/register", false], ["forgot-password", "/forgot-password", false],
  ["reset-invalid", "/reset-password", false],
  ["reset-password", "/reset-password?token=synthetic-token", false],
  ["account", "/account", true], ["profile", "/account/profile", true],
  ["change-password", "/account/change-password", true],
  ["suppliers", "/suppliers", true],
  ["analyzer-home", "/incidents-analyzer", true],
  ["analyzer-upload", "/incidents-analyzer/incidents", true],
  ["incident-create", "/incidents-manager", true],
  ["incident-list", "/incidents-manager/incidents", true],
  ["incident-summary", "/incidents-manager/summary", true],
  ["products", "/inventory-management/products", true],
  ["inbound", "/inventory-management/inbound", true],
  ["outbound", "/inventory-management/outbound", true],
  ["orders", "/inventory-management/orders", true],
  ["talent-list", "/talent-pipeline-tracker", true],
  ["talent-detail", "/talent-pipeline-tracker/candidates/synthetic-candidate", true],
];
let browser;
let output;
const captures = [];

before(async () => {
  if (process.env.PLATFORM_OUTPUT) {
    await mkdir(process.env.PLATFORM_OUTPUT, { recursive: true });
    output = await realpath(process.env.PLATFORM_OUTPUT);
    const repository = await realpath(root);
    assert.ok(output !== repository && !output.startsWith(`${repository}${path.sep}`), "Evidence must be outside the repository");
  }
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  if (output) {
    await writeFile(path.join(output, "visual.json"), `${JSON.stringify(captures, null, 2)}\n`);
    const cards = captures.map(({ name, device, route }) =>
      `<article><h2>${name} / ${device}</h2><p>${route}</p><a href="${name}-${device}.png"><img loading="lazy" src="${name}-${device}.png" alt="${name} ${device}"></a></article>`,
    ).join("\n");
    await writeFile(path.join(output, "index.html"), `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Brasaland platform phase 3</title>
<style>body{font-family:system-ui;background:#171717;color:#eee;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}article{min-width:0}img{width:100%;max-height:650px;object-fit:contain;object-position:top;background:#292524}a{color:#fbbf24}</style>
<h1>Brasaland platform phase 3</h1><p>Real frontend; synthetic APIs and external image placeholders.</p><main>${cards}</main></html>`);
  }
});

async function withPage(options, run) {
  const { authenticated = false, role = "manager", viewport = { width: 1365, height: 1000 }, fail = {}, scenario = {} } = options;
  const context = await browser.newContext({ viewport, locale: "es-CO", timezoneId: "UTC", reducedMotion: "reduce", serviceWorkers: "block" });
  const requests = [];
  const unexpected = [];
  const errors = [];
  await context.clock.setFixedTime(new Date("2026-11-14T20:00:00Z"));
  if (authenticated) await context.addInitScript((key) => {
    if (!sessionStorage.getItem("platform-fixture-initialized")) {
      localStorage.setItem(key, "synthetic-token");
      sessionStorage.setItem("platform-fixture-initialized", "1");
    }
  }, tokenKey);
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
      if (request.resourceType() === "image") return route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><rect width="100%" height="100%" fill="#292524"/><text x="50" y="350" fill="#fbbf24" font-size="32">External image placeholder</text></svg>',
      });
      unexpected.push(`External request: ${url.origin}`);
      return route.abort();
    }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    requests.push({ method: request.method(), pathname: url.pathname, search: url.search, body: request.postData(), authorization: request.headers().authorization });
    const json = (body, status = 200) => route.fulfill({ json: body, status });
    if (fail[url.pathname]) return json({ detail: "Synthetic failure" }, fail[url.pathname]);
    if (url.pathname === "/api/auth/login") return json({ access_token: "synthetic-token", token_type: "bearer" });
    if (url.pathname === "/api/auth/me") return json({ ...user, role });
    if (url.pathname === "/api/profiles/me") return json(profile);
    if (url.pathname === "/api/users") return json([{ ...user, is_active: true, created_at: timestamp }]);
    if (url.pathname === "/api/users/display-names") return json([{ id: user.id, display_name: profile.name }]);
    if (url.pathname === "/api/suppliers") {
      if (request.method() === "POST") return json({ ...supplier, ...request.postDataJSON() }, 201);
      return json([supplier]);
    }
    if (url.pathname === "/api/incidents") {
      if (request.method() === "POST") return json({ ...incident, ...request.postDataJSON() }, 201);
      return json([incident]);
    }
    if (url.pathname === "/api/incidents/summary") return json({
      total: 1, by_status: { open: 1, in_progress: 0, resolved: 0, discarded: 0 },
      by_category: { equipment_failure: 1 }, by_origin: { branch: 1 }, by_branch: { miami_doral: 1 },
    });
    if (url.pathname === "/api/incidents/analyze") return json({ analysis_id: "synthetic-analysis" }, 201);
    if (url.pathname === "/api/incidents/results/synthetic-analysis") return json({
      analysis_id: "synthetic-analysis", company: "Synthetic company", source_file: "synthetic.csv",
      total_records: 1, valid_records: 1, invalid_records: 0, invalid_breakdown: {},
      by_category: { equipment_failure: { count: 1, percentage: 100 } },
      by_status: { open: { count: 1, percentage: 100 } },
      satisfaction: { closed_cases: 0, scored_cases: 0, average: null, scores: {} },
    });
    if (url.pathname === "/api/incidents/results/export") return route.fulfill({ contentType: "text/csv", body: "status\nopen\n" });
    if (url.pathname === `/api/incidents/${incident.id}/status`) return json({ ...incident, ...request.postDataJSON() });
    if (url.pathname === "/api/inventory/products") return json(products);
    if (url.pathname === "/api/inventory/orders") return json([{
      id: 1, type: "inbound", ingredient_id: 1, ingredient_name: products[0].name,
      quantity: 25, supplier_name: supplier.name, reason: null, location_id: 1,
      created_at: timestamp, user_uuid: user.id,
    }]);
    if (["/api/inventory/orders/inbound", "/api/inventory/orders/outbound"].includes(url.pathname)) {
      return json({ id: 2, ...request.postDataJSON() }, 201);
    }
    if (url.pathname === "/api/talent/records") {
      if (request.method() === "POST") return json({ ...candidate, ...request.postDataJSON() }, 201);
      return json({ total: scenario.talentTotal ?? 1, page: Number(url.searchParams.get("page") ?? 1), limit: 9, data: [candidate] });
    }
    if (url.pathname === `/api/talent/records/${candidate.id}`) {
      if (request.method() === "PATCH") scenario.currentCandidate = { ...candidate, ...request.postDataJSON() };
      return json(scenario.currentCandidate ?? candidate);
    }
    if (url.pathname === `/api/talent/records/${candidate.id}/notes`) {
      if (request.method() === "POST") {
        const note = { id: "synthetic-note", ...request.postDataJSON(), created_at: timestamp };
        scenario.notes = [...(scenario.notes ?? []), note];
        return json(note, 201);
      }
      return json(scenario.notes ?? []);
    }
    unexpected.push(`${request.method()} ${url.pathname}`);
    return json({ detail: "Unmocked platform request" }, 501);
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400 && new URL(response.url()).pathname.includes("/_next/")) {
      errors.push(`Asset HTTP ${response.status()}: ${response.url()}`);
    }
  });
  try {
    await run({ page, context, requests, fail, scenario });
    assert.deepEqual(unexpected, []);
    assert.deepEqual(errors, []);
  } finally {
    await context.close();
  }
}

for (const [name, route, authenticated] of views) {
  for (const [device, viewport] of [
    ["desktop", { width: 1365, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    test(`platform ${name} ${device}`, () => withPage({ authenticated, viewport }, async ({ page }) => {
      const response = await page.goto(`${base}${route}`);
      assert.equal(response.status(), 200);
      await page.locator("h1").first().waitFor();
      await page.waitForLoadState("networkidle");
      await page.evaluate(() => document.fonts.ready);
      assert.equal(new URL(page.url()).pathname, new URL(route, base).pathname);
      const layout = await page.evaluate(() => ({
        viewport: innerWidth, document: document.documentElement.scrollWidth,
        area: document.querySelector("[data-platform-area]")?.getAttribute("data-platform-area"),
        scrollSnap: getComputedStyle(document.documentElement).scrollSnapType,
        colorScheme: getComputedStyle(document.documentElement).colorScheme,
        font: getComputedStyle(document.querySelector("[data-platform-area]")).fontFamily,
      }));
      const knownManagerOverflow = name.startsWith("incident-") && device === "mobile" ? 200 : 0;
      assert.ok(layout.document <= layout.viewport + knownManagerOverflow, `New horizontal overflow: ${JSON.stringify(layout)}`);
      assert.equal(layout.area, ["/", "/application"].includes(route) ? "public" : "backoffice");
      assert.equal(layout.colorScheme, layout.area === "public" ? "normal" : "dark");
      if (layout.area === "backoffice") assert.equal(layout.scrollSnap, "none");
      if (output) await page.screenshot({ path: path.join(output, `${name}-${device}.png`), fullPage: true, animations: "disabled" });
      captures.push({ name, device, route, layout, headings: await page.locator("h1").allTextContents() });
    }));
  }
}

test("platform public routes do not initialize authentication, even with a stored token", () =>
  withPage({ authenticated: true }, async ({ page, requests }) => {
    for (const route of ["/", "/application"]) {
      await page.goto(`${base}${route}`);
      await page.locator("h1").first().waitFor();
      await page.waitForLoadState("networkidle");
      assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /index, follow/);
      assert.equal(await page.locator('script[type="application/ld+json"]').count(), route === "/" ? 1 : 2);
      assert.equal(await page.locator('img[src="/logo-brasaland.svg"]').evaluate((img) => img.complete && img.naturalWidth > 0), true);
    }
    assert.deepEqual(requests, []);
  }));

test("platform guards preserve the destination without revealing protected content", () =>
  withPage({}, async ({ page, requests }) => {
    for (const route of views.filter(([, , protectedView]) => protectedView).map(([, route]) => route)) {
      await page.goto(`${base}${route}`);
      await page.waitForURL((url) => url.pathname === "/login" && url.searchParams.get("next") === route);
      await page.locator("#auth-email").waitFor();
      assert.equal(await page.getByRole("heading", { name: "Servicios del backoffice" }).count(), 0);
    }
    assert.deepEqual(requests, []);
  }));

for (const [next, destination] of [
  [null, "/backoffice"], ["/", "/backoffice"],
  ["/backoffice", "/backoffice"], ["/account/profile", "/account/profile"],
  ["//evil.example", "/backoffice"], ["/unknown", "/backoffice"],
]) {
  test(`platform login destination ${next}`, () => withPage({}, async ({ page, requests }) => {
    await page.goto(`${base}/login${next === null ? "" : `?next=${encodeURIComponent(next)}`}`);
    await page.locator("#auth-email").fill(user.email);
    await page.locator("#auth-password").fill("synthetic-password");
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await page.waitForURL(`${base}${destination}`);
    await page.getByRole("link", { name: "Volver al dashboard", exact: true }).waitFor();
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), tokenKey), "synthetic-token");
    const login = requests.find(({ pathname }) => pathname === "/api/auth/login");
    assert.equal(new URLSearchParams(login.body).get("username"), user.email);
    assert.equal(requests.find(({ pathname }) => pathname === "/api/auth/me").authorization, "Bearer synthetic-token");
  }));
}

test("platform account links return to /backoffice and logout clears its session", () =>
  withPage({ authenticated: true }, async ({ page }) => {
    await page.goto(`${base}/backoffice`);
    await page.getByRole("link", { name: /Gestionar cuenta/ }).click();
    await page.waitForURL(`${base}/account`);
    await page.getByRole("link", { name: "Gestionar perfil" }).click();
    await page.waitForURL(`${base}/account/profile`);
    await page.locator("#profile-name").waitFor();
    await page.getByRole("link", { name: "Volver al dashboard", exact: true }).click();
    await page.waitForURL(`${base}/backoffice`);
    assert.match(await page.locator('meta[name="robots"]').getAttribute("content"), /noindex/);
    assert.equal(await page.locator('script[type="application/ld+json"]').count(), 0);
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await page.waitForURL(`${base}/login`);
    await page.locator("#auth-email").waitFor();
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), tokenKey), null);
  }));

test("platform 401 invalidation preserves the new dashboard destination", () =>
  withPage({ authenticated: true, fail: { "/api/auth/me": 401 } }, async ({ page }) => {
    await page.goto(`${base}/backoffice?ignored=1#catalog`);
    await page.waitForURL((url) => url.pathname === "/login" && url.searchParams.get("next") === "/backoffice");
    await page.locator("#auth-email").waitFor();
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), tokenKey), null);
  }));

test("platform transient auth failures remain explicit and retry without clearing the token", () =>
  withPage({ authenticated: true, fail: { "/api/auth/me": 503 } }, async ({ page, fail }) => {
    await page.goto(`${base}/backoffice`);
    await page.getByRole("alert").filter({ hasText: "No se pudo validar la sesion" }).waitFor();
    assert.equal(new URL(page.url()).pathname, "/backoffice");
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), tokenKey), "synthetic-token");
    delete fail["/api/auth/me"];
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await page.getByRole("heading", { name: "Servicios del backoffice" }).waitFor();
  }));

test("platform catalog opens all five modules without reloads or session revalidation", () =>
  withPage({ authenticated: true }, async ({ page, requests }) => {
    await page.goto(`${base}/backoffice`);
    await page.getByRole("heading", { name: "Servicios del backoffice" }).waitFor();
    assert.deepEqual(await page.getByRole("link", { name: "Abrir", exact: true }).evaluateAll((anchors) => anchors.map((a) => a.href)), [
      "/suppliers", "/incidents-analyzer", "/incidents-manager", "/inventory-management", "/talent-pipeline-tracker",
    ].map((route) => new URL(route, base).href));
    await page.evaluate(() => { window.platformNavigationSentinel = "same-document"; });
    for (const route of ["/suppliers", "/incidents-analyzer", "/incidents-manager", "/inventory-management", "/talent-pipeline-tracker"]) {
      await page.locator(`a[href="${route}"]`).click();
      await page.waitForURL(`${base}${route === "/inventory-management" ? `${route}/products` : route}`);
      await page.getByRole("link", { name: /Backoffice/i }).first().click();
      await page.waitForURL(`${base}/backoffice`);
      await page.getByRole("heading", { name: "Servicios del backoffice" }).waitFor();
      assert.equal(await page.evaluate(() => window.platformNavigationSentinel), "same-document");
    }
    assert.equal(requests.filter(({ pathname }) => pathname === "/api/auth/me").length, 1);
    assert.ok(requests.every(({ authorization }) => authorization === "Bearer synthetic-token"));
  }));

test("platform public form preserves local confirmation without API submissions", () =>
  withPage({}, async ({ page, requests }) => {
    await page.goto(`${base}/`);
    await page.getByRole("link", { name: "Recibir novedades" }).click();
    await page.waitForURL(`${base}/application`);
    for (const [name, value] of Object.entries({
      nombre: "Synthetic Contact", email: "contact@example.test", telefono: "+570000000000",
      ciudad: "Synthetic City", mensaje: "Synthetic request for platform validation only.",
    })) await page.locator(`[name="${name}"]`).fill(value);
    await page.locator('[name="pais"]').selectOption("Colombia");
    await page.locator('[name="interes"]').selectOption("novedades");
    await page.locator('[name="area"]').selectOption("operaciones");
    await page.locator('[name="consentimiento"]').check();
    await page.getByRole("button", { name: "Enviar aplicación" }).click();
    await page.getByRole("status").filter({ hasText: "Recibimos tu solicitud correctamente" }).waitFor();
    assert.deepEqual(requests, []);
    await page.getByRole("link", { name: "Volver al inicio" }).click();
    await page.waitForURL(`${base}/`);
    await page.getByRole("heading", { name: /Cocina a la brasa con/ }).waitFor();
  }));

test("platform module deep links survive reload without leaving the unified origin", () =>
  withPage({ authenticated: true }, async ({ page }) => {
    for (const [, route] of views.filter(([, route]) => /^\/(suppliers|incidents-|inventory-|talent-)/.test(route))) {
      await page.goto(`${base}${route}`);
      await page.locator("h1").first().waitFor();
      await page.reload();
      await page.locator("h1").first().waitFor();
      await page.waitForLoadState("networkidle");
      assert.equal(page.url(), `${base}${route}`);
    }
  }));

test("platform regular users cannot mount talent or inventory mutation views", () =>
  withPage({ authenticated: true, role: "user" }, async ({ page, requests }) => {
    for (const route of ["/talent-pipeline-tracker", `/talent-pipeline-tracker/candidates/${candidate.id}`, "/inventory-management/inbound", "/inventory-management/outbound"]) {
      await page.goto(`${base}${route}`);
      await page.getByRole("alert").filter({ hasText: "No tienes permiso" }).waitFor();
      assert.equal(await page.locator("form").count(), 0);
    }
    assert.ok(requests.every(({ pathname }) => pathname === "/api/auth/me"));
    await page.goto(`${base}/inventory-management/products`);
    await page.getByRole("heading", { name: "Productos y existencias" }).waitFor();
    assert.equal(await page.getByRole("link", { name: "Entrada", exact: true }).count(), 0);
    assert.equal(await page.getByRole("link", { name: "Salida", exact: true }).count(), 0);
    await page.goto(`${base}/suppliers`);
    await page.getByText(supplier.name, { exact: true }).waitFor();
    assert.equal(await page.getByRole("button", { name: /Nuevo proveedor/ }).count(), 0);
  }));

test("platform login can return to a module subroute using the same session document", () =>
  withPage({}, async ({ page, requests }) => {
    const destination = `/talent-pipeline-tracker/candidates/${candidate.id}`;
    await page.goto(`${base}/login?next=${encodeURIComponent(destination)}`);
    await page.locator("#auth-email").fill(user.email);
    await page.locator("#auth-password").fill("synthetic-password");
    await page.evaluate(() => { window.platformNavigationSentinel = "login-document"; });
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await page.waitForURL(`${base}${destination}`);
    await page.getByRole("heading", { name: candidate.full_name, exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.platformNavigationSentinel), "login-document");
    assert.equal(requests.filter(({ pathname }) => pathname === "/api/auth/me").length, 1);
  }));

test("platform module 401 returns to central login with a sanitized deep destination", () =>
  withPage({ authenticated: true, fail: { "/api/inventory/products": 401 } }, async ({ page }) => {
    await page.goto(`${base}/inventory-management/products?private=ignored#section`);
    await page.waitForURL((url) => url.pathname === "/login" && url.searchParams.get("next") === "/inventory-management/products");
    await page.locator("#auth-email").waitFor();
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), tokenKey), null);
  }));

test("platform logout from a module also terminates another tab", () =>
  withPage({ authenticated: true }, async ({ page, context }) => {
    await page.goto(`${base}/backoffice`);
    await page.getByRole("heading", { name: "Servicios del backoffice" }).waitFor();
    const other = await context.newPage();
    await other.goto(`${base}/inventory-management/products`);
    await other.getByRole("button", { name: "Cerrar sesión", exact: true }).waitFor();
    await other.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
    await other.waitForURL(`${base}/login`);
    await page.waitForURL(`${base}/login`);
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), tokenKey), null);
  }));

test("platform legacy module login aliases validate next and remain on the same origin", async () => {
  for (const [route, destination] of [
    ["/inventory-management/login", "/inventory-management"],
    ["/incidents-manager/login", "/incidents-manager"],
    ["/inventory-management/login?next=%2Finventory-management%2Forders", "/inventory-management/orders"],
    ["/incidents-manager/login?next=%2F%2Fevil.example", "/backoffice"],
    ["/incidents-manager/login?next=%2Fincidents-manager&next=%2Faccount", "/backoffice"],
  ]) {
    const response = await fetch(`${base}${route}`, { redirect: "manual" });
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), `/login?next=${encodeURIComponent(destination)}`);
  }
});

test("platform internal subnavigation preserves module prefixes, filters and session", () =>
  withPage({ authenticated: true, scenario: { talentTotal: 18 } }, async ({ page, requests }) => {
    await page.goto(`${base}/incidents-analyzer`);
    await page.getByRole("link", { name: "Analizar incidencias", exact: true }).click();
    await page.waitForURL(`${base}/incidents-analyzer/incidents`);
    await page.getByRole("link", { name: /Backoffice/ }).click();
    await page.waitForURL(`${base}/backoffice`);
    await page.locator('a[href="/incidents-manager"]').click();
    await page.getByRole("link", { name: "Incidencias", exact: true }).click();
    await page.waitForURL(`${base}/incidents-manager/incidents`);
    await page.getByRole("link", { name: "Resumen", exact: true }).click();
    await page.waitForURL(`${base}/incidents-manager/summary`);
    await page.getByRole("link", { name: /Backoffice/ }).click();
    await page.waitForURL(`${base}/backoffice`);
    await page.locator('a[href="/inventory-management"]').click();
    for (const [label, route] of [["Entrada", "inbound"], ["Salida", "outbound"], ["Órdenes", "orders"], ["Productos", "products"]]) {
      await page.getByRole("link", { name: label, exact: true }).click();
      await page.waitForURL(`${base}/inventory-management/${route}`);
    }
    await page.getByRole("link", { name: /Backoffice/ }).click();
    await page.waitForURL(`${base}/backoffice`);
    await page.locator('a[href="/talent-pipeline-tracker"]').click();
    await page.getByPlaceholder("Buscar por nombre o puesto").fill("Synthetic");
    await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/talent-pipeline-tracker" && url.searchParams.get("search") === "Synthetic");
    await page.getByRole("link", { name: "Siguiente", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/talent-pipeline-tracker" && url.searchParams.get("page") === "2" && url.searchParams.get("search") === "Synthetic");
    await page.getByRole("link").filter({ hasText: candidate.full_name }).click();
    await page.waitForURL(`${base}/talent-pipeline-tracker/candidates/${candidate.id}`);
    await page.getByRole("link", { name: "Volver", exact: true }).click();
    await page.waitForURL(`${base}/talent-pipeline-tracker`);
    assert.equal(requests.filter(({ pathname }) => pathname === "/api/auth/me").length, 1);
  }));

test("platform module styles and talent light mode do not leak into dashboard or website", () =>
  withPage({ authenticated: true }, async ({ page }) => {
    await page.goto(`${base}/backoffice`);
    const dashboardStyle = () => page.locator("h1").evaluate((h1) => {
      const style = getComputedStyle(h1);
      return { font: style.fontFamily, size: style.fontSize, weight: style.fontWeight, color: style.color };
    });
    const original = await dashboardStyle();
    await page.evaluate(() => { window.platformNavigationSentinel = "theme-document"; });
    await page.locator('a[href="/talent-pipeline-tracker"]').click();
    await page.getByRole("button", { name: "Modo oscuro" }).click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-platform-module="talent"]')).colorScheme === "light");
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), "dark");
    await page.getByRole("link", { name: "Backoffice", exact: true }).click();
    await page.waitForURL(`${base}/backoffice`);
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), "dark");
    assert.deepEqual(await dashboardStyle(), original);
    for (const route of ["/incidents-analyzer", "/incidents-manager", "/inventory-management"]) {
      await page.locator(`a[href="${route}"]`).click();
      await page.getByRole("link", { name: /Backoffice/ }).click();
      await page.waitForURL(`${base}/backoffice`);
      assert.deepEqual(await dashboardStyle(), original);
    }
    assert.equal(await page.evaluate(() => window.platformNavigationSentinel), "theme-document");
    await page.evaluate(() => window.history.pushState(null, "", "/"));
    await page.reload();
    await page.locator("h1").waitFor();
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), "normal");
  }));

test("platform supplier creation preserves payload and bearer authorization", () =>
  withPage({ authenticated: true }, async ({ page, requests }) => {
    await page.goto(`${base}/suppliers`);
    await page.getByRole("button", { name: /Nuevo proveedor/ }).click();
    const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Crear proveedor", exact: true }) });
    await form.getByLabel("Nombre", { exact: true }).fill("Synthetic New Supplier");
    await form.getByLabel("Tarifa por unidad", { exact: true }).fill("12.5");
    await form.getByRole("button", { name: "carne", exact: true }).click();
    await form.getByRole("button", { name: "Crear proveedor", exact: true }).click();
    await page.getByText("Proveedor creado correctamente.", { exact: true }).waitFor();
    const request = requests.find(({ method, pathname }) => method === "POST" && pathname === "/api/suppliers");
    assert.deepEqual(JSON.parse(request.body), { name: "Synthetic New Supplier", country: "Colombia", categories: ["carne"], rate_per_unit: 12.5, currency: "COP", status: "active" });
    assert.equal(request.authorization, "Bearer synthetic-token");
  }));

test("platform incidents retain registration and status mutation flows", () =>
  withPage({ authenticated: true }, async ({ page, requests }) => {
    await page.goto(`${base}/incidents-manager`);
    await page.locator("#title").fill("Synthetic new incident");
    await page.locator("#description").fill("Synthetic detailed incident description");
    await page.locator("#category").selectOption("equipment_failure");
    await page.locator('input[name="origin"][value="branch"]').check();
    await page.locator("#branch").selectOption("miami_doral");
    await page.locator('button[type="submit"]').click();
    await page.getByRole("status").filter({ hasText: "Incidencia registrada correctamente" }).waitFor();
    const create = requests.find(({ method, pathname }) => method === "POST" && pathname === "/api/incidents");
    assert.equal(JSON.parse(create.body).branch, "miami_doral");
    await page.getByRole("link", { name: "Incidencias", exact: true }).click();
    await page.getByRole("combobox", { name: `Cambiar estado de ${incident.title}`, exact: true }).selectOption("in_progress");
    await page.getByRole("status").filter({ hasText: "actualizado" }).waitFor();
    const update = requests.find(({ method }) => method === "PATCH");
    assert.equal(update.pathname, `/api/incidents/${incident.id}/status`);
    assert.deepEqual(JSON.parse(update.body), { status: "in_progress" });
  }));

test("platform analyzer retains multipart upload, results and CSV download", () =>
  withPage({ authenticated: true }, async ({ page, requests }) => {
    await page.goto(`${base}/incidents-analyzer/incidents`);
    await page.locator('input[type="file"]').setInputFiles({ name: "synthetic.csv", mimeType: "text/csv", buffer: Buffer.from("status\nopen\n") });
    await page.locator('button[type="submit"]').click();
    const downloadButton = page.getByRole("button", { name: /Descargar/ });
    await downloadButton.waitFor();
    const downloaded = page.waitForEvent("download");
    await downloadButton.click();
    assert.equal((await downloaded).suggestedFilename(), "results.csv");
    const upload = requests.find(({ pathname }) => pathname === "/api/incidents/analyze");
    assert.match(upload.body, /filename="synthetic.csv"/);
    assert.ok(requests.some(({ pathname, search }) => pathname === "/api/incidents/results/export" && search === "?analysis_id=synthetic-analysis"));
  }));

test("platform inventory preserves inbound and outbound write contracts", () =>
  withPage({ authenticated: true }, async ({ page, requests }) => {
    await page.goto(`${base}/inventory-management/inbound`);
    await page.getByLabel("Producto", { exact: true }).selectOption("3");
    await page.getByLabel("Sede", { exact: true }).selectOption("1");
    await page.getByLabel("Cantidad recibida", { exact: true }).fill("5");
    await page.getByLabel("Proveedor y referencia de entrega", { exact: true }).fill("Synthetic Supplier");
    await page.getByRole("button", { name: "Registrar entrada", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Entrada registrada correctamente" }).waitFor();
    const inbound = requests.find(({ method, pathname }) => method === "POST" && pathname.endsWith("/inbound"));
    assert.deepEqual(JSON.parse(inbound.body), { ingredient_id: 3, location_id: 1, quantity: 5, supplier_name: "Synthetic Supplier" });
    await page.getByRole("link", { name: "Salida", exact: true }).click();
    await page.waitForURL(`${base}/inventory-management/outbound`);
    await page.getByRole("heading", { name: "Registrar salida", exact: true }).waitFor();
    await page.getByLabel("Producto", { exact: true }).selectOption("3");
    await page.getByLabel("Sede", { exact: true }).selectOption("1");
    await page.locator("#quantity").fill("2");
    await page.locator("#reason").selectOption("consumption");
    await page.getByRole("button", { name: "Registrar salida", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Salida registrada correctamente" }).waitFor();
    const outbound = requests.find(({ method, pathname }) => method === "POST" && pathname.endsWith("/outbound"));
    assert.deepEqual(JSON.parse(outbound.body), { ingredient_id: 3, location_id: 1, quantity: 2, reason: "consumption" });
  }));

test("platform talent retains synthetic create, stage/status and note contracts", () =>
  withPage({ authenticated: true }, async ({ page, requests }) => {
    await page.goto(`${base}/talent-pipeline-tracker`);
    await page.getByText("Ingresar nueva candidatura", { exact: true }).click();
    const form = page.locator("details form");
    for (const [name, value] of Object.entries({
      full_name: "Synthetic New Candidate", email: "new-candidate@example.test", phone: "0000000000",
      position: "Cocina", cv_url: "https://example.test/synthetic-cv.pdf", experience_years: "3",
    })) await form.locator(`[name="${name}"]`).fill(value);
    await form.locator('button[type="submit"]').click();
    await page.getByText("Candidatura creada exitosamente.", { exact: true }).waitFor();
    const create = requests.find(({ method, pathname }) => method === "POST" && pathname === "/api/talent/records");
    assert.equal(JSON.parse(create.body).email, "new-candidate@example.test");
    await page.getByRole("link").filter({ hasText: candidate.full_name }).click();
    await page.waitForURL(`${base}/talent-pipeline-tracker/candidates/${candidate.id}`);
    await page.locator("select").selectOption("stage:review");
    await page.getByText(/Etapa actual: Revisión/).waitFor();
    const update = requests.find(({ method }) => method === "PATCH");
    assert.deepEqual(JSON.parse(update.body), { status: "received", stage: "review" });
    await page.getByLabel("Nueva nota", { exact: true }).fill("Synthetic internal note");
    await page.getByRole("button", { name: "Agregar nota", exact: true }).click();
    await page.getByText("Synthetic internal note", { exact: true }).waitFor();
    const note = requests.find(({ method, pathname }) => method === "POST" && pathname.endsWith("/notes"));
    assert.deepEqual(JSON.parse(note.body), { content: "Synthetic internal note" });
  }));
