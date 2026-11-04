export function render(root, kit) {
  let disposed = false;
  let loading = false;
  let loadFailed = false;
  let applying = false;
  let shockApplied = false;
  let selectedCellId = "";
  let focusCellId = "";

  const esc = kit.esc;

  function numberOrZero(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function numberLabel(value) {
    const number = numberOrZero(value);
    return Number.isInteger(number) ? String(number) : number.toFixed(1);
  }

  function countLabel(count, singular, plural) {
    return `${kit.fmtInt(count)} ${count === 1 ? singular : plural}`;
  }

  function cellLabel(cell) {
    return kit.friendlyName(cell && cell.cellId ? cell.cellId : "", "Cell");
  }

  function cellLabelById(cellId, cells) {
    const match = (cells || []).find((cell) => cell.cellId === cellId);
    return match ? cellLabel(match) : kit.friendlyName(cellId || "", "Cell");
  }

  function materialLabel(materialId) {
    const raw = String(materialId || "").replace(/^MAT-/, "");
    return kit.friendlyName(raw, "Material");
  }

  function jobLabel(job) {
    return kit.friendlyName(job && job.jobId ? job.jobId : "", "Job");
  }

  function optionLabel(option) {
    return kit.friendlyName(option && option.optionId ? option.optionId : "", "Recovery path");
  }

  function getSnapshot() {
    return kit.state.workflow && kit.state.workflow.snapshot ? kit.state.workflow.snapshot : null;
  }

  function getAnalysis() {
    if (kit.state.analysis) return kit.state.analysis;
    if (kit.state.workflow && kit.state.workflow.analysis) return kit.state.workflow.analysis;
    return null;
  }

  function getScenarioId(snapshot) {
    if (kit.state.scenario && kit.state.scenario.scenarioId) return kit.state.scenario.scenarioId;
    if (snapshot && snapshot.scenarioId) return snapshot.scenarioId;
    return "Current scenario";
  }

  function jobHours(job) {
    const direct = Number(job && job.totalHours);
    if (Number.isFinite(direct)) return direct;
    const units = Number(job && job.unitsRequired);
    const perUnit = Number(job && job.hoursPerUnit);
    return Number.isFinite(units) && Number.isFinite(perUnit) ? units * perUnit : 0;
  }

  function dueText(job) {
    return Number.isFinite(Number(job && job.dueHours)) ? `due in ${kit.fmtHours(job.dueHours)}` : "no due time recorded";
  }

  function ensureSelected(cells) {
    if (cells.some((cell) => cell.cellId === selectedCellId)) return;
    const online = cells.filter((cell) => cell.online !== false);
    const pool = online.length ? online : cells;
    let chosen = pool.length ? pool[0] : null;
    for (const cell of pool) {
      if (!chosen || numberOrZero(cell.availableHours) < numberOrZero(chosen.availableHours)) chosen = cell;
    }
    selectedCellId = chosen ? chosen.cellId : "";
  }

  function computeModel(snapshot) {
    const cells = Array.isArray(snapshot.cells) ? snapshot.cells : [];
    ensureSelected(cells);
    const selected = cells.find((cell) => cell.cellId === selectedCellId) || null;
    const analysis = getAnalysis();
    const impactedJobs = analysis && analysis.impacted && Array.isArray(analysis.impacted.jobs) ? analysis.impacted.jobs : null;
    const jobs = Array.isArray(snapshot.jobs) ? snapshot.jobs : impactedJobs || [];
    const options = analysis && analysis.recovery && Array.isArray(analysis.recovery.options) ? analysis.recovery.options : [];
    const otherCells = selected ? cells.filter((cell) => cell.cellId !== selected.cellId && cell.online !== false) : cells.filter((cell) => cell.online !== false);
    const before = selected ? numberOrZero(kit.openCellHours(selected)) : 0;
    const remaining = otherCells.reduce((total, cell) => total + numberOrZero(kit.openCellHours(cell)), 0);
    const totalRecorded = cells.reduce((total, cell) => total + numberOrZero(kit.openCellHours(cell)), 0);
    const required = jobs.reduce((total, job) => total + jobHours(job), 0);
    const covered = Math.min(required, remaining);
    const shortfall = Math.max(0, required - remaining);
    const preferredCount = selected ? jobs.filter((job) => job.preferredCellId === selected.cellId).length : 0;
    const preferredNames = [];
    jobs.forEach((job) => {
      if (!job.preferredCellId) return;
      const name = cellLabelById(job.preferredCellId, cells);
      if (!preferredNames.includes(name)) preferredNames.push(name);
    });
    const parts = analysis && analysis.impacted && Number.isFinite(Number(analysis.impacted.impactedUnits))
      ? Number(analysis.impacted.impactedUnits)
      : jobs.reduce((total, job) => total + numberOrZero(job.unitsRequired), 0);
    const orderCount = analysis && analysis.impacted && Number.isFinite(Number(analysis.impacted.impactedJobCount))
      ? Number(analysis.impacted.impactedJobCount)
      : jobs.length;
    const dueValues = jobs.map((job) => Number(job.dueHours)).filter((value) => Number.isFinite(value));
    const firstDue = dueValues.length ? Math.min(...dueValues) : null;
    return {
      snapshot,
      analysis,
      cells,
      jobs,
      options,
      selected,
      otherCells,
      before,
      remaining,
      totalRecorded,
      required,
      covered,
      shortfall,
      preferredCount,
      preferredNames,
      parts,
      orderCount,
      firstDue,
      beforePct: totalRecorded ? (before / totalRecorded) * 100 : 0,
      remainingPct: totalRecorded ? (remaining / totalRecorded) * 100 : 0
    };
  }

  function currentModel() {
    const snapshot = getSnapshot();
    return snapshot ? computeModel(snapshot) : null;
  }

  function jobRoute(job, model) {
    const preferred = model.cells.find((cell) => cell.cellId === job.preferredCellId) || null;
    const preferredName = preferred ? cellLabel(preferred) : "";
    const preferredOut = Boolean(preferred && model.selected && preferred.cellId === model.selected.cellId);
    const preferredDown = Boolean(preferred && (preferredOut || preferred.online === false));
    const compatible = model.otherCells.filter((cell) => Array.isArray(cell.compatibleMaterials) && cell.compatibleMaterials.includes(job.materialId));
    const compatibleText = compatible.map((cell) => `${cellLabel(cell)} (${kit.fmtHours(kit.openCellHours(cell))} open)`).join(", ");
    if (preferred && !preferredDown) {
      return {
        text: `Via ${preferredName} · preferred · ${kit.fmtHours(kit.openCellHours(preferred))} open`,
        pill: "Route still open",
        tone: "is-ok"
      };
    }
    if (preferred && preferredDown && compatible.length) {
      return {
        text: `Preferred ${preferredName} is out in this preview · ${compatibleText} can take ${materialLabel(job.materialId)}`,
        pill: "New route to check",
        tone: "is-held"
      };
    }
    if (preferred && preferredDown) {
      return {
        text: `Preferred ${preferredName} is out in this preview · no other recorded cell takes ${materialLabel(job.materialId)}`,
        pill: "No route in preview",
        tone: "is-danger"
      };
    }
    if (compatible.length) {
      return {
        text: `No preferred cell recorded · ${compatibleText} can take ${materialLabel(job.materialId)}`,
        pill: "Route to check",
        tone: "is-held"
      };
    }
    return {
      text: `No recorded cell takes ${materialLabel(job.materialId)} in this preview`,
      pill: "No route in preview",
      tone: "is-danger"
    };
  }

  function connectionLabel() {
    if (kit.state.connection === "connected") return "Plant records connected";
    if (kit.state.connection === "offline") return "Plant records could not be reached";
    return "Checking plant records";
  }

  function headerHtml(model, primaryDisabled) {
    const selected = model && model.selected;
    const selectedName = selected ? cellLabel(selected) : "";
    const titleOne = selected ? `${selectedName} drops from ${kit.fmtHours(model.before)} to 0h,` : "Capacity has changed,";
    const jobPhrase = model ? countLabel(model.jobs.length, "waiting job", "waiting jobs") : "";
    const preferredPhrase = model && model.preferredNames.length
      ? ` Preferred ${model.preferredNames.length === 1 ? "cell" : "cells"}: ${model.preferredNames.join(", ")}.`
      : "";
    const sub = selected
      ? `${jobPhrase} ${model.jobs.length === 1 ? "needs" : "need"} ${kit.fmtHours(model.required)} of work.${preferredPhrase} Nothing has been changed yet.`
      : "Cell and job records are needed before a preview can be checked.";
    const helperDot = kit.state.connection === "connected" ? "helper-dot" : "helper-dot is-held";
    return `
      <header class="disrupt-head">
        <div>
          <div class="eyebrow"><span class="status-dot is-danger"></span><span>Second disruption · ${esc(connectionLabel())}</span></div>
          <h1 class="page-title">
            <span class="page-title-line">${esc(titleOne)}</span>
            <span class="page-title-line">so the plan needs a fresh capacity check.</span>
          </h1>
          <p class="page-sub">${esc(sub)}</p>
        </div>
        <div class="action-stack">
          <div class="action-row">
            <button class="btn btn-secondary" type="button" data-shop>${kit.ui.icon("box")}<span>Open full plant view</span></button>
            <button class="btn btn-primary" type="button" data-primary ${primaryDisabled ? "disabled" : ""}><span>Reinvestigate changed capacity</span>${kit.ui.icon("arrow")}</button>
          </div>
          <p class="primary-helper"><span class="${helperDot}"></span><span>Preview only · nothing has moved yet</span></p>
        </div>
      </header>`;
  }

  function loadingHtml() {
    return `
      <div class="disrupt-page">
        ${headerHtml(null, true)}
        <section class="panel grow">
          <div class="card-head">
            <div><h2 class="card-title">Loading current records</h2></div>
          </div>
          ${kit.ui.loadingRow("Loading cell, job and recovery records.")}
          <div class="evidence-list">${kit.ui.skeletonCards(3)}</div>
        </section>
      </div>`;
  }

  function unavailableHtml() {
    return `
      <div class="disrupt-page">
        ${headerHtml(null, true)}
        <div class="disrupt-grid">
          <section class="panel">
            ${kit.ui.emptyState({
              title: "Plant records are not available yet",
              text: "Check the connection, then try again. The preview will use the current cell and job records.",
              actionLabel: "Try again",
              actionAttrs: "data-retry"
            })}
          </section>
          <aside class="disrupt-aside">
            <section class="side-card is-grow">
              <h2 class="side-title">What to do next</h2>
              ${kit.ui.stepList([
                {
                  title: "Load plant records",
                  sub: "Cell and job records are needed for this preview",
                  active: true,
                  state: "Waiting",
                  tone: "is-neutral",
                  attrs: "data-retry"
                }
              ])}
            </section>
          </aside>
        </div>
      </div>`;
  }

  function openCellDialog(cell, model) {
    if (!cell) return;
    const materials = Array.isArray(cell.compatibleMaterials) ? cell.compatibleMaterials.map(materialLabel).join(", ") : "";
    const isSelected = model.selected && cell.cellId === model.selected.cellId;
    kit.openDialog({
      title: `${cellLabel(cell)} capacity record`,
      subtitle: "From the current plant snapshot. Selecting a cell only changes the preview.",
      bodyHtml: kit.detailRowsHtml([
        { label: "Cell", value: cellLabel(cell) },
        { label: "Recorded as", value: String(cell.cellId || "") },
        { label: "Status in records", value: cell.online === false ? "Offline" : "Available" },
        { label: "Open hours now", value: kit.fmtHours(kit.openCellHours(cell)) },
        { label: "Open in preview", value: isSelected ? kit.fmtHours(0) : kit.fmtHours(kit.openCellHours(cell)) },
        { label: "Hourly cost", value: `${kit.fmtMoney(cell.hourlyCostUsd)} per hour` },
        { label: "Works with", value: materials || "No compatible material recorded" },
        { label: "Scenario", value: getScenarioId(model.snapshot) }
      ]),
      actions: [{ label: "Done", variant: "btn-secondary", onClick: () => true }]
    });
  }

  function openOtherCellsDialog(model) {
    const bodyHtml = model.otherCells.length
      ? kit.ui.table({
          columns: [{ label: "Cell" }, { label: "Open", numeric: true }, { label: "Cost", numeric: true }, { label: "Status" }],
          rows: model.otherCells.map((cell) => [
            cellLabel(cell),
            kit.fmtHours(kit.openCellHours(cell)),
            `${kit.fmtMoney(cell.hourlyCostUsd)}/h`,
            cell.online === false ? "Offline" : "Available"
          ])
        })
      : kit.ui.emptyState({ title: "No other cells are available", text: "The current snapshot lists no other online cell for this preview.", compact: true });
    kit.openDialog({
      title: "Other cells in this preview",
      subtitle: "These cells would still have open hours after the selected cell drops to 0h.",
      bodyHtml,
      actions: [{ label: "Done", variant: "btn-secondary", onClick: () => true }]
    });
  }

  function openJobDialog(job, model) {
    if (!job) return;
    const route = jobRoute(job, model);
    kit.openDialog({
      title: `${jobLabel(job)} record`,
      subtitle: "Waiting job in the current snapshot. Opening this record changes nothing.",
      bodyHtml: kit.detailRowsHtml([
        { label: "Job", value: jobLabel(job) },
        { label: "Recorded as", value: String(job.jobId || "") },
        { label: "Material", value: materialLabel(job.materialId) },
        { label: "Parts needed", value: kit.fmtInt(job.unitsRequired) },
        { label: "Work recorded", value: kit.fmtHours(jobHours(job)) },
        { label: "Due", value: Number.isFinite(Number(job.dueHours)) ? `in ${kit.fmtHours(job.dueHours)}` : "No due time recorded" },
        { label: "Preferred cell", value: cellLabelById(job.preferredCellId, model.cells) },
        { label: "Route in preview", value: route.text }
      ]),
      actions: [{ label: "Done", variant: "btn-secondary", onClick: () => true }]
    });
  }

  function openJobsDialog(model) {
    const bodyHtml = model.jobs.length
      ? kit.ui.table({
          columns: [{ label: "Job" }, { label: "Parts", numeric: true }, { label: "Work", numeric: true }, { label: "Due in", numeric: true }, { label: "Preferred cell" }],
          rows: model.jobs.map((job) => [
            jobLabel(job),
            kit.fmtInt(job.unitsRequired),
            kit.fmtHours(jobHours(job)),
            Number.isFinite(Number(job.dueHours)) ? kit.fmtHours(job.dueHours) : "No due time",
            cellLabelById(job.preferredCellId, model.cells)
          ])
        })
      : kit.ui.emptyState({ title: "No waiting jobs recorded", text: "The current snapshot lists no waiting jobs for this lot.", compact: true });
    kit.openDialog({
      title: "Waiting job records",
      subtitle: "Every waiting job in the current snapshot is included in the capacity check.",
      bodyHtml,
      actions: [{ label: "Done", variant: "btn-secondary", onClick: () => true }]
    });
  }

  function openOptionsDialog(model) {
    const bodyHtml = model.options.length
      ? kit.ui.table({
          columns: [{ label: "Recovery path" }, { label: "Finish", numeric: true }, { label: "Added cost", numeric: true }, { label: "Status" }],
          rows: model.options.map((option) => [
            optionLabel(option),
            (option.feasible === false ? "Cannot run" : kit.fmtHours(option.finishHours)),
            (option.feasible === false ? "Not applicable" : kit.fmtMoney(option.incrementalCostUsd)),
            option.feasible ? "Feasible" : "Not feasible"
          ])
        })
      : kit.ui.emptyState({ title: "No recovery paths loaded yet", text: "Reinvestigating changed capacity refreshes the analysis before Evidence opens.", compact: true });
    kit.openDialog({
      title: "Recovery paths in the last analysis",
      subtitle: "These paths were calculated before this preview and will be checked again.",
      bodyHtml,
      actions: [{ label: "Done", variant: "btn-secondary", onClick: () => true }]
    });
  }

  function setApplying(next) {
    applying = next;
    const button = root.querySelector("[data-primary]");
    if (!button || !button.isConnected) return;
    button.disabled = next;
    button.innerHTML = next
      ? `<span class="btn-spinner" aria-hidden="true"></span><span>Checking plant records</span>`
      : `<span>Reinvestigate changed capacity</span>${kit.ui.icon("arrow")}`;
  }

  async function performPrimary() {
    const model = currentModel();
    if (!model || !model.selected || applying) return;
    setApplying(true);
    try {
      // Apply the outage on the server; stale approvals and tracked tasks are invalidated there.
      if (!shockApplied) {
        await kit.api.post('/api/workflow/shock', { cellId: model.selected.cellId });
        shockApplied = true;
      }
      kit.state.replanChoice = null;
      kit.state.decision = null;
      kit.state.selectedOptionId = null;
      const started = await kit.api.post('/api/workflow/investigation-start', { provider: kit.state.modelProvider });
      let job = started;
      while (job && job.status === 'running' && !disposed) {
        await new Promise((resolve) => setTimeout(resolve, Number(started.pollAfterMs) || 2000));
        job = await kit.api.post('/api/workflow/investigation-status', { jobId: started.jobId });
      }
      if (!job || job.status !== 'completed') throw new Error('Changed capacity investigation did not complete');
      await kit.refreshData({ notifyOnError: false });
      kit.state.disruptionPreview = null;
      kit.setAgentStatus("Changed capacity ready to check");
      setApplying(false);
      kit.go("evidence");
    } catch (error) {
      setApplying(false);
      throw error;
    }
  }

  async function handlePrimary() {
    try {
      await performPrimary();
    } catch {
      kit.toast("Plant records could not be checked", {
        text: "The outage may already be recorded. Reload the plant records before trying again.",
        actionLabel: "Retry",
        onAction: async () => {
          await performPrimary();
        }
      });
    }
  }

  function selectCell(cellId) {
    selectedCellId = cellId;
    focusCellId = cellId;
    draw();
  }

  async function startLoad() {
    if (loading) return;
    loading = true;
    try {
      const result = await kit.refreshData({ notifyOnError: false });
      loadFailed = !getSnapshot() && !(result && result.ok);
    } catch {
      if (!getSnapshot()) loadFailed = true;
    } finally {
      loading = false;
      if (!disposed) draw();
    }
  }

  function bindCommon() {
    const shop = root.querySelector("[data-shop]");
    if (shop) shop.addEventListener("click", () => kit.go("shop"));
    root.querySelectorAll("[data-retry]").forEach((button) => {
      button.addEventListener("click", () => {
        loadFailed = false;
        draw();
      });
    });
  }

  function draw() {
    if (disposed) return;
    const snapshot = getSnapshot();
    if (!snapshot && !loadFailed) {
      root.innerHTML = loadingHtml();
      bindCommon();
      kit.setAgentStatus("Checking plant records");
      kit.setPageCommands([{ title: "Open full plant view", hint: "Departments, machines and waiting orders", run: () => kit.go("shop") }]);
      if (!loading) startLoad();
      return;
    }
    if (!snapshot && loadFailed) {
      root.innerHTML = unavailableHtml();
      bindCommon();
      kit.setAgentStatus("Plant records need attention");
      kit.setPageCommands([
        { title: "Try loading plant records again", hint: "Reload the scenario, snapshot, plant and analysis", run: () => { loadFailed = false; draw(); } },
        { title: "Open full plant view", hint: "Departments, machines and waiting orders", run: () => kit.go("shop") }
      ]);
      return;
    }

    const model = computeModel(snapshot);
    const selected = model.selected;
    const selectedName = selected ? cellLabel(selected) : "No cell";
    const primaryDisabled = !selected || applying;

    const cellCards = model.cells.length
      ? model.cells.map((cell) => {
          const isSelected = selected && cell.cellId === selected.cellId;
          return kit.ui.station({
            name: cellLabel(cell),
            detail: isSelected
              ? `Currently ${kit.fmtHours(kit.openCellHours(cell))} open · 0h in this preview · ${kit.fmtMoney(cell.hourlyCostUsd)}/hour`
              : `${kit.fmtHours(kit.openCellHours(cell))} open · ${kit.fmtMoney(cell.hourlyCostUsd)}/hour`,
            status: isSelected ? "Out in preview" : cell.online === false ? "Offline" : "Available",
            tone: isSelected || cell.online === false ? "is-danger" : "is-ok",
            selected: Boolean(isSelected),
            attrs: `data-cell="${esc(cell.cellId)}" aria-label="Preview ${esc(cellLabel(cell))} going offline"`
          });
        }).join("")
      : kit.ui.emptyState({ title: "No cells in this snapshot", text: "The capacity preview needs at least one recorded cell.", compact: true });

    const capacityHtml = selected
      ? `
        <section class="panel-inset disrupt-capacity">
          <div class="section-label-row">
            <span class="section-label">Capacity after this preview</span>
            <span class="section-hint">${esc(selectedName)} selected</span>
          </div>
          <div class="disrupt-bars">
            ${kit.ui.metricBar({ label: "Before", value: numberLabel(model.beforePct), displayValue: kit.fmtHours(model.before), tone: "is-cert", attrs: 'data-metric-kind="before"', ariaLabel: `${selectedName} before, ${kit.fmtHours(model.before)} open` })}
            ${kit.ui.metricBar({ label: "After", value: "0", displayValue: kit.fmtHours(0), tone: "is-danger", attrs: 'data-metric-kind="after"', ariaLabel: `${selectedName} after, ${kit.fmtHours(0)} open` })}
            ${kit.ui.metricBar({ label: "Elsewhere", value: numberLabel(model.remainingPct), displayValue: kit.fmtHours(model.remaining), tone: "is-recv", attrs: 'data-metric-kind="elsewhere"', ariaLabel: `Other cells combined, ${kit.fmtHours(model.remaining)} open` })}
          </div>
          ${kit.ui.stats([
            { value: numberLabel(model.remaining), suffix: "h", label: "Still open elsewhere" },
            { value: numberLabel(model.required), suffix: "h", label: "Needed by waiting jobs" },
            { value: numberLabel(model.shortfall), suffix: "h", label: "Shortfall" }
          ])}
        </section>`
      : kit.ui.emptyState({ title: "No capacity preview selected", text: "Select a recorded cell above to see the changed hours.", compact: true });

    const jobsHtml = model.jobs.length
      ? model.jobs.map((job) => {
          const route = jobRoute(job, model);
          const losesPreferred = selected && job.preferredCellId === selected.cellId;
          return `
            <button class="job-card${losesPreferred ? " is-linked" : ""}" type="button" data-job="${esc(job.jobId)}">
              <span class="job-main">
                <span class="job-name">${esc(jobLabel(job))}</span>
                <span class="job-detail">${esc(`${kit.fmtInt(job.unitsRequired)} parts · ${kit.fmtHours(jobHours(job))} of work · ${dueText(job)}`)}</span>
                <span class="job-detail disrupt-route">${esc(route.text)}</span>
              </span>
              ${kit.ui.pill(route.pill, route.tone)}
            </button>`;
        }).join("")
      : kit.ui.emptyState({ title: "No waiting jobs in this snapshot", text: "The capacity preview can still be rechecked against the current records.", compact: true });

    const verifiedText = selected
      ? model.jobs.length
        ? `${esc(selectedName)} has <b>${esc(kit.fmtHours(model.before))} open</b>; <b>${esc(kit.fmtInt(model.preferredCount))} of ${esc(kit.fmtInt(model.jobs.length))}</b> waiting jobs prefer it.${model.preferredCount < model.jobs.length && model.preferredNames.length ? ` Preferred: <b>${esc(model.preferredNames.join(", "))}</b>.` : ""}`
        : `${esc(selectedName)} has <b>${esc(kit.fmtHours(model.before))} open</b> in the current snapshot.`
      : "No cell is selected for this preview yet.";
    const estimateText = !selected
      ? "Select a cell to compare recorded work with the hours that would remain."
      : model.required === 0
        ? "No waiting work is recorded, so the fresh check will confirm the current cell hours."
        : model.shortfall > 0
          ? `Waiting work is <b>${esc(kit.fmtHours(model.required))}</b>; <b>${esc(kit.fmtHours(model.remaining))}</b> remains elsewhere, leaving <b>${esc(kit.fmtHours(model.shortfall))} uncovered</b>. Due times need the fresh check.`
          : `Waiting work is <b>${esc(kit.fmtHours(model.required))}</b>; <b>${esc(kit.fmtHours(model.remaining))}</b> remains elsewhere. It fits by hours; due times need the fresh check.`;

    const sourceText = model.preferredNames.length
      ? `${countLabel(model.cells.length, "cell", "cells")} · Preferred: ${model.preferredNames.join(", ")}`
      : `${countLabel(model.cells.length, "cell", "cells")} in the current snapshot`;

    root.innerHTML = `
      <div class="disrupt-page">
        ${headerHtml(model, primaryDisabled)}
        <div class="disrupt-grid">
          <section class="panel disrupt-main">
            <div class="card-head">
              <div><h2 class="card-title">Preview a cell going offline</h2></div>
              ${selected ? kit.ui.pill(`${selectedName} out in preview`, "is-danger") : kit.ui.pill("No cell selected", "is-neutral")}
            </div>
            <div class="disrupt-cells">${cellCards}</div>
            ${capacityHtml}
            <section class="disrupt-jobs-wrap">
              <div class="section-label-row">
                <span class="section-label">Jobs and routes after this preview</span>
                <span class="section-hint">Select a job for its record</span>
              </div>
              <div class="disrupt-jobs">${jobsHtml}</div>
            </section>
            <section class="disrupt-records">
              <div class="section-label-row">
                <span class="section-label">Records behind this preview</span>
                <span class="section-hint">Select a record to open it</span>
              </div>
              <div class="disrupt-records-grid">
                ${kit.ui.evidenceCard({
                  title: selected ? `${selectedName} has ${kit.fmtHours(model.before)} open` : "No cell record selected",
                  sub: "Cell capacity record",
                  attrs: 'data-evidence="cell"',
                  linked: Boolean(selected)
                })}
                ${kit.ui.evidenceCard({
                  title: `${countLabel(model.jobs.length, "job", "jobs")} need ${kit.fmtHours(model.required)}`,
                  sub: "Waiting order records",
                  attrs: 'data-evidence="jobs"'
                })}
                ${kit.ui.evidenceCard({
                  title: model.options.length ? `${countLabel(model.options.length, "path", "paths")} in the last analysis` : "No recovery paths loaded",
                  sub: model.options.length ? "Recovery records to recheck" : "Reinvestigation refreshes the analysis",
                  attrs: 'data-evidence="options"'
                })}
              </div>
            </section>
          </section>
          <aside class="disrupt-aside">
            ${kit.ui.sideCard({
              title: "Impact at a glance",
              body: `
                ${kit.ui.stats([
                  { value: kit.fmtInt(model.parts), label: "Parts at risk" },
                  { value: kit.fmtInt(model.orderCount), label: "Orders affected" },
                  { value: model.firstDue === null ? "None" : numberLabel(model.firstDue), suffix: model.firstDue === null ? "" : "hours", label: "First due in" }
                ])}
                <div class="disrupt-source"><span class="disrupt-dot${model.shortfall > 0 ? " is-held" : ""}"></span><span class="disrupt-source-text">${esc(sourceText)}</span></div>`
            })}
            ${kit.ui.sideCard({
              title: "The Britt's summary",
              grow: true,
              body: `
                <div class="agent-rows">
                  ${kit.ui.agentRow("Verified fact", "is-fact", verifiedText)}
                  ${kit.ui.agentRow("Estimate", "is-estimate", estimateText)}
                  ${kit.ui.agentRow("Suggestion", "is-suggestion", "Reinvestigate now, then read the new evidence before approving a changed plan.")}
                </div>
                <div class="agent-line">
                  <span class="agent-avatar">${kit.ui.icon("mark")}</span>
                  <span class="agent-line-text"><b>The Britt has changed nothing.</b> This preview becomes a new plan only after the fresh evidence is checked.</span>
                </div>`
            })}
          </aside>
        </div>
      </div>`;

    bindCommon();
    const primary = root.querySelector("[data-primary]");
    if (primary) primary.addEventListener("click", handlePrimary);
    root.querySelectorAll("[data-cell]").forEach((button) => {
      button.addEventListener("click", () => selectCell(button.dataset.cell));
    });
    root.querySelectorAll("[data-job]").forEach((button) => {
      button.addEventListener("click", () => {
        const job = model.jobs.find((entry) => entry.jobId === button.dataset.job);
        openJobDialog(job, model);
      });
    });
    root.querySelectorAll("[data-metric-kind]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.metricKind === "elsewhere") openOtherCellsDialog(model);
        else openCellDialog(selected, model);
      });
    });
    root.querySelectorAll("[data-evidence]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.evidence === "cell") openCellDialog(selected, model);
        else if (button.dataset.evidence === "jobs") openJobsDialog(model);
        else openOptionsDialog(model);
      });
    });

    kit.ui.applyMetrics(root);
    if (window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        if (!disposed) kit.ui.applyMetrics(root);
      });
    }
    kit.setAgentStatus(selected ? "Previewing changed capacity" : "Ready now");
    kit.setPageCommands([
      { title: "Reinvestigate changed capacity", hint: "Checks plant records again, then opens Evidence", run: handlePrimary },
      ...model.cells.map((cell) => ({
        title: `Preview ${cellLabel(cell)} going offline`,
        hint: `${kit.fmtHours(kit.openCellHours(cell))} open in the current records`,
        run: () => selectCell(cell.cellId)
      })),
      { title: "Open full plant view", hint: "Departments, machines and waiting orders", run: () => kit.go("shop") }
    ]);

    if (focusCellId) {
      const target = Array.from(root.querySelectorAll("[data-cell]")).find((element) => element.dataset.cell === focusCellId);
      focusCellId = "";
      if (target) target.focus();
    }
  }

  draw();

  return () => {
    disposed = true;
    kit.clearPageCommands();
    kit.setAgentStatus("Ready now");
  };
}