export async function render(root, kit) {
  const ui = kit.ui;
  const esc = kit.esc;
  let destroyed = false;
  let loading = false;
  let selectedId = "";
  let previewId = "";
  let selectionTouched = false;
  let currentModel = null;

  const asArray = (value) => (Array.isArray(value) ? value : []);
  const hasText = (value) => value !== null && value !== undefined && String(value).trim() !== "";

  function optionDisplayName(option) {
    const id = String(option && option.optionId ? option.optionId : "");
    const key = id.toLowerCase();
    if (key.includes("wait") || key.includes("replenish")) return "Wait for replenishment";
    if (key.includes("substitut")) return "Use verified substitute";
    if (key.includes("split") || key.includes("capacity")) return "Split available capacity";
    if (key.includes("expedite")) return "Expedite replacement";
    if (key.includes("rework")) return "Rework the held lot";
    return kit.friendlyName(id, "Recovery path");
  }

  function optionMeaning(option) {
    const key = String(option && option.optionId ? option.optionId : "").toLowerCase();
    if (key.includes("wait") || key.includes("replenish")) return "Wait for a new lot of the held material to arrive.";
    if (key.includes("substitut")) return "Run the waiting jobs on the substitute named in the records.";
    if (key.includes("split") || key.includes("capacity")) return "Share the waiting jobs across the cells that can run them.";
    if (key.includes("expedite")) return "Bring in a replacement lot sooner than the standard lead time.";
    if (key.includes("rework")) return "Send the held lot through the rework named in the records.";
    return "Use this calculated path for the waiting jobs.";
  }

  function buildModel() {
    const workflow = kit.state.workflow || {};
    const analysis = kit.state.analysis || workflow.analysis || {};
    const recovery = analysis.recovery || {};
    const impacted = recovery.impacted || analysis.impacted || {};
    const snapshot = workflow.snapshot || {};
    const recoveryOptions = asArray(recovery.options);
    const options = recoveryOptions.length ? recoveryOptions : asArray(analysis.options);
    const impactedJobs = asArray(impacted.jobs);
    const jobs = impactedJobs.length ? impactedJobs : asArray(snapshot.jobs);
    const materials = asArray(snapshot.materials);
    const cells = asArray(snapshot.cells);
    const incident = snapshot.incident || (kit.state.scenario && kit.state.scenario.incident) || analysis.incident || {};
    const heldMaterial = materials.find((material) => material && material.materialId === incident.heldMaterialId) || null;
    const evidenceById = new Map();
    for (const record of asArray(snapshot.evidenceRecords)) {
      if (record && record.evidenceId) evidenceById.set(record.evidenceId, record);
    }
    const feasible = options.filter((option) => option && option.optionId && option.feasible !== false);
    const namedRecommendedId = recovery.recommendedOptionId || recovery.recommendedId || analysis.recommendedOptionId || "";
    let recommended = feasible.find((option) => option.optionId === namedRecommendedId) || null;
    if (!recommended && feasible.length) {
      recommended = [...feasible].sort((a, b) => {
        const finishA = Number(a.finishHours);
        const finishB = Number(b.finishHours);
        const safeA = Number.isFinite(finishA) ? finishA : Number.POSITIVE_INFINITY;
        const safeB = Number.isFinite(finishB) ? finishB : Number.POSITIVE_INFINITY;
        if (safeA !== safeB) return safeA - safeB;
        return (Number(a.incrementalCostUsd) || 0) - (Number(b.incrementalCostUsd) || 0);
      })[0];
    }
    const impactedUnits = impacted.impactedUnits !== null && impacted.impactedUnits !== undefined
      ? Number(impacted.impactedUnits)
      : jobs.reduce((sum, job) => sum + (Number(job && job.unitsRequired) || 0), 0);
    const jobCount = impacted.impactedJobCount !== null && impacted.impactedJobCount !== undefined
      ? Number(impacted.impactedJobCount)
      : jobs.length;
    const dueValues = jobs.map((job) => Number(job && job.dueHours)).filter((value) => Number.isFinite(value));
    const firstDue = dueValues.length ? Math.min(...dueValues) : null;
    return {
      analysis,
      recovery,
      snapshot,
      incident,
      options,
      feasible,
      jobs,
      materials,
      cells,
      heldMaterial,
      evidenceById,
      recommendedId: recommended ? recommended.optionId : "",
      impactedUnits,
      jobCount,
      firstDue,
      digest: snapshot.snapshotDigest || analysis.snapshotDigest || recovery.snapshotDigest || (kit.state.scenario && kit.state.scenario.snapshotDigest) || "",
      hasAnalysis: Boolean(analysis.snapshotDigest || analysis.scenarioId || recovery.snapshotDigest || options.length)
    };
  }

  function ensureSelection(model) {
    if (!model.feasible.some((option) => option.optionId === selectedId)) {
      selectedId = model.recommendedId || (model.feasible[0] ? model.feasible[0].optionId : "");
      selectionTouched = false;
    }
    if (!model.options.some((option) => option && option.optionId === previewId)) {
      previewId = selectedId || (model.feasible[0] ? model.feasible[0].optionId : "") || (model.options[0] ? model.options[0].optionId : "");
    }
  }

  function selectedOption(model) {
    return model.options.find((option) => option && option.optionId === selectedId) || null;
  }

  function previewOption(model) {
    return model.options.find((option) => option && option.optionId === previewId) || null;
  }

  function optionUnits(option, model) {
    return option.impactedUnits !== null && option.impactedUnits !== undefined ? option.impactedUnits : model.impactedUnits;
  }

  function optionMeta(option, model) {
    return [
      { label: "Finish", value: kit.fmtHours(option.finishHours) },
      { label: "Cost", value: kit.fmtMoney(option.incrementalCostUsd) },
      { label: "Orders", value: kit.fmtInt(model.jobCount) }
    ];
  }

  function coversText(option, model) {
    const count = Number(model.jobCount) || 0;
    return `${kit.fmtInt(count)} ${count === 1 ? "order" : "orders"} · ${kit.fmtInt(optionUnits(option, model))} pieces`;
  }

  function keyAssumption(option) {
    const assumptions = asArray(option.assumptions).filter(hasText).map(String);
    return assumptions.length ? assumptions[assumptions.length - 1] : "No assumption was recorded for this path.";
  }

  function keyLimit(option) {
    if (option.feasible === false) return hasText(option.rejectReason) ? String(option.rejectReason) : "This path cannot run on the current records.";
    const constraints = asArray(option.constraints).filter(hasText).map(String);
    return constraints.length ? constraints[0] : "No limit was recorded for this path.";
  }

  function optionCard(model, option) {
    const isSelected = option.optionId === selectedId;
    const isRecommended = option.optionId === model.recommendedId;
    const infeasible = option.feasible === false;
    const chooseButton = isSelected
      ? `<button class="btn btn-ghost" type="button" data-dec-choose="${esc(option.optionId)}" disabled>${ui.icon("check")}<span>Selected</span></button>`
      : infeasible
        ? `<button class="btn btn-secondary" type="button" data-dec-choose="${esc(option.optionId)}" disabled>Cannot choose</button>`
        : `<button class="btn btn-secondary" type="button" data-dec-choose="${esc(option.optionId)}">Choose this option</button>`;
    return `<article class="option-card${isSelected ? " is-selected" : ""}${infeasible ? " is-infeasible" : ""}">
      <div class="option-top"><span class="option-name">${esc(optionDisplayName(option))}</span>${isRecommended ? ui.pill("Recommended", "is-rec", false) : ""}</div>
      <p class="option-meaning">${esc(optionMeaning(option))}</p>
      <div class="meta-grid">${optionMeta(option, model).map((cell) => `<span class="meta-cell"><span class="meta-label">${esc(cell.label)}</span><span class="meta-value">${esc(cell.value)}</span></span>`).join("")}</div>
      <p class="dec-cover"><b>Covers:</b> ${esc(infeasible ? "does not cover the waiting orders" : coversText(option, model))}</p>
      <span class="option-assump"><b>Key assumption:</b> ${esc(keyAssumption(option))}</span>
      <span class="option-assump"><b>${infeasible ? "Cannot run:" : "Key limit:"}</b> ${esc(keyLimit(option))}</span>
      <div class="option-footer">
        <button class="btn btn-ghost" type="button" data-dec-preview="${esc(option.optionId)}">Preview impact</button>
        ${chooseButton}
      </div>
    </article>`;
  }

  function jobCard(job) {
    const parts = [];
    if (job.unitsRequired !== null && job.unitsRequired !== undefined) parts.push(`${kit.fmtInt(job.unitsRequired)} parts`);
    if (job.dueHours !== null && job.dueHours !== undefined) parts.push(`due in ${kit.fmtHours(job.dueHours)}`);
    if (job.preferredCellId) parts.push(`via ${kit.friendlyName(job.preferredCellId, "Cell")}`);
    return `<button class="job-card" type="button" data-dec-job="${esc(job.jobId || "")}">
      <span class="job-main"><span class="job-name">${esc(kit.friendlyName(job.jobId, "Job"))}</span><span class="job-detail">${esc(parts.join(" · "))}</span></span>
      ${ui.pill("At risk", "is-held")}
    </button>`;
  }

  function confirmationHtml(model) {
    const option = selectedOption(model);
    if (!option) {
      return `<section class="side-card dec-confirm"><h2 class="side-title">Your decision</h2>${ui.emptyState({ title: "No runnable path is selected", text: "Choose a path that can run, then authorize it here.", compact: true })}</section>`;
    }
    return `<section class="side-card dec-confirm">
      <div class="card-head"><h2 class="side-title">Your decision</h2>${ui.pill("Ready to authorize", "is-ok")}</div>
      <p class="dec-confirm-name">${esc(optionDisplayName(option))}</p>
      <p class="dec-cover">Finish <b>${esc(kit.fmtHours(option.finishHours))}</b> · Cost <b>${esc(kit.fmtMoney(option.incrementalCostUsd))}</b> · Covers <b>${esc(kit.fmtInt(optionUnits(option, model)))} pieces</b></p>
      <p class="dec-note">Selected for authorization. Nothing moves until you authorize this path.</p>
      <button class="btn btn-primary btn-wide" type="button" data-dec-authorize>Authorize this decision</button>
    </section>`;
  }

  function agentHtml(model) {
    const rows = [];
    if (hasText(model.incident.discrepancy)) {
      rows.push(ui.agentRow("Verified fact", "is-fact", esc(String(model.incident.discrepancy))));
    }
    const recommended = model.options.find((option) => option && option.optionId === model.recommendedId) || null;
    if (recommended) {
      rows.push(ui.agentRow("Estimate", "is-estimate", `<b>${esc(optionDisplayName(recommended))}</b> finishes in ${esc(kit.fmtHours(recommended.finishHours))} for ${esc(kit.fmtMoney(recommended.incrementalCostUsd))}.`));
      rows.push(ui.agentRow("Suggestion", "is-suggestion", `Preview <b>${esc(optionDisplayName(recommended))}</b>, then authorize your choice.`));
    } else if (model.feasible.length) {
      rows.push(ui.agentRow("Suggestion", "is-suggestion", "Preview a path that can run, then authorize your choice."));
    }
    if (!rows.length) return "";
    return `<section class="side-card dec-agent">
      <h2 class="side-title">The Britt’s summary</h2>
      <div class="agent-rows">${rows.join("")}</div>
    </section>`;
  }

  function headerHtml(model) {
    const connectionText = kit.state.connection === "connected"
      ? "Plant records connected"
      : kit.state.connection === "offline"
        ? "Plant records could not be reached"
        : "Checking plant records";
    const jobText = model && model.jobCount
      ? `${kit.fmtInt(model.jobCount)} ${Number(model.jobCount) === 1 ? "order is" : "orders are"} waiting on the held lot. Preview a path, choose one, then authorize it.`
      : "Preview a path, choose one, then authorize it.";
    return `<header class="dec-head">
      <div class="dec-head-main">
        <p class="eyebrow"><span class="status-dot${kit.state.connection === "offline" ? " is-danger" : ""}" aria-hidden="true"></span><span>Human decision · ${esc(connectionText)}</span></p>
        <h1 class="page-title">Choose a recovery path.</h1>
        <p class="page-sub dec-sub">${esc(jobText)}</p>
      </div>
      <div class="action-stack">
        <div class="action-row"><button class="btn btn-secondary" type="button" data-dec-back>Back to findings</button></div>
        <p class="primary-helper"><span class="helper-dot is-held" aria-hidden="true"></span><span>Nothing moves until you authorize.</span></p>
      </div>
    </header>`;
  }

  function paintUnavailable() {
    currentModel = buildModel();
    root.innerHTML = `<div class="dec-screen">
      ${headerHtml(currentModel)}
      <section class="panel dec-unavailable">${ui.emptyState({
        title: "Plant records are not available yet",
        text: "No recovery path can be chosen until the current snapshot loads. Your place in the flow is kept.",
        actionLabel: "Try again",
        actionAttrs: "data-dec-retry"
      })}</section>
    </div>`;
    wire();
    kit.setAgentStatus("Waiting for plant records");
    kit.setPageCommands([
      { title: "Try loading plant records again", hint: "Reload the snapshot, plant and analysis", run: reload },
      { title: "Back to findings", hint: "Return to the verified findings step", run: () => kit.go("findings") }
    ]);
  }

  function paintLoading() {
    root.innerHTML = `<div class="dec-screen">${ui.panel({ title: "Decision", body: ui.loadingRow("Loading recovery paths from the current plant snapshot.") })}</div>`;
  }

  function paint() {
    if (destroyed) return;
    const model = buildModel();
    currentModel = model;
    if (!model.hasAnalysis && !model.options.length) {
      paintUnavailable();
      return;
    }
    ensureSelection(model);
    const preview = previewOption(model);
    const feasiblePill = ui.pill(
      model.feasible.length ? `${kit.fmtInt(model.feasible.length)} of ${kit.fmtInt(model.options.length)} paths can run` : "No path can run",
      model.feasible.length ? "is-ok" : "is-danger"
    );
    const previewHtml = preview
      ? `<span class="preview-text"><b>${esc(optionDisplayName(preview))} preview:</b> finishes in ${esc(kit.fmtHours(preview.finishHours))} · added cost ${esc(kit.fmtMoney(preview.incrementalCostUsd))} · covers ${esc(coversText(preview, model))}.${preview.feasible === false ? " This path cannot run." : ""}</span><button class="btn btn-ghost" type="button" data-dec-detail>See calculation detail</button>`
      : `<span class="preview-text">No recovery path is available to preview on this snapshot.</span>`;
    const heldLine = model.incident.heldMaterialId
      ? `Held lot ${String(model.incident.heldMaterialId)}${model.heldMaterial && model.heldMaterial.held !== null && model.heldMaterial.held !== undefined ? `, ${kit.fmtInt(model.heldMaterial.held)} pieces held` : ""}`
      : "Held lot from the current snapshot";
    root.innerHTML = `<div class="dec-screen">
      ${headerHtml(model)}
      <div class="dec-grid">
        <main class="dec-main">
          <section class="panel dec-options-panel">
            <div class="card-head"><div><h2 class="card-title">Recovery paths from plant records</h2><p class="card-desc">Compare time, cost and coverage from the same snapshot.</p></div>${feasiblePill}</div>
            ${model.options.length
              ? `<div class="dec-options">${model.options.map((option) => optionCard(model, option)).join("")}</div><div class="preview-line">${previewHtml}</div>`
              : ui.emptyState({ title: "No recovery paths were returned", text: "Choose cannot continue until the analysis returns a path for this snapshot.", actionLabel: "Try again", actionAttrs: "data-dec-retry" })}
          </section>
          <section class="panel dec-jobs-panel">
            <div class="section-label-row"><span class="section-label">Orders waiting on this lot</span><span class="section-hint">Select an order to see its record</span></div>
            ${model.jobs.length
              ? `<div class="dec-jobs">${model.jobs.map((job) => jobCard(job)).join("")}</div>`
              : ui.emptyState({ title: "No waiting orders were returned", text: "The current snapshot lists no orders for the held lot.", compact: true })}
          </section>
        </main>
        <aside class="dec-aside">
          <section class="side-card">
            <h2 class="side-title">Impact at a glance</h2>
            ${ui.stats([
              { value: kit.fmtInt(model.impactedUnits), label: "Parts at risk" },
              { value: kit.fmtInt(model.jobCount), label: "Orders affected" },
              { value: model.firstDue === null ? kit.fmtHours(null) : kit.fmtHours(model.firstDue), label: "First order due" }
            ])}
            <div class="source-line"><span class="source-dot" aria-hidden="true"></span><span class="source-text">${esc(heldLine)}</span></div>
          </section>
          ${confirmationHtml(model)}
          ${agentHtml(model)}
        </aside>
      </div>
    </div>`;
    wire();
    kit.setAgentStatus(selectedId ? "Ready to authorize" : "Waiting for your decision");
    const commands = [];
    for (const option of model.feasible) {
      commands.push({
        title: `Choose ${optionDisplayName(option)}`,
        hint: `${kit.fmtHours(option.finishHours)} · ${kit.fmtMoney(option.incrementalCostUsd)} from plant records`,
        run: () => chooseOption(option.optionId, true)
      });
    }
    if (preview) {
      commands.push({ title: `Preview ${optionDisplayName(preview)}`, hint: "See time, cost, coverage and records behind this path", run: () => openOptionDetail(preview) });
    }
    commands.push({ title: "Authorize this decision", hint: "Open the authorize wall for the selected path", run: openAuthorizeWall });
    commands.push({ title: "Back to findings", hint: "Return to the verified findings step", run: () => kit.go("findings") });
    kit.setPageCommands(commands);
  }

  function chooseOption(optionId, focusAuthorize) {
    selectedId = optionId;
    previewId = optionId;
    selectionTouched = true;
    paint();
    if (focusAuthorize) {
      const button = root.querySelector("[data-dec-authorize]");
      if (button) button.focus();
    }
  }

  function openOptionDetail(option) {
    if (!option || !currentModel) return;
    const model = currentModel;
    const constraints = asArray(option.constraints).filter(hasText).map(String);
    const assumptions = asArray(option.assumptions).filter(hasText).map(String);
    const evidence = asArray(option.evidenceIds).map((id) => model.evidenceById.get(id)).filter(Boolean);
    const rows = [
      { label: "Finish", value: kit.fmtHours(option.finishHours) },
      { label: "Added cost", value: kit.fmtMoney(option.incrementalCostUsd) },
      { label: "Covers", value: `${kit.fmtInt(optionUnits(option, model))} pieces` },
      { label: "Waiting orders", value: `${kit.fmtInt(model.jobCount)} ${Number(model.jobCount) === 1 ? "order" : "orders"}` },
      { label: "Key limits", value: constraints.length ? constraints.join(" · ") : "No limit was recorded for this path." },
      { label: "Assumptions", value: assumptions.length ? assumptions.join(" ") : "No assumptions were recorded for this path." }
    ];
    const evidenceHtml = evidence.length
      ? `<div><h3 class="dialog-section-title">Records behind this path</h3><div class="stack-sm">${evidence.map((record) => `<p class="excerpt">${esc(record.excerpt || record.evidenceId || "")}</p>`).join("")}</div></div>`
      : "";
    const actions = [{ label: "Close", variant: "btn-secondary", onClick: () => true }];
    if (option.feasible !== false) {
      actions.push({
        label: "Choose this option",
        variant: "btn-primary",
        onClick: () => {
          chooseOption(option.optionId, true);
          return true;
        }
      });
    }
    kit.openDialog({
      title: optionDisplayName(option),
      subtitle: "Calculated from the current plant snapshot.",
      wide: true,
      bodyHtml: `${kit.detailRowsHtml(rows)}${evidenceHtml}`,
      actions
    });
  }

  function openJobDetail(job) {
    if (!job || !currentModel) return;
    const model = currentModel;
    const cell = model.cells.find((entry) => entry && entry.cellId === job.preferredCellId) || null;
    const totalHours = job.totalHours !== null && job.totalHours !== undefined
      ? Number(job.totalHours)
      : (Number(job.unitsRequired) || 0) * (Number(job.hoursPerUnit) || 0);
    const rows = [
      { label: "Material", value: job.materialId || "Not recorded" },
      { label: "Units required", value: job.unitsRequired !== null && job.unitsRequired !== undefined ? `${kit.fmtInt(job.unitsRequired)} pieces` : "Not recorded" },
      { label: "Hours per unit", value: job.hoursPerUnit !== null && job.hoursPerUnit !== undefined ? kit.fmtHours(job.hoursPerUnit) : "Not recorded" },
      { label: "Total work", value: totalHours ? kit.fmtHours(totalHours) : "Not recorded" },
      { label: "Due in", value: job.dueHours !== null && job.dueHours !== undefined ? kit.fmtHours(job.dueHours) : "Not recorded" },
      { label: "Preferred cell", value: job.preferredCellId || "Not recorded" }
    ];
    if (cell) {
      rows.push({ label: "Cell open", value: `${kit.fmtHours(cell.availableHours)} at ${kit.fmtMoney(cell.hourlyCostUsd)} per hour` });
      rows.push({ label: "Cell can run", value: asArray(cell.compatibleMaterials).join(", ") || "Not recorded" });
    }
    kit.openDialog({
      title: kit.friendlyName(job.jobId, "Job"),
      subtitle: "The order record behind this decision.",
      bodyHtml: kit.detailRowsHtml(rows),
      actions: [{ label: "Close", variant: "btn-secondary", onClick: () => true }]
    });
  }

  function collectWorkflowEndpoints(value, found) {
    if (!value || typeof value !== "object") return;
    for (const entry of Object.values(value)) {
      if (typeof entry === "string" && entry.startsWith("/api/workflow/")) found.push(entry);
      else if (entry && typeof entry === "object") collectWorkflowEndpoints(entry, found);
    }
  }

  function isMissingEndpoint(error) {
    const message = String(error && error.message ? error.message : error);
    return /(^|\D)(404|405)(\D|$)/.test(message) || /not found|unknown endpoint|no route/i.test(message);
  }

  function extractToolList(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.tools)) return payload.tools;
    if (payload && Array.isArray(payload.definitions)) return payload.definitions;
    return [];
  }

  function toolNameOf(tool) {
    if (typeof tool === "string") return tool;
    if (!tool || typeof tool !== "object") return "";
    return String(tool.name || tool.id || (tool.function && tool.function.name) || "");
  }

  function buildToolArgs(tool, option, model) {
    const fallback = { optionId: option.optionId, snapshotDigest: model.digest || undefined };
    if (!tool || typeof tool !== "object") return fallback;
    const schema = tool.inputSchema || tool.parameters || tool.schema || (tool.function && tool.function.parameters) || null;
    const properties = schema && schema.properties && typeof schema.properties === "object" ? schema.properties : null;
    if (!properties) return fallback;
    const args = {};
    for (const key of Object.keys(properties)) {
      const lower = key.toLowerCase();
      if (lower.includes("option")) args[key] = option.optionId;
      else if (lower.includes("digest")) args[key] = model.digest;
      else if (lower.includes("snapshot")) args[key] = model.digest;
      else if (/(operator|actor|approver|user)/.test(lower)) {
        const operatorId = kit.state.operator && kit.state.operator.id;
        if (operatorId) args[key] = operatorId;
      }
    }
    return Object.keys(args).length ? args : fallback;
  }

  async function recordDecision(option, model) {
    const payload = { optionId: option.optionId, snapshotDigest: model.digest || undefined };
    const discovered = [];
    collectWorkflowEndpoints(kit.state.workflow, discovered);
    collectWorkflowEndpoints(kit.state.analysis, discovered);
    const candidates = [
      "/api/workflow/decide",
      "/api/workflow/decision",
      "/api/workflow/accept-option",
      "/api/workflow/accept-recovery-option",
      "/api/workflow/record-decision",
      "/api/workflow/choose-option",
      "/api/workflow/authorize-decision",
      "/api/workflow/approve-decision",
      "/api/workflow/acceptance",
      "/api/workflow/accept",
      "/api/workflow/approve",
      "/api/workflow/authorize"
    ];
    const tried = new Set();
    let lastError = null;
    for (const path of discovered) {
      if (!/(decide|decision|accept|author|choose|approve)/i.test(path) || tried.has(path)) continue;
      tried.add(path);
      try {
        return await kit.api.post(path, payload);
      } catch (error) {
        lastError = error;
        if (!isMissingEndpoint(error)) throw error;
      }
    }
    let toolError = null;
    try {
      const toolsPayload = kit.state.tools || await kit.loadTools();
      const tool = extractToolList(toolsPayload).find((entry) => {
        const name = toolNameOf(entry);
        return /(accept|approve|authoriz|consent|decision|decide|choose|record|submit)/i.test(name) && !/(get|list|status|read|preview|compare|analy)/i.test(name);
      });
      const toolName = toolNameOf(tool);
      if (toolName) {
        try {
          return await kit.api.post("/api/tools/invoke", { name: toolName, arguments: buildToolArgs(tool, option, model) });
        } catch (error) {
          toolError = error;
        }
      }
    } catch (error) {
      toolError = error;
    }
    for (const path of candidates) {
      if (tried.has(path)) continue;
      tried.add(path);
      try {
        return await kit.api.post(path, payload);
      } catch (error) {
        lastError = error;
        if (!isMissingEndpoint(error)) throw error;
      }
    }
    throw toolError || lastError || new Error("The decision could not be recorded.");
  }

  function openAuthorizeWall() {
    const model = currentModel || buildModel();
    const option = selectedOption(model);
    if (!option) {
      kit.toast("Choose a recovery path first", { text: "Preview a path, choose it, then authorize that choice." });
      return;
    }
    if (option.feasible === false) {
      kit.toast("That path cannot run", { text: "Choose a path that can run on the current records." });
      return;
    }
    kit.openAuthorize({
      title: "Authorize this decision",
      subtitle: "Read what will happen, then authorize with one click. Nothing moves before this step.",
      confirmLabel: "Authorize this decision",
      summary: `You are authorizing <b>${esc(optionDisplayName(option))}</b> for the waiting orders. The Britt will build the recovery plan only after this authorization is recorded.`,
      rows: [
        { label: "Path", value: optionDisplayName(option) },
        { label: "Finish", value: kit.fmtHours(option.finishHours) },
        { label: "Added cost", value: kit.fmtMoney(option.incrementalCostUsd) },
        { label: "Covers", value: `${kit.fmtInt(optionUnits(option, model))} pieces` },
        { label: "Waiting orders", value: `${kit.fmtInt(model.jobCount)} ${Number(model.jobCount) === 1 ? "order" : "orders"}` },
        { label: "Held lot", value: model.incident.heldMaterialId || "From the current snapshot" },
        { label: "Snapshot", value: model.digest || "Current snapshot" }
      ],
      onAuthorize: async () => {
        const response = await recordDecision(option, model);
        kit.state.decision = { optionId: option.optionId, snapshotDigest: model.digest };
        kit.state.selectedOptionId = option.optionId;
        if (response && typeof response === "object") {
          kit.state.decisionResponse = response;
          if (response.workflow) kit.state.workflow = response.workflow;
          if (response.analysis) kit.state.analysis = response.analysis;
        }
        try {
          await kit.refreshData({ notifyOnError: false });
        } catch {
          /* The authorization already succeeded; the next step reloads the shared records. */
        }
      },
      onAuthorized: () => {
        kit.toast("Decision authorized", { text: "The Britt can now build the recovery plan from your choice." });
        kit.go("britt-replan");
      }
    });
  }

  function wire() {
    root.querySelectorAll("[data-dec-back]").forEach((button) => button.addEventListener("click", () => kit.go("findings")));
    root.querySelectorAll("[data-dec-retry]").forEach((button) => button.addEventListener("click", reload));
    root.querySelectorAll("[data-dec-choose]").forEach((button) => button.addEventListener("click", () => chooseOption(button.dataset.decChoose, true)));
    root.querySelectorAll("[data-dec-preview]").forEach((button) => button.addEventListener("click", () => {
      previewId = button.dataset.decPreview;
      paint();
      const again = Array.from(root.querySelectorAll("[data-dec-preview]")).find((entry) => entry.dataset.decPreview === previewId);
      if (again) again.focus();
    }));
    root.querySelectorAll("[data-dec-detail]").forEach((button) => button.addEventListener("click", () => {
      if (currentModel) openOptionDetail(previewOption(currentModel));
    }));
    root.querySelectorAll("[data-dec-authorize]").forEach((button) => button.addEventListener("click", openAuthorizeWall));
    root.querySelectorAll("[data-dec-job]").forEach((button) => button.addEventListener("click", () => {
      if (!currentModel) return;
      const job = currentModel.jobs.find((entry) => entry && entry.jobId === button.dataset.decJob);
      if (job) openJobDetail(job);
    }));
  }

  async function reload() {
    if (loading || destroyed) return;
    loading = true;
    paintLoading();
    try {
      await kit.refreshData({ notifyOnError: false });
    } finally {
      loading = false;
      if (!destroyed) paint();
    }
  }

  const unsubscribe = kit.subscribe(() => {
    if (!destroyed && !loading) paint();
  });

  if (kit.state.analysis || kit.state.workflow) paint();
  else await reload();

  return () => {
    destroyed = true;
    if (typeof unsubscribe === "function") unsubscribe();
    kit.clearPageCommands();
  };
}