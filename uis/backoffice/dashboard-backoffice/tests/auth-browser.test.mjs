import assert from "node:assert/strict";
import test, { before, after, beforeEach, afterEach } from "node:test";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const base = process.env.DASHBOARD_URL ?? "http://localhost:3000";
const tokenKey = "brasaland.dashboard.token";
const user = {
  id: "test-user", email: "person@example.com", role: "user",
  profile: { id: "profile-id", user_id: "test-user", name: "Ana Test", phone: null, address: null },
};
let browser;
let context;
let page;
let failures;
let calls;
let scenario;
const directoryUsers = [
  { id: "test-user", email: "person@example.com", role: "user", is_active: true, created_at: "2026-10-03T12:00:00Z" },
  { id: "other-user", email: "other@example.com", role: "manager", is_active: false, created_at: "2026-10-02T12:00:00Z" },
];
const fixtureProfile = {
  id: "profile-id", user_id: "test-user", name: "Ana Test", phone: "+57 300 000 0000", address: "Medellín",
};

before(async () => { browser = await chromium.launch({ headless: true }); });
after(async () => { await browser?.close(); });

beforeEach(async () => {
  failures = [];
  calls = [];
  scenario = {};
  scenario.user = { ...user, role: scenario.role ?? user.role };
  scenario.users = directoryUsers.map((account) => ({ ...account }));
  scenario.profile = { ...fixtureProfile };
  context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  context.on("page", (currentPage) => currentPage.on("pageerror", (error) => failures.push(error.message)));
  await context.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    calls.push({ path, method: request.method(), headers: request.headers(), body: request.postData() });
    if (path === "/api/auth/login") {
      if (scenario.loginGate) await scenario.loginGate;
      const status = scenario.loginStatus ?? 200;
      return route.fulfill({ status, json: status === 200
        ? { access_token: "fixture-token", token_type: "bearer" }
        : { detail: "Email o contrasena incorrectos" } });
    }
    if (path === "/api/auth/me") {
      if (scenario.networkFailure) return route.abort("failed");
      const status = scenario.meStatus ?? 200;
      return route.fulfill({ status, json: status === 200 ? scenario.user : { detail: "Sesion no valida" } });
    }
    if (path === "/api/users" && request.method() === "GET") {
      return route.fulfill({ status: scenario.usersStatus ?? 200, json: scenario.usersStatus === 403 ? { detail: "Permiso denegado" } : scenario.users });
    }
    if (path.startsWith("/api/users/") && request.method() === "PUT") {
      const id = decodeURIComponent(path.slice("/api/users/".length));
      const changes = JSON.parse(request.postData() ?? "{}");
      const index = scenario.users.findIndex((account) => account.id === id);
      if (index < 0) return route.fulfill({ status: 404, json: { detail: "Usuario no encontrado" } });
      scenario.users[index] = { ...scenario.users[index], ...changes };
      return route.fulfill({ json: scenario.users[index] });
    }
    if (path === "/api/profiles/me" && request.method() === "GET") {
      return route.fulfill({ json: scenario.profile });
    }
    if (path === "/api/profiles/me" && request.method() === "PUT") {
      scenario.profile = { ...scenario.profile, ...JSON.parse(request.postData() ?? "{}") };
      return route.fulfill({ json: scenario.profile });
    }
    if (path === "/api/users" && request.method() === "POST") {
      const status = scenario.registerStatus ?? 200;
      return route.fulfill({ status, json: status === 200
        ? { user: { ...user, is_active: true, created_at: "2026-10-03" }, profile: user.profile }
        : { detail: "El email ya esta registrado" } });
    }
    return route.fulfill({ status: 404, json: { detail: "Unexpected test endpoint" } });
  });
  page = await context.newPage();
});

afterEach(async () => {
  await context?.close();
  assert.deepEqual(failures, [], "Unexpected browser exception");
});

async function openForm(route = "/login") {
  await page.goto(`${base}${route}`);
  await page.locator("#auth-email").waitFor({ state: "visible" });
}

async function fillCredentials() {
  await page.getByLabel("Email", { exact: true }).fill("person@example.com");
  await page.getByLabel("Contrase\u00f1a", { exact: true }).fill("fixture-password");
}

