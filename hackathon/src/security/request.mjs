import { ERROR_CODES } from "../contracts.mjs";

const DEFAULT_ALLOWED_HOSTS = Object.freeze(["127.0.0.1", "localhost"]);

export function createRequestGuards(options = {}) {
  const allowedHosts = new Set(
    (options.allowedHosts || DEFAULT_ALLOWED_HOSTS).map((h) => String(h).toLowerCase()),
  );
  const maxBodyBytes = options.maxBodyBytes ?? 64 * 1024;

  return {
    maxBodyBytes,
    assertHost(req) {
      const hostHeader = String(req.headers.host || "").split(":")[0].toLowerCase();
      if (!hostHeader || !allowedHosts.has(hostHeader)) {
        const err = new Error("Host not allowed");
        err.code = ERROR_CODES.FORBIDDEN;
        err.status = 403;
        throw err;
      }
    },
    assertOrigin(req, { requireOrigin = false } = {}) {
      const origin = req.headers.origin;
      if (!origin) {
        if (requireOrigin) {
          const err = new Error("Origin required");
          err.code = ERROR_CODES.FORBIDDEN;
          err.status = 403;
          throw err;
        }
        return;
      }
      let url;
      try {
        url = new URL(origin);
      } catch {
        const err = new Error("Origin not allowed");
        err.code = ERROR_CODES.FORBIDDEN;
        err.status = 403;
        throw err;
      }
      const scheme=options.schemeFor?.(req)??(req.socket?.encrypted?'https':'http');
      if (!allowedHosts.has(url.hostname.toLowerCase()) || (req.headers.host && url.origin!==`${scheme}://${req.headers.host}`)) {
        const err = new Error("Origin not allowed");
        err.code = ERROR_CODES.FORBIDDEN;
        err.status = 403;
        throw err;
      }
    },
    async readJson(req) {
      if(Number(req.headers['content-length'])>maxBodyBytes){req.resume();throw Object.assign(new Error('Request body too large'),{code:ERROR_CODES.BAD_REQUEST,status:413});}
      const chunks = [];
      let total = 0;
      for await (const chunk of req) {
        total += chunk.length;
        if (total > maxBodyBytes) {
          const err = new Error("Request body too large");
          err.code = ERROR_CODES.BAD_REQUEST;
          err.status = 413;
          throw err;
        }
        chunks.push(chunk);
      }
      if (chunks.length === 0) return {};
      if(!/^application\/json(?:\s*;|$)/i.test(String(req.headers['content-type']||''))){
        throw Object.assign(new Error('JSON content type required'),{code:ERROR_CODES.BAD_REQUEST,status:415});
      }
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        return JSON.parse(raw);
      } catch {
        const err = new Error("Invalid JSON body");
        err.code = ERROR_CODES.BAD_REQUEST;
        err.status = 400;
        throw err;
      }
    },
  };
}
