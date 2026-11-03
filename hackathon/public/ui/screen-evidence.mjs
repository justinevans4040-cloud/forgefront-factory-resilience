export async function render(root, kit) {
  const { ui, esc } = kit;
  let selectedId = '';
  let isChecking = false;
  let isRetaining = false;

  const getWorkflow = () => kit.state.workflow || null;
  const getSnapshot = () => getWorkflow()?.snapshot || null;
  const getAnalysis = () => kit.state.analysis || getWorkflow()?.analysis || null;
  const getRecords = () => {
    const records = getSnapshot()?.evidenceRecords;
    return Array.isArray(records) ? records : [];
  };
  const getOptions = () => {
    const analysis = getAnalysis();
    const options = analysis?.recovery?.options || analysis?.options;
    return Array.isArray(options) ? options : [];
  };
  const getJobs = () => {
    const impacted = getAnalysis()?.impacted?.jobs;
    if (Array.isArray(impacted) && impacted.length) return impacted;
    const jobs = getSnapshot()?.jobs;
    return Array.isArray(jobs) ? jobs : [];
  };
  const getAssumptions = () => {
    const assumptions = getSnapshot()?.assumptions;
    return Array.isArray(assumptions) ? assumptions.filter((item) => String(item || '').trim()) : [];
  };
  const quantityOf = (record) => {
    const value = Number(record?.quantity?.value);
    return Number.isFinite(value) ? value : null;
  };
  const formatQuantity = (value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 'Not listed';
    return Number.isInteger(numeric) ? kit.fmtInt(numeric) : String(numeric);
  };
  const sourceKind = (record) => {
    const key = `${record?.evidenceId || ''} ${record?.documentId || ''}`.toLowerCase();
    const field = String(record?.field || '').toLowerCase();
    if (key.includes('cert')) return { label: 'Certificate', sub: 'Supplier certificate', tone: 'is-cert', role: 'cert' };
    if (key.includes('recv') || key.includes('receiv')) return { label: 'Receiving', sub: 'Receiving count', tone: 'is-recv', role: 'receiving' };
    if (key.includes('inv') || key.includes('sub') || field.includes('onhand')) return { label: 'Verified stock', sub: 'Verified substitute stock', tone: 'is-ok', role: 'stock' };
    return { label: 'Source record', sub: kit.friendlyName(record?.documentId || record?.evidenceId, 'Source record'), tone: 'is-ok', role: 'source' };
  };
  const selectedRecord = () => getRecords().find((record) => record.evidenceId === selectedId) || getRecords()[0] || null;
  const plainSentence = (record) => {
    if (!record) return '';
    const kind = sourceKind(record);
    const quantity = quantityOf(record);
    const unit = record.quantity?.unit || '';
    if (quantity === null) return `${kind.label} is retained as a source record without a listed quantity.`;
    const linePart = record.lineId ? ` line ${record.lineId}` : '';
    const onHand = kind.role === 'stock' || String(record.field || '').toLowerCase().includes('onhand');
    return `${kind.label}${linePart} records ${formatQuantity(quantity)}${unit ? ` ${unit}` : ''}${onHand ? ' on hand' : ''}.`;
  };

  function exportPacket() {
    const records = getRecords();
    if (!records.length) {
      kit.toast('No evidence packet to export', { text: 'Re-check the plant records, then export once source records are shown.' });
      return;
    }
    const snapshot = getSnapshot() || {};
    const analysis = getAnalysis() || {};
    const packet = {
      scenarioId: snapshot.scenarioId || kit.state.scenario?.scenarioId || '',
      snapshotDigest: snapshot.snapshotDigest || kit.state.scenario?.snapshotDigest || '',
      incident: snapshot.incident || kit.state.scenario?.incident || null,
      evidenceRecords: records,
      materials: Array.isArray(snapshot.materials) ? snapshot.materials : [],
      jobs: getJobs(),
      assumptions: getAssumptions(),
      impacted: analysis.impacted || null,
      recoveryOptions: getOptions()
    };
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${packet.scenarioId || 'forgefront'}-evidence.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    kit.toast('Evidence packet exported', { text: `${kit.fmtInt(records.length)} source records were downloaded with the snapshot reference.` });
  }

  function openSource(record) {
    if (!record) return;
    const kind = sourceKind(record);
    const quantity = quantityOf(record);
    const unit = record.quantity?.unit || '';
    const rows = [
      { label: 'Document', value: record.documentId || 'Not listed' },
      { label: 'Record', value: record.recordId || 'Not listed' },
      { label: 'Line', value: record.lineId || 'No line listed' },
      { label: 'Field', value: record.field || 'Not listed' },
      { label: 'Quantity', value: quantity === null ? 'Not listed' : `${formatQuantity(quantity)} ${unit}`.trim() },
      { label: 'Evidence', value: record.evidenceId || 'Not listed' }
    ];
    kit.openDialog({
      title: quantity === null ? kind.label : `${kind.label} · ${formatQuantity(quantity)} ${unit}`.trim(),
      subtitle: kind.sub,
      bodyHtml: `${kit.detailRowsHtml(rows)}<div class="excerpt">${esc(plainSentence(record))}</div>`,
      actions: [{ label: 'Back', variant: 'btn-primary', onClick: () => true }]
    });
  }

  async function recheckRecords() {
    if (isChecking || isRetaining) return;
    isChecking = true;
    renderAll();
    const result = await kit.refreshData({ notifyOnError: false });
    isChecking = false;
    if (root.dataset.screen && root.dataset.screen !== 'evidence') return;
    renderAll();
    if (!result.ok) {
      kit.toast('Plant records could not be reached', {
        text: 'The records already on screen have not changed.',
        actionLabel: 'Retry',
        onAction: recheckRecords
      });
      return;
    }
    kit.toast('Evidence records re-checked', { text: 'The newest snapshot is shown below.' });
  }

  async function retainAndContinue() {
    if (isChecking || isRetaining || !getRecords().length) return;
    isRetaining = true;
    renderAll();
    try {
      const status = await kit.api.workflowStatus();
      if (status) kit.state.workflow = status;
      const refreshed = await kit.refreshData({ notifyOnError: false });
      if (!refreshed.ok) throw new Error('Plant records could not be reached');
      const records = getRecords();
      if (!records.length) throw new Error('No evidence records were returned');
      const snapshotDigest = getSnapshot()?.snapshotDigest || kit.state.scenario?.snapshotDigest || '';
      const analysisDigest = getAnalysis()?.snapshotDigest || '';
      if (snapshotDigest && analysisDigest && snapshotDigest !== analysisDigest) throw new Error('Snapshot check failed');
      isRetaining = false;
      kit.toast('Evidence retained', { text: `${kit.fmtInt(records.length)} source records are tied to this snapshot.` });
      kit.go('shop');
    } catch (error) {
      isRetaining = false;
      if (root.dataset.screen && root.dataset.screen !== 'evidence') return;
      renderAll();
      kit.toast('Evidence could not be retained', {
        text: 'Nothing was changed. Check the connection, then try again.',
        actionLabel: 'Retry',
        onAction: retainAndContinue
      });
    }
  }

  function renderAll(focusSelected = false) {
    if (root.dataset.screen && root.dataset.screen !== 'evidence') return;
    const records = getRecords();
    if (!records.some((record) => record.evidenceId === selectedId)) selectedId = records[0]?.evidenceId || '';
    const selected = selectedRecord();
    const snapshot = getSnapshot() || {};
    const analysis = getAnalysis() || {};
    const jobs = getJobs();
    const assumptions = getAssumptions();
    const snapshotDigest = snapshot.snapshotDigest || kit.state.scenario?.snapshotDigest || '';
    const analysisDigest = analysis.snapshotDigest || '';
    const digestMatch = Boolean(snapshotDigest && analysisDigest && snapshotDigest === analysisDigest);
    const connected = kit.state.connection === 'connected';
    const offline = kit.state.connection === 'offline';
    const entries = records.map((record) => ({ record, kind: sourceKind(record), value: quantityOf(record) }));
    const quantityEntries = entries.filter((entry) => entry.value !== null);
    const otherEntries = entries.filter((entry) => entry.value === null);
    const largestQuantity = quantityEntries.reduce((largest, entry) => Math.max(largest, entry.value), 0);
    const certEntry = quantityEntries.find((entry) => entry.kind.role === 'cert');
    const receivingEntry = quantityEntries.find((entry) => entry.kind.role === 'receiving');
    const stockEntry = quantityEntries.find((entry) => entry.kind.role === 'stock');
    const difference = certEntry && receivingEntry ? Math.abs(certEntry.value - receivingEntry.value) : null;
    const unit = certEntry?.record?.quantity?.unit || receivingEntry?.record?.quantity?.unit || quantityEntries[0]?.record?.quantity?.unit || '';
    const unitWord = unit === 'each' ? 'pieces' : unit;
    const documentCount = new Set(records.map((record) => record.documentId).filter(Boolean)).size;
    const excerptCount = records.filter((record) => Boolean(record.excerpt)).length;
    const impactedCountValue = Number(analysis.impacted?.impactedJobCount);
    const impactedCount = Number.isFinite(impactedCountValue) ? impactedCountValue : jobs.length;
    const feasibleOptions = getOptions().filter((option) => option && option.feasible !== false && Number.isFinite(Number(option.finishHours)));
    const fastestOption = feasibleOptions.reduce((fastest, option) => (!fastest || Number(option.finishHours) < Number(fastest.finishHours) ? option : fastest), null);
    const busy = isChecking || isRetaining;
    const primaryLabel = isRetaining ? 'Verifying and retaining' : 'Verify, retain and open shop';
    const selectedKind = selected ? sourceKind(selected) : null;
    const selectedQuantity = selected ? quantityOf(selected) : null;

    const barsHtml = quantityEntries.length ? quantityEntries.map((entry) => ui.metricBar({
      label: entry.kind.label,
      value: largestQuantity > 0 ? (entry.value / largestQuantity) * 100 : 0,
      displayValue: formatQuantity(entry.value),
      tone: entry.kind.tone,
      attrs: `data-ev-select="${esc(entry.record.evidenceId || '')}" data-ev-selected="${entry.record.evidenceId === selectedId}"`,
      ariaLabel: `${entry.kind.label} ${formatQuantity(entry.value)} ${entry.record.quantity?.unit || ''}`.trim()
    })).join('') : ui.emptyState({ title: 'No recorded quantities in this snapshot', text: 'Re-check the plant records to load the source quantities.', compact: true });

    const otherHtml = otherEntries.length ? `<div class="evidence-list">${otherEntries.map((entry) => ui.evidenceCard({
      title: entry.kind.label,
      sub: entry.kind.sub,
      linked: entry.record.evidenceId === selectedId,
      attrs: `data-ev-select="${esc(entry.record.evidenceId || '')}"`
    })).join('')}</div>` : '';

    const detailFacts = selected ? [
      { label: 'Document', value: selected.documentId || 'Not listed' },
      { label: 'Record', value: selected.recordId || 'Not listed' },
      { label: 'Line', value: selected.lineId || 'No line listed' },
      { label: 'Quantity', value: selectedQuantity === null ? 'Not listed' : `${formatQuantity(selectedQuantity)} ${selected.quantity?.unit || ''}`.trim() }
    ].map((fact) => `<div class="ev-fact"><span class="stat-label">${esc(fact.label)}</span><span class="ev-fact-value">${esc(fact.value)}</span></div>`).join('') : '';

    const detailHtml = selected ? `
      <div class="row-between">
        <div class="stack-sm">
          <span class="section-label">Selected source record</span>
          <span class="ev-plain">${esc(plainSentence(selected))}</span>
        </div>
        <button class="btn btn-ghost btn-small ev-detail-button" type="button" data-ev-open>Open full source record</button>
      </div>
      <div class="ev-detail-facts">${detailFacts}</div>` : `
      <div class="section-label">Selected source record</div>
      ${ui.emptyState({ title: 'Choose a source record', text: 'Its exact line and source reference will appear here.', compact: true })}`;

    const jobsHtml = jobs.length ? `<div class="ev-job-list">${jobs.map((job) => {
      const parts = [];
      if (Number.isFinite(Number(job.unitsRequired))) parts.push(`${kit.fmtInt(job.unitsRequired)} pieces`);
      if (Number.isFinite(Number(job.dueHours))) parts.push(`due in ${kit.fmtHours(job.dueHours)}`);
      if (job.preferredCellId) parts.push(`via ${kit.friendlyName(job.preferredCellId)}`);
      return `<div class="job-card"><span class="job-main"><span class="job-name">${esc(kit.friendlyName(job.jobId, 'Waiting job'))}</span><span class="job-detail">${esc(parts.join(' · ') || 'Waiting on the held material')}</span></span>${ui.pill('Waiting', 'is-held')}</div>`;
    }).join('')}</div>` : ui.emptyState({ title: 'No waiting jobs are traced', text: 'No job in this snapshot needs the held material.', compact: true });

    const assumptionsHtml = assumptions.length
      ? `<div class="ev-assump-list">${ui.listRows(assumptions.map((item) => ({ text: String(item) })))}</div>`
      : ui.emptyState({ title: 'No assumptions are listed', text: 'This snapshot lists no assumptions to keep with the packet.', compact: true });

    const factText = certEntry && receivingEntry
      ? `<b>Certificate ${esc(formatQuantity(certEntry.value))}, receiving ${esc(formatQuantity(receivingEntry.value))}:</b> records differ by ${esc(formatQuantity(difference))} ${esc(unitWord)}.${stockEntry ? ` Substitute stock is ${esc(formatQuantity(stockEntry.value))} ${esc(stockEntry.record.quantity?.unit || unit)}.` : ''}`
      : `<b>${esc(kit.fmtInt(records.length))} source records</b> are present in the current snapshot.`;
    const summaryRows = [
      ui.agentRow('Verified fact', 'is-fact', factText),
      fastestOption ? ui.agentRow('Estimate', 'is-estimate', `<b>Fastest calculated recovery</b> finishes in ${esc(kit.fmtHours(fastestOption.finishHours))}.`) : '',
      ui.agentRow('Suggestion', 'is-suggestion', 'Open the selected record, then retain the packet.')
    ].join('');

    root.innerHTML = `
      <div class="ev-page">
        <header class="ev-head">
          <div class="ev-title-block">
            <div class="eyebrow"><span class="status-dot${connected && digestMatch ? ' is-ok' : ''}"></span><span>${offline ? 'Evidence · plant records could not be reached' : 'Evidence · plant records connected'}</span></div>
            <h1 class="page-title"><span class="page-title-line">Every number traces back to a retained record.</span></h1>
            <p class="page-sub">Select a quantity to inspect its record, then retain the packet and continue.</p>
          </div>
          <div class="action-stack">
            <button class="btn btn-primary" type="button" data-ev-primary${busy || !records.length ? ' disabled' : ''}>${isRetaining ? '<span class="btn-spinner" aria-hidden="true"></span>' : ''}<span>${esc(primaryLabel)}</span>${isRetaining ? '' : ui.icon('arrow')}</button>
            <span class="primary-helper"><span class="helper-dot${digestMatch ? '' : ' is-held'}"></span>${digestMatch ? 'Snapshot matches the analysis' : 'Check the snapshot before continuing'}</span>
          </div>
        </header>
        <div class="ev-grid">
          <section class="panel ev-main">
            <div class="card-head">
              <div><h2 class="card-title">Verify the records before they are retained</h2><p class="card-desc">Source records from the current snapshot, kept with the recovery.</p></div>
              <button class="btn btn-ghost btn-small" type="button" data-ev-recheck${busy ? ' disabled' : ''}>${isChecking ? 'Checking records' : 'Re-check records'}</button>
            </div>
            ${ui.stats([
              { value: difference !== null ? formatQuantity(difference) : kit.fmtInt(records.length), label: difference !== null ? 'Difference in recorded quantity' : 'Records in the packet', suffix: difference !== null ? unitWord : '' },
              { value: kit.fmtInt(records.length), label: 'Records in the packet' },
              { value: kit.fmtInt(impactedCount), label: 'Waiting jobs traced' }
            ])}
            <div class="ev-quantities">
              <div class="section-label-row"><span class="section-label">Recorded quantities compared</span><span class="section-hint">Every row can be selected</span>${difference !== null ? ui.pill(difference > 0 ? 'Does not match' : 'Records match', difference > 0 ? 'is-danger' : 'is-ok') : ''}</div>
              ${barsHtml}
              ${otherHtml}
            </div>
            <div class="ev-detail inset-panel">${detailHtml}</div>
            <div class="ev-bottom">
              <div class="ev-col">
                <div class="section-label-row"><span class="section-label">Waiting jobs traced</span><span class="section-hint">${esc(kit.fmtInt(jobs.length))} jobs need the held material</span></div>
                ${jobsHtml}
              </div>
              <div class="ev-col">
                <div class="section-label-row"><span class="section-label">Assumptions kept with the packet</span><span class="section-hint">From the current snapshot</span></div>
                ${assumptionsHtml}
              </div>
            </div>
          </section>
          <aside class="ev-aside">
            ${ui.sideCard({
              title: 'Packet check',
              className: 'ev-side',
              body: `${ui.stats([
                { value: digestMatch ? 'Match' : 'Check', label: 'Snapshot' },
                { value: `${kit.fmtInt(excerptCount)} of ${kit.fmtInt(records.length)}`, label: 'Excerpts' },
                { value: kit.fmtInt(documentCount), label: 'Documents' }
              ])}<span class="primary-helper"><span class="helper-dot${digestMatch ? '' : ' is-held'}"></span>${digestMatch ? 'Snapshot matches the analysis' : 'Snapshot needs a check'}</span>`
            })}
            ${ui.sideCard({
              title: "The Britt's summary",
              className: 'ev-side ev-summary',
              body: `<div class="agent-rows">${summaryRows}</div>
                <div class="agent-line"><span class="agent-avatar">${ui.icon('mark')}</span><span class="agent-line-text"><b>The Britt is ready.</b> Nothing has changed or been approved.</span></div>`
            })}
            ${ui.sideCard({
              title: 'Export a copy',
              className: 'ev-side',
              body: `<div class="row-between"><span class="ev-export-text">Downloads a copy of this packet.</span><button class="btn btn-secondary btn-small" type="button" data-ev-export${busy || !records.length ? ' disabled' : ''}>Export packet</button></div>`
            })}
          </aside>
        </div>
      </div>`;

    ui.applyMetrics(root);
    root.querySelectorAll('[data-ev-select]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedId = button.dataset.evSelect || '';
        renderAll(true);
      });
    });
    root.querySelectorAll('[data-ev-recheck]').forEach((button) => button.addEventListener('click', recheckRecords));
    root.querySelectorAll('[data-ev-export]').forEach((button) => button.addEventListener('click', exportPacket));
    const openButton = root.querySelector('[data-ev-open]');
    if (openButton) openButton.addEventListener('click', () => openSource(selectedRecord()));
    const primaryButton = root.querySelector('[data-ev-primary]');
    if (primaryButton) primaryButton.addEventListener('click', retainAndContinue);
    if (focusSelected) {
      const selectedButton = Array.from(root.querySelectorAll('[data-ev-select]')).find((button) => button.dataset.evSelect === selectedId);
      if (selectedButton) selectedButton.focus({ preventScroll: true });
    }
    kit.setAgentStatus(records.length ? 'Evidence ready to retain' : 'Evidence records needed');
    kit.setPageCommands([
      { title: 'Verify, retain and open shop', hint: 'Check the current snapshot, retain its evidence, then continue', run: retainAndContinue },
      { title: 'Export the evidence packet', hint: 'Download the source records and snapshot reference', run: exportPacket },
      { title: 'Re-check plant records', hint: 'Load the newest scenario, snapshot, plant and analysis', run: recheckRecords },
      { title: 'Open the selected source record', hint: selected ? `${selectedKind.label} from ${selected.documentId || 'the current snapshot'}` : 'Choose a source record first', run: () => openSource(selectedRecord()) }
    ]);
  }

  if (!getRecords().length) {
    root.innerHTML = ui.panel({ title: 'Evidence', body: `${ui.loadingRow('Loading evidence records from the current plant snapshot.')}<div class="evidence-list">${ui.skeletonCards(3)}</div>` });
    await kit.refreshData({ notifyOnError: false });
    if (root.dataset.screen && root.dataset.screen !== 'evidence') return undefined;
  }
  renderAll();
  return () => { kit.clearPageCommands(); };
}