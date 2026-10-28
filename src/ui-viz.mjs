/**
 * Live visuals from engine impact + session events (Pass 3b — Neutral Dark Gray HMI).
 * Front-end only; CSP-safe inline SVG. Alarm red for disruption; amber for tamper.
 * No green-for-OK. Real engine data only.
 */

const safe = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[c]);

const COL = {
  alarm: "#D9534F",
  amber: "#E0A030",
  ink: "#E6E8EA",
  muted: "#A9AFB5",
  dim: "#8C939A",
  line: "#8A9098",
  fill: "#34383C",
  bg: "#2B2E31"
};

export const DEMO_BEATS = ["disruption", "analysis", "options", "consent", "ledger"];

/** Build a 12-point consequence series from current impact (deterministic). */
export function consequenceSeries(impact, plansLength = 0) {
  const blocked = Boolean(impact?.blocked);
  const orders = Number(impact?.orderCount) || 0;
  const exposure = Number(impact?.exposureValue) || 0;
  const units = Number(impact?.units) || 0;
  const base = blocked ? 0.35 : 0.08;
  const spike = blocked ? Math.min(1, 0.25 + orders / 40 + Math.min(exposure, 5_000_000) / 12_000_000) : 0.12;
  const recovery = blocked ? Math.max(0.15, spike - plansLength * 0.04) : 0.1;
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const t = i / 11;
    let y = base;
    if (blocked) {
      if (t < 0.25) y = base + (spike - base) * (t / 0.25) * 0.4;
      else if (t < 0.55) y = base * 0.5 + spike * (0.55 + (t - 0.25));
      else if (t < 0.8) y = spike;
      else y = spike + (recovery - spike) * ((t - 0.8) / 0.2);
      y += Math.sin(i * 1.7) * 0.03 * (blocked ? 1 : 0.2);
    } else {
      y = 0.08 + Math.sin(i * 0.9) * 0.02;
    }
    pts.push(Math.max(0.02, Math.min(1, y)));
  }
  if (units > 0 && blocked) pts[7] = Math.min(1, pts[7] + Math.min(units, 200) / 800);
  return pts;
}

