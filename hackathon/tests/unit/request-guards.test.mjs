import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createRequestGuards } from "../../src/security/request.mjs";

describe("request guards", () => {
  it("allows loopback hosts and rejects others", () => {
    const guards = createRequestGuards();
    assert.doesNotThrow(() => guards.assertHost({ headers: { host: "127.0.0.1:8787" } }));
    assert.doesNotThrow(() => guards.assertHost({ headers: { host: "localhost" } }));
    assert.throws(() => guards.assertHost({ headers: { host: "evil.example" } }), /Host not allowed/);
  });

  it("rejects disallowed Origin values", () => {
    const guards = createRequestGuards();
    assert.doesNotThrow(() =>
      guards.assertOrigin({ headers: { origin: "http://127.0.0.1:8787" } }),
    );
    assert.throws(
      () => guards.assertOrigin({ headers: { origin: "https://evil.example" } }),
      /Origin not allowed/,
    );
  });
});