async function login() {
  await openForm();
  await fillCredentials();
  await page.getByRole("button", { name: "Iniciar sesi\u00f3n", exact: true }).click();
  try {
    await page.getByRole("button", { name: "Cerrar sesi\u00f3n" }).waitFor({ timeout: 5000 });
  } catch (failure) {
    console.error("Login diagnostic:", page.url(), await page.locator("body").innerText(), calls, failures);
    throw failure;
  }
}

async function loginAs(role = "user") {
  scenario.user = { ...scenario.user, role };
  await login();
}

async function savedToken() {
  return page.evaluate((key) => localStorage.getItem(key), tokenKey);
}

async function waitForFormOutcome(successText) {
  try {
    await page.waitForFunction((text) =>
      document.querySelector("p[role='status']")?.textContent === text ||
      document.querySelector("p[role='alert']") !== null,
    successText, { timeout: 3000 });
  } catch (failure) {
    console.error("Form outcome diagnostic:", await page.locator("main").innerText(), calls);
    throw failure;
  }
  const alert = await page.locator("p[role='alert']").allInnerTexts();
  assert.deepEqual(alert, [], alert.join(" "));
}

test("anonymous dashboard redirects to login without rendering its tools", async () => {
  await page.goto(base);
  await page.waitForURL("**/login?next=%2F");
  await page.locator("#auth-email").waitFor();
  assert.equal(await page.getByText("Servicios del backoffice", { exact: true }).count(), 0);
  assert.equal(calls.length, 0);
});

test("direct visits to account and profile redirect anonymous users to login", async () => {
  for (const route of ["/account", "/account/profile"]) {
    await page.goto(`${base}${route}`);
    await page.waitForURL((url) => url.pathname === "/login" && url.searchParams.get("next") === route);
    await page.locator("#auth-email").waitFor();
    assert.equal(calls.length, 0);
  }
});

test("registration rejects mismatched passwords before calling the API", async () => {
  await openForm("/register");
  await fillCredentials();
  await page.getByLabel("Confirmar contrase\u00f1a").fill("different-password");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.locator("#auth-error").waitFor();
  assert.match(await page.locator("#auth-error").innerText(), /no coinciden/);
  assert.equal(calls.length, 0);
});

test("invalid email is blocked by native validation", async () => {
  await openForm("/register");
  await fillCredentials();
  await page.getByLabel("Email", { exact: true }).fill("not-an-email");
  await page.getByLabel("Confirmar contrase\u00f1a").fill("fixture-password");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  assert.equal(await page.locator("#auth-email").evaluate((input) => input.validity.typeMismatch), true);
  assert.equal(calls.length, 0);
});

test("registration redirects to confirmed login without storing a token", async () => {
  await openForm("/register");
  await page.getByLabel("Nombre (opcional)").fill("Ana Test");
  await fillCredentials();
  await page.getByLabel("Confirmar contrase\u00f1a").fill("fixture-password");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.waitForURL("**/login?registered=1&next=%2F");
  await page.getByText("Cuenta creada. Ya puedes iniciar sesi\u00f3n.").waitFor();
  assert.equal(await savedToken(), null);
  assert.equal(calls.length, 1);
  assert.equal(JSON.parse(calls[0].body).name, "Ana Test");
  assert.equal(calls[0].headers.authorization, undefined);
});

test("duplicate registration displays the API error", async () => {
  scenario.registerStatus = 400;
  await openForm("/register");
  await fillCredentials();
  await page.getByLabel("Confirmar contrase\u00f1a").fill("fixture-password");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.locator("#auth-error").waitFor();
  assert.match(await page.locator("#auth-error").innerText(), /ya esta registrado/);
  assert.equal(await savedToken(), null);
});

test("invalid credentials stay on login without a stored token", async () => {
  scenario.loginStatus = 401;
  await openForm();
  await fillCredentials();
  await page.getByRole("button", { name: "Iniciar sesi\u00f3n", exact: true }).click();
  await page.locator("#auth-error").waitFor();
  assert.match(await page.locator("#auth-error").innerText(), /incorrectos/);
  assert.equal(new URL(page.url()).pathname, "/login");
  assert.equal(await savedToken(), null);
});

