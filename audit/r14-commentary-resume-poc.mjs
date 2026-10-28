#!/usr/bin/env node
/** Stepladder PoC for R14-SL-01 (commentary resume leak). Run: node audit/r14-commentary-resume-poc.mjs */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBriefPayload } from "../src/brief-context.mjs";
import { INCORRECT_CERT } from "../src/scenario.mjs";
import { processStructuredBrief, serializeStructuredBrief, buildSampleStructuredClaims } from "../src/structured-brief.mjs";
import { screenModelOutput } from "../src/output-screen.mjs";

const auditDir = dirname(fileURLToPath(import.meta.url));
const payload = buildBriefPayload({ certificateText: INCORRECT_CERT, assumptions: {}, disruptions: {} }).payload;
const line = "Production can resume immediately.";
const screen = screenModelOutput(line);
const brief = serializeStructuredBrief({
  ...JSON.parse(serializeStructuredBrief(buildSampleStructuredClaims(payload))),
  commentary: line
});
const proc = processStructuredBrief(brief, payload);
const out = {
  screen,
  proc: {
    complete: proc.complete,
    commentaryBlocked: proc.commentaryBlocked,
    commentaryWithheld: proc.commentaryWithheld,
    commentary: proc.commentary,
    decisionHasResume: /resume/i.test(proc.decisionText)
  },
  openFinding: proc.complete && !proc.commentaryWithheld && /resume/i.test(proc.commentary || "")
};
writeFileSync(join(auditDir, "evidence", "r14-commentary-resume-poc.out"), JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