/** Small inline trend (band) — not a hero area chart. */
export function renderConsequenceSparkline(el, impact, plansLength = 0) {
  if (!el) return;
  const series = consequenceSeries(impact, plansLength);
  const w = 120;
  const h = 28;
  const pad = { t: 2, r: 2, b: 2, l: 2 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const coords = series.map((y, i) => {
    const x = pad.l + (i / (series.length - 1)) * iw;
    const yy = pad.t + (1 - y) * ih;
    return [x, yy];
  });
  const line = coords.map((c, i) => `${i ? "L" : "M"}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(" ");
  const blocked = Boolean(impact?.blocked);
  const stroke = blocked ? COL.alarm : COL.muted;
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <path class="spark-line" d="${line}" style="stroke:${stroke}"/>
  </svg>`;
}

export function renderIncidentTimeline(el, events = []) {
  if (!el) return;
  const rows = (events || []).slice(0, 8);
  if (!rows.length) {
    el.innerHTML = `<li class="tl-empty">Session events appear here as the demo runs.</li>`;
    return;
  }
  el.innerHTML = rows.map(row => {
    const text = String(row.message || row || "");
    const t = row.at ? new Date(row.at) : new Date();
    const stamp = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const alert = /conflict|fail|denied|tamper|invalid|shock|blocked|review required|diverged/i.test(text);
    const ok = /match|verified|accepted|pass|ok|cleared|fields match/i.test(text);
    const cls = alert ? "alert" : ok ? "ok" : "";
    return `<li class="${cls}"><time datetime="${safe(t.toISOString())}">${safe(stamp)}</time><span>${safe(text)}</span></li>`;
  }).join("");
}

/**
 * Demo story / beat flags. Maps recovery → options for time conductor.
 */
export function resolveDemoBeat(state = {}) {
  const blocked = Boolean(state.impact?.blocked);
  const hasBrief = Boolean(state.brief) && !state.briefStale;
  const hasPlans = Array.isArray(state.plans) && state.plans.length > 0 && blocked;
  const consented = Boolean(state.approval?.planId) || state.incident?.state === "ACCEPTED_SCENARIO";
  const ledgerOk = state.ledger?.ok !== false && (state.events?.length || 0) > 0;

  const flags = {
    disruption: blocked || state.incident?.state === "DETECTED" || state.incident?.state === "REOPENED",
    analysis: hasBrief || (state.lastClaimBlocked > 0),
    options: hasPlans || Boolean(state.selected),
    recovery: hasPlans || Boolean(state.selected),
    consent: consented,
    ledger: ledgerOk && (consented || (state.events?.length || 0) >= 3)
  };

  const order = ["disruption", "analysis", "options", "consent", "ledger"];
  let active = "disruption";
  for (const key of order) {
    if (flags[key]) active = key;
  }
  if (!blocked && state.certificate?.status === "FIELDS MATCHED") {
    active = flags.analysis ? "analysis" : "disruption";
  }
  return { active, flags, order };
}

export function renderDemoStory(el, state = {}) {
  if (!el) return;
  const { active, flags, order } = resolveDemoBeat(state);
  for (const step of el.querySelectorAll("[data-story]")) {
    const key = step.getAttribute("data-story");
    const mapped = key === "recovery" ? "options" : key;
    const idx = order.indexOf(mapped);
    const act = order.indexOf(active);
    const done = idx < act || (flags[mapped] && mapped !== active && idx <= act);
    step.classList.toggle("is-active", mapped === active || (key === "recovery" && active === "options"));
    step.classList.toggle("is-done", done && mapped !== active);
  }
}

export function renderTimeConductor(el, state = {}, scrubBeat = null) {
  if (!el) return;
  const { active, flags, order } = resolveDemoBeat(state);
  const beat = scrubBeat && order.includes(scrubBeat) ? scrubBeat : active;
  const scrubber = el.querySelector("#tcScrubber") || document.getElementById("tcScrubber");
  const label = el.querySelector("#tcBeatLabel") || document.getElementById("tcBeatLabel");
  const marks = el.querySelectorAll("[data-beat]");
  const idx = Math.max(0, order.indexOf(beat));
  if (scrubber && Number(scrubber.value) !== idx) scrubber.value = String(idx);
  if (label) label.textContent = beat;
  for (const node of marks) {
    const key = node.getAttribute("data-beat");
    const i = order.indexOf(key);
    node.classList.toggle("is-active", key === beat);
    node.classList.toggle("is-done", i >= 0 && i < idx);
  }
  document.body.dataset.beat = beat;
  return beat;
}

/**
 * ISA-101 plant schematic: certificate/lot → 4 CNC cells → 40 order marks.
 * Normal = gray. Disruption = first red + diamond shape + "BAD" / "HOLD" text.
 */
export function renderPlantSchematic(el, factory = {}, impact = {}, beat = "disruption") {
  if (!el) return;
  const machines = Array.isArray(factory.machines) ? factory.machines.slice(0, 4) : [];
  const jobs = Array.isArray(factory.jobs) ? factory.jobs.slice(0, 40) : [];
  const blocked = Boolean(impact?.blocked);
  const heldIds = new Set((impact?.jobs || impact?.jobIds || []).map(j => (typeof j === "string" ? j : j.id)));
  const showAlarm = blocked && beat !== "ledger";
  const w = 720;
  const h = 300;
  const lotX = 70;
  const lotY = 40;
  const cellY = 120;
  const cellXs = [140, 280, 420, 560];
  const gridY0 = 190;
  const cols = 10;
  const cellW = 56;
  const cellH = 36;

  const lotStroke = showAlarm ? COL.alarm : COL.ink;
  const lotShape = showAlarm
    ? `<polygon points="${lotX},${lotY - 18} ${lotX + 22},${lotY} ${lotX},${lotY + 18} ${lotX - 22},${lotY}" fill="none" stroke="${lotStroke}" stroke-width="2" class="plant-mark${showAlarm ? " is-alarm" : ""}"/>
       <text x="${lotX}" y="${lotY + 4}" text-anchor="middle" fill="${lotStroke}" font-size="9" font-family="ui-monospace,monospace" font-weight="700">BAD</text>
       <text x="${lotX}" y="${lotY + 36}" text-anchor="middle" fill="${lotStroke}" font-size="9" font-family="ui-monospace,monospace">${safe(factory.incomingLotId || "LOT")}</text>`
    : `<rect x="${lotX - 28}" y="${lotY - 16}" width="56" height="32" fill="none" stroke="${COL.ink}" stroke-width="1.5"/>
       <text x="${lotX}" y="${lotY + 4}" text-anchor="middle" fill="${COL.ink}" font-size="9" font-family="ui-monospace,monospace">CERT</text>
       <text x="${lotX}" y="${lotY + 36}" text-anchor="middle" fill="${COL.muted}" font-size="9" font-family="ui-monospace,monospace">${safe(factory.incomingLotId || "LOT")}</text>`;

  const cells = (machines.length ? machines : [{ id: "C1" }, { id: "C2" }, { id: "C3" }, { id: "C4" }]).map((m, i) => {
    const x = cellXs[i] || 140 + i * 140;
    const label = String(m.id || m.name || `CELL-${i + 1}`).slice(0, 12);
    return `<rect x="${x - cellW / 2}" y="${cellY - cellH / 2}" width="${cellW}" height="${cellH}" fill="none" stroke="${COL.ink}" stroke-width="1.5"/>
      <text x="${x}" y="${cellY + 4}" text-anchor="middle" fill="${COL.ink}" font-size="9" font-family="ui-monospace,monospace">${safe(label)}</text>
      <line x1="${lotX}" y1="${lotY + 20}" x2="${x}" y2="${cellY - cellH / 2}" stroke="${COL.line}" stroke-width="1"/>`;
  }).join("");

  const orderMarks = jobs.map((job, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 40 + col * 68;
    const y = gridY0 + row * 26;
    const id = job.id || `J${i + 1}`;
    const held = showAlarm && (heldIds.has(id) || (heldIds.size === 0 && blocked && i < (impact.orderCount || 0)));
    if (held) {
      return `<g class="order-mark is-alarm" data-job="${safe(id)}">
        <polygon points="${x},${y - 7} ${x + 8},${y} ${x},${y + 7} ${x - 8},${y}" fill="none" stroke="${COL.alarm}" stroke-width="1.5"/>
        <text x="${x + 12}" y="${y + 3}" fill="${COL.alarm}" font-size="8" font-family="ui-monospace,monospace">HOLD ${safe(id)}</text>
      </g>`;
    }
    return `<g class="order-mark" data-job="${safe(id)}">
      <rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="none" stroke="${COL.ink}" stroke-width="1"/>
      <text x="${x + 10}" y="${y + 3}" fill="${COL.dim}" font-size="8" font-family="ui-monospace,monospace">${safe(id)}</text>
    </g>`;
  }).join("");

  const feeders = cellXs.map(x =>
    `<line x1="${x}" y1="${cellY + cellH / 2}" x2="${x}" y2="${gridY0 - 12}" stroke="${COL.line}" stroke-width="1"/>`
  ).join("");

  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <text x="12" y="16" fill="${COL.muted}" font-size="10" font-family="ui-monospace,monospace">INCOMING CERT / LOT</text>
    ${lotShape}
    <text x="12" y="${cellY - 28}" fill="${COL.muted}" font-size="10" font-family="ui-monospace,monospace">4 CNC CELLS (ILLUSTRATIVE HAAS-CLASS)</text>
    ${cells}
    ${feeders}
    <text x="12" y="${gridY0 - 16}" fill="${COL.muted}" font-size="10" font-family="ui-monospace,monospace">40 ORDERS · SQUARE=NORMAL · DIAMOND+HOLD=IMPACTED</text>
    ${orderMarks || `<text x="40" y="${gridY0 + 20}" fill="${COL.dim}" font-size="11">No jobs in scenario.</text>`}
  </svg>`;
}

/** Cumulative late-hours / exposure series from a plan schedule (engine data). */
function seriesFromSchedule(schedule = [], hours = 12, costPerLateHour = 1) {
  const pts = [];
  for (let t = 0; t < hours; t++) {
    const late = (schedule || []).reduce((s, row) => {
      const lh = Number(row.lateHours) || 0;
      return s + Math.min(lh, Math.max(0, lh - (hours - 1 - t) * (lh / Math.max(hours - 1, 1))));
    }, 0);
    pts.push(late * costPerLateHour);
  }
  // Prefer true cumulative at end = sum lateHours
  const total = (schedule || []).reduce((s, row) => s + (Number(row.lateHours) || 0), 0);
  if (pts.length) pts[pts.length - 1] = total * costPerLateHour;
  return pts;
}

function doNothingSeries(impact = {}, factory = {}, hours = 12) {
  const jobs = impact?.jobs || factory?.jobs || [];
  const blocked = Boolean(impact?.blocked);
  const rate = Number(factory?.assumptions?.latenessCostPerHour) || 120;
  if (!blocked) return Array.from({ length: hours }, () => 0);
  // Hold all impacted jobs: approximate do-nothing as rising exposure from impact
  const units = Number(impact?.units) || jobs.reduce((s, j) => s + (Number(j.units) || 0), 0);
  const exposure = Number(impact?.exposureValue) || units * rate * 4;
  return Array.from({ length: hours }, (_, t) => exposure * ((t + 1) / hours));
}

/**
 * F1-style strategy gapper: 4 strategies + do-nothing reference over time.
 * Replaces Pass-2 cost bar chart.
 */
export function renderPlanCompare(el, plans = [], impact = {}, factory = {}, selectedId = null) {
  if (!el) return;
  const list = Array.isArray(plans) ? plans : [];
  const hours = 12;
  const nothing = doNothingSeries(impact, factory, hours);
  if (!list.length) {
    const w = 640;
    const h = 120;
    const maxN = Math.max(...nothing, 1);
    const line = nothing.map((v, i) => {
      const x = 40 + (i / (hours - 1)) * (w - 60);
      const y = 20 + (1 - v / maxN) * 70;
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">
      <text x="12" y="14" fill="${COL.muted}" font-size="10" font-family="ui-monospace,monospace">DO NOTHING (REF) · recovery options appear when certificate is blocked</text>
      <path d="${line}" fill="none" stroke="${COL.alarm}" stroke-width="1.5" stroke-dasharray="4 3"/>
    </svg>`;
    return;
  }

  const seriesMap = list.map(p => ({
    id: p.id,
    label: p.label || p.id,
    selected: p.id === selectedId || p._selected,
    cost: Number(p.estimatedCost) || 0,
    late: Number(p.incrementalLateHours) || Number(p.totalLateHours) || 0,
    ys: seriesFromSchedule(p.schedule, hours).map((v, i) => {
      // Blend schedule late-hours toward plan estimatedCost for $ exposure axis
      const t = (i + 1) / hours;
      return (Number(p.estimatedCost) || 0) * t + v * 0.01;
    })
  }));
  const allY = [...nothing, ...seriesMap.flatMap(s => s.ys)];
  const maxY = Math.max(...allY, 1);
  const w = 720;
  const h = 200;
  const pad = { t: 28, r: 16, b: 28, l: 48 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const pathFor = ys => ys.map((v, i) => {
    const x = pad.l + (i / (ys.length - 1)) * iw;
    const y = pad.t + (1 - v / maxY) * ih;
    return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  const ref = pathFor(nothing);
  const strokes = ["#E6E8EA", "#A9AFB5", "#8C939A", "#8A9098"];
  const lines = seriesMap.map((s, i) =>
    `<path d="${pathFor(s.ys)}" fill="none" stroke="${s.selected ? COL.alarm : strokes[i % strokes.length]}" stroke-width="${s.selected ? 2.2 : 1.4}" data-plan="${safe(s.id)}"/>
     <text x="${pad.l + iw}" y="${pad.t + 12 + i * 12}" text-anchor="end" fill="${s.selected ? COL.alarm : COL.muted}" font-size="9" font-family="ui-monospace,monospace">${safe(s.label)} · $${Math.round(s.cost).toLocaleString()}</text>`
  ).join("");

  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <text x="${pad.l}" y="16" fill="${COL.muted}" font-size="10" font-family="ui-monospace,monospace">$ EXPOSURE / LATENESS vs DO NOTHING</text>
    <path d="${ref}" fill="none" stroke="${COL.alarm}" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="${pad.l}" y="${h - 8}" fill="${COL.alarm}" font-size="9" font-family="ui-monospace,monospace">— do nothing (ref)</text>
    ${lines}
  </svg>`;
}

/** Tufte sparklines: 40 orders × each strategy; click drills to order state. */
export function renderOrderSparklines(el, plans = [], factory = {}, impact = {}, onDrill = null) {
  if (!el) return;
  const list = Array.isArray(plans) ? plans.slice(0, 4) : [];
  const jobs = Array.isArray(factory?.jobs) ? factory.jobs.slice(0, 40) : [];
  if (!list.length || !jobs.length) {
    el.innerHTML = `<p class="support-text" style="margin:0">Order sparklines appear when recovery strategies are computed from engine schedules.</p>`;
    return;
  }
  const rowH = 14;
  const labelW = 120;
  const sparkW = 80;
  const gap = 8;
  const w = labelW + list.length * (sparkW + gap) + 20;
  const h = 24 + jobs.length * rowH;
  const header = list.map((p, i) => {
    const x = labelW + i * (sparkW + gap);
    return `<text x="${x + sparkW / 2}" y="12" text-anchor="middle" fill="${COL.muted}" font-size="8" font-family="ui-monospace,monospace">${safe(String(p.id || p.label).slice(0, 10))}</text>`;
  }).join("");

  const rows = jobs.map((job, ji) => {
    const y = 22 + ji * rowH;
    const id = job.id || `J${ji + 1}`;
    const held = Boolean(impact?.blocked) && (
      (impact.jobs || []).some(j => (j.id || j) === id) ||
      (impact.jobIds || []).includes(id)
    );
    const labelFill = held ? COL.alarm : COL.dim;
    const sparks = list.map((p, pi) => {
      const sched = (p.schedule || []).find(s => s.id === id);
      const late = Number(sched?.lateHours) || 0;
      const alloc = (p.allocations || []).find(a => a.jobId === id);
      const x0 = labelW + pi * (sparkW + gap);
      const pts = 8;
      const line = Array.from({ length: pts }, (_, t) => {
        const x = x0 + (t / (pts - 1)) * sparkW;
        const yy = y + 4 - (late * (t / (pts - 1))) * 0.35;
        return `${t ? "L" : "M"}${x.toFixed(1)},${yy.toFixed(1)}`;
      }).join(" ");
      return `<path d="${line}" fill="none" stroke="${late > 0 ? COL.alarm : COL.ink}" stroke-width="1" data-plan="${safe(p.id)}" data-job="${safe(id)}" data-late="${late}" data-status="${safe(alloc?.status || "")}" style="cursor:pointer"/>`;
    }).join("");
    return `<text x="4" y="${y + 4}" fill="${labelFill}" font-size="8" font-family="ui-monospace,monospace">${held ? "◆ " : "□ "}${safe(id)}</text>${sparks}`;
  }).join("");

  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="false">${header}${rows}</svg>`;
  el.onclick = e => {
    const path = e.target.closest("path[data-job]");
    if (!path) return;
    const detail = {
      jobId: path.getAttribute("data-job"),
      planId: path.getAttribute("data-plan"),
      lateHours: Number(path.getAttribute("data-late")) || 0,
      status: path.getAttribute("data-status") || ""
    };
    if (typeof onDrill === "function") onDrill(detail);
  };
}

export function renderImpactConstellation(el, impact = {}, jobs = []) {
  if (!el) return;
  const blocked = Boolean(impact?.blocked);
  const rows = Array.isArray(jobs) && jobs.length
    ? jobs.slice(0, 40)
    : Array.from({ length: Math.min(40, Number(impact?.orderCount) || (blocked ? 7 : 0)) }, (_, i) => ({
      id: `J${i + 1}`,
      held: blocked
    }));
  if (!rows.length) {
    el.innerHTML = `<svg viewBox="0 0 640 80"><text x="12" y="40" fill="${COL.muted}" font-size="11">No jobs held.</text></svg>`;
    return;
  }
  const cols = 10;
  const marks = rows.map((j, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 20 + col * 62;
    const y = 20 + row * 22;
    const held = j.held !== false && (j.status === "HELD" || j.blocked || blocked);
    const id = j.id || j.jobId || `J${i + 1}`;
    if (held && blocked) {
      return `<polygon points="${x},${y - 6} ${x + 7},${y} ${x},${y + 6} ${x - 7},${y}" fill="none" stroke="${COL.alarm}" stroke-width="1.5"/>
        <text x="${x + 10}" y="${y + 3}" fill="${COL.alarm}" font-size="8" font-family="ui-monospace,monospace">HOLD ${safe(id)}</text>`;
    }
    return `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="none" stroke="${COL.ink}" stroke-width="1"/>
      <text x="${x + 8}" y="${y + 3}" fill="${COL.dim}" font-size="8" font-family="ui-monospace,monospace">${safe(id)}</text>`;
  }).join("");
  const rowsN = Math.ceil(rows.length / cols);
  el.innerHTML = `<svg viewBox="0 0 640 ${16 + rowsN * 22}" aria-hidden="true">${marks}</svg>`;
}

/** Dense monospace ledger with hash prefixes + chain sparkline. */
export function renderLedgerChain(el, events = [], ledger = {}) {
  if (!el) return;
  const rows = (events || []).slice(0, 12);
  if (!rows.length) {
    el.innerHTML = `<p class="support-text" style="margin:0;font-family:var(--mono)">Ledger chain fills as session events are recorded.</p>`;
    return;
  }
  const ok = ledger?.ok !== false;
  const tip = String(ledger?.tip || "");
  const w = Math.max(480, 40 + rows.length * 36);
  const h = 56;
  const spark = rows.map((_, i) => {
    const x = 20 + i * 36;
    const y = 28 + Math.sin(i * 1.1) * 8;
    return `${i ? "L" : "M"}${x},${y.toFixed(1)}`;
  }).join(" ");
  const blocks = rows.map((row, i) => {
    const x = 20 + i * 36;
    const hash = tip ? tip.slice(i % Math.max(tip.length - 4, 1), (i % Math.max(tip.length - 4, 1)) + 4) : String(i + 1).padStart(4, "0");
    const fail = COL.amber;
    return `<rect x="${x - 10}" y="8" width="20" height="16" fill="none" stroke="${ok ? COL.ink : fail}" stroke-width="1"/>
      <text x="${x}" y="20" text-anchor="middle" fill="${ok ? COL.muted : fail}" font-size="7" font-family="ui-monospace,monospace">${safe(hash)}</text>`;
  }).join("");
  const status = ok ? "hash-chained · tamper-evident" : `integrity: ${safe(ledger?.reason || "FAILED")}`;
  const failStroke = COL.amber;
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">
    ${blocks}
    <path d="${spark}" fill="none" stroke="${ok ? COL.ink : failStroke}" stroke-width="1"/>
    <text x="20" y="52" fill="${ok ? COL.muted : failStroke}" font-size="9" font-family="ui-monospace,monospace">${status}</text>
  </svg>`;
}
