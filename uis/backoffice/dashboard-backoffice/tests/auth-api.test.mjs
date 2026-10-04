import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { beforeEach, afterEach } from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/app/components/auth-api.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
});
const api = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const navigationSource = await readFile(new URL("../src/app/components/auth-navigation.ts", import.meta.url), "utf8");
const { outputText: navigationCode } = ts.transpileModule(navigationSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
});
const { safeAuthDestination } = await import(
  `data:text/javascript;base64,${Buffer.from(navigationCode).toString("base64")}`
);
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
let values;
let browser;

beforeEach(() => {
  values = new Map();
  browser = new EventTarget();
  browser.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = browser;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

test("token helpers are safe without a browser", () => {
  delete globalThis.window;
  assert.equal(api.getToken(), null);
  assert.doesNotThrow(() => api.clearToken());
});

test("login uses the OAuth2 form and does not save credentials or attach a token", async () => {
  api.setToken("existing-token");
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/auth/login");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.get("Content-Type"), "application/x-www-form-urlencoded");
    assert.equal(options.headers.get("Authorization"), null);
    assert.equal(options.body.get("username"), "person@example.com");
    assert.equal(options.body.get("password"), "example-password");
    return Response.json({ access_token: "new-token", token_type: "bearer" });
  };
  assert.equal(await api.login("person@example.com", "example-password"), "new-token");
  assert.equal(api.getToken(), "existing-token");
  assert.equal(values.size, 1);
});

test("protected calls attach Bearer and disable caching", async () => {
  api.setToken("test-token");
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/auth/me");
    assert.equal(options.headers.get("Authorization"), "Bearer test-token");
    assert.equal(options.cache, "no-store");
    return Response.json({ id: "user-id" });
  };
  assert.deepEqual(await api.fetchMe(), { id: "user-id" });
});

test("missing token rejects without making a network call", async () => {
  globalThis.fetch = () => assert.fail("Unexpected network request");
  await assert.rejects(api.fetchMe(), api.UnauthorizedError);
});

test("protected 401 clears token and notifies the provider", async () => {
  api.setToken("expired-token");
  let notifications = 0;
  browser.addEventListener(api.SESSION_INVALIDATED_EVENT, () => notifications++);
  globalThis.fetch = async () => Response.json({ detail: "Token expirado" }, { status: 401 });
  await assert.rejects(api.fetchMe(), { name: "UnauthorizedError", status: 401, message: "Token expirado" });
  assert.equal(api.getToken(), null);
  assert.equal(notifications, 1);
});

test("a late 401 does not clear a replacement token", async () => {
  api.setToken("old-token");
  globalThis.fetch = async () => {
    api.setToken("new-token");
    return Response.json({ detail: "Expired" }, { status: 401 });
  };
  await assert.rejects(api.fetchMe(), api.UnauthorizedError);
  assert.equal(api.getToken(), "new-token");
});

test("invalid login does not invalidate an existing session", async () => {
  api.setToken("existing-token");
  globalThis.fetch = async () => Response.json({ detail: "Credenciales incorrectas" }, { status: 401 });
  await assert.rejects(api.login("person@example.com", "wrong-password"), api.UnauthorizedError);
  assert.equal(api.getToken(), "existing-token");
});

test("403 and 500 preserve the token", async () => {
  api.setToken("valid-token");
  for (const status of [403, 500]) {
    globalThis.fetch = async () => Response.json({ detail: "Error" }, { status });
    await assert.rejects(api.fetchMe(), { name: "ApiError", status });
    assert.equal(api.getToken(), "valid-token");
  }
});

test("network failure preserves the token", async () => {
  api.setToken("valid-token");
  globalThis.fetch = async () => { throw new TypeError("Network unavailable"); };
  await assert.rejects(api.fetchMe(), /Network unavailable/);
  assert.equal(api.getToken(), "valid-token");
});

test("registration sends JSON and exposes FastAPI validation messages", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, "/api/users");
    assert.equal(options.headers.get("Authorization"), null);
    assert.equal(options.headers.get("Content-Type"), "application/json");
    assert.equal(JSON.parse(options.body).email, "person@example.com");
    return Response.json({ detail: [{ msg: "Invalid email" }] }, { status: 422 });
  };
  await assert.rejects(api.register({ email: "person@example.com", password: "example" }), {
    status: 422, message: "Invalid email",
  });
});

test("account and profile calls use the corresponding auth endpoints", async () => {
  api.setToken("valid-token");
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push([url, options.method ?? "GET"]);
    assert.equal(options.headers.get("Authorization"), "Bearer valid-token");
    return Response.json({});
  };
  await api.listUsers();
  await api.fetchUser("id/with/slash");
  await api.updateUser("id", { email: "person@example.com" });
  await api.deleteUser("id");
  await api.fetchProfile();
  await api.updateProfile({ name: "Person" });
  assert.deepEqual(calls, [
    ["/api/users", "GET"], ["/api/users/id%2Fwith%2Fslash", "GET"],
    ["/api/users/id", "PUT"], ["/api/users/id", "DELETE"],
    ["/api/profiles/me", "GET"], ["/api/profiles/me", "PUT"],
  ]);
});

test("malformed login response is rejected", async () => {
  globalThis.fetch = async () => Response.json({});
  await assert.rejects(api.login("person@example.com", "example"), /token valido/);
  assert.equal(api.getToken(), null);
});

test("auth rewrites cover collection and nested routes for all three resources", async () => {
  const configSource = await readFile(new URL("../next.config.ts", import.meta.url), "utf8");
  const { outputText: configCode } = ts.transpileModule(configSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  });
  const { default: config } = await import(
    `data:text/javascript;base64,${Buffer.from(configCode).toString("base64")}`
  );
  const base = process.env.AUTH_API_URL ?? "http://localhost:8001";
  assert.deepEqual(await config.rewrites(), ["auth", "users", "profiles"].flatMap((resource) => [
    { source: `/api/${resource}`, destination: `${base}/${resource}` },
    { source: `/api/${resource}/:path*`, destination: `${base}/${resource}/:path*` },
  ]));
});

test("auth destinations retain supported internal routes", () => {
  for (const route of ["/", "/account", "/account/profile", "/?view=tools#services"]) {
    assert.equal(safeAuthDestination(route), route);
  }
});

test("auth destinations reject external URLs, scripts, control characters and login loops", () => {
  for (const route of [
    null, "", "https://example.com", "//example.com", "javascript:alert(1)",
    "/\\example.com", "/%2f%2fexample.com", "/\nexample.com", "/login", "/register",
    "/missing", "/account/profile-other", "/account /profile",
  ]) {
    assert.equal(safeAuthDestination(route), "/");
  }
});