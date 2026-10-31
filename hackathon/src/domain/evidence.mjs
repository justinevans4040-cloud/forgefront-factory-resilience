/**
 * Immutable evidence registry bound to a single snapshot digest.
 * Citations outside the current digest are rejected.
 */

export function buildEvidenceRegistry(snapshot) {
  if (!snapshot?.snapshotDigest) {
    throw new Error("snapshot digest required");
  }

  const byId = new Map();
  for (const record of snapshot.evidenceRecords || []) {
    byId.set(
      record.evidenceId,
      Object.freeze({
        evidenceId: record.evidenceId,
        snapshotDigest: snapshot.snapshotDigest,
        source: Object.freeze({
          documentId: record.documentId,
          recordId: record.recordId,
          lineId: record.lineId,
          field: record.field,
        }),
        quantity: record.quantity,
        excerpt: record.excerpt,
      }),
    );
  }

  return Object.freeze({
    snapshotDigest: snapshot.snapshotDigest,
    size: byId.size,
    list() {
      return Object.freeze([...byId.values()]);
    },
    get(evidenceId, expectedDigest = snapshot.snapshotDigest) {
      if (expectedDigest !== snapshot.snapshotDigest) {
        const err = new Error("evidence request bound to a different snapshot digest");
        err.code = "CROSS_SNAPSHOT";
        throw err;
      }
      const entry = byId.get(evidenceId);
      if (!entry) {
        const err = new Error(`unknown evidence id: ${evidenceId}`);
        err.code = "NOT_FOUND";
        throw err;
      }
      return entry;
    },
    has(evidenceId) {
      return byId.has(evidenceId);
    },
  });
}
