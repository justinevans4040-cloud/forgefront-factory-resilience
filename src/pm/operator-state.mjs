/** Per-session approval + Kanban state. Approvals expire (<= 15 min) and are bound to a scenario hash. */
export const MAX_APPROVAL_TTL_MS = 15 * 60 * 1000;
export const DEFAULT_APPROVAL_TTL_MS = MAX_APPROVAL_TTL_MS;

const approvals = new Map();
const kanbanBoards = new Map();

export function approvalTtlMs() {
  const sec = Number(process.env.APPROVAL_TTL_SEC);
  return Number.isFinite(sec) && sec > 0 ? Math.min(sec * 1000, MAX_APPROVAL_TTL_MS) : DEFAULT_APPROVAL_TTL_MS;
}

export function setOperatorApproval(sessionToken, approval, board) {
  const now = Date.now();
  approvals.set(sessionToken, { ...approval, expiresAt: approval.expiresAt || new Date(now + approvalTtlMs()).toISOString() });
  if (board) kanbanBoards.set(sessionToken, board);
  else kanbanBoards.delete(sessionToken);
}

/** Returns the live approval, or null when absent or expired (expired approvals are purged). */
export function getOperatorApproval(sessionToken, nowMs = Date.now()) {
  const row = approvals.get(sessionToken);
  if (!row) return null;
  if (Date.parse(row.expiresAt) <= nowMs) {
    approvals.delete(sessionToken);
    kanbanBoards.delete(sessionToken);
    return null;
  }
  return row;
}

/** Peek without purging — used to tell "expired" apart from "never approved". */
export function peekOperatorApproval(sessionToken) {
  return approvals.get(sessionToken) || null;
}

export function revokeOperatorApproval(sessionToken) {
  const prior = approvals.get(sessionToken) || null;
  approvals.delete(sessionToken);
  kanbanBoards.delete(sessionToken);
  return prior;
}

export function getKanbanBoard(sessionToken) {
  return kanbanBoards.get(sessionToken) || null;
}

export function updateKanbanBoard(sessionToken, board) {
  kanbanBoards.set(sessionToken, board);
}

export const approvalCount = () => approvals.size;
export const kanbanCount = () => kanbanBoards.size;

/** Used only by the "Prove it" panel on its own probe session: move the approval past its expiry. */
export function expireOperatorApprovalForProof(sessionToken) {
  const row = approvals.get(sessionToken);
  if (row) row.expiresAt = new Date(Date.now() - 1000).toISOString();
  return Boolean(row);
}

export function resetOperatorStateForTests() {
  approvals.clear();
  kanbanBoards.clear();
}
