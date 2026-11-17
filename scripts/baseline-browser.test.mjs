import assert from "node:assert/strict";
import { mkdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import test, { after, before } from "node:test";
import { root } from "./backoffice.mjs";
import { tokenKey, timestamp, profile, user, supplier, incident, products, candidate } from "./backoffice-fixtures.mjs";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
if (!process.env.BASELINE_OUTPUT) throw new Error("BASELINE_OUTPUT debe indicar una salida fuera del repositorio.");
await mkdir(process.env.BASELINE_OUTPUT, { recursive: true });
const output = await realpath(process.env.BASELINE_OUTPUT);
const repository = await realpath(root);
assert.ok(output !== repository && !output.startsWith(`${repository}${path.sep}`));
const base = "http://localhost:3000";
const website = "http://localhost:3006";
const routes = [
  ["website", website, "/", false],
  ["application", website, "/application", false],
  ["login", base, "/login", false],
  ["register", base, "/register", false],
  ["forgot-password", base, "/forgot-password", false],
  ["reset-invalid", base, "/reset-password", false],
  ["reset-password", base, "/reset-password?token=synthetic-token", false],
  ["dashboard", base, "/", true],
  ["account", base, "/account", true],
  ["profile", base, "/account/profile", true],
  ["change-password", base, "/account/change-password", true],
  ["suppliers", base, "/suppliers", true],
  ["analyzer-home", base, "/incidents-analyzer", true],
  ["analyzer-upload", base, "/incidents-analyzer/incidents", true],
  ["incident-create", base, "/incidents-manager", true],
  ["incident-list", base, "/incidents-manager/incidents", true],
  ["incident-summary", base, "/incidents-manager/summary", true],
  ["products", base, "/inventory-management/products", true],
  ["inbound", base, "/inventory-management/inbound", true],
  ["outbound", base, "/inventory-management/outbound", true],
  ["orders", base, "/inventory-management/orders", true],
  ["talent-list", base, "/talent-pipeline-tracker", true],
  ["talent-detail", base, "/talent-pipeline-tracker/candidates/synthetic-candidate", true],
];
const results = [];
let browser;
before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => {
  await browser?.close();
  await writeFile(path.join(output, "visual.json"), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    scope: "Real UIs; mocked APIs; external images replaced; not backend E2E or pixel comparison",
    results,
  }, null, 2)}\n`);
  const cards = results.filter(({ screenshot }) => screenshot).map((record) =>
    `<article><h2>${record.name} / ${record.device}</h2><p>${record.route}</p><p>Width: ${record.layout.document} / viewport: ${record.layout.viewport}</p><a href="${record.screenshot}"><img loading="lazy" src="${record.screenshot}" alt="${record.name} ${record.device}"></a></article>`,
  ).join("\n");
  await writeFile(path.join(output, "index.html"), `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Brasaland phase 1 visual baseline</title>
