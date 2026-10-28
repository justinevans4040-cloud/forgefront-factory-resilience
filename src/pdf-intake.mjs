import { extractCertificate } from "./engine.mjs";
import { extractPdfText } from "./pdf-text.mjs";
import { scanSupplierText } from "./prompt-defense.mjs";
import { proposeCertFieldsFromText } from "./model-adapter.mjs";

const MAX_PAGES = 3;
const MAX_PDF_BYTES = 512_000;
const MAX_EXTRACT_CHARS = 120_000;

/**
 * Text-layer extraction: full parser (FlateDecode, object streams, ToUnicode CMaps) with the
 * legacy uncompressed ( … ) Tj scan as a fallback. Image-only/scanned PDFs have no text
 * layer; this build has no OCR and says so (TEXT_LAYER_UNREADABLE), never "OCR failed".
 */
export function extractPdfTextLayer(buffer) {
  const bin = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (bin.length > MAX_PDF_BYTES) {
    return { text: "", readable: false, pageCount: 0, method: "pdf-text-layer", reason: "PAYLOAD_TOO_LARGE" };
  }
  if (!bin.subarray(0, 1024).toString("latin1").includes("%PDF-")) {
    return { text: "", readable: false, pageCount: 0, method: "pdf-text-layer", reason: "NOT_A_PDF" };
  }
  let full = { text: "", pageCount: 0 };
  try { full = extractPdfText(bin); } catch { full = { text: "", pageCount: 0 }; }
  if (full.reason === "INFLATE_BOMB") {
    return { text: "", readable: false, pageCount: full.pageCount || 0, method: full.method || "pdf-text-layer", reason: "INFLATE_BOMB" };
  }
  let text = full.text || "";
  let method = full.method || "pdf-text-layer";
  if (text.length < 40) {
    const raw = bin.toString("latin1");
    const parts = [];
    const re = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
    let match;
    while ((match = re.exec(raw)) !== null) {
      const token = match[1].replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\\(/g, "(").replace(/\\\)/g, ")");
      if (token.trim()) parts.push(token);
    }
    const legacy = parts.join("\n").trim();
    if (legacy.length > text.length) { text = legacy; method = "pdf-text-layer-lite (uncompressed Tj)"; }
  }
  text = text.slice(0, MAX_EXTRACT_CHARS);
  const pageHints = full.pageCount || (bin.toString("latin1").match(/\/Type\s*\/Page\b/g) || []).length;
  return {
    text,
    readable: text.length >= 40,
    pageCount: Math.min(MAX_PAGES, Math.max(1, pageHints || 1)),
    compressed: Boolean(full.compressed),
    method,
    reason: full.reason
  };
}

function mapProposalToCertText(proposal) {
  if (!proposal) return "";
  const po = proposal.po_number || proposal.po || "MISSING";
  const heat = proposal.heat_number || proposal.heat || "MISSING";
  const grade = proposal.material_grade || proposal.grade || "MISSING";
  return `MATERIAL TEST REPORT\nPurchase Order: ${po}\nHeat Number: ${heat}\nMaterial Grade: ${grade}\n`;
}

export async function processPdfCertificate(buffer, { provider } = {}) {
  const extracted = extractPdfTextLayer(buffer);
  const probeText = extracted.text || buffer.toString("utf8").slice(0, MAX_EXTRACT_CHARS);
  const defense = scanSupplierText(probeText);
  if (defense.quarantined) {
    return {
      route: "FLAGGED_INJECTION",
      reason: "SUPPLIER_INJECTION_QUARANTINED",
      extraction: extracted,
      defense,
      certificateText: defense.sanitized,
      policy: "supplier-text-never-executes-as-instruction"
    };
  }
  if (!extracted.readable) {
    return {
      route: "FLAGGED",
      reason: extracted.reason === "INFLATE_BOMB" ? "INFLATE_BOMB"
        : extracted.reason === "ENCRYPTED_PDF" ? "ENCRYPTED_PDF"
        : extracted.reason === "NOT_A_PDF" ? "NOT_A_PDF" : "TEXT_LAYER_UNREADABLE",
      message: "No readable text layer (image-only or scanned PDF). This build extracts PDF text layers; it does not perform OCR.",
      extraction: extracted,
      defense,
      certificateText: ""
    };
  }
  const deterministic = extractCertificate(defense.sanitized);
  const model = await proposeCertFieldsFromText(defense.sanitized, { provider });
  const proposedText = mapProposalToCertText(model.proposal);
  const proposedExtract = proposedText ? extractCertificate(proposedText) : null;

  const decision = {
    po: deterministic.fields.po?.value || null,
    heat: deterministic.fields.heat?.value || null,
    grade: deterministic.fields.grade?.value || null,
    source: "deterministic-parser",
    modelProposal: model.proposal,
    modelProvider: model.provider
  };

  // Injection quarantine takes priority over "no fields" — the sanitizer may have
  // replaced the whole blob with a marker, which is exactly the fail-closed outcome.
  if (defense.quarantined) {
    return {
      route: "FLAGGED_INJECTION",
      reason: "SUPPLIER_INJECTION_QUARANTINED",
      extraction: extracted,
      defense,
      model,
      decision,
      certificateText: defense.sanitized,
      policy: "supplier-text-never-executes-as-instruction"
    };
  }
  if (!decision.po && !decision.heat && !decision.grade) {
    return {
      route: "FLAGGED",
      reason: "NO_EXTRACTABLE_FIELDS",
      extraction: extracted,
      defense,
      model,
      decision
    };
  }

  const certificateText = defense.sanitized;
  return {
    route: defense.quarantined ? "FLAGGED_INJECTION" : "PROCESSING",
    extraction: extracted,
    defense,
    model,
    decision,
    certificateText,
    proposedExtract,
    policy: "deterministic-fields-override-model"
  };
}
