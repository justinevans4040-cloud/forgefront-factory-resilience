import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sha256Hex } from "../src/sha256.mjs";

const VECTORS = [
  ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
  ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
  ["The quick brown fox jumps over the lazy dog", "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592"]
];

for (const [input, expected] of VECTORS) {
  test(`sha256Hex matches known vector: ${input.slice(0, 20) || "(empty)"}`, () => {
    assert.equal(sha256Hex(input), expected);
    assert.equal(sha256Hex(input), createHash("sha256").update(input, "utf8").digest("hex"));
  });
}

test("sha256Hex matches node:crypto for JSON ledger bodies", () => {
  const body = { at: "2026-01-01T00:00:00.000Z", prev_hash: "0".repeat(64), actor: "a", action: "X", detail: "y" };
  const json = JSON.stringify(body);
  assert.equal(sha256Hex(json), createHash("sha256").update(json, "utf8").digest("hex"));
});
