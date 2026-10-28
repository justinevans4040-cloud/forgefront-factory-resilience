const buckets = new Map();
const concurrency = new Map();
const daily = new Map();

function dayKey() {
  return new Date().toISOString().slice(0, 10);
}

function touchBucket(key, windowMs, limit) {
  const now = Date.now();
  const row = buckets.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > row.resetAt) {
    row.count = 0;
    row.resetAt = now + windowMs;
  }
  row.count += 1;
  buckets.set(key, row);
  if (row.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((row.resetAt - now) / 1000));
    return { allowed: false, retryAfter, remaining: 0 };
  }
  return { allowed: true, retryAfter: 0, remaining: limit - row.count };
}

export function checkRateLimits({ ip, route, profile }) {
  const ipKey = `${route}:ip:${ip}`;
  const globalKey = `${route}:global`;
  const ipCheck = touchBucket(ipKey, profile.windowMs, profile.perIp);
  if (!ipCheck.allowed) return { allowed: false, retryAfter: ipCheck.retryAfter, scope: "ip" };
  const globalCheck = touchBucket(globalKey, profile.windowMs, profile.global);
  if (!globalCheck.allowed) return { allowed: false, retryAfter: globalCheck.retryAfter, scope: "global" };
  return { allowed: true, retryAfter: 0 };
}

export async function withConcurrency(key, max, fn) {
  const active = concurrency.get(key) || 0;
  if (active >= max) return { ok: false, retryAfter: 2 };
  concurrency.set(key, active + 1);
  try {
    const result = await fn();
    return { ok: true, result };
  } finally {
    concurrency.set(key, Math.max(0, (concurrency.get(key) || 1) - 1));
  }
}

export function checkDailyBudget(route, units, maxUnits) {
  const key = `${route}:day:${dayKey()}`;
  const used = daily.get(key) || 0;
  if (used + units > maxUnits) {
    const retryAfter = Math.max(60, Math.ceil((new Date(`${dayKey()}T23:59:59Z`).getTime() - Date.now()) / 1000));
    return { allowed: false, retryAfter, used };
  }
  daily.set(key, used + units);
  return { allowed: true, used: used + units };
}

export const ROUTE_LIMITS = {
  "meta-brief": { windowMs: 60_000, perIp: 8, global: 40, concurrency: 2, dailyUnits: 200, costPerCall: 5 },
  intake: { windowMs: 60_000, perIp: 30, global: 120, concurrency: 8, dailyUnits: 5000, costPerCall: 1 },
  "pdf-intake": { windowMs: 60_000, perIp: 12, global: 60, concurrency: 4, dailyUnits: 5000, costPerCall: 2 },
  consent: { windowMs: 60_000, perIp: 20, global: 80, concurrency: 4, dailyUnits: 1000, costPerCall: 1 },
  pm: { windowMs: 60_000, perIp: 20, global: 80, concurrency: 6, dailyUnits: 2000, costPerCall: 2 },
  kanban: { windowMs: 60_000, perIp: 40, global: 160, concurrency: 10, dailyUnits: 4000, costPerCall: 1 },
  session: { windowMs: 60_000, perIp: 30, global: 120, concurrency: 8, dailyUnits: 20000, costPerCall: 1 },
  read: { windowMs: 60_000, perIp: 120, global: 480, concurrency: 16, dailyUnits: 200000, costPerCall: 1 },
  "ledger-verify": { windowMs: 60_000, perIp: 30, global: 120, concurrency: 4, dailyUnits: 50000, costPerCall: 1 },
  ask: { windowMs: 60_000, perIp: 30, global: 120, concurrency: 4, dailyUnits: 2000, costPerCall: 1 },
  "prove-it": { windowMs: 60_000, perIp: 6, global: 20, concurrency: 1, dailyUnits: 500, costPerCall: 5 }
};

export function resetRateLimitsForTests() {
  buckets.clear();
  concurrency.clear();
  daily.clear();
}
