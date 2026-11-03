export async function render(root, kit) {
  const { ui, esc } = kit;
  let disposed = false;
  let checking = false;
  let restoring = false;
  let toolError = null;
  let restoreState = 'idle';
  let restoreMessage = '';

  function snapshot() {
    return kit.state.workflow?.snapshot || null;
  }

  function incident() {
    return kit.state.scenario?.incident || snapshot()?.incident || kit.state.analysis?.incident || null;
  }

  function snapshotDigest() {
    return kit.state.scenario?.snapshotDigest || snapshot()?.snapshotDigest || kit.state.workflow?.snapshotDigest || kit.state.analysis?.snapshotDigest || '';
  }

  function toolsDigest() {
    return kit.state.tools?.snapshotDigest || '';
  }

  function toolsPayload() {
    return kit.state.tools || null;
  }

  function toolsList() {
    const payload = toolsPayload();
    if (!payload) return [];
    let raw = Array.isArray(payload) ? payload : (payload.tools ?? payload.definitions ?? payload.items ?? payload.data ?? null);
    if (raw && !Array.isArray(raw) && typeof raw === 'object') {
      raw = Object.entries(raw).map(([name, value]) => (
        value && typeof value === 'object'
          ? { ...value, name: value.name || value.id || name }
          : { name, description: String(value || '') }
      ));
    }
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      if (typeof item === 'string') return { name: item, label: kit.friendlyName(item, item), description: '' };
      const nested = item?.function && typeof item.function === 'object' ? item.function : {};
      const name = String(item?.name || item?.id || item?.toolName || nested.name || nested.id || '');
      const description = String(item?.description || item?.summary || nested.description || nested.summary || '');
      return { name, label: kit.friendlyName(name, name || 'Tool'), description };
    }).filter((item) => item.name);
  }

  function phaseShort() {
    if (checking) return 'Checking';
    if (kit.state.connection === 'offline') return 'No data';
    return 'Not loaded';
  }

  function humanText(value, fallback) {
    const friendly = kit.friendlyName(value, fallback || '');
    return friendly ? friendly.charAt(0).toUpperCase() + friendly.slice(1) : friendly;
  }

  function operatorText(operator) {
    if (!operator) return checking ? 'Signing in' : 'Not signed in';
    const name = kit.friendlyName(operator.id || 'Operator', 'Operator');
    if (!operator.role) return name;
    const role = humanText(operator.role, operator.role);
    return role && !name.toLowerCase().includes(role.toLowerCase()) ? `${name} · ${role}` : name;
  }

  function plantName() {
    const plant = kit.state.plant;
    if (!plant) return phaseShort();
    return plant.id ? kit.friendlyName(plant.id, 'Plant') : 'Plant connected';
  }

  function materialName(value) {
    return kit.friendlyName(value, String(value || '')).replace(/^Mat\s+/, '');
  }

  function shortDigest(value) {
    const digest = String(value || '');
    return digest ? `${digest.slice(0, 12)}…` : '';
  }

  function countValue(value) {
    return Number.isFinite(value) ? kit.fmtInt(value) : phaseShort();
  }

  function arrayCount(value) {
    return Array.isArray(value) ? value.length : null;
  }

  function setText(selector, value) {
    const element = root.querySelector(selector);
    if (element) element.textContent = String(value ?? '');
  }

  function setHtml(selector, value) {
    const element = root.querySelector(selector);
    if (element) element.innerHTML = value;
  }

  function toolSnapshotText() {
    if (checking) return 'Checking';
    if (toolError) return 'Could not be checked';
    if (!toolsPayload()) return phaseShort();
    const current = snapshotDigest();
    const listed = toolsDigest();
    if (!current || !listed) return 'No snapshot listed';
    return current === listed ? `Matches · ${shortDigest(listed)}` : `Different · ${shortDigest(listed)}`;
  }

  function modelRouteText() {
    if (checking) return 'Checking';
    if (toolError) return 'Could not be checked';
    if (toolsPayload()) return 'Connected';
    if (kit.state.connection === 'offline') return 'Could not be checked';
    return 'Not checked yet';
  }

  function updateHead() {
    const connection = kit.state.connection;
    const mismatch = toolSnapshotText().startsWith('Different');
    const danger = connection === 'offline' || mismatch || Boolean(toolError);
    const eyebrow = root.querySelector('[data-connection-eyebrow-wrap]');
    if (eyebrow) eyebrow.className = `settings-eyebrow${connection === 'offline' ? ' is-danger' : ''}`;
    const eyebrowDot = root.querySelector('[data-connection-dot]');
    if (eyebrowDot) eyebrowDot.className = `settings-dot${connection === 'offline' ? ' is-danger' : ''}`;
    setText('[data-connection-eyebrow]', checking
      ? 'Settings · Checking plant records'
      : connection === 'connected'
        ? 'Settings · Plant records connected'
        : connection === 'offline'
          ? 'Settings · Plant records could not be reached'
          : 'Settings · Checking plant records');
    kit.setAgentStatus(checking ? 'Checking records' : restoring ? 'Restoring incident' : danger ? 'Records need a check' : 'Ready now');
  }

  function updateModel() {
    const list = toolsList();
    const payload = toolsPayload();
    const route = modelRouteText();
    setHtml('[data-model-pill-slot]', ui.pill(
      route,
      toolError || kit.state.connection === 'offline' ? 'is-danger' : checking ? 'is-info' : payload ? 'is-ok' : 'is-neutral'
    ));
    setHtml('[data-model-rows]', ui.statRows([
      { label: 'Provider', value: 'Meta models' },
      { label: 'Tools returned', value: checking ? 'Checking' : toolError ? 'Could not be checked' : payload ? kit.fmtInt(list.length) : 'Not loaded' },
      { label: 'Tool snapshot', value: toolSnapshotText() }
    ]));
    setText('[data-tools-count]', checking
      ? 'Checking'
      : toolError
        ? 'Not returned'
        : payload
          ? `${kit.fmtInt(list.length)} returned`
          : 'Not loaded');
    setText('[data-tools-names]', checking
      ? 'Checking the tool definitions for this session.'
      : toolError
        ? 'Tool definitions could not be returned, so tool readiness cannot be confirmed.'
        : !payload
          ? 'Tool definitions have not been returned yet.'
          : list.length
            ? `${kit.fmtInt(list.length)} definitions returned for this session.`
            : 'No tools were listed for this session, so The Britt has nothing to call yet.');
    setText('[data-tools-note]', checking
      ? 'Waiting for the check to finish.'
      : toolError
        ? 'Reload the records and tools to try again.'
        : list.length
          ? 'Definitions only. No model run starts here.'
          : 'No tool details are available yet.');
  }

  function updateSession() {
    const operator = kit.state.operator;
    const plant = kit.state.plant;
    const snap = snapshot();
    setHtml('[data-session-pill-slot]', ui.pill(
      operator ? 'Signed in' : checking ? 'Signing in' : 'Not signed in',
      operator ? 'is-ok' : checking ? 'is-info' : 'is-danger'
    ));
    setHtml('[data-session-rows]', ui.statRows([
      { label: 'Signed in as', value: operatorText(operator) },
      { label: 'Plant', value: plantName() },
      { label: 'Snapshot', value: shortDigest(snapshotDigest()) || phaseShort() }
    ]));
    setHtml('[data-session-stats]', ui.stats([
      { value: countValue(arrayCount(plant?.machines)), label: 'Machines' },
      { value: countValue(arrayCount(snap?.materials)), label: 'Materials' },
      { value: countValue(arrayCount(snap?.evidenceRecords)), label: 'Evidence records' }
    ]));
  }

  function updateReturn() {
    const workflow = kit.state.workflow;
    setHtml('[data-return-rows]', ui.statRows([
      { label: 'Board tasks now', value: countValue(arrayCount(workflow?.board?.tasks)) },
      { label: 'Approvals waiting', value: countValue(arrayCount(workflow?.pendingConsents)) }
    ]));
  }

  function updateIncident() {
    const currentIncident = incident();
    const snap = snapshot();
    const impacted = kit.state.analysis?.impacted;
    const impactedJobs = Array.isArray(impacted?.jobs) ? impacted.jobs : [];
    const snapJobs = Array.isArray(snap?.jobs) ? snap.jobs : [];
    const jobsForDue = impactedJobs.length ? impactedJobs : snapJobs;
    let earliest = null;
    for (const job of jobsForDue) {
      const value = Number(job?.dueHours);
      if (Number.isFinite(value) && (earliest === null || value < earliest)) earliest = value;
    }
    const impactedCount = Number(impacted?.impactedJobCount);
    const impactedUnits = Number(impacted?.impactedUnits);
    const summedUnits = snapJobs.reduce((total, job) => total + (Number(job?.unitsRequired) || 0), 0);
    const loaded = Boolean(currentIncident || snap || kit.state.analysis);
    setText('[data-incident-summary]', currentIncident?.summary || (checking ? 'Checking the current incident records.' : 'Incident records have not loaded yet.'));
    setHtml('[data-held-row]', currentIncident?.heldMaterialId
      ? `<div class="stat-row"><span>Held material</span><span class="settings-held-value"><b>${esc(materialName(currentIncident.heldMaterialId))}</b>${ui.pill('On hold', 'is-held')}</span></div>`
      : `<div class="stat-row"><span>Held material</span><b>${esc(phaseShort())}</b></div>`);
    setHtml('[data-incident-stats]', ui.stats([
      { value: Number.isFinite(impactedCount) ? kit.fmtInt(impactedCount) : snapJobs.length ? kit.fmtInt(snapJobs.length) : loaded ? kit.fmtInt(0) : phaseShort(), label: 'Jobs waiting' },
      { value: Number.isFinite(impactedUnits) ? kit.fmtInt(impactedUnits) : snapJobs.length ? kit.fmtInt(summedUnits) : phaseShort(), label: 'Work waiting', suffix: Number.isFinite(impactedUnits) || snapJobs.length ? 'units' : '' },
      { value: earliest === null ? (loaded ? 'None' : phaseShort()) : kit.fmtHours(earliest), label: 'Earliest due in' }
    ]));
  }

  function updateControls() {
    const list = toolsList();
    root.querySelectorAll('[data-act="check"]').forEach((button) => { button.disabled = checking || restoring; });
    root.querySelectorAll('[data-check-label]').forEach((element) => { element.textContent = checking ? 'Checking status' : 'Reload records and tools'; });
    root.querySelectorAll('[data-act="restore"]').forEach((button) => { button.disabled = restoring || checking; });
    root.querySelectorAll('[data-restore-label]').forEach((element) => { element.textContent = restoring ? 'Restoring opening incident' : 'Restore opening incident'; });
    root.querySelectorAll('[data-act="details"]').forEach((button) => { button.disabled = restoring; });
    root.querySelectorAll('[data-act="tools"]').forEach((button) => { button.disabled = restoring || checking || Boolean(toolError) || !list.length; });
    root.querySelectorAll('[data-act="incident"]').forEach((button) => { button.disabled = restoring; });
    setText('[data-return-status]', restoring
      ? 'Restoring the opening incident. Incident opens when the restore is confirmed.'
      : restoreState === 'error'
        ? restoreMessage
        : restoreState === 'success'
          ? 'Opening incident restored. Opening Incident now.'
          : 'Ready to restore. Nothing has changed yet.');
    const returnDot = root.querySelector('[data-return-dot]');
    if (returnDot) returnDot.className = `settings-dot${restoreState === 'error' ? ' is-danger' : ''}`;
    const returnText = root.querySelector('[data-return-status]');
    if (returnText) returnText.className = `preview-text${restoreState === 'error' ? ' settings-text-danger' : ''}`;
  }

  function updateAll() {
    if (disposed || !root.isConnected) return;
    updateHead();
    updateModel();
    updateSession();
    updateReturn();
    updateIncident();
    updateControls();
  }

  async function checkStatus(manual) {
    if (checking || restoring || disposed) return;
    checking = true;
    toolError = null;
    updateAll();
    let recordsOk = false;
    let toolsOk = false;
    try {
      try { await kit.ensureSession(); } catch { /* the record check below reports the usable state */ }
      try {
        const result = await kit.refreshData({ notifyOnError: false });
        recordsOk = Boolean(result?.ok);
      } catch { recordsOk = false; }
      try {
        await kit.loadTools();
        toolsOk = true;
        toolError = null;
      } catch (error) {
        toolsOk = false;
        toolError = error;
      }
    } finally {
      checking = false;
      if (!disposed) updateAll();
    }
    if (manual && !disposed) {
      if (recordsOk && toolsOk) {
        kit.toast('Settings status is up to date', { text: 'Plant records and tool definitions were reloaded for this session.' });
      } else {
        kit.toast('Status could not be fully checked', {
          text: 'Some records did not return. The panels show the last available state.',
          actionLabel: 'Retry',
          onAction: () => checkStatus(true)
        });
      }
    }
  }

  async function startRestore() {
    if (restoring || checking || disposed) return;
    restoring = true;
    restoreState = 'idle';
    restoreMessage = '';
    updateAll();
    try {
      await kit.api.resetDemo();
    } catch {
      restoring = false;
      restoreState = 'error';
      restoreMessage = 'The opening incident could not be restored. Nothing was changed.';
      if (!disposed) updateAll();
      kit.toast('Opening incident could not be restored', {
        text: 'Nothing was changed. You can try again.',
        actionLabel: 'Retry',
        onAction: () => startRestore()
      });
      return;
    }
    kit.state.scenario = null;
    kit.state.workflow = null;
    kit.state.analysis = null;
    kit.state.plant = null;
    kit.state.tools = null;
    restoreState = 'success';
    restoring = false;
    if (disposed) return;
    updateAll();
    kit.toast('Opening incident restored', { text: 'Incident is open with the restored records.' });
    kit.go('incident');
  }

  function openTools() {
    const list = toolsList();
    const rows = list.map((item) => ({ label: item.label, value: item.description || item.name }));
    kit.openDialog({
      title: 'Tool details',
      subtitle: toolError
        ? 'Tool definitions did not return on the last check.'
        : 'Definitions returned for this session that The Britt can call. Reading them does not start a run.',
      bodyHtml: rows.length
        ? kit.detailRowsHtml(rows)
        : ui.emptyState({ title: 'No tool definitions are available', text: 'Reload the records and tools. When definitions return, they will be listed here.', compact: true }),
      actions: [{ label: 'Close', variant: 'btn-secondary', onClick: () => true }]
    });
  }

  async function copyDigest() {
    const digest = snapshotDigest();
    if (!digest) {
      kit.toast('No snapshot digest is available', { text: 'Reload the records and tools, then reopen the record ids.' });
      return true;
    }
    try {
      await navigator.clipboard.writeText(digest);
      kit.toast('Snapshot digest copied', { text: 'The full digest from plant records is on the clipboard.' });
    } catch {
      kit.toast('The digest could not be copied', { text: 'The full digest stays visible in the record ids.', actionLabel: 'Retry', onAction: () => copyDigest() });
    }
    return true;
  }

  function openDetails() {
    const operator = kit.state.operator;
    const plant = kit.state.plant;
    const rows = [];
    if (operator?.id) rows.push({ label: 'Operator record', value: operator.id });
    if (operator?.role) rows.push({ label: 'Operator role', value: operator.role });
    if (snapshotDigest()) rows.push({ label: 'Snapshot digest', value: snapshotDigest() });
    if (toolsDigest()) rows.push({ label: 'Tool snapshot digest', value: toolsDigest() });
    if (plant?.id) rows.push({ label: 'Plant record', value: plant.id });
    kit.openDialog({
      title: 'Record ids behind this session',
      subtitle: 'Plain names are shown on Settings. These are the exact records behind them.',
      bodyHtml: rows.length
        ? kit.detailRowsHtml(rows)
        : ui.emptyState({ title: 'No record ids are available', text: 'Reload the records and tools. Returned records will be shown here.', compact: true }),
      actions: [
        { label: 'Copy snapshot digest', variant: 'btn-secondary', onClick: () => copyDigest() },
        { label: 'Close', variant: 'btn-secondary', onClick: () => true }
      ]
    });
  }

  function onClick(event) {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest('[data-act]');
    if (!button || !root.contains(button) || button.disabled) return;
    const action = button.getAttribute('data-act');
    if (action === 'check') void checkStatus(true);
    else if (action === 'restore') void startRestore();
    else if (action === 'tools') openTools();
    else if (action === 'details') openDetails();
    else if (action === 'incident') kit.go('incident');
  }

  root.innerHTML = `
    <div class="settings-screen">
      <header class="settings-head">
        <div class="settings-head-main">
          <p class="settings-eyebrow" data-connection-eyebrow-wrap><span class="settings-dot" data-connection-dot></span><span data-connection-eyebrow>Settings · Checking plant records</span></p>
          <h1 class="page-title">Check the model and session, then return to the incident.</h1>
          <p class="settings-sub">Who is signed in, what The Britt can call, and what restoring changes.</p>
        </div>
        <div class="action-stack">
          <div class="action-row">
            <button class="btn btn-secondary" type="button" data-act="check">${ui.icon('check')}<span data-check-label>Reload records and tools</span></button>
            <button class="btn btn-primary" type="button" data-act="restore">${ui.icon('arrow')}<span data-restore-label>Restore opening incident</span></button>
          </div>
          <p class="primary-helper"><span class="helper-dot"></span><span>Restore runs first, then Incident opens.</span></p>
        </div>
      </header>

      <div class="settings-layout">
        <div class="settings-main">
          ${ui.panel({
            title: 'Model and provider',
            className: 'settings-panel-grow',
            headExtra: '<span data-model-pill-slot></span>',
            body: `
              <div class="settings-panel-body">
                <div class="settings-rows" data-model-rows></div>
                <div class="panel-inset settings-tools-box">
                  <div class="section-label-row"><span class="section-label">Tools The Britt can call</span><span class="section-hint" data-tools-count>Checking</span></div>
                  <p class="settings-copy" data-tools-names>Checking the tool definitions for this session.</p>
                </div>
                <div class="settings-actions">
                  <button class="btn btn-ghost" type="button" data-act="tools"><span>View tool details</span>${ui.icon('chevron')}</button>
                  <span class="settings-action-note" data-tools-note>Waiting for the check to finish.</span>
                </div>
              </div>`
          })}
          ${ui.panel({
            title: 'Session and snapshot',
            className: 'settings-panel-grow',
            headExtra: '<span data-session-pill-slot></span>',
            body: `
              <div class="settings-panel-body">
                <div class="settings-rows" data-session-rows></div>
                <div data-session-stats></div>
                <div class="settings-actions">
                  <button class="btn btn-ghost" type="button" data-act="details"><span>Show record ids</span></button>
                </div>
              </div>`
          })}
        </div>

        <aside class="settings-aside">
          ${ui.sideCard({
            title: 'Before you return',
            className: 'settings-return-card settings-card-grow',
            body: `
              <div class="settings-card-body">
                <p class="settings-copy">Restoring replaces the current snapshot with the opening incident and clears work tied to it.</p>
                <div class="settings-rows" data-return-rows></div>
                <div class="preview-line settings-return-line">
                  <span class="settings-dot" data-return-dot></span>
                  <span class="preview-text" data-return-status>Ready to restore. Nothing has changed yet.</span>
                </div>
              </div>`
          })}
          ${ui.sideCard({
            title: 'Current incident',
            className: 'settings-card-grow',
            body: `
              <div class="settings-card-body settings-incident-body">
                <p class="settings-copy settings-copy-strong" data-incident-summary>Checking the current incident records.</p>
                <div class="settings-rows is-compact" data-held-row></div>
                <div data-incident-stats></div>
                <div class="settings-actions">
                  <button class="btn btn-ghost btn-wide" type="button" data-act="incident"><span>Open incident without restoring</span></button>
                </div>
              </div>`
          })}
        </aside>
      </div>
    </div>`;

  root.addEventListener('click', onClick);
  const unsubscribe = typeof kit.subscribe === 'function' ? kit.subscribe(() => updateAll()) : null;

  kit.setPageCommands([
    { title: 'Restore opening incident', hint: 'Restore the opening incident through plant records, then open Incident', run: () => startRestore() },
    { title: 'Reload records and tools', hint: 'Reload plant records, the session and tool definitions', run: () => checkStatus(true) },
    { title: 'View tool details', hint: 'See the definitions The Britt can call in this session', run: () => openTools() },
    { title: 'Show record ids behind this session', hint: 'See the exact plant and snapshot records behind the plain names', run: () => openDetails() },
    { title: 'Open incident without restoring', hint: 'Return to the current incident as it stands', run: () => kit.go('incident') }
  ]);

  updateAll();
  void checkStatus(false);

  return () => {
    disposed = true;
    root.removeEventListener('click', onClick);
    if (typeof unsubscribe === 'function') unsubscribe();
    kit.clearPageCommands();
    kit.setAgentStatus('Ready now');
  };
}