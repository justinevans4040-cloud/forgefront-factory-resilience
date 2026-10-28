function extraAllowedHosts() {
  // Comma-separated host[:port] for temporary public/family demos (Ichabod).
  return String(process.env.FFR_ALLOWED_HOSTS || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function publicDemoOpen() {
  return String(process.env.FFR_PUBLIC_DEMO || "").trim() === "1";
}

function hostAllowed(host, port) {
  const h = String(host || "").toLowerCase();
  if (!h) return false;
  const allowed = new Set([
    `127.0.0.1:${port}`,
    `localhost:${port}`,
    `[::1]:${port}`,
    ...extraAllowedHosts()
  ]);
  if (allowed.has(h)) return true;
  if (!h.includes(":") && allowed.has(`${h}:${port}`)) return true;
  for (const entry of extraAllowedHosts()) {
    if (entry.includes(":") && entry.split(":")[0] === h.split(":")[0]) return true;
    if (!entry.includes(":") && (h === entry || h.startsWith(`${entry}:`))) return true;
  }
  // Temporary family tunnels (cloudflared quick tunnel)
  if (publicDemoOpen() && (h.endsWith(".trycloudflare.com") || h.includes(".trycloudflare.com"))) {
    return true;
  }
  return false;
}

export function expectedOrigins(port) {
  const origins = new Set([
    `http://127.0.0.1:${port}`,
    `http://localhost:${port}`,
    `http://[::1]:${port}`
  ]);
  for (const host of extraAllowedHosts()) {
    origins.add(`http://${host}`);
    origins.add(`https://${host}`);
    if (!host.includes(":")) {
      origins.add(`http://${host}:${port}`);
      origins.add(`https://${host}:${port}`);
    }
  }
  if (publicDemoOpen()) {
    // Origins for trycloudflare are exact host; validated loosely in validateHostAndOrigin when demo open.
  }
  return origins;
}

export function validateHostAndOrigin(req, port) {
  const host = String(req.headers.host || "").toLowerCase();
  if (!hostAllowed(host, port)) return { ok: false, reason: "HOST_MISMATCH" };
  const origin = req.headers.origin;
  if (!origin) return { ok: true };
  if (expectedOrigins(port).has(origin)) return { ok: true };
  if (publicDemoOpen()) {
    try {
      const u = new URL(origin);
      if (hostAllowed(u.host, port)) return { ok: true };
    } catch {
      /* fall through */
    }
  }
  return { ok: false, reason: "ORIGIN_MISMATCH" };
}

export const corsDenyHeaders = {
  "Access-Control-Allow-Origin": "null",
  "Access-Control-Allow-Credentials": "false",
  Vary: "Origin"
};
