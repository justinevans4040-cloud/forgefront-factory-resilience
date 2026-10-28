/** Kanban recovery board — adapted from PMP Mastery KanbanService (study UI omitted). */

import { calculateWsjf } from "./wsjf-calculator.mjs";

export const KANBAN_COLUMNS = ["todo", "in_progress", "blocked", "done"];

export function buildRecoveryKanban({ plan, cpm, wsjfRank, operator, approvalJti }) {
  const topOrders = wsjfRank.slice(0, 3).map(r => r.order).join(", ");
  const rawFinish = Number(cpm?.projectDurationHours ?? cpm?.projectDuration);
  if (!Number.isFinite(rawFinish) || rawFinish <= 0) throw new Error("KANBAN_NEEDS_CPM_DURATION");
  const finish = Math.round(rawFinish);
  const lateJobs = Number(plan.lateJobs) || 0;
  const cards = [
    {
      id: "card-quarantine",
      title: "Quarantine incoming lot LOT-TI-001",
      ownerRole: "Quality engineer",
      dueHour: Math.max(1, Math.round(finish * 0.2)),
      wsjfPriority: 1,
      column: "todo",
      notes: "Hold material until certificate reconciliation is documented."
    },
    {
      id: "card-recert",
      title: "Re-certify supplier heat documentation",
      ownerRole: "Supplier quality",
      dueHour: Math.max(2, Math.round(finish * 0.35)),
      wsjfPriority: 2,
      column: "todo",
      notes: `Plan ${plan.id}: ${plan.label}`
    },
    {
      id: "card-rerun",
      title: `Re-run affected cell schedules (${lateJobs} late ${lateJobs === 1 ? "job" : "jobs"} shop-wide)`,
      ownerRole: "Production supervisor",
      dueHour: Math.max(3, Math.round(finish * 0.55)),
      wsjfPriority: 3,
      column: "todo",
      notes: `Critical path finish ${finish}h (synthetic CPM horizon).`
    },
    {
      id: "card-notify",
      title: `Notify customers (${topOrders || "impacted orders"})`,
      ownerRole: "Customer operations",
      dueHour: Math.max(4, Math.round(finish * 0.7)),
      wsjfPriority: 4,
      column: "todo",
      notes: "WSJF-ranked communication order — planning only."
    },
    {
      id: "card-closeout",
      title: "Incident close-out and evidence export",
      ownerRole: "Incident commander",
      dueHour: finish,
      wsjfPriority: 5,
      column: "todo",
      notes: `Accepted by ${operator}; consent ${approvalJti}; operationalRelease false.`
    }
  ];
  return {
    planId: plan.id,
    approvalJti,
    wipLimitInProgress: 3,
    columns: KANBAN_COLUMNS,
    cards
  };
}

export function moveKanbanCard(board, cardId, targetColumn) {
  if (!KANBAN_COLUMNS.includes(targetColumn)) return { ok: false, reason: "INVALID_COLUMN" };
  const card = board.cards.find(c => c.id === cardId);
  if (!card) return { ok: false, reason: "CARD_NOT_FOUND" };
  if (targetColumn === "in_progress") {
    const inProgress = board.cards.filter(c => c.column === "in_progress").length;
    if (inProgress >= board.wipLimitInProgress && card.column !== "in_progress") {
      return { ok: false, reason: "WIP_LIMIT" };
    }
  }
  card.column = targetColumn;
  return { ok: true, card };
}

export function recalculateCardWsjf(card) {
  const score = calculateWsjf(card.businessValue || 1, card.timeCriticality || 1, card.riskReduction || 1, card.jobSize || 1);
  card.wsjfScore = +score.toFixed(4);
  return card;
}
