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
const source = await readFile(new URL("../src/lib/incidents-api.ts", import.meta.url), "utf8");
const api = await import(moduleUrl(source.replace("../../../auth-shared/auth-api", authUrl)));
const originalWindow = globalThis.window;
const originalFetch = globalThis.fetch;
let notifications;
const input = {
  title: "Synthetic", description: "Synthetic test", category: "other",
  origin: "internal", branch: "central",
};

beforeEach(() => {
  const values = new Map();
  const browser = new EventTarget();
  browser.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  globalThis.window = browser;
  notifications = 0;
  browser.addEventListener(auth.SESSION_INVALIDATED_EVENT, () => notifications++);
  auth.setToken("old-token");
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

for (const [name, request] of [
  ["create", () => api.createIncident(input)],
  ["summary", () => api.fetchSummary()],
]) {
  test(`${name}: a delayed 401 never clears a replacement session`, async () => {
    let respond;
    globalThis.fetch = () => new Promise((resolve) => { respond = resolve; });
    const pending = request();
    auth.setToken("new-token");
    respond(Response.json({}, { status: 401 }));
    await assert.rejects(pending, api.IncidentRequestError);
    assert.equal(auth.getToken(), "new-token");
    assert.equal(notifications, 0);
  });

  test(`${name}: a current 401 clears and signals the session`, async () => {
    globalThis.fetch = async () => Response.json({}, { status: 401 });
    await assert.rejects(request(), api.IncidentRequestError);
    assert.equal(auth.getToken(), null);
    assert.equal(notifications, 1);
  });

  test(`${name}: a 503 preserves the session`, async () => {
    globalThis.fetch = async () => Response.json({}, { status: 503 });
    await assert.rejects(request(), api.IncidentRequestError);
    assert.equal(auth.getToken(), "old-token");
    assert.equal(notifications, 0);
  });

  test(`${name}: missing credentials invalidate without a network call`, async () => {
    auth.clearToken();
    globalThis.fetch = () => assert.fail("Unexpected network call");
    await assert.rejects(request(), api.IncidentRequestError);
    assert.equal(notifications, 1);
  });
}

