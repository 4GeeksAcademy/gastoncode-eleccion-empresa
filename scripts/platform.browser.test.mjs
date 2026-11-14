import assert from "node:assert/strict";
import { mkdir, realpath, writeFile } from "node:fs/promises";
import path from "node:path";
import test, { after, before } from "node:test";
import { root } from "./backoffice.mjs";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.PLATFORM_URL ?? "http://localhost:3007";
const legacy = process.env.LEGACY_BACKOFFICE_URL ?? "http://localhost:3000";
const tokenKey = "brasaland.backoffice.token";
const profile = { id: "synthetic-profile", user_id: "synthetic-user", name: "Synthetic Manager", phone: null, address: null };
const user = { id: "synthetic-user", email: "synthetic@example.test", role: "manager", profile };
const timestamp = "2026-11-01T10:00:00Z";
const views = [
  ["website", "/", false], ["application", "/application", false],
  ["dashboard", "/backoffice", true], ["login", "/login", false],
  ["register", "/register", false], ["forgot-password", "/forgot-password", false],
  ["reset-invalid", "/reset-password", false],
  ["reset-password", "/reset-password?token=synthetic-token", false],
  ["account", "/account", true], ["profile", "/account/profile", true],
  ["change-password", "/account/change-password", true],
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
<html lang="en"><meta charset="utf-8"><title>Brasaland platform phase 2</title>
<style>body{font-family:system-ui;background:#171717;color:#eee;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px}article{min-width:0}img{width:100%;max-height:650px;object-fit:contain;object-position:top;background:#292524}a{color:#fbbf24}</style>
<h1>Brasaland platform phase 2</h1><p>Real frontend; synthetic APIs and external image placeholders.</p><main>${cards}</main></html>`);
  }
});

async function withPage(options, run) {
  const { authenticated = false, viewport = { width: 1365, height: 1000 }, fail = {} } = options;
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
    requests.push({ method: request.method(), pathname: url.pathname, body: request.postData(), authorization: request.headers().authorization });
    const json = (body, status = 200) => route.fulfill({ json: body, status });
    if (fail[url.pathname]) return json({ detail: "Synthetic failure" }, fail[url.pathname]);
    if (url.pathname === "/api/auth/login") return json({ access_token: "synthetic-token", token_type: "bearer" });
    if (url.pathname === "/api/auth/me") return json(user);
    if (url.pathname === "/api/profiles/me") return json(profile);
    if (url.pathname === "/api/users") return json([{ ...user, is_active: true, created_at: timestamp }]);
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
    await run({ page, context, requests, fail });
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
      assert.ok(layout.document <= layout.viewport, `Horizontal overflow: ${JSON.stringify(layout)}`);
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
    for (const route of ["/backoffice", "/account", "/account/profile", "/account/change-password"]) {
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

test("platform catalog retains five modules in their original backoffice", () =>
  withPage({ authenticated: true }, async ({ page }) => {
    await page.goto(`${base}/backoffice`);
    await page.getByRole("heading", { name: "Servicios del backoffice" }).waitFor();
    assert.deepEqual(await page.getByRole("link", { name: "Abrir", exact: true }).evaluateAll((anchors) => anchors.map((a) => a.href)), [
      "/suppliers", "/incidents-analyzer", "/incidents-manager", "/inventory-management", "/talent-pipeline-tracker",
    ].map((route) => new URL(route, legacy).href));
    for (const route of ["/suppliers", "/incidents-manager/summary?status=open", "/inventory-management/products", "/talent-pipeline-tracker/candidates/synthetic-candidate"]) {
      const response = await fetch(`${base}${route}`, { redirect: "manual" });
      assert.equal(response.status, 307);
      assert.equal(new URL(response.headers.get("location"), base).href, new URL(route, legacy).href);
    }
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
