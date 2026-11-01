#!/usr/bin/env node
import { createClientLimiter } from './src/security/client-limit.mjs';
/**
 * HTTP assembly skeleton for the Meta Hackathon build.
 * Loopback bind by default; Host/Origin allowlist; public health only.
 * Scenario analysis is deterministic; authenticated Meta responses explain evidence and options.
 */

import http from "node:http";
import { loadOperators } from './src/security/operators.mjs';
import { createWorkflow } from './src/workflow.mjs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createMetaHandler } from "./src/security/meta-handler.mjs";
import { fileURLToPath } from "node:url";
import { ERROR_CODES } from "./src/contracts.mjs";
import { analyzeSnapshot } from "./src/domain/engine.mjs";
import { buildDemoScenarioInput, createSnapshot } from "./src/domain/scenario.mjs";
import { createToolDispatcher, listToolDefinitions } from "./src/agent/tools.mjs";
import { createRequestGuards } from "./src/security/request.mjs";

const DEFAULT_PORT = Number(process.env.PORT || 8787);
const DEFAULT_HOST = process.env.BIND_HOST || "127.0.0.1";

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

const STATUS_BY_CODE = Object.freeze({
  [ERROR_CODES.BAD_REQUEST]: 400,
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.CONFLICT]: 409,
  [ERROR_CODES.RATE_LIMITED]: 429,
  [ERROR_CODES.VALIDATION]: 400,
  [ERROR_CODES.INFEASIBLE]: 409,
  [ERROR_CODES.CROSS_SNAPSHOT]: 409,
  [ERROR_CODES.UNKNOWN_TOOL]: 400,
  [ERROR_CODES.TOOL_SCHEMA]: 400,
  [ERROR_CODES.INTERNAL]: 500,
});

export function sendError(res, err) {
  const knownCode = err?.code && Object.values(ERROR_CODES).includes(err.code) ? err.code : null;
  const intentional = Number.isInteger(err?.status) || Boolean(knownCode);
  const status = Number.isInteger(err?.status)
    ? err.status
    : knownCode
      ? STATUS_BY_CODE[knownCode]
      : 500;
  const message =
    intentional && typeof err.message === "string" && err.message.length > 0 && err.message.length <= 180
      ? err.message
      : "request failed";
  sendJson(res, status, {
    error: {
      code: knownCode || ERROR_CODES.INTERNAL,
      message,
    },
  });
}

