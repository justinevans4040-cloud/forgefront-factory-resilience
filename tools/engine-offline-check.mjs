/**
 * Run the deterministic engine with the network disabled (spawned with --import network-off.mjs).
 * Prints JSON: {digest, networkOff, engineNetworkAttempts, guardSelfTest}.
 */
import { engineDigest } from "../src/engine-digest.mjs";
import net from "node:net";

const inputs = JSON.parse(Buffer.from(process.argv[2] || "", "base64").toString("utf8") || "{}");
const guard = globalThis.__networkOff;
const before = guard ? guard.blocked.length : -1;
const result = engineDigest(inputs);
const engineAttempts = guard ? guard.blocked.length - before : -1;

// Self-test: prove the guard is live by trying to reach the network ourselves.
const probes = [];
try { await fetch("https://example.com/"); probes.push("fetch:reached"); } catch (e) { probes.push(`fetch:${e.code || e.message}`); }
try { net.connect(443, "93.184.215.14"); probes.push("socket:reached"); } catch (e) { probes.push(`socket:${e.code || e.message}`); }

process.stdout.write(JSON.stringify({
  ...result,
  networkOff: Boolean(guard?.installed),
  engineNetworkAttempts: engineAttempts,
  guardSelfTest: probes,
  guardBlocked: guard ? guard.blocked.length : 0,
  node: process.version
}));