test("login sends OAuth2 and Bearer, survives reload and logout removes the token", async () => {
  await login();
  assert.equal(await savedToken(), "fixture-token");
  const form = new URLSearchParams(calls.find((call) => call.path.endsWith("/login")).body);
  assert.equal(form.get("username"), "person@example.com");
  assert.equal(form.get("password"), "fixture-password");
  assert.equal(calls.find((call) => call.path.endsWith("/me")).headers.authorization, "Bearer fixture-token");
  await page.reload();
  await page.getByRole("button", { name: "Cerrar sesi\u00f3n" }).waitFor();
  assert.ok(calls.filter((call) => call.path.endsWith("/me")).length >= 2);
  await page.getByRole("button", { name: "Cerrar sesi\u00f3n" }).click();
  await page.waitForURL((url) => url.pathname === "/login");
  assert.equal(await savedToken(), null);
});

test("expired session clears token and returns to login", async () => {
  await login();
  scenario.meStatus = 401;
  await page.reload();
  await page.locator("#auth-email").waitFor();
  assert.equal(new URL(page.url()).pathname, "/login");
  assert.equal(await savedToken(), null);
});

test("network outage preserves token and guard retry restores the dashboard", async () => {
  await login();
  scenario.networkFailure = true;
  await page.reload();
  await page.getByRole("button", { name: "Reintentar", exact: true }).waitFor();
  assert.equal(await savedToken(), "fixture-token");
  scenario.networkFailure = false;
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await page.getByRole("button", { name: "Cerrar sesi\u00f3n" }).waitFor();
});

test("logout synchronizes to another tab", async () => {
  await login();
  const otherTab = await context.newPage();
  await otherTab.goto(base);
  await otherTab.getByRole("button", { name: "Cerrar sesi\u00f3n" }).waitFor();
  await page.getByRole("button", { name: "Cerrar sesi\u00f3n" }).click();
  await otherTab.waitForURL((url) => url.pathname === "/login");
  assert.equal(await savedToken(), null);
});

test("external next is rejected and passwords can be revealed", async () => {
  await openForm("/login?next=https%3A%2F%2Fexample.com");
  await fillCredentials();
  await page.getByLabel("Mostrar contrase\u00f1a").check();
  assert.equal(await page.locator("#auth-password").getAttribute("type"), "text");
  await page.getByRole("button", { name: "Iniciar sesi\u00f3n", exact: true }).click();
  await page.getByRole("button", { name: "Cerrar sesi\u00f3n" }).waitFor();
  assert.equal(new URL(page.url()).pathname, "/");
  assert.equal(new URL(page.url()).origin, new URL(base).origin);
});

test("submit is disabled during an in-flight login", async () => {
  let release;
  scenario.loginGate = new Promise((resolve) => { release = resolve; });
  await openForm();
  await fillCredentials();
  await page.getByRole("button", { name: "Iniciar sesi\u00f3n", exact: true }).click();
  try {
    await page.waitForFunction(() => document.querySelector('button[type="submit"]')?.disabled);
    assert.equal(await page.locator("#auth-email").isDisabled(), true);
  } finally {
    release();
  }
  await page.getByRole("button", { name: "Cerrar sesi\u00f3n" }).waitFor();
});

test("desktop and mobile auth views fit their viewport and produce screenshots", async () => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(viewport);
    for (const route of ["login", "register"]) {
      await openForm(`/${route}`);
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(hasOverflow, false);
      for (const input of await page.locator('input:not([type="checkbox"])').all()) {
        const box = await input.boundingBox();
        assert.ok(box && box.width > 200 && box.x >= 0 && box.x + box.width <= viewport.width);
      }
      await page.screenshot({ path: `/tmp/brasaland-auth-${route}-${viewport.width}.png`, fullPage: true });
    }
  }
  await login();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  await page.screenshot({ path: "/tmp/brasaland-auth-dashboard-mobile.png", fullPage: true });
});

