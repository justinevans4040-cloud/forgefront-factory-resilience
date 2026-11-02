import assert from "node:assert/strict";
import http from "node:http";
import { describe, it, before, after } from "node:test";
import { createApp } from "../../server.mjs";

function rawRequest(port, { method = "GET", path = "/", headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: "127.0.0.1", port, method, path, headers },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.end();
  });
}

describe("server skeleton", () => {
  /** @type {ReturnType<typeof createApp>} */
  let app;
  let baseUrl;
  let port;
  let auth;
  const authenticatedFetch=(url,options={})=>fetch(url,{...options,headers:{...options.headers,...auth}});

  before(async () => {
    app = createApp({models:{env:{HACKATHON_ADMIN_TOKEN:'test-admin-ok'}}});
    const addr = await app.listen(0, "127.0.0.1");
    port = addr.port;
    baseUrl = `http://127.0.0.1:${port}`;
    const response=await fetch(baseUrl+'/api/meta/session',{method:'POST',headers:{Authorization:'Bearer test-admin-ok'}});const session=await response.json();auth={'X-Session-Token':session.session,'X-CSRF-Token':session.csrf};
  });

  after(async () => {
    await app.close();
  });

  it("serves public health without secrets", async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, "forgefront-hackathon");
  });

  it("rejects disallowed Host headers while keeping health probes open", async () => {
    const health = await rawRequest(port, {
      path: "/healthz",
      headers: { Host: "evil.example" },
    });
    assert.equal(health.status, 200);
    const res = await rawRequest(port, {
      path: "/",
      headers: { Host: "evil.example" },
    });
    assert.equal(res.status, 403);
    assert.match(res.body, /Host not allowed/);
  });

  it("returns scenario and analysis from the live snapshot", async () => {
    const scenarioRes = await authenticatedFetch(`${baseUrl}/api/scenario`);
    assert.equal(scenarioRes.status, 200);
    const scenario = await scenarioRes.json();
    assert.ok(scenario.snapshotDigest);
    assert.equal(scenario.label, "SYNTHETIC");

    const analysisRes = await authenticatedFetch(`${baseUrl}/api/analysis`);
    assert.equal(analysisRes.status, 200);
    const analysis = await analysisRes.json();
    assert.equal(analysis.snapshotDigest, scenario.snapshotDigest);
    assert.ok(analysis.recovery.feasibleCount >= 1);
  });

  it("invokes a read-only tool through the HTTP API", async () => {
    const res = await authenticatedFetch(`${baseUrl}/api/tools/invoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "list_impacted_jobs", arguments: {} }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.result.impactedUnits, 70);
  });

  it("rejects unknown tool invocations", async () => {
    const res = await authenticatedFetch(`${baseUrl}/api/tools/invoke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "approve_plan", arguments: {} }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error.code, "UNKNOWN_TOOL");
  });
});