export function createApp(options = {}) {
  const guards = createRequestGuards(options.guards);
  const env=options.models?.env??process.env;
  const operatorSecrets=loadOperators(env).map(o=>o.token);
  const workflow=options.workflow??(env.HACKATHON_LEDGER_KEY?createWorkflow({directory:env.HACKATHON_STATE_DIR?.trim()||join(process.cwd(),'data','hackathon'),key:env.HACKATHON_LEDGER_KEY,secrets:[...operatorSecrets,env.HACKATHON_OPERATORS_JSON,env.MUSE_API_KEY,env.MODEL_API_KEY,env.BASETEN_API_KEY,env.FIREWORKS_API_KEY,env.HACKATHON_ADMIN_TOKEN,env.HACKATHON_LEDGER_KEY]}):null);
  // A configured persistent workflow has already verified its private directory and encryption key.
  const quotaPersistence=env.HACKATHON_LEDGER_KEY?name=>({path:join(env.HACKATHON_STATE_DIR?.trim()||join(process.cwd(),'data','hackathon'),'quota-'+name+'.json'),key:env.HACKATHON_LEDGER_KEY}):undefined;
  const handleMeta = createMetaHandler({...options.models,workflow,quotaPersistence});
  let snapshot = options.snapshot || createSnapshot(buildDemoScenarioInput());
  let tools = createToolDispatcher(snapshot);
  const apiLimit=createClientLimiter({persistence:quotaPersistence?.('api')});
  let ledgerFailure=false;
  const verificationTimer=workflow?setInterval(()=>{try{workflow.verify();}catch{ledgerFailure=true;}},30000):null;
  verificationTimer?.unref();

  function replaceSnapshot(next) {
    snapshot = next;
    tools = createToolDispatcher(snapshot);
  }

  const server = http.createServer(async (req, res) => {
    try {
      guards.assertHost(req);
      res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
      res.setHeader('X-Content-Type-Options','nosniff');
      res.setHeader('Referrer-Policy','no-referrer');

      const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
      const path = url.pathname;
      if(path.startsWith('/api/')){
        if(ledgerFailure)throw Object.assign(new Error('LEDGER_TAMPERED'),{status:409});
        const allowance=apiLimit(req);if(!allowance.allowed){res.setHeader('Retry-After',String(allowance.retryAfter));throw Object.assign(new Error('Client API rate limit exceeded'),{status:429});}
        guards.assertOrigin(req);
      }
      const assets={'/stage-scene.mjs':['stage-scene.mjs','text/javascript'],'/factory-layout.mjs':['factory-layout.mjs','text/javascript'],'/command-center.mjs':['command-center.mjs','text/javascript'],'/brand-emblem.png':['brand-emblem.png','image/png'],'/forgefront-systems-logo.png':['forgefront-systems-logo.png','image/png'],'/favicon.png':['favicon.png','image/png'],'/route-health.mjs':['route-health.mjs','text/javascript'],'/investigation-status.mjs':['investigation-status.mjs','text/javascript'],'/':['index.html','text/html'],'/app.mjs':['app.mjs','text/javascript'],'/guide.mjs':['guide.mjs','text/javascript'],'/passphrase.mjs':['passphrase.mjs','text/javascript'],'/style.css':['style.css','text/css']};
      if(req.method==='GET' && assets[path]){
        const [name,type]=assets[path];const content=readFileSync(new URL('./public/'+name,import.meta.url));
        res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(content);return;
      }
      const meta = await handleMeta(req, res, path, guards, snapshot);
      if (meta && !meta.legacyAuthorized) { sendJson(res, 200, meta); return; }
      if(meta?.legacyAuthorized && workflow)replaceSnapshot(workflow.status().snapshot);

      if (req.method === "GET" && path === "/health") {
        sendJson(res, 200, { ok: true, service: "forgefront-hackathon" });
        return;
      }

      if (req.method === "GET" && path === "/api/scenario") {
        sendJson(res, 200, {
          scenarioId: snapshot.scenarioId,
          snapshotDigest: snapshot.snapshotDigest,
          version: snapshot.version,
          label: snapshot.label,
          incident: snapshot.incident,
        });
        return;
      }

      if (req.method === "GET" && path === "/api/analysis") {
        sendJson(res, 200, analyzeSnapshot(snapshot));
        return;
      }

      if (req.method === "GET" && path === "/api/tools") {
        sendJson(res, 200, {
          snapshotDigest: snapshot.snapshotDigest,
          tools: listToolDefinitions(),
        });
        return;
      }

      if (req.method === "POST" && path === "/api/tools/invoke") {
        const body = await guards.readJson(req);
        const name = body?.name;
        const args = body?.arguments ?? {};
        const result = await tools.invoke(name, args);
        sendJson(res, 200, { ok: true, name, result });
        return;
      }

      if (req.method === "POST" && path === "/api/scenario/reset-demo") {
        if(workflow)replaceSnapshot(workflow.reset(meta?.operator).snapshot);
        else replaceSnapshot(createSnapshot(buildDemoScenarioInput()));
        sendJson(res, 200, {
          ok: true,
          scenarioId: snapshot.scenarioId,
          snapshotDigest: snapshot.snapshotDigest,
        });
        return;
      }

      sendJson(res, 404, {
        error: { code: ERROR_CODES.NOT_FOUND, message: "route not found" },
      });
    } catch (err) {
      sendError(res, err);
    }
  });

  return {
    server,
    getSnapshot: () => snapshot,
    replaceSnapshot,
    listen(port = DEFAULT_PORT, host = DEFAULT_HOST) {
      return new Promise((resolve,reject) => {
        const onError=error=>reject(error);server.once('error',onError);
        server.listen(port, host, () => {server.off('error',onError);resolve(server.address());});
      });
    },
    close() {
      clearInterval(verificationTimer);
      return new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const app = createApp();
  const addr = await app.listen();
  console.log(`hackathon server listening on http://${addr.address}:${addr.port}`);
}
