/* Incident screen. Every number below is derived from the shared API payloads
   held by the kit; before they arrive the screen shows loading state only. */

function materialName(raw, fallback = 'Alloy A') {
  if (!raw) return fallback;
  const cleaned = String(raw).replace(/^MAT[-_]/i, '');
  return kitRef.friendlyName(cleaned, fallback);
}

let kitRef = null;

function optionDisplay(rawId, material, substituteMaterial) {
  const id = String(rawId || '').toLowerCase();
  if (id.includes('wait') || id.includes('replenish')) return { kind: 'wait', name: 'Wait for replenishment', meaning: `Wait for a new ${material} lot.` };
  if (id.includes('split') || id.includes('hybrid')) return { kind: 'split', name: 'Split available capacity', meaning: 'Split jobs across the mill cells.' };
  if (id.includes('substitut') || id.includes('reallocat') || id.includes('alternate')) return { kind: 'substitute', name: 'Use verified substitute', meaning: `Run waiting jobs on ${substituteMaterial}.` };
  if (id.includes('expedite')) return { kind: 'expedite', name: 'Expedite replacement', meaning: `Bring in replacement ${material} sooner.` };
  return { kind: 'generic', name: kitRef.friendlyName(rawId, 'Recovery path'), meaning: 'Use this path to run the waiting jobs.' };
}
function assumptionShortFor(rawId, substituteMaterial) {
  const id = String(rawId || '').toLowerCase();
  if (id.includes('wait') || id.includes('replenish')) return 'Lead time holds';
  if (id.includes('split') || id.includes('hybrid')) return 'Cells stay open';
  if (id.includes('substitut') || id.includes('reallocat') || id.includes('alternate')) return `${substituteMaterial} in stock`;
  if (id.includes('expedite')) return 'Delivery time holds';
  return 'Rates stay current';
}
function optionJobsLine(kind, subject, plural, material, substituteMaterial) {
  if (kind === 'wait') return `${subject} ${plural ? 'wait' : 'waits'} for new ${material}.`;
  if (kind === 'substitute') return `${subject} ${plural ? 'run' : 'runs'} on ${substituteMaterial}.`;
  if (kind === 'split') return `Split ${subject === 'Both jobs' ? 'both jobs' : subject} across cells.`;
  if (kind === 'expedite') return `${subject} ${plural ? 'get' : 'gets'} new ${material} sooner.`;
  return `${subject} ${plural ? 'use' : 'uses'} this recovery path.`;
}

