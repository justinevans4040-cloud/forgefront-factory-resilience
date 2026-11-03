export async function render(root, kit) {
  const ui = kit.ui;
  const esc = kit.esc;

  let destroyed = false;
  let activeFilter = "all";
  let selectedKind = "material";
  let selectedId = "";
  let selectedDept = "";
  let continueBusy = false;
  let refreshBusy = false;

  const asArray = (value) => (Array.isArray(value) ? value : []);
  const num = (value) => {
    const next = Number(value);
    return Number.isFinite(next) ? next : 0;
  };
  const hasNum = (value) => value !== null && value !== undefined && Number.isFinite(Number(value));
  const titleWord = (value) => kit.friendlyName(value).replace(/^\w/, (ch) => ch.toUpperCase());
  const materialName = (id) => kit.friendlyName(String(id || "").replace(/^mat-/i, "")) || "Held lot";
  const cellName = (id) => kit.friendlyName(String(id || "").replace(/^cell-/i, "")) || "Cell";
  const jobName = (id) => kit.friendlyName(id) || "Job";
  const unitLabel = (unit) => {
    const value = String(unit || "").trim().toLowerCase();
    if (value === "each" || value === "ea") return "pieces";
    return value || "units";
  };

  function machineForCell(model, cellId) {
    const candidate = String(cellId || "").toLowerCase().replace(/^cell-/, "");
    return model.machines.find((machine) => String(machine.id).toLowerCase() === candidate) || null;
  }

  function cellDisplay(model, cell) {
    if (!cell) return "Cell";
    const machine = machineForCell(model, cell.cellId);
    return machine ? String(machine.label || kit.friendlyName(machine.id)) : cellName(cell.cellId);
  }

  function tileNumber(machine, index) {
    const text = String(machine.label || machine.id || "");
    const match = text.match(/(\d+)\s*$/);
    return match ? match[1] : String(index + 1);
  }

  function getModel() {
    const plant = kit.state.plant || {};
    const machines = asArray(plant.machines).filter((machine) => machine && typeof machine === "object");
    const workflow = kit.state.workflow || {};
    const snapshot = workflow.snapshot || {};
    const analysis = kit.state.analysis || workflow.analysis || {};
    const scenario = kit.state.scenario || {};
    const incident = analysis.incident || snapshot.incident || scenario.incident || {};
    const materials = asArray(snapshot.materials);
    const snapshotJobs = asArray(snapshot.jobs);
    const cells = asArray(snapshot.cells);

    let heldId = incident.heldMaterialId || "";
    let heldMaterial = materials.find((material) => String(material.materialId) === String(heldId)) || null;
    if (!heldMaterial) {
      heldMaterial = materials.find((material) => num(material.held) > 0) || null;
      if (heldMaterial) heldId = heldMaterial.materialId;
    }
    if (heldMaterial && !heldId) heldId = heldMaterial.materialId;

    const substitutes = heldMaterial ? asArray(heldMaterial.substitutes).map(String) : [];
    const snapshotJobById = new Map(snapshotJobs.map((job) => [String(job.jobId), job]));
    const impacted = analysis.impacted || {};
    let jobs = asArray(impacted.jobs).map((job) => ({ ...(snapshotJobById.get(String(job.jobId)) || {}), ...job }));
    if (!jobs.length && heldId) jobs = snapshotJobs.filter((job) => String(job.materialId) === String(heldId));
    jobs = jobs.map((job) => {
      const units = num(job.unitsRequired);
      const perUnit = hasNum(job.hoursPerUnit) ? num(job.hoursPerUnit) : 0;
      const total = hasNum(job.totalHours) ? num(job.totalHours) : units * perUnit;
      return { ...job, unitsRequired: units, hoursPerUnit: perUnit, totalHours: total };
    });

    const impactedUnits = hasNum(impacted.impactedUnits)
      ? num(impacted.impactedUnits)
      : jobs.reduce((sum, job) => sum + num(job.unitsRequired), 0);
    const totalWorkHours = jobs.reduce((sum, job) => sum + num(job.totalHours), 0);
    const preferredCellIds = new Set(jobs.map((job) => String(job.preferredCellId || "")).filter(Boolean));
    const involvedCells = cells.filter((cell) => {
      const compatible = asArray(cell.compatibleMaterials).map(String);
      return preferredCellIds.has(String(cell.cellId))
        || (heldId && compatible.includes(String(heldId)))
        || substitutes.some((substitute) => compatible.includes(substitute));
    });
    const involvedOpenHours = involvedCells.reduce((sum, cell) => sum + num(cell.availableHours), 0);

    const involvedMachineIds = new Set();
    involvedCells.forEach((cell) => {
      const machine = machineForCell({ machines }, cell.cellId);
      if (machine) involvedMachineIds.add(String(machine.id));
    });

    const machineById = new Map(machines.map((machine) => [String(machine.id), machine]));
    const involvedMachines = machines.filter((machine) => involvedMachineIds.has(String(machine.id)));

    const deptMap = new Map();
    machines.forEach((machine) => {
      const name = String(machine.department || "Department");
      if (!deptMap.has(name)) deptMap.set(name, []);
      deptMap.get(name).push(machine);
    });
    const departments = Array.from(deptMap.entries()).map(([name, deptMachines]) => {
      const online = deptMachines.filter((machine) => machine.online).length;
      return {
        name,
        machines: deptMachines,
        online,
        offline: deptMachines.length - online,
        capacity: deptMachines.reduce((sum, machine) => sum + num(machine.capacityHours), 0),
        involved: deptMachines.filter((machine) => involvedMachineIds.has(String(machine.id))).length
      };
    });
    const deptByName = new Map(departments.map((dept) => [dept.name, dept]));

    const recovery = analysis.recovery || {};
    const recoveryOptions = asArray(recovery.options || analysis.options);
    const fastestFinish = recoveryOptions
      .filter((option) => option && option.feasible !== false && hasNum(option.finishHours))
      .reduce((best, option) => (best === null ? num(option.finishHours) : Math.min(best, num(option.finishHours))), null);

    const onlineCount = machines.filter((machine) => machine.online).length;
    const firstDue = jobs.reduce((best, job) => {
      if (!hasNum(job.dueHours)) return best;
      return best === null ? num(job.dueHours) : Math.min(best, num(job.dueHours));
    }, null);
    const defaultDept = (involvedMachines[0] && String(involvedMachines[0].department || ""))
      || (departments[0] ? departments[0].name : "");

    return {
      plant,
      machines,
      machineById,
      snapshot,
      analysis,
      incident,
      materials,
      heldId,
      heldMaterial,
      substitutes,
      snapshotJobs,
      jobs,
      impactedUnits,
      totalWorkHours,
      cells,
      involvedCells,
      involvedOpenHours,
      involvedMachineIds,
      involvedMachines,
      departments,
      deptByName,
      defaultDept,
      fastestFinish,
      onlineCount,
      offlineCount: machines.length - onlineCount,
      totalCapacity: machines.reduce((sum, machine) => sum + num(machine.capacityHours), 0),
      firstDue,
      connection: kit.state.connection || "checking"
    };
  }

  function ensureSelection(model) {
    if (!model.departments.length) return;
    if (!selectedDept || !model.deptByName.has(selectedDept)) {
      selectedDept = model.defaultDept || model.departments[0].name;
    }
    if (selectedKind === "material" && !model.heldMaterial) selectedKind = "machine";
    if (selectedKind === "machine" && !model.machineById.has(selectedId)) {
      const first = model.involvedMachines[0] || model.machines[0];
      if (first) {
        selectedId = String(first.id);
        selectedDept = String(first.department || selectedDept);
      }
    }
    if (selectedKind === "cell" && !model.cells.some((cell) => String(cell.cellId) === selectedId)) {
      selectedKind = model.heldMaterial ? "material" : "machine";
      selectedId = model.heldMaterial ? String(model.heldId) : selectedId;
    }
    if (selectedKind === "job" && !model.jobs.some((job) => String(job.jobId) === selectedId)) {
      selectedKind = model.heldMaterial ? "material" : "machine";
      selectedId = model.heldMaterial ? String(model.heldId) : selectedId;
    }
    if (selectedKind === "material" && model.heldMaterial) selectedId = String(model.heldId);
    if (selectedKind === "department") selectedId = selectedDept;
    if (selectedKind === "machine") {
      const machine = model.machineById.get(selectedId);
      if (machine) selectedDept = String(machine.department || selectedDept);
    }
  }

  function preferredCellDisplay(model, job) {
    if (!job || !job.preferredCellId) return "Not listed";
    const cell = model.cells.find((item) => String(item.cellId) === String(job.preferredCellId));
    return cell ? cellDisplay(model, cell) : cellName(job.preferredCellId);
  }

  function detailFor(model) {
    if (selectedKind === "department") {
      const dept = model.deptByName.get(selectedDept) || model.departments[0];
      if (dept) {
        return {
          title: dept.name,
          subtitle: "Department in this plant",
          pill: `${kit.fmtInt(dept.machines.length)} machines`,
          tone: "is-neutral",
          rows: [
            { label: "Machines", value: `${kit.fmtInt(dept.machines.length)} · ${kit.fmtInt(dept.online)} online` },
            { label: "Capacity listed", value: kit.fmtHours(dept.capacity) },
            { label: "On held path", value: `${kit.fmtInt(dept.involved)} machines` }
          ]
        };
      }
    }

    if (selectedKind === "cell") {
      const cell = model.cells.find((item) => String(item.cellId) === selectedId);
      if (cell) {
        return {
          title: cellDisplay(model, cell),
          subtitle: "Cell in the current snapshot",
          pill: cell.online ? "Online" : "Offline",
          tone: cell.online ? "is-ok" : "is-danger",
          rows: [
            { label: "Open capacity", value: kit.fmtHours(cell.availableHours) },
            { label: "Can run", value: asArray(cell.compatibleMaterials).map(materialName).join(", ") || "Not listed" },
            { label: "Hourly cost", value: `${kit.fmtMoney(cell.hourlyCostUsd)} per hour` }
          ]
        };
      }
    }

    if (selectedKind === "job") {
      const job = model.jobs.find((item) => String(item.jobId) === selectedId);
      if (job) {
        return {
          title: jobName(job.jobId),
          subtitle: "Job waiting in the current snapshot",
          pill: "Waiting",
          tone: "is-held",
          rows: [
            { label: "Parts and work", value: num(job.totalHours) > 0 ? `${kit.fmtInt(job.unitsRequired)} parts · ${kit.fmtHours(job.totalHours)}` : `${kit.fmtInt(job.unitsRequired)} parts` },
            { label: "Preferred cell", value: preferredCellDisplay(model, job) },
            { label: "Due in", value: hasNum(job.dueHours) ? kit.fmtHours(job.dueHours) : "Not listed" }
          ]
        };
      }
    }

    if (selectedKind === "material" && model.heldMaterial) {
      const material = model.heldMaterial;
      const unit = unitLabel(material.unit);
      return {
        title: materialName(material.materialId),
        subtitle: "Material lot in the current snapshot",
        pill: num(material.held) > 0 ? "On hold" : "Available",
        tone: num(material.held) > 0 ? "is-held" : "is-ok",
        rows: [
          { label: "On hand", value: `${kit.fmtInt(material.onHand)} ${unit}` },
          { label: "Held", value: `${kit.fmtInt(material.held)} ${unit}` },
          { label: "Available", value: `${kit.fmtInt(material.available)} ${unit}` }
        ]
      };
    }

    const machine = model.machineById.get(selectedId) || model.machines[0];
    if (!machine) return null;
    return {
      title: String(machine.label || kit.friendlyName(machine.id)),
      subtitle: "Machine in this plant",
      pill: machine.online ? "Online" : "Offline",
      tone: machine.online ? "is-ok" : "is-danger",
      rows: [
        { label: "Department", value: String(machine.department || "Department") },
        { label: "Capacity listed", value: kit.fmtHours(machine.capacityHours) },
        { label: "Hourly cost", value: `${kit.fmtMoney(machine.hourlyCostUsd)} per hour` }
      ]
    };
  }

  function cascadeHtml(model) {
    const held = model.heldMaterial;
    const heldStage = held
      ? `<button class="shop-stage-main" type="button" data-shop-material data-shop-focus="material" aria-pressed="${selectedKind === "material"}">
           <span class="shop-stage-main-top"><span class="shop-stage-title">${esc(materialName(held.materialId))}</span>${ui.pill(num(held.held) > 0 ? "On hold" : "Available", num(held.held) > 0 ? "is-held" : "is-ok")}</span>
           <span class="shop-stage-detail">${esc(`${kit.fmtInt(held.held)} held · ${kit.fmtInt(held.available)} available`)}</span>
         </button>`
      : `<div class="shop-stage-main"><span class="shop-stage-title">No held lot listed</span><span class="shop-stage-detail">Every machine below is in the plant record.</span></div>`;

    const cellChips = model.involvedCells.length
      ? model.involvedCells.map((cell) => `
          <button class="shop-stage-chip${selectedKind === "cell" && selectedId === String(cell.cellId) ? " is-selected" : ""}" type="button" data-shop-cell="${esc(cell.cellId)}" data-shop-focus="cell:${esc(cell.cellId)}" aria-pressed="${selectedKind === "cell" && selectedId === String(cell.cellId)}">
            <span class="shop-chip-name">${esc(cellDisplay(model, cell))}</span>
            <span class="shop-chip-detail">${esc(`${kit.fmtHours(cell.availableHours)} open`)}</span>
          </button>`).join("")
      : `<div class="shop-stage-chip"><span class="shop-chip-name">No cells listed</span><span class="shop-chip-detail">No cell can run this lot.</span></div>`;

    const jobChips = model.jobs.length
      ? model.jobs.map((job) => `
          <button class="shop-stage-chip${selectedKind === "job" && selectedId === String(job.jobId) ? " is-selected" : ""}" type="button" data-shop-job="${esc(job.jobId)}" data-shop-focus="job:${esc(job.jobId)}" aria-pressed="${selectedKind === "job" && selectedId === String(job.jobId)}">
            <span class="shop-chip-name">${esc(jobName(job.jobId))}</span>
            <span class="shop-chip-detail">${esc(hasNum(job.dueHours) ? `${kit.fmtInt(job.unitsRequired)} parts · due in ${kit.fmtHours(job.dueHours)}` : `${kit.fmtInt(job.unitsRequired)} parts`)}</span>
          </button>`).join("")
      : `<div class="shop-stage-chip"><span class="shop-chip-name">No jobs waiting</span><span class="shop-chip-detail">No job needs this lot.</span></div>`;

    return `
      <div class="shop-cascade" aria-label="How the hold reaches cells and jobs">
        <div class="shop-stage${selectedKind === "material" ? " is-selected" : ""}">
          <span class="shop-stage-label">Held lot</span>
          ${heldStage}
        </div>
        ${ui.connector("is-held")}
        <div class="shop-stage${selectedKind === "cell" ? " is-selected" : ""}">
          <span class="shop-stage-label">Cells that can run it</span>
          <div class="shop-stage-chips">${cellChips}</div>
        </div>
        ${ui.connector("is-held")}
        <div class="shop-stage${selectedKind === "job" ? " is-selected" : ""}">
          <span class="shop-stage-label">Waiting jobs</span>
          <div class="shop-stage-chips">${jobChips}</div>
        </div>
      </div>`;
  }

  function machineMatches(model, machine) {
    if (activeFilter === "online") return Boolean(machine.online);
    if (activeFilter === "offline") return !machine.online;
    if (activeFilter === "held") return model.involvedMachineIds.has(String(machine.id));
    return true;
  }

  function floorHtml(model) {
    const lanes = model.departments.map((dept) => {
      const isDeptSelected = dept.name === selectedDept;
      const anyMatch = dept.machines.some((machine) => machineMatches(model, machine));
      const deptDot = dept.involved ? "" : dept.offline ? " is-danger" : " is-ok";
      const tiles = dept.machines.map((machine, machineIndex) => {
        const involved = model.involvedMachineIds.has(String(machine.id));
        const selected = selectedKind === "machine" && selectedId === String(machine.id);
        const dimmed = !machineMatches(model, machine);
        const label = String(machine.label || kit.friendlyName(machine.id));
        const dotTone = involved ? "" : machine.online ? " is-ok" : " is-danger";
        return `
          <button class="shop-machine${selected ? " is-selected" : ""}${involved ? " is-linked" : ""}${dimmed ? " is-dimmed" : ""}" type="button"
            data-shop-machine="${esc(machine.id)}" data-shop-focus="machine:${esc(machine.id)}" aria-pressed="${selected}"
            aria-label="${esc(`${label}. ${machine.online ? "Online" : "Offline"}. ${kit.fmtHours(machine.capacityHours)} capacity.${involved ? " On the held path." : ""} Select to inspect.`)}">
            <span class="status-dot${dotTone}" aria-hidden="true"></span>
            <span class="shop-machine-num">${esc(tileNumber(machine, machineIndex))}</span>
          </button>`;
      }).join("");
      return `
        <div class="shop-lane${isDeptSelected ? " is-selected" : ""}${anyMatch ? "" : " is-dimmed"}">
          <button class="shop-dept-head" type="button" data-shop-dept="${esc(dept.name)}" data-shop-focus="dept:${esc(dept.name)}" aria-pressed="${isDeptSelected}"
            aria-label="${esc(`${dept.name}: ${kit.fmtInt(dept.machines.length)} machines, ${kit.fmtInt(dept.online)} online, ${kit.fmtHours(dept.capacity)} capacity listed.${dept.involved ? ` ${kit.fmtInt(dept.involved)} on the held path.` : ""} Select to inspect this department.`)}">
            <span class="status-dot${deptDot}" aria-hidden="true"></span>
            <span class="shop-dept-name">${esc(dept.name)}</span>
            <span class="shop-dept-count">${esc(`${kit.fmtInt(dept.machines.length)} machines`)}</span>
          </button>
          <div class="shop-tiles">${tiles}</div>
        </div>`;
    }).join("");

    return `
      <div class="shop-floor-head">
        <div class="shop-floor-title">
          <h3 class="section-label">Plant floor</h3>
          <div class="legend" aria-label="Machine status">
            <span class="legend-item"><span class="legend-dot is-held" aria-hidden="true"></span>Held path</span>
            <span class="legend-item"><span class="legend-dot is-ok" aria-hidden="true"></span>Available</span>
            <span class="legend-item"><span class="legend-dot is-danger" aria-hidden="true"></span>Offline</span>
          </div>
        </div>
        ${ui.tabs([
          { id: "all", label: "All machines" },
          { id: "held", label: "Held path" },
          { id: "online", label: "Online" },
          { id: "offline", label: "Offline" }
        ], activeFilter)}
      </div>
      <div class="shop-lanes">${lanes}</div>`;
  }

  function glanceHtml(model) {
    const stats = model.heldMaterial
      ? [
          { value: `${kit.fmtInt(model.onlineCount)}/${kit.fmtInt(model.machines.length)}`, label: "Online" },
          { value: kit.fmtInt(model.departments.length), label: "Departments" },
          { value: kit.fmtHours(model.involvedOpenHours), label: "Open on path" }
        ]
      : [
          { value: kit.fmtInt(model.machines.length), label: "Machines" },
          { value: kit.fmtInt(model.onlineCount), label: "Online" },
          { value: kit.fmtInt(model.departments.length), label: "Departments" }
        ];
    return `
      <section class="side-card">
        <div class="card-head">
          <h2 class="side-title">Plant at a glance</h2>
          <button class="btn btn-ghost shop-refresh" type="button" data-shop-refresh data-shop-focus="refresh" ${refreshBusy ? "disabled" : ""}>${refreshBusy ? "Checking" : "Refresh"}</button>
        </div>
        ${ui.stats(stats)}
        <div class="source-line">
          <span class="status-dot ${model.connection === "connected" ? "is-ok" : ""}" aria-hidden="true"></span>
          <span class="source-text">${esc(model.connection === "connected" ? "Plant records connected" : model.connection === "offline" ? "Plant records could not be reached" : "Checking plant records")}</span>
        </div>
      </section>`;
  }

  function detailHtml(model) {
    const detail = detailFor(model);
    if (!detail) return "";
    return `
      <section class="side-card">
        <div class="card-head">
          <div>
            <h2 class="side-title">${esc(detail.title)}</h2>
            <p class="card-desc">${esc(detail.subtitle)}</p>
          </div>
          ${ui.pill(detail.pill, detail.tone)}
        </div>
        <div class="shop-detail-rows">
          ${detail.rows.map((row) => `<div class="shop-detail-row"><span class="shop-detail-label">${esc(row.label)}</span><b class="shop-detail-value">${esc(row.value)}</b></div>`).join("")}
        </div>
        <button class="btn btn-ghost btn-wide shop-record" type="button" data-shop-record data-shop-focus="record">View ${esc(detail.title)} record</button>
      </section>`;
  }

  function agentHtml(model) {
    const rows = [];
    if (model.heldMaterial && model.jobs.length) {
      rows.push(ui.agentRow("Verified fact", "is-fact",
        `<b>${esc(kit.fmtInt(model.impactedUnits))} parts</b> in <b>${esc(kit.fmtInt(model.jobs.length))} jobs</b> waiting.`));
    } else {
      rows.push(ui.agentRow("Verified fact", "is-fact",
        `<b>${esc(kit.fmtInt(model.onlineCount))} of ${esc(kit.fmtInt(model.machines.length))} machines</b> online.`));
    }
    if (model.involvedCells.length) {
      rows.push(ui.agentRow("Verified fact", "is-fact",
        `<b>${esc(kit.fmtInt(model.involvedCells.length))} cells</b> · <b>${esc(kit.fmtHours(model.involvedOpenHours))} open</b> for this lot.`));
    } else if (model.heldMaterial) {
      rows.push(ui.agentRow("Verified fact", "is-fact", "No cell can run this lot."));
    }
    if (model.fastestFinish !== null) {
      rows.push(ui.agentRow("Estimate", "is-estimate",
        `Fastest feasible finish <b>${esc(kit.fmtHours(model.fastestFinish))}</b>.`));
    }
    rows.push(ui.agentRow("Suggestion", "is-suggestion",
      model.involvedCells.length ? "Inspect held-path cells first." : "Select any tile to inspect it."));
    return `
      <section class="side-card is-grow">
        <h2 class="side-title">The Britt's view of the shop</h2>
        <div class="agent-rows">${rows.join("")}</div>
        <div class="agent-line">
          <span class="status-dot is-ok" aria-hidden="true"></span>
          <p class="agent-line-text"><b>The Britt is ready.</b> Nothing has moved.</p>
        </div>
      </section>`;
  }

  function openRecord(model) {
    let title = "Selected";
    let rows = [];
    if (selectedKind === "machine") {
      const machine = model.machineById.get(selectedId) || model.machines[0];
      if (!machine) return;
      title = String(machine.label || kit.friendlyName(machine.id));
      rows = [
        { label: "Record", value: String(machine.id || "") },
        { label: "Machine", value: String(machine.label || "") },
        { label: "Department", value: String(machine.department || "") },
        { label: "Status", value: machine.online ? "Online" : "Offline" },
        { label: "Capacity", value: kit.fmtHours(machine.capacityHours) },
        { label: "Hourly cost", value: `${kit.fmtMoney(machine.hourlyCostUsd)} per hour` },
        { label: "Work it can do", value: asArray(machine.capabilities).map(titleWord).join(", ") || "Not listed in the record" }
      ];
    } else if (selectedKind === "cell") {
      const cell = model.cells.find((item) => String(item.cellId) === selectedId);
      if (!cell) return;
      title = cellDisplay(model, cell);
      rows = [
        { label: "Record", value: String(cell.cellId || "") },
        { label: "Runs as", value: cellDisplay(model, cell) },
        { label: "Status", value: cell.online ? "Online" : "Offline" },
        { label: "Open capacity", value: kit.fmtHours(cell.availableHours) },
        { label: "Hourly cost", value: `${kit.fmtMoney(cell.hourlyCostUsd)} per hour` },
        { label: "Can run", value: asArray(cell.compatibleMaterials).map(materialName).join(", ") || "Not listed in the record" }
      ];
    } else if (selectedKind === "job") {
      const job = model.jobs.find((item) => String(item.jobId) === selectedId);
      if (!job) return;
      title = jobName(job.jobId);
      rows = [
        { label: "Record", value: String(job.jobId || "") },
        { label: "Material", value: materialName(job.materialId) },
        { label: "Parts needed", value: kit.fmtInt(job.unitsRequired) },
        { label: "Work needed", value: kit.fmtHours(job.totalHours) },
        { label: "Preferred cell", value: preferredCellDisplay(model, job) },
        { label: "Due in", value: hasNum(job.dueHours) ? kit.fmtHours(job.dueHours) : "Not in the record" }
      ];
    } else if (selectedKind === "department") {
      const dept = model.deptByName.get(selectedDept);
      if (!dept) return;
      title = dept.name;
      rows = [
        { label: "Department", value: dept.name },
        { label: "Machines", value: kit.fmtInt(dept.machines.length) },
        { label: "Online", value: `${kit.fmtInt(dept.online)} online · ${kit.fmtInt(dept.offline)} offline` },
        { label: "Combined capacity", value: kit.fmtHours(dept.capacity) },
        { label: "On held path", value: `${kit.fmtInt(dept.involved)} machines` }
      ];
    } else if (model.heldMaterial) {
      const material = model.heldMaterial;
      const unit = unitLabel(material.unit);
      title = materialName(material.materialId);
      rows = [
        { label: "Record", value: String(material.materialId || "") },
        { label: "On hand", value: `${kit.fmtInt(material.onHand)} ${unit}` },
        { label: "Held", value: `${kit.fmtInt(material.held)} ${unit}` },
        { label: "Available", value: `${kit.fmtInt(material.available)} ${unit}` },
        { label: "Substitutes", value: model.substitutes.map(materialName).join(", ") || "None listed in the record" },
        { label: "Restock time", value: hasNum(material.replenishmentHours) ? kit.fmtHours(material.replenishmentHours) : "Not listed in the record" },
        { label: "Unit cost", value: kit.fmtMoney(material.unitCostUsd) }
      ];
    }
    kit.openDialog({
      title: `${title} record`,
      subtitle: "These fields come from the current plant records. Opening the record changes nothing.",
      bodyHtml: kit.detailRowsHtml(rows),
      actions: [{ label: "Back", variant: "btn-secondary", onClick: () => true }]
    });
  }

  function draw() {
    if (destroyed) return;
    const model = getModel();
    ensureSelection(model);

    const activeElement = document.activeElement;
    const focusKey = activeElement && root.contains(activeElement) ? activeElement.getAttribute("data-shop-focus") : "";

    kit.setAgentStatus(continueBusy || refreshBusy
      ? "Checking plant records"
      : model.machines.length
        ? "Shop view ready"
        : model.connection === "offline" ? "Records need a retry" : "Checking plant records");

    const hasMachines = model.machines.length > 0;
    const isLoading = !hasMachines && model.connection !== "offline";
    const eyebrow = model.connection === "connected"
      ? "Full shop · Plant records connected"
      : model.connection === "offline"
        ? "Full shop · Plant records could not be reached"
        : "Full shop · Checking plant records";
    const headline = model.heldMaterial
      ? "The whole plant in one view, with the held lot's path lit."
      : "The whole plant in one view, department by department.";
    const sub = hasMachines
      ? model.heldMaterial
        ? `${kit.fmtInt(model.machines.length)} machines in ${kit.fmtInt(model.departments.length)} departments · ${kit.fmtInt(model.jobs.length)} jobs waiting on the held lot.`
        : `${kit.fmtInt(model.machines.length)} machines in ${kit.fmtInt(model.departments.length)} departments · ${kit.fmtInt(model.snapshotJobs.length)} jobs in the current snapshot.`
      : "Checking machines, cells and waiting jobs from plant records.";
    const helper = !hasMachines
      ? model.connection === "offline" ? "No plant records are shown yet" : "Checking plant records"
      : model.connection === "offline"
        ? "Showing the last records on this screen"
        : "Re-checks plant records first";

    let mainBody = "";
    let asideBody = "";
    if (isLoading) {
      mainBody = `<div class="shop-loading">${ui.loadingRow("Loading machines from the current plant snapshot.")}<div class="stack">${ui.skeletonCards(4)}</div></div>`;
      asideBody = `<section class="side-card is-grow"><h2 class="side-title">Shop detail</h2><div class="stack">${ui.skeletonCards(3)}</div></section>`;
    } else if (!hasMachines) {
      mainBody = ui.emptyState({
        title: "Plant records could not be loaded",
        text: "No machines are shown, so no shop counts are claimed. Try the connection again.",
        actionLabel: "Try again",
        actionAttrs: 'data-shop-retry data-shop-focus="retry"'
      });
      asideBody = `<section class="side-card is-grow"><h2 class="side-title">Shop detail</h2><p class="card-desc">Machine, cell and job details appear here once the plant record loads.</p></section>`;
    } else {
      mainBody = `
        <div class="card-head">
          <div>
            <h2 class="card-title">Held lot, cells that can run it, and waiting jobs</h2>
            <p class="card-desc">Select the lot, a cell, a job, a department, or any machine tile to inspect its record.</p>
          </div>
        </div>
        ${cascadeHtml(model)}
        ${floorHtml(model)}`;
      asideBody = `${glanceHtml(model)}${detailHtml(model)}${agentHtml(model)}`;
    }

    root.innerHTML = `
      <div class="shop-screen">
        <header class="shop-head">
          <div class="shop-head-copy">
            <p class="eyebrow"><span class="status-dot ${model.connection === "connected" ? "is-ok" : ""}" aria-hidden="true"></span>${esc(eyebrow)}</p>
            <h1 class="page-title"><span class="page-title-line">${esc(headline)}</span></h1>
            <p class="page-sub">${esc(sub)}</p>
          </div>
          <div class="action-stack">
            <div class="action-row">
              <button class="btn btn-secondary" type="button" data-shop-back data-shop-focus="back">Back to evidence</button>
              <button class="btn btn-primary" type="button" data-shop-primary data-shop-focus="primary" ${continueBusy ? "disabled" : ""}>
                ${continueBusy ? `<span class="btn-spinner" aria-hidden="true"></span><span>Checking records</span>` : `<span>Continue to settings</span>${ui.icon("arrow")}`}
              </button>
            </div>
            <p class="primary-helper"><span class="helper-dot ${model.connection === "offline" ? "is-held" : ""}" aria-hidden="true"></span>${esc(helper)}</p>
          </div>
        </header>
        <div class="shop-grid">
          <section class="panel shop-main" aria-label="Full shop">${mainBody}</section>
          <aside class="shop-aside" aria-label="Shop detail">${asideBody}</aside>
        </div>
      </div>`;

    const back = root.querySelector("[data-shop-back]");
    if (back) back.addEventListener("click", () => kit.go("evidence"));

    const primary = root.querySelector("[data-shop-primary]");
    if (primary) primary.addEventListener("click", handlePrimary);

    const retry = root.querySelector("[data-shop-retry]");
    if (retry) retry.addEventListener("click", handleRefresh);

    const refresh = root.querySelector("[data-shop-refresh]");
    if (refresh) refresh.addEventListener("click", handleRefresh);

    const record = root.querySelector("[data-shop-record]");
    if (record) record.addEventListener("click", () => openRecord(model));

    const materialButton = root.querySelector("[data-shop-material]");
    if (materialButton) materialButton.addEventListener("click", () => {
      selectedKind = "material";
      selectedId = String(model.heldId || "");
      draw();
    });

    root.querySelectorAll("[data-shop-cell]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedKind = "cell";
        selectedId = button.dataset.shopCell || "";
        const machine = machineForCell(model, selectedId);
        if (machine) selectedDept = String(machine.department || selectedDept);
        draw();
      });
    });

    root.querySelectorAll("[data-shop-job]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedKind = "job";
        selectedId = button.dataset.shopJob || "";
        const job = model.jobs.find((item) => String(item.jobId) === selectedId);
        const machine = job ? machineForCell(model, job.preferredCellId) : null;
        if (machine) selectedDept = String(machine.department || selectedDept);
        draw();
      });
    });

    root.querySelectorAll("[data-shop-dept]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedKind = "department";
        selectedDept = button.dataset.shopDept || "";
        selectedId = selectedDept;
        draw();
      });
    });

    root.querySelectorAll("[data-shop-machine]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedKind = "machine";
        selectedId = button.dataset.shopMachine || "";
        const machine = model.machineById.get(selectedId);
        if (machine) selectedDept = String(machine.department || selectedDept);
        draw();
      });
    });

    root.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.tab || "all";
        draw();
        const activeTab = root.querySelector(`[data-tab="${activeFilter}"]`);
        if (activeTab) activeTab.focus({ preventScroll: true });
      });
    });

    kit.setPageCommands([
      { title: "Continue to settings", hint: "Check plant records, then open the last step", run: handlePrimary },
      { title: "Refresh plant records", hint: "Reload machines, cells and waiting jobs", run: handleRefresh },
      { title: "Highlight the held path", hint: "Dim every machine that is not on the held path", run: () => { activeFilter = "held"; draw(); } },
      { title: "Show all machines", hint: "Return the plant floor to the full view", run: () => { activeFilter = "all"; draw(); } },
      ...model.departments.map((dept) => ({
        title: `Inspect ${dept.name}`,
        hint: `${kit.fmtInt(dept.machines.length)} machines · ${kit.fmtInt(dept.online)} online`,
        run: () => { selectedKind = "department"; selectedDept = dept.name; selectedId = dept.name; draw(); }
      }))
    ]);

    if (focusKey) {
      const target = Array.from(root.querySelectorAll("[data-shop-focus]"))
        .find((element) => element.getAttribute("data-shop-focus") === focusKey && !element.disabled);
      if (target) target.focus({ preventScroll: true });
    }
  }

  async function attemptContinue() {
    if (continueBusy) return;
    continueBusy = true;
    draw();
    try {
      const status = await kit.api.post("/api/workflow/status", {});
      if (status) kit.state.workflow = status;
      kit.setConnection("connected");
      kit.go("settings");
    } catch (error) {
      continueBusy = false;
      if (!destroyed) draw();
      throw error;
    }
  }

  async function handlePrimary() {
    try {
      await attemptContinue();
    } catch {
      if (destroyed) return;
      kit.toast("Plant records could not be checked", {
        text: "Nothing has changed and settings has not opened. Try again when the connection is back.",
        actionLabel: "Retry",
        onAction: attemptContinue
      });
    }
  }

  async function attemptRefresh() {
    if (refreshBusy) return;
    refreshBusy = true;
    draw();
    try {
      const result = await kit.refreshData({ notifyOnError: false });
      if (!result.ok) throw new Error("Plant records could not be refreshed");
      refreshBusy = false;
      if (!destroyed) draw();
    } catch (error) {
      refreshBusy = false;
      if (!destroyed) draw();
      throw error;
    }
  }

  async function handleRefresh() {
    try {
      await attemptRefresh();
      if (!destroyed) kit.toast("Plant records are up to date", { text: "The shop now shows the newest machines, cells and jobs." });
    } catch {
      if (destroyed) return;
      kit.toast("Plant records could not be refreshed", {
        text: "The shop has not changed. You can try again.",
        actionLabel: "Retry",
        onAction: attemptRefresh
      });
    }
  }

  draw();
  const unsubscribe = kit.subscribe(() => {
    if (!destroyed) draw();
  });

  if (!kit.state.plant || !kit.state.workflow) {
    kit.refreshData({ notifyOnError: false }).then((result) => {
      if (destroyed) return;
      if (!result.ok) {
        kit.toast("Plant records could not be reached", {
          text: "The shop has not changed. Check the connection, then try again.",
          actionLabel: "Retry",
          onAction: attemptRefresh
        });
      }
    }, () => {});
  }

  return () => {
    destroyed = true;
    if (typeof unsubscribe === "function") unsubscribe();
    kit.clearPageCommands();
  };
}