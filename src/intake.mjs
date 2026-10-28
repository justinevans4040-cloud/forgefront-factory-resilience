import { sha256Hex } from "./sha256.mjs";
import { extractCertificate } from "./engine.mjs";

const PO_PATTERN = /\b(?:Purchase\s+Order|PO)(?:\s*(?:No\.?|Number|#))?\s*[:=\-]?\s*(PO[- ]?\d{4,8})\b/i;
const HEAT_PATTERN = /\bHeat(?:\s*(?:No\.?|Number|#))?\s*[:=\-]?\s*([A-Z]{1,3}[- ]?\d{3,7})\b/i;
const GRADE_PATTERN = /\b(?:Material\s+Grade|Grade|Spec(?:ification)?)\s*[:=\-]?\s*(AMS[- ]?\d{4,5})\b/i;
const LOT_PATTERN = /\bLot(?:\s*(?:ID|No\.?|Number|#|Reference))?\s*[:=\-]?\s*([A-Z]{2,4}[- ]?[A-Z0-9-]{3,12})\b/i;
const QTY_PATTERN = /\b(?:Quantity|Qty|Received)\s*[:=\-]?\s*(\d{1,5})\b/i;

function normalizeToken(value) {
  if (!value) return null;
  return String(value).toUpperCase().replace(/\s+/g, "").replace(/^(PO|H|A|S)(?=\d)/, "$1-");
}

function fieldFromLine(lines, pattern, key) {
  const at = lines.findIndex(line => pattern.test(line));
  if (at < 0) return null;
  const match = lines[at].match(pattern);
  return {
    value: normalizeToken(match[1]),
    confidence: "KNOWN",
    line: at + 1,
    quote: lines[at].trim(),
    key
  };
}

export function hashDocumentText(text) {
  return sha256Hex(String(text || ""));
}

export function parseDocument(docType, text, docId) {
  const lines = String(text || "").split(/\r?\n/);
  const sha256 = hashDocumentText(text);
  const extractedAt = new Date(0).toISOString();
  const fields = {};

  if (docType === "material_certificate") {
    const cert = extractCertificate(text);
    for (const [key, evidence] of Object.entries(cert.fields)) {
      fields[key] = evidence ? {
        value: evidence.value,
        confidence: "KNOWN",
        line: evidence.line,
        quote: evidence.quote
      } : { value: null, confidence: "UNKNOWN" };
    }
    if (cert.fields.lot === undefined) {
      const lot = fieldFromLine(lines, LOT_PATTERN, "lot");
      if (lot) fields.lot = { value: lot.value, confidence: "KNOWN", line: lot.line, quote: lot.quote };
    }
    const qty = fieldFromLine(lines, QTY_PATTERN, "quantity");
    if (qty) fields.quantity = { value: qty.value, confidence: "KNOWN", line: qty.line, quote: qty.quote };
  } else {
    const po = fieldFromLine(lines, PO_PATTERN, "po");
    const heat = fieldFromLine(lines, HEAT_PATTERN, "heat");
    const grade = fieldFromLine(lines, GRADE_PATTERN, "grade");
    const lot = fieldFromLine(lines, LOT_PATTERN, "lot");
    const qty = fieldFromLine(lines, QTY_PATTERN, "quantity");
    for (const row of [po, heat, grade, lot, qty]) {
      if (row) fields[row.key] = { value: row.value, confidence: "KNOWN", line: row.line, quote: row.quote };
    }
  }

  return {
    docId: docId || `${docType}-${sha256.slice(0, 8)}`,
    docType,
    sha256,
    extractedAt,
    extractionMethod: "deterministic-text",
    fields,
    lineCount: lines.length
  };
}

const CANONICAL_KEYS = ["po", "heat", "grade", "lot", "quantity"];

export function reconcilePacket(documents, masterLot) {
  const contradictions = [];
  const byKey = new Map();

  for (const doc of documents) {
    for (const key of CANONICAL_KEYS) {
      const field = doc.fields[key];
      if (!field || field.confidence === "UNKNOWN" || field.value == null) continue;
      const entry = {
        key,
        value: field.value,
        docId: doc.docId,
        docType: doc.docType,
        pointer: field.line ? { line: field.line, quote: field.quote } : field.cell ? { cell: field.cell } : null
      };
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(entry);
    }
  }

  for (const [key, entries] of byKey) {
    const values = [...new Set(entries.map(e => e.value))];
    if (values.length > 1) {
      contradictions.push({
        id: `XDOC-${key}`,
        field: key,
        severity: "REVIEW_REQUIRED",
        values,
        evidence: entries,
        summary: `${key.toUpperCase()} disagrees across ${entries.length} document(s).`
      });
    }
  }

  if (masterLot) {
    for (const key of ["po", "heat", "grade"]) {
      const expected = normalizeToken(masterLot[key]);
      const observed = byKey.get(key)?.find(e => e.docType === "material_certificate") ||
        byKey.get(key)?.[0];
      if (!observed) {
        contradictions.push({
          id: `MASTER-MISSING-${key}`,
          field: key,
          severity: "UNKNOWN",
          values: [expected, null],
          evidence: [{ key, value: null, docId: "master", docType: "scenario_master", pointer: { sourceRef: `lot:${masterLot.id}:${key}` } }],
          summary: `No ${key} value found in submitted packet for lot ${masterLot.id}.`
        });
        continue;
      }
      if (observed.value !== expected) {
        contradictions.push({
          id: `MASTER-${key}`,
          field: key,
          severity: "REVIEW_REQUIRED",
          values: [expected, observed.value],
          evidence: [
            { key, value: expected, docId: "master", docType: "scenario_master", pointer: { sourceRef: `lot:${masterLot.id}:${key}` } },
            observed
          ],
          summary: `Certificate ${key} ${observed.value} does not match master record ${expected}.`
        });
      }
    }
  }

  const hasConflict = contradictions.some(c => c.severity === "REVIEW_REQUIRED");
  const hasUnknown = contradictions.some(c => c.severity === "UNKNOWN");
  const status = hasConflict ? "REVIEW REQUIRED" : hasUnknown ? "UNKNOWN" : "FIELDS MATCHED";

  return {
    status,
    contradictions,
    documents: documents.map(d => ({ docId: d.docId, docType: d.docType, sha256: d.sha256 })),
    fieldIndex: Object.fromEntries([...byKey.entries()].map(([k, v]) => [k, v]))
  };
}

export function buildPacketFromScenario(factory) {
  const lot = factory.lots.find(l => l.id === factory.incomingLotId);
  const poText = factory.packetDocuments?.purchase_order || "";
  const invText = factory.packetDocuments?.inventory_receipt || "";
  const certText = factory.certificate;
  const docs = [
    parseDocument("material_certificate", certText, "DOC-CERT-001"),
    parseDocument("purchase_order", poText, "DOC-PO-001"),
    parseDocument("inventory_receipt", invText, "DOC-INV-001")
  ];
  return { documents: docs, reconciliation: reconcilePacket(docs, lot) };
}