function normalizeData(workflow, analysis, plant) {
  const snapshot = workflow && workflow.snapshot ? workflow.snapshot : null;
  if (!snapshot) return null;
  const analysisData = analysis || workflow.analysis || {};
  const incident = snapshot.incident || analysisData.incident || {};
  const materials = Array.isArray(snapshot.materials) ? snapshot.materials : [];
  const held = materials.find((m) => m.materialId === incident.heldMaterialId) || materials.find((m) => Number(m.held) > 0) || materials[0];
  const material = materialName(held ? held.materialId : incident.heldMaterialId);
  const subId = held && Array.isArray(held.substitutes) ? held.substitutes[0] : null;
  const subMat = materials.find((m) => m.materialId === subId);
  const substituteMaterial = materialName(subId, 'Alloy B');
  const heldAvailable = held && typeof held.available === 'number' ? held.available : undefined;

  const records = Array.isArray(snapshot.evidenceRecords) ? snapshot.evidenceRecords : [];
  const qtyOf = (rec) => (rec && rec.quantity && typeof rec.quantity.value === 'number' ? rec.quantity.value : undefined);
  const recordKey = (rec) => `${rec.evidenceId || ''} ${rec.documentId || ''} ${rec.recordId || ''}`;
  const certRec = records.find((r) => /cert/i.test(recordKey(r)));
  const recvRec = records.find((r) => /recv/i.test(recordKey(r)));
  const subRec = records.find((r) => /sub|inv/i.test(recordKey(r)));
  const certificate = qtyOf(certRec);
  const receiving = qtyOf(recvRec) ?? (held && typeof held.onHand === 'number' ? held.onHand : undefined);
  const substitute = qtyOf(subRec) ?? (subMat && typeof subMat.onHand === 'number' ? subMat.onHand : undefined);

  const cells = (Array.isArray(snapshot.cells) ? snapshot.cells : []).map((cell) => {
    const name = kitRef.friendlyName(cell.cellId, 'Mill cell');
    const compatible = (Array.isArray(cell.compatibleMaterials) ? cell.compatibleMaterials : []).map((m) => materialName(m));
    let detail = `${kitRef.fmtHours(cell.availableHours)} open`;
    if (compatible.length > 1) detail += ` · ${compatible.join(' or ')}`;
    else if (compatible.length === 1 && compatible[0] === material) detail += ` · ${compatible[0]} only`;
    else if (compatible.length === 1) detail += ` · ${compatible[0]} alternative`;
    return { id: String(cell.cellId), name, hours: cell.availableHours, cost: cell.hourlyCostUsd, online: cell.online !== false, compatible, detail, preferredJobs: 0 };
  });

  const impactedJobs = analysisData.impacted && Array.isArray(analysisData.impacted.jobs) ? analysisData.impacted.jobs : (Array.isArray(snapshot.jobs) ? snapshot.jobs : []);
  const jobs = impactedJobs.map((job) => ({
    id: String(job.jobId || job.name || ''),
    name: kitRef.friendlyName(job.jobId || job.name, 'Job'),
    units: job.unitsRequired,
    due: job.dueHours,
    preferredCell: kitRef.friendlyName(job.preferredCellId, cells.length ? cells[0].name : 'Mill cell'),
    status: 'At risk'
  }));
  for (const cell of cells) {
    cell.preferredJobs = jobs.filter((job) => job.preferredCell === cell.name).length;
  }
  const jobPhrase = jobs.length === 1
    ? jobs[0].name
    : jobs.length === 2
      ? `${jobs[0].name} and ${jobs[1].name}`
      : jobs.length ? `${kitRef.fmtInt(jobs.length)} jobs` : 'Waiting jobs';
  const jobSubject = jobs.length === 1
    ? jobs[0].name
    : jobs.length === 2
      ? 'Both jobs'
      : jobs.length ? `${kitRef.fmtInt(jobs.length)} jobs` : 'Waiting jobs';
  const jobPlural = jobs.length !== 1;

  const rawOptions = analysisData.recovery && Array.isArray(analysisData.recovery.options) ? analysisData.recovery.options : [];
  const impactedUnits = analysisData.impacted && typeof analysisData.impacted.impactedUnits === 'number'
    ? analysisData.impacted.impactedUnits
    : jobs.reduce((sum, job) => sum + (Number(job.units) || 0), 0);
  let options = rawOptions.map((opt) => {
    const display = optionDisplay(opt.optionId, material, substituteMaterial);
    return {
      id: String(opt.optionId),
      name: display.name,
      meaning: display.meaning,
      jobsLine: optionJobsLine(display.kind, jobSubject, jobPlural, material, substituteMaterial),
      feasible: opt.feasible !== false,
      hours: opt.finishHours,
      cost: opt.incrementalCostUsd,
      units: typeof opt.impactedUnits === 'number' ? opt.impactedUnits : impactedUnits,
      assumptionShort: assumptionShortFor(opt.optionId, substituteMaterial),
      assumptions: Array.isArray(opt.assumptions) ? opt.assumptions : [],
      constraints: Array.isArray(opt.constraints) ? opt.constraints : [],
      recommended: false
    };
  });
  const feasible = options.filter((o) => o.feasible && Number.isFinite(Number(o.hours)));
  if (feasible.length) {
    const best = feasible.reduce((a, b) => (Number(b.hours) < Number(a.hours) ? b : a), feasible[0]);
    options = options.map((o) => ({ ...o, recommended: o.id === best.id }));
  }

  const firstCellName = cells.length ? cells[0].name : 'Receiving';
  const subCell = cells.find((c) => c.compatible.length === 1 && c.compatible[0] === substituteMaterial)
    || cells.find((c) => c.compatible.includes(substituteMaterial));
  const subLink = subCell ? subCell.name : firstCellName;

  const evidence = records.map((rec) => {
    const key = recordKey(rec);
    const kind = /cert/i.test(key) ? 'cert' : /recv/i.test(key) ? 'recv' : /sub|inv/i.test(key) ? 'sub' : 'record';
    const value = qtyOf(rec);
    let title;
    let sub;
    if (kind === 'cert') { title = `Certificate says ${kitRef.fmtInt(value)}`; sub = 'Supplier certificate'; }
    else if (kind === 'recv') { title = `Receiving counted ${kitRef.fmtInt(value)}`; sub = 'Receiving count'; }
    else if (kind === 'sub') { title = `Substitute available: ${kitRef.fmtInt(value)}`; sub = 'Verified substitute stock'; }
    else if (value !== undefined) { title = `${kitRef.friendlyName(rec.field, 'Record')} is ${kitRef.fmtInt(value)}`; sub = kitRef.friendlyName(rec.documentId, 'Source record'); }
    else { title = kitRef.friendlyName(rec.recordId || rec.evidenceId, 'Source record'); sub = kitRef.friendlyName(rec.field, 'Source record'); }
    return {
      id: String(rec.evidenceId || rec.recordId || kind),
      kind,
      title,
      sub,
      excerpt: rec.excerpt || title,
      doc: rec.documentId || 'Source document',
      record: rec.recordId || 'Source record',
      line: rec.lineId || rec.field || 'Record',
      link: kind === 'sub' ? subLink : 'Receiving'
    };
  });

  let departments = [];
  if (plant && Array.isArray(plant.machines)) {
    const grouped = new Map();
    for (const machine of plant.machines) {
      const dept = machine.department || 'Plant';
      if (!grouped.has(dept)) grouped.set(dept, { name: dept, count: 0, online: 0, capacity: 0 });
      const row = grouped.get(dept);
      row.count += 1;
      if (machine.online !== false) row.online += 1;
      row.capacity += Number(machine.capacityHours) || 0;
    }
    departments = Array.from(grouped.values());
  }
  if (!departments.length && cells.length) {
    departments = [{ name: 'Mill cells', count: cells.length, online: cells.filter((c) => c.online).length, capacity: cells.reduce((sum, c) => sum + (Number(c.hours) || 0), 0) }];
  }

  const dues = jobs.map((job) => Number(job.due)).filter(Number.isFinite);
  return {
    certificate, receiving, substitute, material, substituteMaterial, heldAvailable,
    cells, jobs, options, evidence, departments, jobPhrase, jobPlural,
    partsAtRisk: impactedUnits,
    ordersAffected: analysisData.impacted && typeof analysisData.impacted.impactedJobCount === 'number' ? analysisData.impacted.impactedJobCount : jobs.length,
    firstDue: dues.length ? Math.min(...dues) : undefined
  };
}

