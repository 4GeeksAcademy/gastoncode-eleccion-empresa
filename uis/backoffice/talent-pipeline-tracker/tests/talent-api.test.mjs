import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { beforeEach, afterEach } from "node:test";
import ts from "typescript";

function moduleUrl(source) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

const authUrl = moduleUrl(await readFile(new URL("../../auth-shared/auth-api.ts", import.meta.url), "utf8"));
const auth = await import(authUrl);
const source = await readFile(new URL("../utils/api.ts", import.meta.url), "utf8");
const { trackerFetch } = await import(moduleUrl(source.replaceAll('"../../auth-shared/auth-api"', JSON.stringify(authUrl))));
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
let invalidations;

beforeEach(() => {
  const values = new Map();
  const browser = new EventTarget();
  browser.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  invalidations = 0;
  browser.addEventListener(auth.SESSION_INVALIDATED_EVENT, () => invalidations++);
  globalThis.window = browser;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

test("missing token rejects before contacting talent", async () => {
  globalThis.fetch = () => assert.fail("Unexpected request");
  await assert.rejects(trackerFetch("/records"), { status: 401 });
  assert.equal(invalidations, 1);
});

test("all operations use the same-origin API, bearer and no-store", async () => {
  auth.setToken("fixture-token");
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "/api/talent/records/demo");
      assert.equal(options.headers.get("Authorization"), "Bearer fixture-token");
      assert.equal(options.method, method);
      assert.equal(options.cache, "no-store");
      return new Response(null, { status: 204 });
    };
    assert.equal((await trackerFetch("/records/demo", { method })).status, 204);
  }
});

test("current 401 invalidates the session but a late 401 preserves its replacement", async () => {
  auth.setToken("old-token");
  globalThis.fetch = async () => new Response(null, { status: 401 });
  await assert.rejects(trackerFetch("/records"), { status: 401 });
  assert.equal(auth.getToken(), null);
  assert.equal(invalidations, 1);
  auth.setToken("old-token");
  globalThis.fetch = async () => {
    auth.setToken("replacement-token");
    return new Response(null, { status: 401 });
  };
  await assert.rejects(trackerFetch("/records"), { status: 401 });
  assert.equal(auth.getToken(), "replacement-token");
  assert.equal(invalidations, 1);
});

test("forbidden, upstream and network failures preserve the session", async () => {
  auth.setToken("fixture-token");
  for (const status of [403, 404, 422, 502, 503]) {
    globalThis.fetch = async () => new Response(null, { status });
    await assert.rejects(trackerFetch("/records"), { status });
    assert.equal(auth.getToken(), "fixture-token");
  }
  globalThis.fetch = async () => { throw new TypeError("Offline"); };
  await assert.rejects(trackerFetch("/records"), { status: 0 });
  assert.equal(auth.getToken(), "fixture-token");
  assert.equal(invalidations, 0);
});

test("talent config prefixes UI routes but keeps protected API paths unprefixed", async () => {
  const { default: config } = await import(moduleUrl(await readFile(new URL("../next.config.ts", import.meta.url), "utf8")));
  assert.equal(config.basePath, "/talent-pipeline-tracker");
  const routes = await config.rewrites();
  for (const resource of ["auth", "users", "profiles", "talent"]) {
    assert.ok(routes.some((route) => route.source.startsWith(`/api/${resource}/`) && route.basePath === false));
  }
});