/** Critical path method — ported from PMP Mastery CpmCalculatorService (Justin Evans IP). */

export class CpmCycleError extends Error {
  constructor(message = "CYCLE_DETECTED") {
    super(message);
    this.code = "CYCLE_DETECTED";
  }
}

function cloneActivity(source) {
  return {
    id: source.id,
    name: source.name,
    duration: source.duration,
    predecessorIds: [...(source.predecessorIds || [])],
    earlyStart: 0,
    earlyFinish: 0,
    lateStart: 0,
    lateFinish: 0,
    totalFloat: 0,
    isCritical: false
  };
}

function topologicalSort(activities) {
  const map = new Map(activities.map(a => [a.id, a]));
  for (const act of activities) {
    for (const pid of act.predecessorIds) {
      if (!map.has(pid)) throw new Error(`UNKNOWN_PREDECESSOR:${pid}`);
    }
  }
  const result = [];
  const state = new Map(activities.map(a => [a.id, "unvisited"]));

  function visit(id) {
    const s = state.get(id);
    if (s === "visiting") throw new CpmCycleError();
    if (s === "done") return;
    state.set(id, "visiting");
    const act = map.get(id);
    for (const p of act.predecessorIds) visit(p);
    state.set(id, "done");
    result.push(act);
  }

  for (const a of activities) visit(a.id);
  return result;
}

export function calculateCpm(activities) {
  const map = new Map(activities.map(a => [a.id, cloneActivity(a)]));
  const ordered = topologicalSort([...map.values()]);

  for (const act of ordered) {
    const preds = act.predecessorIds;
    act.earlyStart = preds.length === 0 ? 0 : Math.max(...preds.map(pid => map.get(pid).earlyFinish));
    act.earlyFinish = act.earlyStart + act.duration;
  }

  const projectDuration = ordered.length ? Math.max(...ordered.map(a => a.earlyFinish)) : 0;

  for (const act of [...ordered].reverse()) {
    const successors = [...map.values()].filter(s => s.predecessorIds.includes(act.id));
    act.lateFinish = successors.length === 0 ? projectDuration : Math.min(...successors.map(s => s.lateStart));
    act.lateStart = act.lateFinish - act.duration;
    act.totalFloat = act.lateStart - act.earlyStart;
    act.isCritical = act.totalFloat === 0;
  }

  const criticalPathIds = [...map.values()].filter(a => a.isCritical).map(a => a.id);

  return {
    activities: [...map.values()].sort((a, b) => a.earlyStart - b.earlyStart || a.id.localeCompare(b.id)),
    projectDuration,
    criticalPathIds
  };
}
