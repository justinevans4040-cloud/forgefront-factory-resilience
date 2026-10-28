/**
 * Preload (`node --import ./tools/network-off.mjs …`) that disables every network primitive
 * in the process: fetch, WebSocket, net/tls sockets, http(s) requests, DNS and UDP. Each
 * attempt throws ENETDISABLED and is counted in globalThis.__networkOff.blocked.
 */
import net from "node:net";
import tls from "node:tls";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import dgram from "node:dgram";
import { syncBuiltinESMExports } from "node:module";

const blocked = [];
const fail = name => { blocked.push(name); const e = new Error(`NETWORK_DISABLED:${name}`); e.code = "ENETDISABLED"; return e; };
const deny = name => function denied() { throw fail(name); };

net.connect = deny("net.connect");
net.createConnection = deny("net.createConnection");
net.Socket.prototype.connect = deny("net.Socket.connect");
tls.connect = deny("tls.connect");
http.request = deny("http.request");
http.get = deny("http.get");
https.request = deny("https.request");
https.get = deny("https.get");
dgram.createSocket = deny("dgram.createSocket");
for (const fn of ["lookup", "resolve", "resolve4", "resolve6", "resolveAny"]) dns[fn] = deny(`dns.${fn}`);
for (const fn of ["lookup", "resolve", "resolve4", "resolve6", "resolveAny"]) if (dns.promises?.[fn]) dns.promises[fn] = async () => { throw fail(`dns.promises.${fn}`); };
globalThis.fetch = async () => { throw fail("fetch"); };
globalThis.WebSocket = class { constructor() { throw fail("WebSocket"); } };
syncBuiltinESMExports();

globalThis.__networkOff = { blocked, installed: true };
