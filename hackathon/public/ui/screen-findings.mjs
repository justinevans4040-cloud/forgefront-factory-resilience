export async function render(root, kit) {
  const ui = kit.ui;
  const esc = kit.esc;
  let selected = { kind: "evidence", id: "" };
  let disposed = false;
  let advancing = false;
  let loadFailed = false;
  let loadPromise = null;
  let lastSignature = "";

  const asArray = (value) => (Array.isArray(value) ? value : []);
  const num = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const friendly = (value, fallback) => kit.friendlyName(value, fallback || "Plant item");
  const materialName = (id) => friendly(id, "Material").replace(/^Mat\s+/, "");
  const cellName = (id) => friendly(id, "Cell");
  const jobName = (id) => friendly(id, "Job");
  const optionName = (id) => {
    const names = {
      wait_replenishment: "Wait for replenishment",
      use_verified_substitute: "Use verified substitute",
      use_substitute: "Use verified substitute",
      split_available_capacity: "Split available capacity",
      split_capacity: "Split available capacity"
    };
    return names[id] || friendly(id, "Recovery path");
  };
  const connectionLabel = () => {
    if (kit.state.connection === "connected") return "Plant records connected";
    if (kit.state.connection === "offline") return "Plant records could not be reached";
    return "Checking plant records";
  };
  const quantityText = (evidence, model) => {
    const value = num(evidence?.quantity?.value);
    if (value === null) return "Not recorded";
    const rawUnit = evidence.quantity?.unit || "";
    const unit = rawUnit === "each" ? (model?.unitLabel || "pieces") : (rawUnit || model?.unitLabel || "");
    return `${kit.fmtInt(value)} ${unit}`.trim();
  };

  function evidenceKind(evidence) {
    const text = `${evidence?.evidenceId || ""} ${evidence?.documentId || ""} ${evidence?.recordId || ""} ${evidence?.field || ""}`.toLowerCase();
    if (text.includes("cert")) return "cert";
    if (text.includes("recv") || text.includes("receiving")) return "receiving";
    if (evidence?.field === "onHand" || text.includes("inv") || text.includes("stock") || text.includes("sub")) return "stock";
    return "record";
  }

  function buildModel() {
    const workflow = kit.state.workflow || null;
    const snapshot = workflow?.snapshot || null;
    const analysis = kit.state.analysis || workflow?.analysis || null;
    if (!snapshot || !analysis) return null;

    const incident = snapshot.incident || analysis.incident || {};
    const heldMaterialId = incident.heldMaterialId || "";
    const materials = asArray(snapshot.materials);
    const heldMaterial = materials.find((material) => material.materialId === heldMaterialId) || null;
    const substitutes = asArray(heldMaterial?.substitutes)
      .map((id) => materials.find((material) => material.materialId === id))
      .filter(Boolean);
    const unitLabel = heldMaterial?.unit === "each" ? "pieces" : (heldMaterial?.unit || "units");
    const evidence = asArray(snapshot.evidenceRecords);
    const quantityEvidence = evidence.filter((item) => item.field === "quantity" && num(item.quantity?.value) !== null);
    const certEvidence = quantityEvidence.find((item) => evidenceKind(item) === "cert") || quantityEvidence[0] || null;
    const receivingEvidence = quantityEvidence.find((item) => evidenceKind(item) === "receiving" && item !== certEvidence)
      || quantityEvidence.find((item) => item !== certEvidence)
      || null;
    const stockEvidence = evidence.find((item) => evidenceKind(item) === "stock") || null;
    const certValue = num(certEvidence?.quantity?.value);
    const receivingValue = num(receivingEvidence?.quantity?.value);
    const difference = certValue !== null && receivingValue !== null ? Math.abs(certValue - receivingValue) : null;

    const impactedSource = asArray(analysis.impacted?.jobs).length
      ? asArray(analysis.impacted?.jobs)
      : asArray(snapshot.jobs).filter((job) => job.materialId === heldMaterialId);
    const jobs = impactedSource.map((job) => {
      const snapshotJob = asArray(snapshot.jobs).find((item) => item.jobId === job.jobId) || {};
      const merged = { ...snapshotJob, ...job };
      const explicitTotal = num(merged.totalHours);
      merged.totalHours = explicitTotal !== null
        ? explicitTotal
        : (num(merged.unitsRequired) || 0) * (num(merged.hoursPerUnit) || 0);
      return merged;
    });
    const impactedUnits = num(analysis.impacted?.impactedUnits) !== null
      ? num(analysis.impacted?.impactedUnits)
      : jobs.reduce((sum, job) => sum + (num(job.unitsRequired) || 0), 0);
    const impactedJobCount = num(analysis.impacted?.impactedJobCount) !== null
      ? num(analysis.impacted?.impactedJobCount)
      : jobs.length;
    const dueValues = jobs.map((job) => num(job.dueHours)).filter((value) => value !== null);
    const earliestDue = dueValues.length ? Math.min(...dueValues) : null;
    const cells = asArray(snapshot.cells);
    const options = asArray(analysis.recovery?.options).length ? asArray(analysis.recovery?.options) : asArray(analysis.options);
    const feasibleOptions = options.filter((option) => option.feasible);
    const fastestOption = feasibleOptions.reduce((best, option) => {
      if (!best) return option;
      return (num(option.finishHours) || 0) < (num(best.finishHours) || 0) ? option : best;
    }, null);
    const substituteAvailable = substitutes.reduce((sum, material) => sum + (num(material.available) || 0), 0);
    const quantityValues = quantityEvidence.map((item) => num(item.quantity?.value)).filter((value) => value !== null);
    const maxQuantity = quantityValues.length ? Math.max(...quantityValues) : 0;

    return {
      workflow,
      snapshot,
      analysis,
      incident,
      heldMaterialId,
      materials,
      heldMaterial,
      substitutes,
      unitLabel,
      evidence,
      quantityEvidence,
      certEvidence,
      receivingEvidence,
      stockEvidence,
      certValue,
      receivingValue,
      difference,
      jobs,
      impactedUnits,
      impactedJobCount,
      earliestDue,
      cells,
      options,
      feasibleOptions,
      fastestOption,
      substituteAvailable,
      maxQuantity,
      assumptions: asArray(snapshot.assumptions)
    };
  }

  function stockLabel(model) {
    return model.substitutes.length === 1
      ? `${materialName(model.substitutes[0].materialId)} available`
      : "Verified substitute stock";
  }

  function evidenceTitle(evidence, model) {
    const value = num(evidence?.quantity?.value);
    const shown = value === null ? "not recorded" : `${kit.fmtInt(value)} ${model.unitLabel}`;
    const kind = evidenceKind(evidence);
    if (kind === "cert") return `Certificate says ${shown}`;
    if (kind === "receiving") return `Receiving counted ${shown}`;
    if (kind === "stock") return `${stockLabel(model)}: ${shown}`;
    return `${friendly(evidence?.field, "Record")} recorded ${shown}`;
  }

  function evidenceSub(evidence) {
    const kind = evidenceKind(evidence);
    if (kind === "cert") return "Supplier certificate";
    if (kind === "receiving") return "Receiving count";
    if (kind === "stock") return "Verified substitute stock";
    return friendly(evidence?.documentId, "Source record");
  }

  function barLabel(evidence) {
    const kind = evidenceKind(evidence);
    if (kind === "cert") return "Certificate";
    if (kind === "receiving") return "Receiving count";
    return friendly(evidence?.documentId, "Quantity record");
  }

  function selectionExists(model) {
    if (selected.kind === "evidence") return model.evidence.some((item) => item.evidenceId === selected.id);
    if (selected.kind === "cell") return model.cells.some((item) => item.cellId === selected.id);
    if (selected.kind === "job") return model.jobs.some((item) => item.jobId === selected.id);
    if (selected.kind === "material") return model.materials.some((item) => item.materialId === selected.id);
    return false;
  }

  function ensureSelected(model) {
    if (selectionExists(model)) return;
    const fallback = model.certEvidence || model.receivingEvidence || model.evidence[0] || null;
    if (fallback) selected = { kind: "evidence", id: fallback.evidenceId };
    else if (model.jobs[0]) selected = { kind: "job", id: model.jobs[0].jobId };
    else if (model.cells[0]) selected = { kind: "cell", id: model.cells[0].cellId };
  }

  function linkedKeys(model) {
    const linked = new Set();
    const add = (kind, id) => { if (id) linked.add(`${kind}:${id}`); };
    if (selected.kind === "evidence") {
      const evidence = model.evidence.find((item) => item.evidenceId === selected.id);
      const kind = evidence ? evidenceKind(evidence) : "";
      if (kind === "cert" || kind === "receiving") {
        add("station", "receiving");
        model.jobs.forEach((job) => add("job", job.jobId));
      }
      if (kind === "stock") {
        const substituteIds = model.substitutes.map((material) => material.materialId);
        model.cells
          .filter((cell) => asArray(cell.compatibleMaterials).some((id) => substituteIds.includes(id)))
          .forEach((cell) => add("cell", cell.cellId));
        model.jobs.forEach((job) => add("job", job.jobId));
      }
    }
    if (selected.kind === "cell") {
      const cell = model.cells.find((item) => item.cellId === selected.id);
      model.jobs.filter((job) => job.preferredCellId === selected.id).forEach((job) => add("job", job.jobId));
      if (cell && asArray(cell.compatibleMaterials).includes(model.heldMaterialId)) add("evidence", model.certEvidence?.evidenceId);
      if (cell && model.substitutes.some((material) => asArray(cell.compatibleMaterials).includes(material.materialId))) add("evidence", model.stockEvidence?.evidenceId);
    }
    if (selected.kind === "job") {
      const job = model.jobs.find((item) => item.jobId === selected.id);
      if (job) add("cell", job.preferredCellId);
      add("evidence", model.certEvidence?.evidenceId);
      add("evidence", model.receivingEvidence?.evidenceId);
    }
    if (selected.kind === "material") {
      if (selected.id === model.heldMaterialId) {
        add("station", "receiving");
        model.jobs.forEach((job) => add("job", job.jobId));
      } else {
        model.cells
          .filter((cell) => asArray(cell.compatibleMaterials).includes(selected.id))
          .forEach((cell) => add("cell", cell.cellId));
        model.jobs.forEach((job) => add("job", job.jobId));
      }
    }
    return linked;
  }

  function detailFor(model) {
    if (selected.kind === "evidence") {
      const evidence = model.evidence.find((item) => item.evidenceId === selected.id);
      if (evidence) {
        const kind = evidenceKind(evidence);
        const line = evidence.lineId ? ` on line ${evidence.lineId} in that record` : "";
        const text = kind === "stock"
          ? `${evidenceSub(evidence)} · ${quantityText(evidence, model)} recorded`
          : `${evidenceSub(evidence)} · ${quantityText(evidence, model)} recorded${line}`;
        return { title: evidenceTitle(evidence, model), text, actionLabel: "Open source record" };
      }
    }
    if (selected.kind === "cell") {
      const cell = model.cells.find((item) => item.cellId === selected.id);
      if (cell) {
        const preferredBy = model.jobs.filter((job) => job.preferredCellId === cell.cellId).map((job) => jobName(job.jobId));
        const fits = asArray(cell.compatibleMaterials).map((id) => materialName(id)).join(", ") || "material fit not recorded";
        return {
          title: `${cellName(cell.cellId)} is ${cell.online ? "available" : "offline"}`,
          text: `${kit.fmtHours(kit.openCellHours(cell))} open · fits ${fits}${preferredBy.length ? ` · preferred by ${preferredBy.join(", ")}` : ""}`,
          actionLabel: "View cell details"
        };
      }
    }
    if (selected.kind === "job") {
      const job = model.jobs.find((item) => item.jobId === selected.id);
      if (job) {
        return {
          title: `${jobName(job.jobId)} is waiting on ${materialName(job.materialId || model.heldMaterialId)}`,
          text: `${kit.fmtInt(num(job.unitsRequired) || 0)} parts · ${kit.fmtHours(num(job.totalHours))} of work · due in ${kit.fmtHours(num(job.dueHours))} · via ${cellName(job.preferredCellId)}`,
          actionLabel: "View job details"
        };
      }
    }
    if (selected.kind === "material") {
      const material = model.materials.find((item) => item.materialId === selected.id);
      if (material) {
        const isHeld = material.materialId === model.heldMaterialId;
        return {
          title: isHeld ? `${materialName(material.materialId)} is held` : `${materialName(material.materialId)} can substitute`,
          text: `${kit.fmtInt(num(material.available) || 0)} ${model.unitLabel} available · ${kit.fmtInt(num(material.held) || 0)} held · ${kit.fmtInt(num(material.onHand) || 0)} on hand`,
          actionLabel: isHeld ? "View lot details" : "View stock details"
        };
      }
    }
    return { title: "Finding detail", text: "Select a record, station or job to see the supporting detail.", actionLabel: "View details" };
  }

  function traceSvg(model, linked) {
    if (!model.jobs.length || !model.cells.length) return "";
    const flowCount = model.cells.length + 1;
    const coord = (value) => String(Math.round(value));
    const centerForCell = (cellId) => {
      const cellIndex = model.cells.findIndex((cell) => cell.cellId === cellId);
      const flowIndex = cellIndex >= 0 ? cellIndex + 1 : 0;
      return ((flowIndex + 0.5) / flowCount) * 1000;
    };
    const paths = model.jobs.map((job, index) => {
      const sourceCenter = centerForCell(job.preferredCellId);
      const jobCenter = ((index + 0.5) / model.jobs.length) * 1000;
      const active = (selected.kind === "job" && selected.id === job.jobId)
        || (selected.kind === "cell" && selected.id === job.preferredCellId)
        || (linked && linked.has(`job:${job.jobId}`));
      const path = Math.abs(sourceCenter - jobCenter) < 1
        ? `M ${coord(sourceCenter)} 0 V 20`
        : `M ${coord(sourceCenter)} 0 V 10 H ${coord(jobCenter)} V 20`;
      return `<path class="${active ? "is-active" : ""}" d="${path}" vector-effect="non-scaling-stroke"/>`;
    }).join("");
    return `<div class="elbow findings-trace" aria-hidden="true"><svg viewBox="0 0 1000 20" preserveAspectRatio="none" focusable="false">${paths}</svg></div>`;
  }

  function openEvidence(evidence) {
    if (!evidence) return;
    const model = buildModel();
    kit.openDialog({
      title: model ? evidenceTitle(evidence, model) : "Source record",
      subtitle: "The exact record behind this finding.",
      bodyHtml: `
        ${kit.detailRowsHtml([
          { label: "Document", value: evidence.documentId || "Not recorded" },
          { label: "Record", value: evidence.recordId || "Not recorded" },
          { label: "Line", value: evidence.lineId || "No line in this record" },
          { label: "Field", value: friendly(evidence.field, "Field") },
          { label: "Quantity", value: quantityText(evidence, model) }
        ])}
        ${evidence.excerpt ? `<p class="excerpt">${esc(evidence.excerpt)}</p>` : ""}`,
      actions: [{ label: "Done", variant: "btn-primary", onClick: () => true }]
    });
  }

  function openCell(cell) {
    if (!cell) return;
    const model = buildModel();
    const preferredBy = model ? model.jobs.filter((job) => job.preferredCellId === cell.cellId).map((job) => jobName(job.jobId)) : [];
    kit.openDialog({
      title: cellName(cell.cellId),
      subtitle: cell.online ? "This cell can take work from the current snapshot." : "This cell is offline in the current snapshot.",
      bodyHtml: kit.detailRowsHtml([
        { label: "Available", value: kit.fmtHours(kit.openCellHours(cell)) },
        { label: "Hourly cost", value: kit.fmtMoney(num(cell.hourlyCostUsd)) },
        { label: "Fits materials", value: asArray(cell.compatibleMaterials).map((id) => materialName(id)).join(", ") || "Not recorded" },
        { label: "Waiting jobs", value: preferredBy.length ? preferredBy.join(", ") : "No waiting job prefers this cell" }
      ]),
      actions: [{ label: "Done", variant: "btn-primary", onClick: () => true }]
    });
  }

  function openJob(job) {
    if (!job) return;
    kit.openDialog({
      title: jobName(job.jobId),
      subtitle: "A waiting job traced to the held lot.",
      bodyHtml: kit.detailRowsHtml([
        { label: "Material", value: materialName(job.materialId || "") },
        { label: "Parts required", value: kit.fmtInt(num(job.unitsRequired) || 0) },
        { label: "Work required", value: kit.fmtHours(num(job.totalHours)) },
        { label: "Preferred cell", value: cellName(job.preferredCellId) },
        { label: "Due in", value: kit.fmtHours(num(job.dueHours)) }
      ]),
      actions: [{ label: "Done", variant: "btn-primary", onClick: () => true }]
    });
  }

  function openMaterial(material) {
    if (!material) return;
    const model = buildModel();
    kit.openDialog({
      title: materialName(material.materialId),
      subtitle: model && material.materialId === model.heldMaterialId ? "The held lot in this incident." : "Stock checked for this recovery.",
      bodyHtml: kit.detailRowsHtml([
        { label: "On hand", value: `${kit.fmtInt(num(material.onHand) || 0)} ${material.unit || ""}` },
        { label: "Held", value: `${kit.fmtInt(num(material.held) || 0)} ${material.unit || ""}` },
        { label: "Available", value: `${kit.fmtInt(num(material.available) || 0)} ${material.unit || ""}` },
        { label: "Substitutes", value: asArray(material.substitutes).map((id) => materialName(id)).join(", ") || "None recorded" },
        { label: "Replenishment", value: num(material.replenishmentHours) === null ? "No time recorded in this snapshot" : kit.fmtHours(num(material.replenishmentHours)) },
        { label: "Unit cost", value: kit.fmtMoney(num(material.unitCostUsd)) }
      ]),
      actions: [{ label: "Done", variant: "btn-primary", onClick: () => true }]
    });
  }

  function openSelectedDetail() {
    const model = buildModel();
    if (!model) return;
    if (selected.kind === "evidence") openEvidence(model.evidence.find((item) => item.evidenceId === selected.id));
    else if (selected.kind === "cell") openCell(model.cells.find((item) => item.cellId === selected.id));
    else if (selected.kind === "job") openJob(model.jobs.find((item) => item.jobId === selected.id));
    else if (selected.kind === "material") openMaterial(model.materials.find((item) => item.materialId === selected.id));
  }

  function openFullAnalysis() {
    const model = buildModel();
    if (!model) return;
    const seen = new Set();
    const assumptions = [];
    [...model.assumptions, ...model.options.flatMap((option) => asArray(option.assumptions))].forEach((item) => {
      if (item && !seen.has(item)) { seen.add(item); assumptions.push(item); }
    });
    kit.openDialog({
      title: "Full verified analysis",
      subtitle: "Explained by The Britt with Meta models. Numbers come from plant records, not from the explanation.",
      wide: true,
      bodyHtml: `
        <div class="stack">
          <section>
            <h3 class="dialog-section-title">What was checked</h3>
            ${kit.detailRowsHtml([
              { label: "Source records", value: kit.fmtInt(model.evidence.length) },
              { label: "Jobs traced", value: kit.fmtInt(model.impactedJobCount) },
              { label: "Pieces waiting", value: `${kit.fmtInt(model.impactedUnits)} ${model.unitLabel}` },
              { label: "Fastest feasible path", value: model.fastestOption ? `${optionName(model.fastestOption.optionId)} · ${kit.fmtHours(num(model.fastestOption.finishHours))} · ${kit.fmtMoney(num(model.fastestOption.incrementalCostUsd))}` : "No feasible path in this snapshot" }
            ])}
          </section>
          <section>
            <h3 class="dialog-section-title">Recovery paths from this snapshot</h3>
            ${model.options.length ? ui.table({
              columns: [{ label: "Path" }, { label: "Finish", numeric: true }, { label: "Cost", numeric: true }, { label: "Covers", numeric: true }],
              rows: model.options.map((option) => [
                optionName(option.optionId),
                option.feasible ? kit.fmtHours(num(option.finishHours)) : "Not feasible",
                kit.fmtMoney(num(option.incrementalCostUsd)),
                `${kit.fmtInt(num(option.impactedUnits) || 0)} ${model.unitLabel}`
              ])
            }) : ui.emptyState({ title: "No recovery paths yet", text: "Paths appear after the analysis answers.", compact: true })}
          </section>
          ${assumptions.length ? `<section><h3 class="dialog-section-title">Assumptions behind the numbers</h3>${ui.listRows(assumptions.map((item) => ({ text: item })))}</section>` : ""}
        </div>`,
      actions: [{ label: "Done", variant: "btn-primary", onClick: () => true }]
    });
  }

  function openFastestPreview() {
    const model = buildModel();
    const option = model?.fastestOption;
    if (!model || !option) return;
    const name = optionName(option.optionId);
    const assumptions = asArray(option.assumptions);
    const constraints = asArray(option.constraints);
    const evidenceTitles = asArray(option.evidenceIds).map((id) => {
      const evidence = model.evidence.find((item) => item.evidenceId === id);
      return evidence ? evidenceTitle(evidence, model) : friendly(id, "Source record");
    });
    kit.openDialog({
      title: `${name} preview`,
      subtitle: "Fastest feasible path from the current snapshot. Nothing moves until you decide on the next step.",
      bodyHtml: `
        ${kit.detailRowsHtml([
          { label: "Finish", value: kit.fmtHours(num(option.finishHours)) },
          { label: "Added cost", value: kit.fmtMoney(num(option.incrementalCostUsd)) },
          { label: "Pieces covered", value: `${kit.fmtInt(num(option.impactedUnits) || 0)} ${model.unitLabel}` }
        ])}
        ${assumptions.length ? `<section><h3 class="dialog-section-title">Assumptions behind this estimate</h3>${ui.listRows(assumptions.map((item) => ({ text: item })))}</section>` : ""}
        ${constraints.length ? `<section><h3 class="dialog-section-title">Limits from the records</h3>${ui.listRows(constraints.map((item) => ({ text: item })))}</section>` : ""}
        ${evidenceTitles.length ? `<section><h3 class="dialog-section-title">Records behind this path</h3>${ui.listRows(evidenceTitles.map((item) => ({ text: item })))}</section>` : ""}`,
      actions: [
        { label: "Back", variant: "btn-secondary", onClick: () => true },
        {
          label: "Compare recovery paths", variant: "btn-primary",
          onClick: async () => { await continueToDecision(); return true; }
        }
      ]
    });
  }

  async function continueToDecision() {
    if (advancing) return false;
    advancing = true;
    const button = root.querySelector("[data-primary]");
    const restore = button ? button.innerHTML : "";
    if (button) {
      button.disabled = true;
      button.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span><span>Checking records</span>`;
    }
    try {
      const workflow = await kit.api.workflowStatus();
      const analysis = workflow?.analysis;
      if (workflow) kit.state.workflow = workflow;
      if (analysis) kit.state.analysis = analysis;
      advancing = false;
      kit.go("decision");
      return true;
    } catch {
      advancing = false;
      if (button && root.contains(button)) {
        button.disabled = false;
        button.innerHTML = restore;
      }
      kit.toast("Recovery paths could not be checked", {
        text: "Your verified findings are still on screen. Try again when the records answer.",
        actionLabel: "Retry",
        onAction: () => continueToDecision()
      });
      return false;
    }
  }

  function registerCommands(model) {
    if (!model) {
      kit.setPageCommands([
        { title: "Check plant records again", hint: "Reload the verified findings", run: () => loadData() },
        { title: "Back to incident", hint: "Return to the held lot summary", run: () => kit.go("incident") }
      ]);
      return;
    }
    kit.setPageCommands([
      { title: "Compare recovery paths", hint: "Check the latest records, then open Decision", run: () => continueToDecision() },
      ...(model.fastestOption ? [{
        title: `Preview ${optionName(model.fastestOption.optionId)}`,
        hint: `${kit.fmtHours(num(model.fastestOption.finishHours))} · ${kit.fmtMoney(num(model.fastestOption.incrementalCostUsd))} from the current snapshot`,
        run: () => openFastestPreview()
      }] : []),
      { title: "Open full analysis", hint: "Paths, assumptions and checked records in one place", run: () => openFullAnalysis() },
      { title: "Open full plant view", hint: "Stations, capacity and waiting jobs", run: () => kit.go("shop") },
      ...model.evidence.map((evidence) => ({
        title: `Open ${evidenceTitle(evidence, model)}`,
        hint: "Source record behind this finding",
        run: () => openEvidence(evidence)
      })),
      { title: "Back to incident", hint: "Return to the held lot summary", run: () => kit.go("incident") }
    ]);
  }

  async function loadData() {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      const result = await kit.refreshData({ notifyOnError: false });
      loadFailed = !result.ok;
      return result;
    })()
      .catch(() => { loadFailed = true; return { ok: false }; })
      .finally(() => {
        loadPromise = null;
        if (!disposed) draw(true);
      });
    return loadPromise;
  }

  function signatureFor(model) {
    return model
      ? `${model.snapshot.snapshotDigest || ""}:${kit.state.connection}:${selected.kind}:${selected.id}`
      : `empty:${kit.state.connection}:${loadFailed ? "failed" : "waiting"}`;
  }

  function bindDraw() {
    const back = root.querySelector("[data-back]");
    if (back) back.addEventListener("click", () => kit.go("incident"));
    const shop = root.querySelector("[data-open-shop]");
    if (shop) shop.addEventListener("click", () => kit.go("shop"));
    const primary = root.querySelector("[data-primary]");
    if (primary) primary.addEventListener("click", () => continueToDecision());
    const readFull = root.querySelector("[data-read-full]");
    if (readFull) readFull.addEventListener("click", () => openFullAnalysis());
    const previewFastest = root.querySelector("[data-preview-fastest]");
    if (previewFastest) previewFastest.addEventListener("click", () => openFastestPreview());
    const detailAction = root.querySelector("[data-detail-action]");
    if (detailAction) detailAction.addEventListener("click", () => openSelectedDetail());
    root.querySelectorAll("[data-retry]").forEach((button) => button.addEventListener("click", () => {
      loadFailed = false;
      draw(true);
      loadData();
    }));
    const selectables = Array.from(root.querySelectorAll("[data-select-kind]"));
    selectables.forEach((button, index) => {
      button.addEventListener("click", () => {
        selected = { kind: button.dataset.selectKind, id: button.dataset.selectId };
        draw(true);
        const next = Array.from(root.querySelectorAll("[data-select-kind]"))[index];
        if (next) next.focus({ preventScroll: true });
      });
    });
    root.querySelectorAll("[data-select-kind]").forEach((element) => {
      if (element.dataset.selectKind === selected.kind && element.dataset.selectId === selected.id) {
        element.classList.add("is-selected");
      }
    });
    ui.applyMetrics(root);
  }

  function drawLoading() {
    kit.setAgentStatus("Checking records");
    registerCommands(null);
    root.innerHTML = `
      <div class="findings-wrap">
        <header class="findings-head">
          <div>
            <p class="eyebrow"><span class="status-dot" aria-hidden="true"></span>${esc(connectionLabel())}</p>
            <h1 class="page-title">Checking the source records against the waiting jobs.</h1>
            <p class="page-sub">Findings appear after the plant records answer.</p>
          </div>
          <div class="action-stack">
            <div class="action-row">
              <button class="btn btn-soft" type="button" data-back>Back to incident</button>
              <button class="btn btn-primary" type="button" disabled><span>Checking records</span></button>
            </div>
            <p class="primary-helper"><span class="helper-dot is-held" aria-hidden="true"></span>Nothing is shown until a record supports it</p>
          </div>
        </header>
        <div class="findings-grid">
          <section class="panel findings-main-panel">
            <h2 class="card-title">Verified findings</h2>
            <div class="stack">${ui.skeletonCards(3)}</div>
          </section>
          <div class="findings-aside">
            <section class="side-card"><h2 class="side-title">Impact at a glance</h2><div class="stack">${ui.skeletonCards(1)}</div></section>
            <section class="side-card is-grow"><h2 class="side-title">The Britt's summary</h2>${ui.loadingRow("Checking the source records.")}</section>
          </div>
        </div>
      </div>`;
    bindDraw();
  }

  function drawFailed() {
    kit.setAgentStatus("Records need attention");
    registerCommands(null);
    root.innerHTML = `
      <div class="findings-wrap">
        <header class="findings-head">
          <div>
            <p class="eyebrow"><span class="status-dot is-danger" aria-hidden="true"></span>${esc(connectionLabel())}</p>
            <h1 class="page-title">The source records could not be reached.</h1>
            <p class="page-sub">No findings are shown without a supporting record.</p>
          </div>
          <div class="action-stack">
            <div class="action-row">
              <button class="btn btn-soft" type="button" data-back>Back to incident</button>
              <button class="btn btn-primary" type="button" data-retry><span>Check records again</span>${ui.icon("arrow")}</button>
            </div>
            <p class="primary-helper"><span class="helper-dot is-held" aria-hidden="true"></span>Try again when the connection answers</p>
          </div>
        </header>
        <div class="findings-grid">
          <section class="panel findings-main-panel">
            ${ui.emptyState({
              title: "Plant records could not be reached",
              text: "The findings have not changed. Check the connection, then try again.",
              actionLabel: "Retry",
              actionAttrs: "data-retry"
            })}
          </section>
          <div class="findings-aside">
            <section class="side-card is-grow">
              <h2 class="side-title">Source records checked</h2>
              <p class="card-desc">Records will appear here after the check answers.</p>
            </section>
          </div>
        </div>
      </div>`;
    bindDraw();
  }

  function draw(force) {
    const model = buildModel();
    if (!model) {
      const signature = signatureFor(null);
      if (!force && signature === lastSignature) return;
      lastSignature = signature;
      if (loadFailed) drawFailed(); else drawLoading();
      return;
    }
    ensureSelected(model);
    const signature = signatureFor(model);
    if (!force && signature === lastSignature) return;
    lastSignature = signature;

    const linked = linkedKeys(model);
    const detail = detailFor(model);
    const connected = kit.state.connection === "connected";
    const offline = kit.state.connection === "offline";
    const heldName = materialName(model.heldMaterialId);
    const title = model.difference !== null
      ? `Records disagree by ${kit.fmtInt(model.difference)} pieces, and ${kit.fmtInt(model.impactedUnits)} pieces are waiting.`
      : "The source records were checked against the waiting jobs.";
    const helper = offline
      ? "Showing the last checked findings · nothing approved yet"
      : "The Britt checked the records · nothing approved yet";
    const quantityHint = model.maxQuantity
      ? `Bars share one scale to ${kit.fmtInt(model.maxQuantity)} ${model.unitLabel}`
      : "The records behind the hold";
    const fastestName = model.fastestOption ? optionName(model.fastestOption.optionId) : "";
    const previewLabel = fastestName
      ? `Preview ${fastestName.charAt(0).toLowerCase()}${fastestName.slice(1)}`
      : "";

    const quantityBars = model.quantityEvidence.map((evidence) => {
      const value = num(evidence.quantity?.value) || 0;
      const percent = model.maxQuantity ? (value / model.maxQuantity) * 100 : 0;
      return ui.metricBar({
        label: barLabel(evidence),
        value: percent,
        displayValue: kit.fmtInt(value),
        tone: evidenceKind(evidence) === "cert" ? "is-cert" : "is-recv",
        attrs: `data-select-kind="evidence" data-select-id="${esc(evidence.evidenceId)}"`,
        ariaLabel: `${barLabel(evidence)}: ${kit.fmtInt(value)} ${model.unitLabel}. Select to see the supporting detail.`
      });
    }).join("");

    const factTargets = [];
    if (model.difference !== null && model.certEvidence) {
      factTargets.push({ label: "Records disagree", value: `${kit.fmtInt(model.difference)} ${model.unitLabel}`, kind: "evidence", id: model.certEvidence.evidenceId });
    }
    if (model.substitutes.length) {
      const target = model.stockEvidence
        ? { kind: "evidence", id: model.stockEvidence.evidenceId }
        : { kind: "material", id: model.substitutes[0].materialId };
      factTargets.push({ label: stockLabel(model), value: `${kit.fmtInt(model.substituteAvailable)} ${model.unitLabel}`, ...target });
    }
    if (model.jobs.length) {
      factTargets.push({ label: "Waiting work traced", value: `${kit.fmtInt(model.impactedUnits)} ${model.unitLabel}`, kind: "job", id: model.jobs[0].jobId });
    }
    const facts = factTargets.map((fact) => `
      <button class="fact-row findings-fact${selected.kind === fact.kind && selected.id === fact.id ? " is-selected" : ""}" type="button" data-select-kind="${esc(fact.kind)}" data-select-id="${esc(fact.id)}">
        <span class="findings-fact-icon">${ui.icon("check")}</span>
        <span class="findings-fact-label">${esc(fact.label)}</span>
        <b>${esc(fact.value)}</b>
      </button>`).join("");

    const receivingStation = ui.station({
      name: "Receiving",
      detail: `${heldName} lot · held before release`,
      status: "On hold",
      tone: "is-held",
      selected: selected.kind === "material" && selected.id === model.heldMaterialId,
      linked: linked.has("station:receiving"),
      attrs: `data-select-kind="material" data-select-id="${esc(model.heldMaterialId)}"`
    });
    const flowParts = [receivingStation];
    model.cells.forEach((cell, index) => {
      flowParts.push(ui.connector(index === 0 ? "is-held" : (cell.online ? "" : "is-stopped")));
      const fits = asArray(cell.compatibleMaterials).map((id) => materialName(id)).join(", ") || "material fit not recorded";
      flowParts.push(ui.station({
        name: cellName(cell.cellId),
        detail: `${kit.fmtHours(kit.openCellHours(cell))} open · fits ${fits}`,
        status: cell.online ? "Available" : "Offline",
        tone: cell.online ? "is-ok" : "is-danger",
        selected: selected.kind === "cell" && selected.id === cell.cellId,
        linked: linked.has(`cell:${cell.cellId}`),
        attrs: `data-select-kind="cell" data-select-id="${esc(cell.cellId)}"`
      }));
    });

    const jobCards = model.jobs.map((job) => `
      <button class="job-card${selected.kind === "job" && selected.id === job.jobId ? " is-selected" : ""}${linked.has(`job:${job.jobId}`) ? " is-linked" : ""}" type="button" data-select-kind="job" data-select-id="${esc(job.jobId)}">
        <span class="job-main">
          <span class="job-name">${esc(jobName(job.jobId))}</span>
          <span class="job-detail">${esc(`${kit.fmtInt(num(job.unitsRequired) || 0)} parts · due in ${kit.fmtHours(num(job.dueHours))} · via ${cellName(job.preferredCellId)}`)}</span>
        </span>
        ${ui.pill("At risk", "is-held")}
      </button>`).join("");

    const sourceRows = model.evidence.map((evidence) => `
      <button class="fact-row findings-source${selected.kind === "evidence" && selected.id === evidence.evidenceId ? " is-selected" : ""}${linked.has(`evidence:${evidence.evidenceId}`) ? " is-linked" : ""}" type="button" data-select-kind="evidence" data-select-id="${esc(evidence.evidenceId)}">
        <span class="findings-source-label">${esc(evidenceTitle(evidence, model))}</span>
        <span class="ev-chevron">${ui.icon("chevron")}</span>
      </button>`).join("");

    const agentRowsHtml = [
      model.difference !== null && model.certEvidence && model.receivingEvidence
        ? ui.agentRow("Verified fact", "is-fact", `<b>${esc(kit.fmtInt(model.certValue || 0))} against ${esc(kit.fmtInt(model.receivingValue || 0))}</b> — records differ by ${esc(kit.fmtInt(model.difference))} ${esc(model.unitLabel)}.`)
        : ui.agentRow("Verified fact", "is-fact", `<b>${esc(kit.fmtInt(model.impactedJobCount))} jobs</b> traced to the held lot.`),
      model.fastestOption
        ? ui.agentRow("Estimate", "is-estimate", `<b>${esc(optionName(model.fastestOption.optionId))}:</b> <span class="findings-keep">${esc(kit.fmtHours(num(model.fastestOption.finishHours)))} · ${esc(kit.fmtMoney(num(model.fastestOption.incrementalCostUsd)))}</span>`)
        : ui.agentRow("Estimate", "is-estimate", "Timing appears after a feasible path is calculated."),
      ui.agentRow("Suggestion", "is-suggestion", "Compare recovery paths next.")
    ].join("");

    kit.setAgentStatus("Findings verified");
    registerCommands(model);

    root.innerHTML = `
      <div class="findings-wrap">
        <header class="findings-head">
          <div>
            <p class="eyebrow"><span class="status-dot${connected ? " is-ok" : ""}${offline ? " is-danger" : ""}" aria-hidden="true"></span>${esc(connectionLabel())}</p>
            <h1 class="page-title">${esc(title)}</h1>
            <p class="page-sub">Source records checked against waiting jobs on one snapshot.</p>
          </div>
          <div class="action-stack">
            <div class="action-row">
              <button class="btn btn-soft" type="button" data-back>Back to incident</button>
              <button class="btn btn-primary" type="button" data-primary><span>Compare recovery paths</span>${ui.icon("arrow")}</button>
            </div>
            <p class="primary-helper"><span class="helper-dot${offline ? " is-held" : ""}" aria-hidden="true"></span>${esc(helper)}</p>
          </div>
        </header>

        <div class="findings-grid">
          <section class="panel findings-main-panel" aria-label="Verified findings">
            <div class="card-head">
              <div>
                <h2 class="card-title">Verified findings</h2>
                <p class="card-desc">Select a record, station or job to see the supporting detail.</p>
              </div>
              ${model.difference !== null ? ui.pill(`${kit.fmtInt(model.difference)} short · does not match`, "is-danger") : ui.pill("Records checked", "is-ok")}
            </div>

            <div class="panel-inset findings-quantity">
              <div class="findings-section-row">
                <span class="section-label">Quantity check</span>
                <span class="section-hint">${esc(quantityHint)}</span>
              </div>
              <div class="stack-sm">${quantityBars}</div>
            </div>

            <div class="findings-facts" aria-label="Verified findings">${facts}</div>

            <div class="findings-section-row">
              <span class="section-label">How this lot moves through the plant</span>
              <button class="btn btn-ghost btn-small" type="button" data-open-shop>Open full plant view</button>
            </div>
            <div class="flow">${flowParts.join("")}</div>

            <div class="findings-section-row">
              <span class="section-label">Orders waiting on this lot</span>
              <span class="section-hint">${esc(`Waiting on ${heldName}`)}</span>
            </div>
            ${traceSvg(model, linked)}
            <div class="findings-jobs" aria-label="Orders waiting on this lot">${jobCards}</div>

            <div class="panel-inset findings-detail">
              <div class="findings-detail-main">
                <span class="findings-detail-title">${esc(detail.title)}</span>
                <span class="findings-detail-text">${esc(detail.text)}</span>
              </div>
              <button class="btn btn-ghost findings-detail-action" type="button" data-detail-action>${esc(detail.actionLabel)}</button>
            </div>
          </section>

          <aside class="findings-aside" aria-label="Impact and source records">
            ${ui.sideCard({
              title: "Impact at a glance",
              className: "findings-impact",
              body: ui.stats([
                { value: kit.fmtInt(model.impactedUnits), label: "Pieces at risk" },
                { value: kit.fmtInt(model.impactedJobCount), label: "Orders affected" },
                { value: model.earliestDue === null ? "Pending" : kit.fmtHours(model.earliestDue), label: "First due in" }
              ])
            })}
            ${ui.sideCard({
              title: "Source records checked",
              body: `<div class="findings-source-list">${sourceRows}</div>`
            })}
            <section class="side-card is-grow findings-agent">
              <div class="findings-agent-head">
                <h2 class="side-title">The Britt's summary</h2>
                <button class="btn btn-ghost btn-small" type="button" data-read-full>Full analysis</button>
              </div>
              <div class="agent-rows">${agentRowsHtml}</div>
              ${model.fastestOption ? `<button class="btn btn-secondary btn-small btn-wide findings-preview" type="button" data-preview-fastest>${esc(previewLabel)}</button>` : ""}
            </section>
          </aside>
        </div>
      </div>`;
    bindDraw();
  }

  draw();
  if (!buildModel()) loadData();
  const unsubscribe = kit.subscribe(() => {
    if (!disposed && !advancing) draw();
  });

  return () => {
    disposed = true;
    unsubscribe();
    kit.clearPageCommands();
    kit.setAgentStatus("Ready now");
  };
}