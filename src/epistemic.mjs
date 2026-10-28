/** Field epistemic polarity — inspired by athere-mesh epistemic-state (see docs/PROVENANCE.md). */

export const POLARITY = {
  UNKNOWN: "unknown",
  VERIFIED_FALSE: "verified_false",
  VERIFIED_TRUE: "verified_true"
};

export function nextActionFor(polarity, fieldKey) {
  switch (polarity) {
    case POLARITY.UNKNOWN:
      return `Collect evidence: re-scan, request supplier MTR, or manual entry for ${fieldKey}.`;
    case POLARITY.VERIFIED_FALSE:
      return `Hold lot and open discrepancy review — ${fieldKey} contradicts master record.`;
    case POLARITY.VERIFIED_TRUE:
      return `Continue trace — ${fieldKey} matches master for this scenario check only (not material release).`;
    default:
      return "Review required.";
  }
}

export function polarityFromFinding(finding) {
  if (!finding) return { polarity: POLARITY.UNKNOWN, confidence: 0 };
  if (finding.status === "UNKNOWN" || finding.observed == null) {
    return { polarity: POLARITY.UNKNOWN, confidence: 0.2 };
  }
  if (finding.status === "CONFLICT") {
    return { polarity: POLARITY.VERIFIED_FALSE, confidence: 0.95 };
  }
  if (finding.status === "MATCH") {
    return { polarity: POLARITY.VERIFIED_TRUE, confidence: 0.9 };
  }
  return { polarity: POLARITY.UNKNOWN, confidence: 0.1 };
}

export function enrichCertificateWithEpistemic(certificate) {
  const fields = certificate.findings.map(f => {
    const { polarity, confidence } = polarityFromFinding(f);
    const evidenceRefs = [];
    if (f.evidence?.line) evidenceRefs.push(`cert-line:${f.evidence.line}`);
    if (f.sourceRef) evidenceRefs.push(f.sourceRef);
    return {
      ...f,
      polarity,
      confidence,
      evidenceRefs,
      nextAction: nextActionFor(polarity, f.field)
    };
  });
  return { ...certificate, fields };
}
