import assert from "node:assert/strict";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { assertPortAvailable, main } from "./backoffice.mjs";

const base = process.env.PLATFORM_URL ?? "http://localhost:3007";
const UNIFIED_PORT = 8005;
const servers = [];
before(async () => {
  await assertPortAvailable(UNIFIED_PORT);
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://synthetic.invalid");
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    if (url.pathname === "/api/incidents/results/export") {
      response.writeHead(200, { "content-type": "text/csv", "content-disposition": 'attachment; filename="synthetic.csv"' });
      response.end("status\nopen\n");
      return;
    }
    // Map the unified API paths to service identifiers
    let service = "unknown";
    if (url.pathname.startsWith("/auth")) service = "auth";
    else if (url.pathname.startsWith("/suppliers")) service = "suppliers";
    else if (url.pathname.startsWith("/api/incidents")) service = "incidents";
    else if (url.pathname.startsWith("/inventory")) service = "inventory";
    else if (url.pathname.startsWith("/talent")) service = "talent";

    const protectedPaths = ["/auth/me", "/api/incidents/summary", "/inventory/products", "/talent/records"];
    const unauthorized = url.searchParams.has("unauthorized") || (!request.headers.authorization && protectedPaths.includes(url.pathname));
    response.writeHead(unauthorized ? 401 : 200, { "content-type": "application/json" });
    response.end(JSON.stringify({
      service, method: request.method, path: url.pathname, search: url.search,
      authorization: request.headers.authorization,
      contentType: request.headers["content-type"],
      body: Buffer.concat(chunks).toString(),
    }));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(UNIFIED_PORT, "127.0.0.1", resolve);
  });
  servers.push(server);
});
after(async () => {
  await Promise.all(servers.map((server) => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  })));
});

for (const [resource, service, backend] of [
  ["auth", "auth", "/auth"], ["users", "auth", "/auth/users"], ["profiles", "auth", "/auth/profiles"],
  ["suppliers", "suppliers", "/suppliers"], ["incidents", "incidents", "/api/incidents"],
  ["inventory", "inventory", "/inventory"], ["talent", "talent", "/talent"],
]) {
  for (const suffix of ["", "/synthetic-child"]) {
    test(`platform real HTTP proxy /api/${resource}${suffix}`, async () => {
      const response = await fetch(`${base}/api/${resource}${suffix}?filter=synthetic%20value`, {
        headers: { Authorization: "Bearer synthetic-proxy-token" },
      });
      assert.equal(response.status, 200);
      const result = await response.json();
      assert.equal(result.service, service);
      assert.equal(result.path, `${backend}${suffix}`);
      assert.equal(new URLSearchParams(result.search).get("filter"), "synthetic value");
      assert.equal(result.authorization, "Bearer synthetic-proxy-token");
    });
  }
}

test("platform real proxy preserves JSON PATCH body and status", async () => {
  const response = await fetch(`${base}/api/talent/records/synthetic-record`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer synthetic-proxy-token" },
    body: JSON.stringify({ status: "in_progress", stage: "review" }),
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.method, "PATCH");
  assert.deepEqual(JSON.parse(result.body), { status: "in_progress", stage: "review" });
});

test("platform real proxy forwards multipart analysis uploads", async () => {
  const form = new FormData();
  form.append("file", new Blob(["status\nopen\n"], { type: "text/csv" }), "synthetic.csv");
  const response = await fetch(`${base}/api/incidents/analyze`, {
    method: "POST", headers: { Authorization: "Bearer synthetic-proxy-token" }, body: form,
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.path, "/api/incidents/analyze");
  assert.match(result.contentType, /^multipart\/form-data; boundary=/);
  assert.match(result.body, /filename="synthetic.csv"/);
  assert.match(result.body, /status\r?\nopen/);
});

test("platform real proxy preserves downloads and content disposition", async () => {
  const response = await fetch(`${base}/api/incidents/results/export?analysis_id=synthetic-analysis`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-disposition"), /synthetic.csv/);
  assert.equal(await response.text(), "status\nopen\n");
});

test("platform real proxy preserves upstream 401 without success fallbacks", async () => {
  const response = await fetch(`${base}/api/auth/me?unauthorized=1`);
  assert.equal(response.status, 401);
  const result = await response.json();
  assert.equal(result.service, "auth");
});

test("platform-check validates the unified origin", async () => {
  await main("check");
});
