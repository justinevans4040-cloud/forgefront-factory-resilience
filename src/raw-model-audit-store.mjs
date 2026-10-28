/** Session-scoped stash for unverified raw model prose (never returned on default API). */
const store = new Map();
const MAX_ENTRIES = 300;

export function stashRawModelAudit(sessionToken, entry) {
  if (!sessionToken) return;
  store.set(sessionToken, { ...entry, storedAt: Date.now() });
  if (store.size > MAX_ENTRIES) {
    const oldest = [...store.entries()].sort((a, b) => a[1].storedAt - b[1].storedAt)[0]?.[0];
    if (oldest) store.delete(oldest);
  }
}

export function peekRawModelAudit(sessionToken) {
  return store.get(sessionToken) || null;
}

export function clearRawModelAuditForTests() {
  store.clear();
}
