export function buildConsequenceGraph(factory, impact, packetReconciliation = null) {
  const lot = factory.lots.find(l => l.id === factory.incomingLotId);
  const nodes = [];
  const edges = [];

  nodes.push({
    id: `lot:${lot.id}`,
    kind: "material_lot",
    label: lot.id,
    status: impact.blocked ? "HOLD" : "CLEAR",
    meta: { heat: lot.heat, grade: lot.grade, po: lot.po }
  });

  if (packetReconciliation) {
    nodes.push({
      id: "packet:reconciliation",
      kind: "evidence_packet",
      label: "Multi-document packet",
      status: packetReconciliation.status,
      meta: { contradictionCount: packetReconciliation.contradictions.length }
    });
    edges.push({
      from: "packet:reconciliation",
      to: `lot:${lot.id}`,
      relation: "references",
      source: "intake"
    });
  }

  const jobsByLot = factory.jobs.filter(j => j.lotId === lot.id);
  for (const job of jobsByLot) {
    const affected = impact.jobIds.includes(job.id);
    nodes.push({
      id: `job:${job.id}`,
      kind: "production_job",
      label: job.id,
      status: affected ? "REVIEW" : "NO_FLAG",
      meta: { order: job.order, customer: job.customer, units: job.units, machineId: job.machineId }
    });
    edges.push({
      from: `lot:${lot.id}`,
      to: `job:${job.id}`,
      relation: "allocates_material",
      source: `scenario:job-lot:${job.id}`
    });
    nodes.push({
      id: `machine:${job.machineId}`,
      kind: "work_center",
      label: job.machineId,
      status: affected ? "EXPOSED" : "NORMAL"
    });
    edges.push({
      from: `job:${job.id}`,
      to: `machine:${job.machineId}`,
      relation: "scheduled_on",
      source: `scenario:routing:${job.id}`
    });
    const deliveryId = `delivery:${job.order}`;
    if (!nodes.find(n => n.id === deliveryId)) {
      nodes.push({
        id: deliveryId,
        kind: "customer_commitment",
        label: job.order,
        status: affected ? "AT_RISK" : "NORMAL",
        meta: { customer: job.customer }
      });
    }
    edges.push({
      from: `job:${job.id}`,
      to: deliveryId,
      relation: "fulfills",
      source: `scenario:order:${job.order}`
    });
  }

  const substitute = factory.lots.find(l => l.id === factory.substituteLotId);
  if (substitute) {
    nodes.push({
      id: `lot:${substitute.id}`,
      kind: "substitute_inventory",
      label: substitute.id,
      status: substitute.status === "qualified-inventory" ? "AVAILABLE" : "BLOCKED",
      meta: { quantity: substitute.quantity, grade: substitute.grade }
    });
    edges.push({
      from: `lot:${substitute.id}`,
      to: `lot:${lot.id}`,
      relation: "alternate_supply",
      source: "scenario:substitute-lot"
    });
  }

  const provenJobIds = new Set(impact.jobIds);
  const possibleOnly = factory.jobs
    .filter(j => j.lotId !== lot.id && j.grade === lot.grade)
    .map(j => j.id)
    .filter(id => !provenJobIds.has(id));

  return {
    nodes,
    edges,
    provenImpact: { jobIds: [...impact.jobIds], units: impact.units },
    possibleImpact: { jobIds: possibleOnly, note: "Same grade but different lot — not held without provenance link." },
    certainty: impact.certainty
  };
}