export async function render(root, kit) {
  kitRef = kit;
  const { esc, fmtInt, fmtHours, fmtMoney } = kit;
  let disposed = false;
  const timers = [];
  const later = (fn, ms) => { const id = window.setTimeout(() => { if (!disposed) fn(); }, ms); timers.push(id); };

  const view = {
    data: null,
    investigation: 'idle',
    selectedStation: 'Receiving',
    selectedEvidence: '',
    selectedOption: '',
    optionPreview: 'Preview a path — nothing moves until you decide.'
  };

  root.innerHTML = `
  <div class="incident-layout">
    <div class="incident-main">
      <section class="incident-headline" aria-labelledby="incidentTitle">
        <div>
          <div class="row incident-status-row">
            <div class="eyebrow"><span class="status-dot" aria-hidden="true"></span><span>Material lot on hold</span></div>
            <span class="pill is-neutral" id="dataStatus">Checking plant records</span>
          </div>
          <h1 class="page-title" id="incidentTitle">Material lot on hold</h1>
          <p class="page-sub" id="incidentSub">Checking the supplier and receiving records for the held lot.</p>
        </div>
        <div class="action-stack">
          <div class="action-row">
            <button class="btn btn-soft" id="shopButton" type="button">${kit.ui.icon('box')}<span>Open full plant view</span></button>
            <button class="btn btn-primary" id="primaryButton" type="button"><span id="primaryLabel">Start investigation</span>${kit.ui.icon('arrow')}</button>
          </div>
          <div class="primary-helper"><span class="helper-dot" aria-hidden="true"></span><span id="primaryHelper">The Britt is ready to check the records</span></div>
        </div>
      </section>

      <section class="panel incident-factory" aria-labelledby="factoryTitle">
        <div class="card-head">
          <div>
            <h2 class="card-title" id="factoryTitle">How this lot moves through the plant</h2>
            <p class="card-desc">Only the held path is highlighted. Everything else stays calm.</p>
          </div>
          <div class="legend" aria-label="Status legend">
            <span class="legend-item"><span class="legend-dot is-held"></span>On hold</span>
            <span class="legend-item"><span class="legend-dot is-ok"></span>Available</span>
          </div>
        </div>

        <div class="inset-panel incident-mismatch">
          <div class="incident-mismatch-head">
            <div class="section-label" id="mismatchTitle">Checking quantity records</div>
            <span class="pill is-neutral" id="mismatchPill">Checking records</span>
          </div>
          <div class="incident-bars" id="mismatchBars"></div>
        </div>

        <div class="incident-flow-group">
          <div class="flow" id="flowRow"></div>

          <div class="elbow" aria-hidden="true">
            <svg viewBox="0 0 1000 24" preserveAspectRatio="none" focusable="false">
              <path d="M500 3v8M252 11h496M252 11v9M748 11v9"/>
            </svg>
          </div>

          <div class="stack-sm incident-jobs-wrap">
            <div class="section-label-row">
              <div class="section-label">Orders waiting on this lot</div>
              <div class="section-hint" id="jobsHint"></div>
            </div>
            <div class="incident-jobs" id="jobsGrid"></div>
          </div>
        </div>

        <div class="incident-options">
          <div class="section-label-row">
            <div class="section-label" id="optionsTitle" tabindex="-1">Recovery paths ready to compare</div>
            <div class="section-hint">Preview first, choose after investigation</div>
          </div>
          <div class="incident-options-grid" id="optionsList"></div>
          <div class="preview-line" id="optionPreview" aria-live="polite"></div>
        </div>
      </section>
    </div>

    <aside class="incident-side" aria-label="Incident evidence and impact">
      <section class="side-card" aria-labelledby="impactTitle">
        <h2 class="side-title" id="impactTitle">Impact at a glance</h2>
        <div class="stats" id="impactStats">
          <div class="stat"><span class="skeleton skeleton-stat"></span><span class="stat-label">Parts at risk</span></div>
          <div class="stat"><span class="skeleton skeleton-stat"></span><span class="stat-label">Orders affected</span></div>
          <div class="stat"><span class="skeleton skeleton-stat"></span><span class="stat-label">First due in</span></div>
        </div>
        <div class="source-line"><span class="source-dot" aria-hidden="true"></span><span class="source-text" id="sourceLine">Held lot being checked</span><button class="retry-btn" id="retryLoad" type="button" hidden>Retry</button></div>
      </section>

      <section class="side-card" aria-labelledby="evidenceTitle">
        <h2 class="side-title" id="evidenceTitle">What we know so far</h2>
        <div class="evidence-list" id="evidenceList">${kit.ui.skeletonCards(3)}</div>
      </section>

      <section class="side-card is-grow incident-agent" aria-labelledby="agentTitle">
        <h2 class="side-title" id="agentTitle">The Britt's summary</h2>
        <div class="agent-rows" id="agentRows">
          <div class="agent-row"><span class="tag is-estimate">Checking</span><span class="agent-text">The Britt is reading the plant records for this lot.</span></div>
        </div>
        <div class="agent-line">
          <span class="agent-avatar">${kit.ui.icon('mark')}</span>
          <div class="agent-line-text" id="agentLine"><b>The Britt is ready.</b> Nothing moved or approved yet.</div>
        </div>
      </section>
    </aside>
  </div>`;

  const $ = (selector) => root.querySelector(selector);
  const $$ = (selector) => Array.from(root.querySelectorAll(selector));

  function setAgentMessage(html) {
    const element = $('#agentLine');
    if (element) element.innerHTML = html;
  }
  function recommendedOption() {
    if (!view.data) return null;
    return view.data.options.find((o) => o.recommended) || view.data.options[0] || null;
  }
  function countUp(element, value) {
    const target = Number(value) || 0;
    if (kit.prefersReduced || !Number.isFinite(target)) { element.textContent = fmtInt(target); return; }
    const start = performance.now();
    const tick = (now) => {
      if (disposed) return;
      const progress = Math.min(1, (now - start) / 650);
      element.textContent = fmtInt(target * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function renderStatus() {
    const status = $('#dataStatus');
    const retry = $('#retryLoad');
    if (!status) return;
    if (kit.state.connection === 'connected') {
      status.textContent = 'Plant records connected';
      if (retry) retry.hidden = true;
    } else if (kit.state.connection === 'offline') {
      status.textContent = 'Plant records could not be reached';
      if (retry) retry.hidden = false;
    } else {
      status.textContent = 'Checking plant records';
      if (retry) retry.hidden = true;
    }
  }

  function buildStations() {
    const data = view.data;
    if (!data) return [{ name: 'Receiving', status: 'Checking', tone: 'is-neutral', details: ['Held lot record is being checked'] }];
    const stations = [{
      name: 'Receiving',
      status: 'On hold',
      tone: 'is-held',
      details: [
        `${data.material} lot · held before release`,
        data.receiving === undefined ? 'Counted quantity is being checked' : `${fmtInt(data.receiving)} counted · ${data.heldAvailable === undefined ? 'availability is being checked' : `${fmtInt(data.heldAvailable)} available`}`
      ]
    }];
    for (const cell of data.cells) {
      const preferredLine = cell.preferredJobs === 1
        ? '1 waiting job prefers this cell'
        : cell.preferredJobs > 1
          ? `${fmtInt(cell.preferredJobs)} waiting jobs prefer this cell`
          : 'No waiting job prefers this cell';
      stations.push({
        name: cell.name,
        status: cell.online ? 'Available' : 'Stopped',
        tone: cell.online ? 'is-ok' : 'is-danger',
        details: [cell.detail, preferredLine]
      });
    }
    return stations;
  }

  function stationHtml(item, linked) {
    const selected = view.selectedStation === item.name;
    return `<button class="station plant-node${selected ? ' is-selected' : ''}${linked && !selected ? ' is-linked' : ''}" type="button" data-station="${esc(item.name)}" aria-pressed="${selected}">
      <span class="station-top plant-node-top"><span class="station-name plant-node-name">${esc(item.name)}</span>${kit.ui.pill(item.status, item.tone)}</span>
      ${item.details.map((detail) => `<span class="station-detail plant-node-detail">${esc(detail)}</span>`).join('')}
    </button>`;
  }

  function renderFlow() {
    const stations = buildStations();
    const selectedJob = view.data ? view.data.jobs.find((j) => j.name === view.selectedStation) : null;
    const linkedEvidence = view.data ? view.data.evidence.find((e) => e.id === view.selectedEvidence) : null;
    const parts = [];
    stations.forEach((item, index) => {
      const linkedByJob = Boolean(selectedJob && selectedJob.preferredCell === item.name);
      const linkedByEvidence = Boolean(linkedEvidence && linkedEvidence.link === item.name && view.selectedStation !== item.name);
      parts.push(stationHtml(item, linkedByJob || linkedByEvidence));
      if (index < stations.length - 1) parts.push(kit.ui.connector(item.tone === 'is-held' ? 'is-held' : item.tone === 'is-danger' ? 'is-stopped' : ''));
    });
    const flow = $('#flowRow');
    flow.innerHTML = parts.join('');
    $$('#flowRow [data-station]').forEach((button) => button.addEventListener('click', () => selectStation(button.dataset.station)));
  }

  function renderJobs() {
    const grid = $('#jobsGrid');
    const hint = $('#jobsHint');
    if (!view.data) {
      hint.textContent = '';
      grid.innerHTML = `<div class="incident-span">${kit.ui.emptyState({ title: 'Orders load with the plant records', text: 'Waiting orders appear here as soon as the snapshot arrives.', compact: true })}</div>`;
      return;
    }
    const data = view.data;
    hint.textContent = data.jobs.length === 2 ? `Both need ${data.material}, so both are waiting` : `${fmtInt(data.jobs.length)} orders need ${data.material}`;
    if (!data.jobs.length) {
      grid.innerHTML = `<div class="incident-span">${kit.ui.emptyState({ title: 'No orders are waiting on this lot', text: 'The snapshot lists no impacted orders for the held material.', compact: true })}</div>`;
      return;
    }
    grid.innerHTML = data.jobs.map((job) => {
      const linked = view.selectedStation === 'Receiving' || view.selectedStation === job.preferredCell;
      return `<button class="job-card ${view.selectedStation === job.name ? 'is-selected' : ''} ${linked && view.selectedStation !== job.name ? 'is-linked' : ''}" type="button" data-job="${esc(job.name)}" aria-pressed="${view.selectedStation === job.name}">
        <span class="job-main"><span class="job-name">${esc(job.name)}</span><span class="job-detail">${fmtInt(job.units)} parts · due ${fmtHours(job.due)} · ${esc(job.preferredCell)}</span></span>
        ${kit.ui.pill(job.status, 'is-held')}
      </button>`;
    }).join('');
    $$('#jobsGrid [data-job]').forEach((button) => button.addEventListener('click', () => selectStation(button.dataset.job)));
  }

  function previewText(option) {
    const data = view.data;
    const cover = data.jobs.length === 2 ? 'both jobs' : data.jobs.length === 1 ? data.jobs[0].name : data.jobs.length ? `${fmtInt(data.jobs.length)} jobs` : 'waiting jobs';
    return `Preview — ${option.name}: ${fmtHours(option.hours)}, ${fmtMoney(option.cost)}, covers ${cover}. Nothing moves yet.`;
  }
  function previewOption(id) {
    if (!view.data) return;
    const option = view.data.options.find((o) => o.id === id);
    if (!option) return;
    view.selectedOption = id;
    view.optionPreview = previewText(option);
    renderOptions();
  }
  function previewRecommended() {
    const option = recommendedOption();
    if (option) previewOption(option.id);
  }

  function renderOptions() {
    const list = $('#optionsList');
    const preview = $('#optionPreview');
    if (!view.data) {
      list.innerHTML = `<div class="incident-span">${kit.ui.emptyState({ title: 'Recovery paths load with the analysis', text: 'Time, cost and coverage are calculated from the same snapshot as the evidence.', compact: true })}</div>`;
      preview.innerHTML = '<span class="preview-text">Recovery paths appear after the plant records load.</span>';
      return;
    }
    const data = view.data;
    if (!data.options.length) {
      list.innerHTML = `<div class="incident-span">${kit.ui.emptyState({ title: 'No recovery path was returned', text: 'The analysis for this snapshot lists no recovery options yet.', compact: true })}</div>`;
    } else {
      list.innerHTML = data.options.map((option) => kit.ui.optionCard({
        name: option.name,
        meaning: option.jobsLine || option.meaning,
        meta: [
          { label: 'Finish', value: fmtHours(option.hours) },
          { label: 'Cost', value: fmtMoney(option.cost) },
          { label: 'Covers', value: `${fmtInt(option.units)} pieces` }
        ],
        assumes: option.assumptionShort,
        recommended: option.recommended,
        selected: view.selectedOption === option.id,
        feasible: option.feasible,
        actionAttrs: `data-preview="${esc(option.id)}" aria-label="Preview impact for ${esc(option.name)}"`
      })).join('');
      $$('#optionsList [data-preview]').forEach((button) => button.addEventListener('click', () => previewOption(button.dataset.preview)));
    }
    const selected = data.options.find((o) => o.id === view.selectedOption);
    const action = selected
      ? '<button class="btn btn-secondary btn-small" type="button" id="chooseSelected">Start investigation</button>'
      : '';
    preview.innerHTML = `<span class="preview-text">${esc(view.optionPreview)}</span>${action}`;
    const chooseButton = $('#chooseSelected');
    if (chooseButton && selected) chooseButton.addEventListener('click', startInvestigation);
  }

  function renderEvidence() {
    const list = $('#evidenceList');
    if (!view.data) {
      list.innerHTML = kit.ui.skeletonCards(3);
      return;
    }
    if (!view.data.evidence.length) {
      list.innerHTML = kit.ui.emptyState({ title: 'No source records in this snapshot', text: 'Evidence cards appear when the snapshot carries source records.', compact: true });
      return;
    }
    list.innerHTML = view.data.evidence.map((item) => `
      <button class="evidence evidence-card${view.selectedEvidence === item.id ? ' is-linked' : ''}" type="button" data-evidence="${esc(item.id)}" aria-label="Open source record for ${esc(item.title)}">
        <span class="ev-main">
          <span class="ev-title">${esc(item.title)}</span>
          <span class="ev-sub">${esc(item.sub)}</span>
        </span>
        <span class="ev-chevron">${kit.ui.icon('chevron')}</span>
      </button>`).join('');
    $$('#evidenceList [data-evidence]').forEach((button) => button.addEventListener('click', () => {
      const item = view.data.evidence.find((entry) => entry.id === button.dataset.evidence);
      if (!item) return;
      view.selectedEvidence = item.id;
      view.selectedStation = item.link;
      renderFlow(); renderJobs(); renderEvidence();
      openEvidence(item);
    }));
  }

  function renderAgentSummary() {
    const rows = $('#agentRows');
    if (!view.data) {
      rows.innerHTML = kit.ui.agentRow('Checking', 'is-estimate', 'The Britt is reading the plant records for this lot.');
      return;
    }
    const data = view.data;
    if (data.certificate === undefined || data.receiving === undefined) {
      rows.innerHTML = kit.ui.agentRow('Checking', 'is-estimate', 'The Britt is reading the plant records for this lot.');
      return;
    }
    const shortage = Math.abs((Number(data.certificate) || 0) - (Number(data.receiving) || 0));
    const rec = recommendedOption();
    const recCost = rec && Number.isFinite(Number(rec.cost)) ? fmtMoney(rec.cost) : 'cost pending';
    const recLine = rec
      ? `<b>${esc(rec.name)}</b> finishes in ${fmtHours(rec.hours)} for ${recCost}.`
      : 'Recovery estimates are calculated from the snapshot.';
    const subClause = data.substitute !== undefined && Number.isFinite(Number(data.substitute)) ? ` Substitute stock is <b>${fmtInt(data.substitute)}</b>.` : '';
    rows.innerHTML = `
      ${kit.ui.agentRow('Verified fact', 'is-fact', `Records are <b>${fmtInt(shortage)} pieces</b> apart: ${fmtInt(data.certificate)} vs ${fmtInt(data.receiving)}.${subClause}`)}
      ${kit.ui.agentRow('Estimate', 'is-estimate', recLine)}
      ${kit.ui.agentRow('Suggestion', 'is-suggestion', 'Preview that path first, then investigate to verify it.')}`;
  }

  function renderBars() {
    const bars = $('#mismatchBars');
    const data = view.data;
    if (!data || data.certificate === undefined || data.receiving === undefined) {
      $('#mismatchTitle').textContent = 'Checking quantity records';
      const pill = $('#mismatchPill');
      pill.className = 'pill is-neutral';
      pill.textContent = 'Checking records';
      bars.innerHTML = '<span class="skeleton skeleton-line"></span><span class="skeleton skeleton-line"></span>';
      return;
    }
    const shortage = Math.abs(Number(data.certificate) - Number(data.receiving));
    $('#mismatchTitle').textContent = `Records disagree by ${fmtInt(shortage)} pieces`;
    const pill = $('#mismatchPill');
    pill.className = 'pill is-danger';
    pill.innerHTML = `<span class="pill-dot" aria-hidden="true"></span><span>${fmtInt(shortage)} short · does not match</span>`;
    const max = Math.max(Number(data.certificate) || 0, Number(data.receiving) || 0, 1);
    bars.innerHTML = `
      ${kit.ui.metricBar({ label: 'Certificate', value: ((Number(data.certificate) || 0) / max) * 100, displayValue: fmtInt(data.certificate), tone: 'is-cert', attrs: 'data-bar-kind="cert"', ariaLabel: 'Open the certificate source record' })}
      ${kit.ui.metricBar({ label: 'Receiving count', value: ((Number(data.receiving) || 0) / max) * 100, displayValue: fmtInt(data.receiving), tone: 'is-recv', attrs: 'data-bar-kind="recv"', ariaLabel: 'Open the receiving source record' })}`;
    kit.ui.applyMetrics(bars);
    bars.querySelector('[data-bar-kind="cert"]').addEventListener('click', () => openEvidenceKind('cert'));
    bars.querySelector('[data-bar-kind="recv"]').addEventListener('click', () => openEvidenceKind('recv'));
  }

  function renderStats() {
    const stats = $('#impactStats');
    if (!view.data) return;
    stats.innerHTML = `
      <div class="stat"><span class="stat-value" id="statParts">0</span><span class="stat-label">Parts at risk</span></div>
      <div class="stat"><span class="stat-value" id="statOrders">0</span><span class="stat-label">Orders affected</span></div>
      <div class="stat"><span class="stat-value"><span id="statDue">0</span><small> hours</small></span><span class="stat-label">First due in</span></div>`;
    countUp($('#statParts'), view.data.partsAtRisk);
    countUp($('#statOrders'), view.data.ordersAffected);
    $('#statDue').textContent = view.data.firstDue === undefined ? '—' : fmtInt(view.data.firstDue);
    $('#sourceLine').textContent = `Held lot: ${view.data.material} · ${fmtInt(view.data.receiving)} counted`;
  }

  function updateInvestigationUi() {
    const label = $('#primaryLabel');
    const helper = $('#primaryHelper');
    const button = $('#primaryButton');
    if (!label || !helper || !button) return;
    if (view.investigation === 'idle') {
      label.textContent = 'Start investigation';
      button.disabled = false;
      helper.textContent = 'The Britt is ready to check the records';
      kit.setAgentStatus('Ready now');
      setAgentMessage('<b>The Britt is ready.</b> Nothing moved or approved yet.');
    }
    if (view.investigation === 'running') {
      label.textContent = 'Investigation running';
      button.disabled = true;
      helper.textContent = 'Checking the newest plant snapshot';
      kit.setAgentStatus('Checking records');
      setAgentMessage('<b>The Britt is checking.</b> No path is chosen yet.');
    }
    if (view.investigation === 'done') {
      label.textContent = 'Review verified findings';
      button.disabled = false;
      helper.textContent = 'Findings are ready — no material has moved';
      kit.setAgentStatus('Findings ready');
      setAgentMessage('<b>The Britt found verified facts.</b> Nothing has moved yet.');
    }
    if (view.investigation === 'failed') {
      label.textContent = 'Try investigation again';
      button.disabled = false;
      helper.textContent = 'The last check did not reach the plant records';
      kit.setAgentStatus('Needs a retry');
      setAgentMessage('<b>The Britt could not finish.</b> The evidence is still here.');
    }
  }

  function renderAll() {
    const data = view.data;
    if (data) {
      $('#incidentTitle').innerHTML = `<span class="page-title-line">The certificate says ${fmtInt(data.certificate)}, but receiving</span><span class="page-title-line">counted ${fmtInt(data.receiving)}, so this alloy lot is on hold.</span>`;
      $('#incidentSub').textContent = `Supplier lists ${fmtInt(data.certificate)} pieces; receiving counted ${fmtInt(data.receiving)}. ${fmtInt(data.ordersAffected)} jobs are waiting on this lot.`;
    }
    renderStatus();
    renderBars();
    renderStats();
    renderFlow();
    renderJobs();
    renderOptions();
    renderEvidence();
    renderAgentSummary();
    updateInvestigationUi();
  }

  function selectStation(name) {
    view.selectedStation = name;
    if (view.data) {
      const linked = view.data.evidence.find((item) => item.link === name);
      if (linked) view.selectedEvidence = linked.id;
      else if (view.data.jobs.some((j) => j.name === name)) view.selectedEvidence = '';
    }
    renderFlow(); renderJobs(); renderEvidence();
  }

  async function loadData() {
    renderStatus();
    const result = await kit.refreshData({ notifyOnError: false });
    if (disposed) return result;
    const normalized = normalizeData(kit.state.workflow, kit.state.analysis, kit.state.plant);
    if (normalized) view.data = normalized;
    if (!result.ok) {
      kit.toast('Plant records could not be reached', {
        text: 'The incident stays as it is. Try the connection again when ready.',
        actionLabel: 'Retry',
        onAction: loadData
      });
    }
    renderAll();
    return result;
  }

  async function startInvestigation() {
    if (view.investigation === 'running') return;
    view.investigation = 'running';
    updateInvestigationUi();
    selectStation('Receiving');
    later(() => {
      if (view.investigation === 'running') setAgentMessage('<b>The Britt is comparing the records.</b> Certificate, receiving and stock are being checked.');
    }, kit.prefersReduced ? 60 : 480);
    const result = await kit.refreshData({ notifyOnError: false });
    if (disposed) return;
    const normalized = normalizeData(kit.state.workflow, kit.state.analysis, kit.state.plant);
    if (normalized) view.data = normalized;
    if (result.ok && (kit.state.analysis || kit.state.workflow)) {
      view.investigation = 'done';
      kit.setAgentStatus('Findings ready');
      kit.go('findings');
      return;
    }
    view.investigation = 'failed';
    renderAll();
    kit.toast('The investigation could not reach the plant records', {
      text: 'No recovery path was chosen and nothing has moved.',
      actionLabel: 'Retry',
      onAction: startInvestigation
    });
  }

  function openEvidence(item) {
    const data = view.data;
    kit.openDialog({
      title: item.title,
      subtitle: 'The supporting source record behind this statement. Selecting it highlights the linked station on the incident.',
      bodyHtml: `
        <div class="excerpt">${esc(item.excerpt)}</div>
        ${kit.detailRowsHtml([
          { label: 'Document', value: item.doc },
          { label: 'Record', value: item.record },
          { label: 'Line', value: item.line },
          { label: 'Linked station', value: `${item.link} — highlighted on the incident` },
          { label: 'Lot', value: `${data.material} lot held at Receiving; ${fmtInt(data.ordersAffected)} jobs are waiting on it` }
        ])}`,
      actions: [
        { label: 'Back to incident', variant: 'btn-secondary', onClick: () => true },
        { label: `Highlight ${item.link}`, variant: 'btn-primary', onClick: () => { selectStation(item.link); return true; } }
      ]
    });
  }
  function openEvidenceKind(kind) {
    if (!view.data) return;
    const item = view.data.evidence.find((entry) => entry.kind === kind);
    if (!item) return;
    view.selectedEvidence = item.id;
    view.selectedStation = item.link;
    renderFlow(); renderJobs(); renderEvidence();
    openEvidence(item);
  }

  function openShop() {
    if (!view.data) { kit.go('shop'); return; }
    const data = view.data;
    const deptRows = data.departments.map((dept) => `<div class="shop-row"><b>${esc(dept.name)}</b><span>${fmtInt(dept.count)} machines · ${fmtInt(dept.online)} online · ${fmtInt(dept.capacity)}h</span></div>`).join('');
    const jobRows = data.jobs.map((job) => `<div class="shop-row"><b>${esc(job.name)}</b><span>${fmtInt(job.units)} parts · due in ${fmtHours(job.due)}</span></div>`).join('');
    kit.openDialog({
      title: 'Full plant view',
      subtitle: 'Machines grouped by department so the whole plant fits one scan. The held lot stays highlighted back on the incident.',
      wide: true,
      bodyHtml: `
        <div class="shop-cols">
          <div><h3 class="dialog-section-title">Departments</h3><div class="shop-list">${deptRows || '<div class="shop-row"><b>Departments load with the plant record</b></div>'}</div></div>
          <div><h3 class="dialog-section-title">Orders waiting · ${fmtInt(data.jobs.length)}</h3><div class="shop-list">${jobRows}</div></div>
        </div>`,
      actions: [{ label: 'Back to incident', variant: 'btn-primary', onClick: () => true }]
    });
  }

  $('#primaryButton').addEventListener('click', startInvestigation);
  $('#shopButton').addEventListener('click', openShop);
  $('#retryLoad').addEventListener('click', loadData);

  kit.setPageCommands([
    { title: 'Start investigation', hint: 'Ask The Britt to check the source records', run: startInvestigation },
    { title: 'Review verified findings', hint: 'Check the records, then open the findings step', run: startInvestigation },
    { title: 'Highlight the receiving hold', hint: 'Show the held lot in the plant flow', run: () => selectStation('Receiving') },
    { title: 'Open the certificate record', hint: 'The supplier document behind the certificate count', run: () => openEvidenceKind('cert') },
    { title: 'Preview the recommended path', hint: 'See time, cost and assumptions before deciding', run: previewRecommended },
    { title: 'Open the full plant view', hint: 'Every department and waiting order in this snapshot', run: openShop }
  ]);

  renderAll();
  loadData();

  return () => {
    disposed = true;
    timers.forEach((timer) => window.clearTimeout(timer));
    kit.clearPageCommands();
    kit.setAgentStatus('Ready now');
  };
}