export async function render(root, kit) {
  const ui = kit.ui;
  const esc = kit.esc;

  let selectedOptionId = "";
  let selectedJobId = "";
  let selectedCellId = "";
  let busy = false;
  let failed = false;

  try {
    if (!kit.state.analysis || !kit.state.workflow) {
      await kit.refreshData({ notifyOnError: false });
    }
  } catch {
    failed = false;
  }

  function finiteNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function readData() {
    const workflow = kit.state.workflow || {};
    const analysis = kit.state.analysis || workflow.analysis || {};
    const snapshot = workflow.snapshot || analysis.snapshot || {};
    const recovery = analysis.recovery || {};
    const impacted = analysis.impacted || recovery.impacted || {};
    const jobsRaw = impacted.jobs || (recovery.impacted && recovery.impacted.jobs) || snapshot.jobs || [];
    const jobs = (Array.isArray(jobsRaw) ? jobsRaw : []).map((job) => ({
      ...job,
      jobId: job.jobId || job.id || "",
      materialId: job.materialId || "",
      preferredCellId: job.preferredCellId || job.cellId || ""
    })).filter((job) => job.jobId);
    const cells = (Array.isArray(snapshot.cells) ? snapshot.cells : []).map((cell) => ({
      ...cell,
      cellId: cell.cellId || cell.id || cell.machineId || ""
    })).filter((cell) => cell.cellId);
    const materials = (Array.isArray(snapshot.materials) ? snapshot.materials : []).map((material) => ({
      ...material,
      materialId: material.materialId || material.id || ""
    })).filter((material) => material.materialId);
    const options = (Array.isArray(recovery.options) ? recovery.options : (Array.isArray(analysis.options) ? analysis.options : [])).map((option) => ({
      ...option,
      optionId: option.optionId || option.id || ""
    })).filter((option) => option.optionId);
    const evidence = Array.isArray(snapshot.evidenceRecords) ? snapshot.evidenceRecords : (Array.isArray(snapshot.evidence) ? snapshot.evidence : []);
    const incident = analysis.incident || snapshot.incident || (kit.state.scenario && kit.state.scenario.incident) || {};
    const heldMaterialId = incident.heldMaterialId || (jobs[0] && jobs[0].materialId) || "";
    const impactedUnitsValue = finiteNumber(impacted.impactedUnits ?? (recovery.impacted && recovery.impacted.impactedUnits));
    const impactedUnits = impactedUnitsValue === null
      ? jobs.reduce((sum, job) => sum + (finiteNumber(job.unitsRequired) || 0), 0)
      : impactedUnitsValue;

    return { workflow, analysis, snapshot, recovery, impacted, jobs, cells, materials, options, evidence, incident, heldMaterialId, impactedUnits };
  }

  function optionId(option) {
    return String((option && option.optionId) || "");
  }

  function optionKey(option) {
    return optionId(option).toLowerCase();
  }

  function optionName(option) {
    if (!option) return "No path selected";
    const key = optionKey(option);
    if (key.includes("wait")) return "Wait for replenishment";
    if (key.includes("split")) return "Split available capacity";
    if (key.includes("substitute")) return "Use verified substitute";
    if (key.includes("expedite")) return "Expedite replacement";
    return kit.friendlyName(optionId(option), "Recovery path");
  }

  function optionMeaning(option) {
    if (!option) return "Calculated from the current records.";
    const key = optionKey(option);
    if (key.includes("wait")) return "Wait for a new lot.";
    if (key.includes("split")) return "Split jobs across available cells.";
    if (key.includes("substitute")) return "Run jobs on verified substitute.";
    if (key.includes("expedite")) return "Bring the replacement lot in sooner.";
    const constraint = Array.isArray(option.constraints) ? option.constraints[0] : "";
    return constraint || "Calculated from the current records.";
  }

  function optionUsesSubstitute(option) {
    const key = optionKey(option);
    return key.includes("substitute") || key.includes("split");
  }

  function isSplitOption(option) {
    return optionKey(option).includes("split");
  }

  function recommendedOptionId(data) {
    const flagged = data.options.find((option) => option.recommended || option.isRecommended || option.selected || option.isChosen);
    if (flagged) return optionId(flagged);
    const feasible = data.options.filter((option) => option.feasible !== false);
    if (!feasible.length) return data.options[0] ? optionId(data.options[0]) : "";
    return optionId(feasible.reduce((best, current) => {
      const bestFinish = finiteNumber(best.finishHours);
      const currentFinish = finiteNumber(current.finishHours);
      if (currentFinish !== null && (bestFinish === null || currentFinish < bestFinish)) return current;
      return best;
    }, feasible[0]));
  }

  function defaultOptionId(data) {
    const pending = Array.isArray(data.workflow.pendingConsents) ? data.workflow.pendingConsents : [];
    const candidates = [
      kit.state.replanChoice && kit.state.replanChoice.optionId,
      kit.state.decision && (kit.state.decision.optionId || kit.state.decision.selectedOptionId),
      kit.state.selectedOptionId,
      data.workflow.decision && (data.workflow.decision.optionId || data.workflow.decision.selectedOptionId),
      data.workflow.acceptedOptionId,
      data.workflow.board && data.workflow.board.optionId,
      ...pending.map((item) => item && (item.optionId || item.strategyId || item.selectedOptionId))
    ];
    for (const candidate of candidates) {
      if (candidate && data.options.some((option) => optionId(option) === String(candidate))) return String(candidate);
    }
    return recommendedOptionId(data);
  }

  function effectiveMaterial(job, data, useSubstitute) {
    const material = data.materials.find((item) => item.materialId === job.materialId);
    const substituteId = material && Array.isArray(material.substitutes) ? material.substitutes[0] : "";
    if (useSubstitute && substituteId) return substituteId;
    return job.materialId;
  }

  function buildPlan(data, option) {
    const sortedJobs = [...data.jobs].sort((a, b) => {
      const aDue = finiteNumber(a.dueHours);
      const bDue = finiteNumber(b.dueHours);
      const aValue = aDue === null ? Number.POSITIVE_INFINITY : aDue;
      const bValue = bDue === null ? Number.POSITIVE_INFINITY : bDue;
      return aValue - bValue || String(a.jobId).localeCompare(String(b.jobId));
    });
    const loads = new Map(data.cells.map((cell) => [cell.cellId, 0]));
    const useSubstitute = optionUsesSubstitute(option);
    const waitOption = optionKey(option).includes("wait");

    const assignments = sortedJobs.map((job, index) => {
      const directHours = finiteNumber(job.totalHours);
      const units = finiteNumber(job.unitsRequired);
      const hoursPerUnit = finiteNumber(job.hoursPerUnit);
      const hours = directHours === null ? ((units || 0) * (hoursPerUnit || 0)) : directHours;
      const materialId = effectiveMaterial(job, data, useSubstitute);
      let candidates = data.cells.filter((cell) => {
        if (cell.online === false) return false;
        if (!Array.isArray(cell.compatibleMaterials) || !cell.compatibleMaterials.length) return true;
        return cell.compatibleMaterials.includes(materialId);
      });
      if (!candidates.length) candidates = data.cells.filter((cell) => cell.cellId === job.preferredCellId);
      if (!candidates.length) candidates = data.cells.filter((cell) => cell.online !== false);

      let cell = null;
      if (candidates.length) {
        if (isSplitOption(option)) {
          cell = candidates.reduce((best, candidate) => {
            if (!best) return candidate;
            const bestFinish = (loads.get(best.cellId) || 0) + hours;
            const candidateFinish = (loads.get(candidate.cellId) || 0) + hours;
            if (candidateFinish < bestFinish) return candidate;
            if (candidateFinish === bestFinish && candidate.cellId === job.preferredCellId) return candidate;
            return best;
          }, null);
        } else {
          cell = candidates.find((candidate) => candidate.cellId === job.preferredCellId) || candidates[0];
        }
      }

      const previousLoad = cell ? (loads.get(cell.cellId) || 0) : 0;
      const finish = previousLoad + hours;
      if (cell) loads.set(cell.cellId, finish);
      const capacity = cell ? finiteNumber(cell.availableHours) : null;
      const due = finiteNumber(job.dueHours);
      const capacityShort = capacity !== null && finish > capacity;

      let statusText = "On plan";
      let statusTone = "is-ok";
      if (waitOption) {
        statusText = "Waiting for lot";
        statusTone = "is-held";
      } else if (!cell) {
        statusText = "No cell listed";
        statusTone = "is-danger";
      } else if (capacityShort) {
        statusText = "Over capacity";
        statusTone = "is-danger";
      } else if (due !== null && finish > due) {
        statusText = "Due at risk";
        statusTone = "is-held";
      }

      return { job, sequence: index + 1, hours, materialId, cell, finish, statusText, statusTone };
    });

    const totalWork = assignments.reduce((sum, assignment) => sum + assignment.hours, 0);
    const totalOpen = data.cells.reduce((sum, cell) => sum + (finiteNumber(cell.availableHours) || 0), 0);
    return { assignments, loads, totalWork, totalOpen, leftHours: totalOpen - totalWork };
  }

  function cellDetail(cell, plan) {
    const available = finiteNumber(cell.availableHours);
    if (available === null) {
      const compatible = Array.isArray(cell.compatibleMaterials)
        ? cell.compatibleMaterials.map((item) => kit.friendlyName(item, "Material")).join(" or ")
        : "";
      return compatible ? `${compatible} work` : "Capacity from current records";
    }
    const load = plan.loads.get(cell.cellId) || 0;
    return `${kit.fmtHours(available)} open · ${kit.fmtHours(available - load)} left after plan`;
  }

  function cellStatus(cell, plan) {
    if (cell.online === false) return { text: "Offline", tone: "is-danger" };
    const available = finiteNumber(cell.availableHours);
    const load = plan.loads.get(cell.cellId) || 0;
    if (available !== null && load > available) return { text: "Over capacity", tone: "is-danger" };
    return { text: "Available", tone: "is-ok" };
  }

  function loadPercent(cell, plan) {
    const available = finiteNumber(cell.availableHours);
    if (available === null || available <= 0) return 0;
    return ((plan.loads.get(cell.cellId) || 0) / available) * 100;
  }

  function evidenceTitle(record) {
    const key = String((record && (record.evidenceId || record.documentId)) || "").toLowerCase();
    if (key.includes("cert")) return "Certificate quantity";
    if (key.includes("recv") || key.includes("receiv")) return "Receiving quantity";
    if (key.includes("sub") || key.includes("stock")) return "Substitute stock";
    return kit.friendlyName((record && (record.evidenceId || record.documentId)) || "", "Source record");
  }

  function evidenceValue(record) {
    if (record && record.excerpt) return String(record.excerpt);
    const quantity = record && record.quantity;
    if (quantity && quantity.value !== undefined) {
      return `${kit.friendlyName(record.field || "", "Quantity")} ${quantity.value} ${quantity.unit || ""}`.trim();
    }
    return kit.friendlyName((record && record.documentId) || "", "Source record");
  }

  function openRecords() {
    const data = readData();
    if (!data.evidence.length) {
      kit.toast("No source records are listed", {
        text: "The current snapshot does not include source records for this plan."
      });
      return;
    }
    const rows = data.evidence.map((record) => ({
      label: evidenceTitle(record),
      value: evidenceValue(record)
    }));
    kit.openDialog({
      title: "Records used for this replan",
      subtitle: "Source records behind the numbers on this screen.",
      bodyHtml: kit.detailRowsHtml(rows),
      actions: [
        { label: "Close", variant: "btn-secondary", onClick: () => true }
      ]
    });
  }

  function checksHtml(data, option, plan) {
    const rows = [];
    if (data.cells.length) {
      rows.push({
        label: "Planned work",
        value: `${kit.fmtHours(plan.totalWork)} of ${kit.fmtHours(plan.totalOpen)} open`
      });
    }

    const heldMaterial = data.materials.find((item) => item.materialId === data.heldMaterialId);
    const substituteId = heldMaterial && Array.isArray(heldMaterial.substitutes) ? heldMaterial.substitutes[0] : "";
    const substituteMaterial = substituteId ? data.materials.find((item) => item.materialId === substituteId) : null;
    if (optionUsesSubstitute(option) && substituteMaterial) {
      const available = finiteNumber(substituteMaterial.available ?? substituteMaterial.onHand);
      rows.push({
        label: `${kit.friendlyName(substituteMaterial.materialId, "Substitute")} stock`,
        value: available === null ? "Stock listed" : `${kit.fmtInt(available)} available`
      });
    } else if (heldMaterial) {
      rows.push({
        label: `${kit.friendlyName(heldMaterial.materialId, "Held material")} lot`,
        value: "On hold"
      });
    }

    if (!rows.length) return "";
    return `<div class="replan-checks">
      <div class="section-label-row"><span class="section-label">Before this plan moves</span></div>
      <div>${ui.statRows(rows)}</div>
    </div>`;
  }

  function stationHtml({ name, detail, status, tone, selected, linked, attrs }) {
    return `<button class="station plant-node${selected ? " is-selected" : ""}${linked ? " is-linked" : ""}" type="button" ${attrs} aria-pressed="${selected}">
      <span class="station-top plant-node-top"><span class="station-name plant-node-name">${esc(name)}</span>${ui.pill(status, tone)}</span>
      <span class="station-detail plant-node-detail">${esc(detail)}</span>
    </button>`;
  }

  function paint(focusSelector = "") {
    const data = readData();
    if (!data.options.some((option) => optionId(option) === selectedOptionId)) {
      selectedOptionId = defaultOptionId(data);
    }
    const option = data.options.find((item) => optionId(item) === selectedOptionId) || null;
    const recommendedId = recommendedOptionId(data);
    const plan = buildPlan(data, option);

    if (!plan.assignments.some((assignment) => String(assignment.job.jobId) === selectedJobId)) {
      selectedJobId = plan.assignments[0] ? String(plan.assignments[0].job.jobId) : "";
    }
    const selectedAssignment = plan.assignments.find((assignment) => String(assignment.job.jobId) === selectedJobId) || null;
    if (selectedCellId !== "receiving" && !data.cells.some((cell) => cell.cellId === selectedCellId)) {
      selectedCellId = (selectedAssignment && selectedAssignment.cell && selectedAssignment.cell.cellId) || (data.cells[0] && data.cells[0].cellId) || "";
    }

    const connectionText = kit.state.connection === "connected"
      ? "Plant records connected"
      : kit.state.connection === "offline" ? "Records could not be reached" : "Checking plant records";
    const heldMaterial = data.materials.find((item) => item.materialId === data.heldMaterialId);
    const heldCount = heldMaterial ? finiteNumber(heldMaterial.held ?? heldMaterial.onHand) : null;
    const receivingDetail = heldMaterial
      ? `${kit.friendlyName(heldMaterial.materialId, "Held material")} lot · ${heldCount === null ? "held before release" : `${kit.fmtInt(heldCount)} pieces held`}`
      : `${kit.friendlyName(data.heldMaterialId, "Held material")} lot · held before release`;

    const stations = [];
    if (data.heldMaterialId || heldMaterial) {
      stations.push(stationHtml({
        name: "Receiving",
        detail: receivingDetail,
        status: "On hold",
        tone: "is-held",
        selected: selectedCellId === "receiving",
        linked: false,
        attrs: 'data-receiving-station="true"'
      }));
    }
    data.cells.forEach((cell) => {
      const status = cellStatus(cell, plan);
      stations.push(stationHtml({
        name: kit.friendlyName(cell.cellId, "Cell"),
        detail: cellDetail(cell, plan),
        status: status.text,
        tone: status.tone,
        selected: selectedCellId === cell.cellId,
        linked: Boolean(selectedAssignment && selectedAssignment.cell && selectedAssignment.cell.cellId === cell.cellId && selectedCellId !== cell.cellId),
        attrs: `data-cell-station="${esc(cell.cellId)}"`
      }));
    });
    const flowHtml = stations.map((html, index) => index ? `${ui.connector(index === 1 ? "is-held" : "")}${html}` : html).join("");

    const optionsHtml = data.options.length ? `
      <div class="replan-options">
        ${data.options.map((item) => {
          const selected = optionId(item) === selectedOptionId;
          const feasible = item.feasible !== false;
          const recommended = optionId(item) === recommendedId;
          const detail = feasible ? optionMeaning(item) : (item.rejectReason || "Not feasible on the current records.");
          const covers = finiteNumber(item.impactedUnits ?? data.impactedUnits);
          const badge = !feasible ? ui.pill("Not feasible", "is-danger") : recommended ? '<span class="pill is-rec">Recommended</span>' : "";
          return `
            <button class="option-card replan-option${selected ? " is-selected" : ""}${feasible ? "" : " is-infeasible"}" type="button" data-option-id="${esc(optionId(item))}" aria-pressed="${selected}"${!feasible || busy ? " disabled" : ""}>
              <span class="option-top"><span class="option-name">${esc(optionName(item))}</span>${badge}</span>
              <span class="replan-option-meaning">${esc(detail)}</span>
              <span class="replan-option-facts">
                <span class="replan-option-fact"><b>${esc(kit.fmtHours(item.finishHours))}</b><span>finish</span></span>
                <span class="replan-option-fact"><b>${esc(kit.fmtMoney(item.incrementalCostUsd))}</b><span>cost</span></span>
                <span class="replan-option-fact"><b>${esc(covers === null ? "Listed" : kit.fmtInt(covers))}</b><span>pieces</span></span>
              </span>
            </button>`;
        }).join("")}
      </div>` : ui.emptyState({
        title: "No recovery paths have been calculated yet",
        text: "Refresh the plant records, or return to the decision to compare the calculated paths.",
        actionLabel: "Refresh records",
        actionAttrs: 'data-refresh-empty="true"'
      });

    const assignmentsHtml = plan.assignments.length ? `
      <div class="replan-assign-list">
        ${plan.assignments.map((assignment) => {
          const job = assignment.job;
          const selected = String(job.jobId) === selectedJobId;
          const linked = Boolean(selectedCellId && assignment.cell && assignment.cell.cellId === selectedCellId && !selected);
          const units = finiteNumber(job.unitsRequired);
          const due = finiteNumber(job.dueHours);
          const cellName = assignment.cell ? kit.friendlyName(assignment.cell.cellId, "Cell") : "";
          return `
            <button class="job-card${selected ? " is-selected" : ""}${linked ? " is-linked" : ""}" type="button" data-job-id="${esc(job.jobId)}" aria-pressed="${selected}">
              <span class="step-list-num">${esc(String(assignment.sequence))}</span>
              <span class="job-main">
                <span class="job-name">${esc(kit.friendlyName(job.jobId, "Job"))}</span>
                <span class="job-detail">${esc(`${units === null ? "Pieces listed" : `${kit.fmtInt(units)} pieces`} · ${kit.friendlyName(assignment.materialId, "Material")} · ${due === null ? "due time pending" : `due in ${kit.fmtHours(due)}`}`)}</span>
              </span>
              <span class="replan-job-meta">${esc(assignment.cell ? `${kit.fmtHours(assignment.hours)} work · ends ${kit.fmtHours(assignment.finish)}` : `${kit.fmtHours(assignment.hours)} work · cell not listed`)}</span>
              ${cellName ? ui.pill(cellName, "is-neutral") : ""}
              ${ui.pill(assignment.statusText, assignment.statusTone)}
            </button>`;
        }).join("")}
      </div>` : ui.emptyState({
        title: "No waiting jobs are listed",
        text: "The current snapshot does not list jobs waiting on the held material."
      });

    const capacityHtml = data.cells.length ? `
      <div class="replan-capacity">
        <div class="section-label-row"><span class="section-label">Cell load after plan</span><span class="section-hint">${esc(`${kit.fmtHours(plan.totalWork)} of ${kit.fmtHours(plan.totalOpen)} open`)}</span></div>
        <div class="replan-capacity-list">
          ${data.cells.map((cell) => {
            const load = plan.loads.get(cell.cellId) || 0;
            const selected = selectedCellId === cell.cellId;
            return `<button class="replan-cap-row${selected ? " is-selected" : ""}" type="button" data-cell-station="${esc(cell.cellId)}" aria-pressed="${selected}" aria-label="${esc(`${kit.friendlyName(cell.cellId, "Cell")}: ${kit.fmtHours(load)} planned of ${kit.fmtHours(cell.availableHours)} open`)}">
              <span class="replan-cap-label">${esc(kit.friendlyName(cell.cellId, "Cell"))}</span>
              <span class="progress-track"><span class="progress-fill" data-metric-value="${esc(loadPercent(cell, plan))}"></span></span>
              <span class="replan-cap-value">${esc(kit.fmtHours(load))}</span>
            </button>`;
          }).join("")}
        </div>
      </div>` : "";

    const factHtml = data.jobs.length
      ? `<b>${esc(kit.fmtInt(data.jobs.length))} jobs</b> wait on <b>${esc(kit.friendlyName(data.heldMaterialId, "the held material"))}</b>; <b>${esc(kit.fmtInt(data.impactedUnits))} pieces</b> needed.`
      : esc(data.incident.summary || "The current snapshot lists the held material and its waiting work.");
    const estimateHtml = option
      ? `<b>${esc(optionName(option))}</b>: <b>${esc(kit.fmtHours(option.finishHours))}</b> for <b>${esc(kit.fmtMoney(option.incrementalCostUsd))}</b>.`
      : "No calculated finish is available yet.";
    const firstAssignment = plan.assignments[0];
    const suggestionHtml = firstAssignment
      ? `Run <b>${esc(kit.friendlyName(firstAssignment.job.jobId, "the earliest job"))}</b> first; test before release.`
      : "Refresh the plant records, then choose a calculated path.";

    const pathPanel = ui.panel({
      title: "Decided recovery path",
      headExtra: ui.pill(`${kit.fmtInt(data.options.length)} paths calculated`, "is-neutral"),
      className: "replan-panel",
      body: optionsHtml
    });

    const assignmentPanel = ui.panel({
      title: "Replanned assignments",
      headExtra: ui.pill(`${kit.fmtInt(data.jobs.length)} waiting`, data.jobs.length ? "is-held" : "is-ok"),
      className: "replan-panel replan-panel-grow",
      body: `
        ${flowHtml ? `<div class="flow replan-flow">${flowHtml}</div>` : ""}
        ${assignmentsHtml}
        ${capacityHtml}`
    });

    const glanceCard = ui.sideCard({
      title: "Plan at a glance",
      body: option ? ui.stats([
        { value: kit.fmtHours(option.finishHours), label: "Planned finish" },
        { value: kit.fmtMoney(option.incrementalCostUsd), label: "Added cost" },
        { value: kit.fmtInt(option.impactedUnits ?? data.impactedUnits), label: "Pieces covered" }
      ]) : ui.emptyState({
        title: "No path selected",
        text: "A calculated path is needed before a finish or cost can be shown.",
        compact: true
      })
    });

    const notesCard = ui.sideCard({
      title: "The Britt's notes",
      grow: true,
      body: `
        <div class="agent-rows">
          ${ui.agentRow("Verified fact", "is-fact", factHtml)}
          ${ui.agentRow("Estimate", "is-estimate", estimateHtml)}
          ${ui.agentRow("Suggestion", "is-suggestion", suggestionHtml)}
        </div>
        ${checksHtml(data, option, plan)}
        ${data.evidence.length ? `<button class="btn btn-soft btn-small btn-wide replan-records" type="button" data-records="true">View records used · ${esc(kit.fmtInt(data.evidence.length))}</button>` : ""}
        <div class="agent-line">
          <span class="agent-avatar">${ui.icon("mark")}<span class="presence-dot" aria-hidden="true"></span></span>
          <span class="agent-line-text"><b>The Britt is ready.</b> Nothing has moved or been approved.</span>
        </div>`
    });

    root.innerHTML = `
      <div class="replan-shell">
        <div class="replan-head">
          <div>
            <div class="eyebrow"><span class="status-dot" aria-hidden="true"></span><span>${esc(`Material on hold · ${connectionText}`)}</span></div>
            <h1 class="page-title"><span class="page-title-line">The Britt replans the recovery from the decision</span></h1>
          </div>
          <div class="action-stack">
            <div class="action-row">
              ${ui.button({ label: "Refresh records", variant: "btn-ghost", size: "btn-small", iconName: "reset", attrs: 'data-refresh="true"', disabled: busy })}
              ${ui.button({ label: "Back to decision", variant: "btn-secondary", attrs: 'data-back="true"', disabled: busy })}
              ${ui.button({ label: failed ? "Try the replan again" : "Replan and test disruption", variant: "btn-primary", attrs: 'data-primary="true"', disabled: busy || !option || (option && option.feasible === false) })}
            </div>
            <span class="primary-helper"><span class="helper-dot is-held" aria-hidden="true"></span><span data-primary-helper>${esc(failed ? "Records could not be reached. Nothing moved." : option ? `${optionName(option)} selected · finish ${kit.fmtHours(option.finishHours)} · nothing moves yet` : "Choose a calculated path to continue")}</span></span>
          </div>
        </div>
        <div class="replan-grid">
          <div class="stack replan-main">
            ${pathPanel}
            ${assignmentPanel}
          </div>
          <aside class="stack replan-aside">
            ${glanceCard}
            ${notesCard}
          </aside>
        </div>
      </div>`;

    ui.applyMetrics(root);

    const primaryButton = root.querySelector("[data-primary]");
    if (primaryButton) primaryButton.addEventListener("click", () => continueToDisrupt());
    const backButton = root.querySelector("[data-back]");
    if (backButton) backButton.addEventListener("click", () => kit.go("decision"));
    const refreshButton = root.querySelector("[data-refresh]");
    if (refreshButton) refreshButton.addEventListener("click", () => refreshRecords());
    const emptyRefreshButton = root.querySelector("[data-refresh-empty]");
    if (emptyRefreshButton) emptyRefreshButton.addEventListener("click", () => refreshRecords());
    const recordsButton = root.querySelector("[data-records]");
    if (recordsButton) recordsButton.addEventListener("click", openRecords);

    root.querySelectorAll("[data-option-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedOptionId = button.dataset.optionId || "";
        failed = false;
        selectedCellId = "";
        kit.state.replanChoice = { optionId: selectedOptionId };
        paint(`[data-option-id="${selectedOptionId}"]`);
      });
    });
    root.querySelectorAll("[data-job-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedJobId = button.dataset.jobId || "";
        const assignment = plan.assignments.find((item) => String(item.job.jobId) === selectedJobId);
        selectedCellId = assignment && assignment.cell ? assignment.cell.cellId : selectedCellId;
        paint(`[data-job-id="${selectedJobId}"]`);
      });
    });
    root.querySelectorAll("[data-cell-station]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedCellId = button.dataset.cellStation || "";
        const assignment = plan.assignments.find((item) => item.cell && item.cell.cellId === selectedCellId);
        if (assignment) selectedJobId = String(assignment.job.jobId);
        paint(`[data-cell-station="${selectedCellId}"]`);
      });
    });
    const receivingButton = root.querySelector("[data-receiving-station]");
    if (receivingButton) {
      receivingButton.addEventListener("click", () => {
        selectedCellId = "receiving";
        paint('[data-receiving-station="true"]');
      });
    }

    kit.setAgentStatus(failed ? "Replan needs another try" : option ? "Replan ready" : "Checking records");
    if (focusSelector) {
      const target = root.querySelector(focusSelector);
      if (target) target.focus({ preventScroll: true });
    }
  }

  async function refreshRecords() {
    if (busy) return;
    busy = true;
    const button = root.querySelector("[data-refresh]");
    if (button) {
      button.disabled = true;
      button.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span><span>Refreshing</span>`;
    }
    try {
      const result = await kit.refreshData({ notifyOnError: false });
      failed = !result.ok;
      if (result.ok) {
        kit.toast("Plant records are up to date", {
          text: "The replan now uses the newest snapshot."
        });
      }
    } catch {
      failed = true;
    }
    busy = false;
    paint('[data-refresh="true"]');
  }

  async function continueToDisrupt() {
    if (busy) return;
    const beforeData = readData();
    const beforeOption = beforeData.options.find((item) => optionId(item) === selectedOptionId) || null;
    if (!beforeOption || beforeOption.feasible === false) return;

    busy = true;
    const button = root.querySelector("[data-primary]");
    const helper = root.querySelector("[data-primary-helper]");
    if (button) {
      button.disabled = true;
      button.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span><span>Replanning</span>`;
    }
    if (helper) helper.textContent = "Checking plant records before the disruption test.";
    kit.setAgentStatus("Replanning recovery");

    try {
      const result = await kit.refreshData({ notifyOnError: false });
      if (!result.ok) throw new Error("Plant records could not be reached");
      const data = readData();
      const option = data.options.find((item) => optionId(item) === selectedOptionId) || null;
      if (!option || option.feasible === false) throw new Error("The selected path is no longer available");
      const plan = buildPlan(data, option);
      kit.state.replanChoice = {
        optionId: optionId(option),
        optionName: optionName(option),
        finishHours: option.finishHours,
        incrementalCostUsd: option.incrementalCostUsd,
        assignments: plan.assignments.map((assignment) => ({
          jobId: assignment.job.jobId,
          cellId: assignment.cell ? assignment.cell.cellId : (assignment.job.preferredCellId || ""),
          materialId: assignment.materialId,
          hours: assignment.hours,
          dueHours: assignment.job.dueHours
        }))
      };
      busy = false;
      kit.setAgentStatus("Replan ready");
      kit.toast("Recovery plan rebuilt", {
        text: `${optionName(option)} is ready to test. Nothing has moved on the floor.`
      });
      kit.go("disrupt");
    } catch {
      busy = false;
      failed = true;
      kit.setAgentStatus("Replan needs another try");
      paint('[data-primary="true"]');
      kit.toast("The replan could not be checked", {
        text: "Plant records could not be reached. Nothing has moved.",
        actionLabel: "Try again",
        onAction: () => continueToDisrupt()
      });
    }
  }

  paint();
  kit.setPageCommands([
    {
      title: "Replan recovery and test a disruption",
      hint: "Checks the latest plant records, then opens the disruption step",
      run: () => continueToDisrupt()
    },
    {
      title: "Refresh the replan from plant records",
      hint: "Reloads jobs, cells, stock and recovery paths",
      run: () => refreshRecords()
    },
    {
      title: "View records used for this replan",
      hint: "Opens the source records behind the numbers",
      run: () => openRecords()
    },
    {
      title: "Back to the decision",
      hint: "Return to compare and choose recovery paths",
      run: () => kit.go("decision")
    }
  ]);

  return () => {
    kit.clearPageCommands();
  };
}