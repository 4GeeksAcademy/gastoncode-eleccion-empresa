import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { afterEach, beforeEach } from "node:test";
import ts from "typescript";

function moduleUrl(source) {
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

const authUrl = moduleUrl(await readFile(new URL("../../auth-shared/auth-api.ts", import.meta.url), "utf8"));
const source = await readFile(new URL("../src/lib/incidents-api.ts", import.meta.url), "utf8");
const api = await import(moduleUrl(source.replace("../../../auth-shared/auth-api", authUrl)));
const auth = await import(authUrl);
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const analysisId = "bd107364-ff31-4443-9560-067ac4f39eaf";
const result = {
  analysis_id: analysisId, company: "BRASALAND", source_file: "synthetic.csv",
  total_records: 1, valid_records: 1, invalid_records: 0, invalid_breakdown: {},
  by_category: { EQUIPMENT: { count: 1, percentage: 100 } },
  by_status: { OPEN: { count: 1, percentage: 100 } },
  satisfaction: { closed_cases: 0, scored_cases: 0, average: null, scores: { 1: 0 } },
};
const file = new File(["synthetic"], "synthetic.csv", { type: "text/csv" });
let notifications;

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
  auth.setToken("fixture-token");
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

test("upload retrieves the full result using the returned analysis ID and authenticates both calls", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push(url);
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-token");
    assert.equal(options.cache, "no-store");
    if (calls.length === 1) {
      assert.equal(options.method, "POST");
      assert.equal(options.headers.get("Content-Type"), null);
      assert.equal(options.body.get("file").name, "synthetic.csv");
      return Response.json({ analysis_id: analysisId });
    }
    return Response.json(result);
  };
  assert.deepEqual(await api.analyzeFile(file), result);
  assert.deepEqual(calls, ["/api/incidents/analyze", `/api/incidents/results/${analysisId}`]);
});

test("export sends the selected analysis ID and token and returns the CSV", async () => {
  globalThis.fetch = async (url, options) => {
    assert.equal(url, `/api/incidents/results/export?analysis_id=${analysisId}`);
    assert.equal(options.headers.get("Authorization"), "Bearer fixture-token");
    return new Response("metric,value\ntotal_records,1", { headers: { "Content-Type": "text/csv" } });
  };
  assert.equal(await (await api.exportAnalysis(analysisId)).text(), "metric,value\ntotal_records,1");
});

test("validation errors use the API field/message shape", async () => {
  globalThis.fetch = async () => Response.json({
    detail: [{ field: "body.file", message: "El fichero está vacío." }],
  }, { status: 400 });
  await assert.rejects(api.analyzeFile(file), /El fichero está vacío/);
  assert.equal(auth.getToken(), "fixture-token");
});

test("upload without an ID and incomplete or mismatched results are rejected", async () => {
  for (const uploaded of [{}, { analysis_id: "" }]) {
    globalThis.fetch = async () => Response.json(uploaded);
    await assert.rejects(api.analyzeFile(file), /identificador/);
  }
  for (const invalid of [{ analysis_id: analysisId }, { ...result, analysis_id: "other" }]) {
    globalThis.fetch = async (url) => Response.json(
      url.endsWith("/analyze") ? { analysis_id: analysisId } : invalid,
    );
    await assert.rejects(api.analyzeFile(file), /resultados de análisis no válidos/);
  }
});

test("missing token rejects before making a request", async () => {
  auth.clearToken();
  globalThis.fetch = () => assert.fail("Unexpected network request");
  await assert.rejects(api.analyzeFile(file), auth.UnauthorizedError);
  assert.equal(notifications, 1);
});

test("401 clears the rejected session", async () => {
  globalThis.fetch = async () => Response.json({}, { status: 401 });
  await assert.rejects(api.analyzeFile(file), auth.UnauthorizedError);
  assert.equal(auth.getToken(), null);
  assert.equal(notifications, 1);
});

test("a late 401 preserves a replacement session", async () => {
  globalThis.fetch = async () => {
    auth.setToken("replacement-token");
    return Response.json({}, { status: 401 });
  };
  await assert.rejects(api.analyzeFile(file), auth.UnauthorizedError);
  assert.equal(auth.getToken(), "replacement-token");
  assert.equal(notifications, 0);
});

test("403 and temporary server failures surface errors without clearing the session", async () => {
  for (const [status, message] of [[403, /permiso/], [503, /identidad/], [500, /más tarde/]]) {
    globalThis.fetch = async () => Response.json({ detail: "internal" }, { status });
    await assert.rejects(api.analyzeFile(file), message);
    assert.equal(auth.getToken(), "fixture-token");
  }
  assert.equal(notifications, 0);
});

test("network and malformed JSON responses surface explicit errors", async () => {
  globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
  await assert.rejects(api.analyzeFile(file), /conexión/);
  globalThis.fetch = async () => new Response("not-json");
  await assert.rejects(api.analyzeFile(file), /respuesta no válida/);
  assert.equal(auth.getToken(), "fixture-token");
});

test("analyzer uses a basePath and unprefixed protected API rewrites", async () => {
  const config = (await import(moduleUrl(await readFile(new URL("../next.config.ts", import.meta.url), "utf8")))).default;
  assert.equal(config.basePath, "/incidents-analyzer");
  const rewrites = await config.rewrites();
  assert.ok(rewrites.some((route) => route.source === "/api/incidents/:path*" && route.basePath === false));
  assert.ok(rewrites.some((route) => route.source === "/api/auth/:path*" && route.basePath === false));
});

test("dashboard proxies analyzer pages and assets under the same prefix", async () => {
  const config = (await import(moduleUrl(await readFile(new URL("../../dashboard-backoffice/next.config.ts", import.meta.url), "utf8")))).default;
  const base = process.env.INCIDENTS_UI_URL ?? "http://localhost:3002";
  const rewrites = await config.rewrites();
  assert.deepEqual(rewrites.filter((route) => route.source.startsWith("/incidents-analyzer")), [
    { source: "/incidents-analyzer", destination: `${base}/incidents-analyzer` },
    { source: "/incidents-analyzer/:path+", destination: `${base}/incidents-analyzer/:path+` },
  ]);
});
