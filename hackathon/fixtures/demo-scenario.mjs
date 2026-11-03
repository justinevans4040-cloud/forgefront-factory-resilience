/** Build a disposable synthetic scenario for unit tests and local smoke. */
export function buildDemoScenarioInput() {
  return {
    scenarioId: "scenario-cert-hold-v1",
    label: "SYNTHETIC",
    incident: {
      incidentId: "inc-cert-alloy-hold",
      summary: "Incoming alloy lot certificate quantity does not match receiving record; only 3 of 100 pieces arrived and the lot is held.",
      heldMaterialId: "MAT-ALLOY-A",
      discrepancy: "certificate claims 100 each; receiving posted 3 each",
    },
    materials: [
      {
        materialId: "MAT-ALLOY-A",
        unit: "each",
        onHand: 3,
        held: 3,
        substitutes: ["MAT-ALLOY-B"],
        replenishmentHours: 48,
        unitCostUsd: 12,
      },
      {
        materialId: "MAT-ALLOY-B",
        unit: "each",
        onHand: 100,
        held: 0,
        substitutes: [],
        replenishmentHours: null,
        unitCostUsd: 14,
      },
    ],
    cells: [
      {
        cellId: "CELL-MILL-1",
        availableHours: 40,
        hourlyCostUsd: 85,
        compatibleMaterials: ["MAT-ALLOY-A", "MAT-ALLOY-B"],
        online: true,
      },
      {
        cellId: "CELL-MILL-2",
        availableHours: 24,
        hourlyCostUsd: 90,
        compatibleMaterials: ["MAT-ALLOY-B"],
        online: true,
      },
    ],
    jobs: [
      {
        jobId: "JOB-1001",
        materialId: "MAT-ALLOY-A",
        unitsRequired: 60,
        hoursPerUnit: 0.5,
        preferredCellId: "CELL-MILL-1",
        dueHours: 36,
      },
      {
        jobId: "JOB-1002",
        materialId: "MAT-ALLOY-A",
        unitsRequired: 40,
        hoursPerUnit: 0.5,
        preferredCellId: "CELL-MILL-1",
        dueHours: 48,
      },
    ],
    evidenceRecords: [
      {
        evidenceId: "ev-cert-qty",
        documentId: "doc-cert-441",
        recordId: "rec-cert-line-3",
        lineId: "L3",
        field: "quantity",
        quantity: { value: 100, unit: "each" },
        excerpt: "Certificate line L3 quantity=100 each for lot ALLOY-A.",
      },
      {
        evidenceId: "ev-recv-qty",
        documentId: "doc-recv-882",
        recordId: "rec-recv-posted",
        lineId: "R1",
        field: "quantity",
        quantity: { value: 3, unit: "each" },
        excerpt: "Receiving post R1 quantity=3 each for lot ALLOY-A; hold applied.",
      },
      {
        evidenceId: "ev-sub-stock",
        documentId: "doc-inv-snap",
        recordId: "rec-inv-alloy-b",
        field: "onHand",
        quantity: { value: 100, unit: "each" },
        excerpt: "Verified substitute MAT-ALLOY-B on-hand=100 each, not held.",
      },
    ],
    assumptions: [
      "Quantities use the current certificate, receiving and stock records.",
      "Cell costs use the hourly rates in this snapshot.",
    ],
  };
}