<style>body{font-family:system-ui;background:#171717;color:#eee;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}article{min-width:0}img{width:100%;max-height:650px;object-fit:contain;object-position:top;background:#292524}a{color:#fbbf24}</style>
<h1>Brasaland phase 1 visual baseline</h1><p>Real UIs; synthetic APIs; external image placeholders; not a pixel comparison.</p><main>${cards}</main></html>`);
});

async function fixtureContext({ authenticated = true, role = "manager", viewport } = {}) {
  const context = await browser.newContext({ viewport, locale: "es-CO", timezoneId: "UTC", reducedMotion: "reduce", serviceWorkers: "block" });
  await context.clock.setFixedTime(new Date("2026-11-14T20:00:00Z"));
  if (authenticated) await context.addInitScript(({ key }) => {
    localStorage.setItem(key, "synthetic-token");
  }, { key: tokenKey });
  const unexpected = [];
  const apiRequests = [];
  await context.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
      if (request.resourceType() === "image") return route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700"><rect width="100%" height="100%" fill="#292524"/><text x="50" y="350" fill="#fbbf24" font-size="32">External image placeholder</text></svg>',
      });
      unexpected.push(`External request blocked: ${url.origin}`);
      return route.abort();
    }
    if (!url.pathname.startsWith("/api/")) return route.continue();
    apiRequests.push({ method: request.method(), pathname: url.pathname });
    const json = (body, status = 200) => route.fulfill({ status, json: body });
    if (url.pathname === "/api/auth/me") return json({ ...user, role });
    if (url.pathname === "/api/users") return json([{ ...user, role, is_active: true, created_at: timestamp }]);
    if (url.pathname === "/api/profiles/me") return json(profile);
    if (url.pathname === "/api/users/display-names") return json([{ id: user.id, display_name: profile.name }]);
    if (url.pathname === "/api/suppliers") return json([supplier]);
    if (url.pathname === "/api/incidents") return json([incident]);
    if (url.pathname === "/api/incidents/summary") return json({
      total: 1, by_status: { open: 1, in_progress: 0, resolved: 0, discarded: 0 },
      by_category: { equipment_failure: 1 }, by_origin: { branch: 1 }, by_branch: { miami_doral: 1 },
    });
    if (url.pathname === "/api/inventory/products") return json(products);
    if (url.pathname === "/api/inventory/orders") return json([{
      id: 1, type: "inbound", ingredient_id: 1, ingredient_name: products[0].name,
      quantity: 25, supplier_name: supplier.name, reason: null, location_id: 1,
      created_at: timestamp, user_uuid: user.id,
    }]);
    if (url.pathname === "/api/talent/records") return json({ total: 1, page: 1, limit: 9, data: [candidate] });
    if (url.pathname === "/api/talent/records/synthetic-candidate") return json(candidate);
    if (url.pathname === "/api/talent/records/synthetic-candidate/notes") return json([]);
    unexpected.push(`Unmocked API: ${request.method()} ${url.pathname}`);
    return json({ detail: "Unexpected baseline request" }, 501);
  });
  return { context, unexpected, apiRequests };
}

for (const [name, origin, route, authenticated] of routes) {
  for (const [device, viewport] of [
    ["desktop", { width: 1365, height: 1000 }],
    ["mobile", { width: 390, height: 844 }],
  ]) {
    test(`baseline ${name} ${device}`, async () => {
      const { context, unexpected } = await fixtureContext({ authenticated, viewport });
      const errors = [];
      const page = await context.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("response", (response) => {
        if (response.status() >= 400 && new URL(response.url()).pathname.includes("/_next/")) {
          errors.push(`Asset HTTP ${response.status()}: ${new URL(response.url()).pathname}`);
        }
      });
      const record = { name, device, route, status: "failed" };
      results.push(record);
      try {
        const response = await page.goto(`${origin}${route}`);
        assert.ok(response.ok(), `HTTP ${response.status()}`);
        await page.locator("h1").first().waitFor();
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);
        assert.equal(new URL(page.url()).pathname, new URL(route, origin).pathname);
        const screenshot = `${name}-${device}.png`;
        await page.screenshot({ path: path.join(output, screenshot), fullPage: true, animations: "disabled" });
        Object.assign(record, {
          screenshot, headings: await page.locator("h1").allTextContents(),
          layout: await page.evaluate(() => ({
            viewport: innerWidth,
            document: document.documentElement.scrollWidth,
            overflowingElements: [...document.querySelectorAll("body *")]
              .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
              .slice(0, 10).map((element) => ({ tag: element.tagName, className: element.className })),
          })),
          links: await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => ({
            text: anchor.textContent.trim(), href: anchor.getAttribute("href"),
          }))),
        });
        assert.deepEqual(errors, []);
        assert.deepEqual(unexpected, []);
        record.status = "passed";
      } catch (error) {
        record.error = error.message;
        throw error;
      } finally {
        await context.close();
      }
    });
  }
}

test("baseline anonymous access preserves protected destinations", async () => {
  const { context, unexpected, apiRequests } = await fixtureContext({ authenticated: false });
  try {
    const page = await context.newPage();
    for (const route of ["/", "/account", "/account/profile", "/account/change-password",
      "/suppliers", "/incidents-analyzer", "/incidents-manager", "/incidents-manager/incidents",
      "/inventory-management/products", "/inventory-management/inbound", "/inventory-management/outbound",
      "/inventory-management/orders", "/talent-pipeline-tracker", "/talent-pipeline-tracker/candidates/synthetic-candidate"]) {
      await page.goto(`${base}${route}`);
      await page.waitForURL((url) => url.pathname === "/login" && url.searchParams.get("next") === route);
      await page.locator("#auth-email").waitFor();
    }
    assert.deepEqual(unexpected, []);
    assert.deepEqual(apiRequests, []);
  } finally { await context.close(); }
});

test("baseline user cannot enter talent or inventory write views", async () => {
  const { context, unexpected, apiRequests } = await fixtureContext({ role: "user" });
  try {
    const page = await context.newPage();
    for (const route of ["/talent-pipeline-tracker", "/inventory-management/inbound", "/inventory-management/outbound"]) {
      await page.goto(`${base}${route}`);
      await page.getByRole("alert").filter({ hasText: "No tienes permiso" }).waitFor();
    }
    assert.deepEqual(unexpected, []);
    assert.ok(apiRequests.every(({ pathname }) => pathname === "/api/auth/me"));
  } finally { await context.close(); }
});

test("baseline catalog opens all five modules and their backoffice links return home", async () => {
  const { context, unexpected } = await fixtureContext();
  try {
    const page = await context.newPage();
    for (const route of ["/suppliers", "/incidents-analyzer", "/incidents-manager", "/inventory-management", "/talent-pipeline-tracker"]) {
      await page.goto(base);
      await page.locator(`a[href="${route}"]`).click();
      await page.waitForURL((url) => url.pathname === (route === "/inventory-management" ? `${route}/products` : route));
      await page.getByRole("link", { name: /Backoffice/i }).first().click();
      await page.waitForURL(`${base}/`);
      await page.getByRole("heading", { name: "Servicios del backoffice" }).waitFor();
    }
    assert.deepEqual(unexpected, []);
  } finally { await context.close(); }
});

test("baseline legacy entrypoints retain their redirects", async () => {
  for (const [url, destination] of [
    ["http://localhost:3001/", "/suppliers"],
    ["http://localhost:3001/login", `${base}/login?next=%2Fsuppliers`],
    ["http://localhost:3001/register", `${base}/register?next=%2Fsuppliers`],
    [`${base}/inventory-management/login`, "/login?next=%2Finventory-management"],
    [`${base}/incidents-manager/login`, `${base}/login?next=%2Fincidents-manager`],
  ]) {
    const response = await fetch(url, { redirect: "manual" });
    assert.equal(response.status, 307, url);
    assert.equal(new URL(response.headers.get("location"), url).href, new URL(destination, url).href, url);
  }
});

test("baseline public interest form confirms locally without API traffic", async () => {
  const { context, unexpected, apiRequests } = await fixtureContext({ authenticated: false });
  try {
    const page = await context.newPage();
    await page.goto(`${website}/application`);
    for (const [name, value] of Object.entries({
      nombre: "Synthetic Contact", email: "contact@example.test", telefono: "+570000000000",
      ciudad: "Synthetic City", mensaje: "Synthetic request for baseline validation only.",
    })) await page.locator(`#${name}`).fill(value);
    for (const [name, value] of Object.entries({ pais: "Colombia", interes: "novedades", area: "operaciones" })) {
      await page.locator(`#${name}`).selectOption(value);
    }
    await page.locator("#consentimiento").check();
    await page.getByRole("button", { name: "Enviar aplicación" }).click();
    await page.getByRole("status").filter({ hasText: "Recibimos tu solicitud correctamente" }).waitFor();
    assert.equal(await page.locator("#nombre").inputValue(), "");
    assert.deepEqual(apiRequests, []);
    assert.deepEqual(unexpected, []);
  } finally { await context.close(); }
});
