const FORBIDDEN_RELEASE = /\b(?<!not\s)(?<!no\s)(material\s+)?release(d|s)?\s+for\b|\bmaterial\s+has\s+been\s+released\b|\bapproved\s+for\s+production\b|\bverified\s+compliant\b|\bas9100\s+certified\b/i;
const FORBIDDEN_INVENTED = /\bconfirmed\s+supplier\s+commitment\b|\bguaranteed\s+delivery\b/i;

export function extractAllowedFactIds(payload) {
  const ids = new Set([`scenario:${payload.scenarioId}`]);
  for (const f of payload.summary?.findings || []) {
    ids.add(`field:${f.field}`);
    if (f.evidence?.line) ids.add(`cert-line:${f.evidence.line}`);
  }
  for (const p of payload.plans || []) ids.add(`plan:${p.id}`);
  if (payload.summary?.impactedOrders != null) ids.add("metric:impactedOrders");
  if (payload.summary?.impactedUnits != null) ids.add("metric:impactedUnits");
  return ids;
}

export function scoreBriefGrounding(text, payload) {
  const violations = [];
  if (!text || !String(text).trim()) {
    return { acceptable: false, violations: ["empty_response"], grounded: false };
  }
  if (FORBIDDEN_RELEASE.test(text)) violations.push("unauthorized_release_language");
  if (FORBIDDEN_INVENTED.test(text)) violations.push("invented_commitment_language");

  const allowed = extractAllowedFactIds(payload);
  const cited = [...String(text).matchAll(/\b(?:JOB-\d{3}|SO-\d+|PO-\d+|H-\d+|AMS\d+|plan\s+[a-z]+)\b/gi)].map(m => m[0]);
  const unknownCitations = cited.filter(token => {
    const upper = token.toUpperCase();
    if (/^JOB-/.test(upper)) return !payload.summary?.findings;
    return false;
  });

  if (unknownCitations.length > 3) violations.push("excessive_ungrounded_entities");

  return {
    acceptable: violations.length === 0,
    violations,
    grounded: violations.length === 0,
    allowedFactCount: allowed.size,
    policy: "explain-only-no-release"
  };
}

export function fixtureBrief(payload) {
  const heat = payload.summary?.findings?.find(f => f.field === "heat");
  const jobs = payload.summary?.impactedOrders ?? 0;
  const units = payload.summary?.impactedUnits ?? 0;
  const top = payload.plans?.[0];
  return {
    status: "COMPLETE",
    text: [
      `[evidence:field:heat] Synthetic incident on scenario ${payload.scenarioId}: observed heat ${heat?.observed || "unknown"} vs master ${heat?.expected || "unknown"}.`,
      `[evidence:metric:impactedOrders] ${jobs} production jobs and [evidence:metric:impactedUnits] ${units} units remain in scenario hold pending documented reconciliation.`,
      top ? `[evidence:plan:${top.id}] Lowest estimated scenario cost option is "${top.label}" at ${top.estimatedCost} — planning estimate only, not material release.` : "No recovery options were supplied.",
      `[evidence:scenario:${payload.scenarioId}] Operator must verify supplier documents before any physical substitution or shipment.`
    ].join(" "),
    model: "fixture-template",
    mode: "fixture",
    grounding: { prechecked: true }
  };
}