test("regular user can change own email and cannot load the user directory", async () => {
  await loginAs("user");
  await page.getByRole("link", { name: "Gestionar cuenta de Ana Test" }).click();
  await page.waitForURL("**/account");
  await page.goto(`${base}/account`);
  await page.getByRole("heading", { name: "Cuenta", exact: true }).waitFor();
  assert.equal(calls.some((call) => call.path === "/api/users" && call.method === "GET"), false);
  assert.equal(await page.getByRole("heading", { name: "Directorio de cuentas" }).count(), 0);
  await page.getByLabel("Email", { exact: true }).fill("updated@example.com");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await waitForFormOutcome("Los datos de acceso se actualizaron.");
  const update = calls.find((call) => call.path === "/api/users/test-user" && call.method === "PUT");
  assert.equal(JSON.parse(update.body).email, "updated@example.com");
  assert.equal(JSON.parse(update.body).password, undefined);
});

test("manager can read the directory but receives no edit controls", async () => {
  await loginAs("manager");
  await page.goto(`${base}/account`);
  await page.getByRole("heading", { name: "Directorio de cuentas" }).waitFor();
  await page.locator("tr").filter({ hasText: "other@example.com" }).waitFor();
  assert.ok(calls.some((call) => call.path === "/api/users" && call.method === "GET"));
  assert.equal(await page.getByRole("button", { name: "Editar other@example.com" }).count(), 0);
});

test("admin can update another account role and active status", async () => {
  await loginAs("admin");
  await page.goto(`${base}/account`);
  await page.getByRole("button", { name: "Editar other@example.com" }).waitFor();
  await page.getByRole("button", { name: "Editar other@example.com" }).click();
  await page.getByLabel("Rol", { exact: true }).selectOption("admin");
  await page.getByLabel("Cuenta activa", { exact: true }).check();
  await page.getByRole("button", { name: "Guardar cuenta" }).click();
  await page.getByText("La cuenta se actualizó.").waitFor();
  const update = calls.find((call) => call.path === "/api/users/other-user" && call.method === "PUT");
  assert.deepEqual(JSON.parse(update.body), { role: "admin", is_active: true });
});

test("profile view loads and updates only the current user's profile", async () => {
  await login();
  await page.goto(`${base}/account/profile`);
  await page.getByLabel("Nombre", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("Teléfono").inputValue(), fixtureProfile.phone);
  await page.getByLabel("Nombre", { exact: true }).fill("Ana Actualizada");
  await page.getByRole("button", { name: "Guardar perfil" }).click();
  await waitForFormOutcome("El perfil se actualizó.");
  const update = calls.find((call) => call.path === "/api/profiles/me" && call.method === "PUT");
  assert.deepEqual(JSON.parse(update.body), {
    name: "Ana Actualizada", phone: fixtureProfile.phone, address: fixtureProfile.address,
  });
  assert.equal(calls.some((call) => call.path.startsWith("/api/users/") && call.method !== "GET"), false);
});

test("account and profile views fit narrow mobile screens", async () => {
  await loginAs("admin");
  await page.setViewportSize({ width: 375, height: 812 });
  for (const route of ["/account", "/account/profile"]) {
    await page.goto(`${base}${route}`);
    await page.getByRole("heading", { name: route === "/account" ? "Cuenta" : "Perfil", exact: true }).waitFor();
    if (route === "/account/profile") await page.getByLabel("Nombre", { exact: true }).waitFor();
    else await page.locator("article").filter({ hasText: "other@example.com" }).waitFor();
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
      parents: (() => {
        const result = [];
        let element = document.querySelector("table");
        while (element && result.length < 8) {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          result.push({ tag: element.tagName, className: String(element.className).slice(0, 90), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, right: Math.round(rect.right), overflowX: style.overflowX, minWidth: style.minWidth, display: style.display });
          element = element.parentElement;
        }
        return result;
      })(),
      elements: [...document.querySelectorAll("body *")].flatMap((element) => {
        const rect = element.getBoundingClientRect();
        return rect.right > window.innerWidth + 1
          ? [{ tag: element.tagName, id: element.id, className: String(element.className).slice(0, 100), right: Math.round(rect.right), text: element.textContent?.trim().slice(0, 60) }]
          : [];
      }).slice(0, 8),
    }));
    assert.equal(overflow.scrollWidth > overflow.viewport, false, JSON.stringify(overflow));
    await page.screenshot({ path: `/tmp/brasaland-${route === "/account" ? "account" : "profile"}-375.png`, fullPage: true });
  }
});