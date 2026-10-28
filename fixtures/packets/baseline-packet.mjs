export const BASELINE_PO = `PURCHASE ORDER CONFIRMATION
Buyer: Northstar Systems MRO
Purchase Order Number: PO-45892
Material: Titanium bar stock
Specification: AMS4928
Heat Number: H-7731
Lot Reference: LOT-TI-001
Quantity: 400 EA
Ship-to: Wake Industries / Bay 3
`;

export const BASELINE_INVENTORY = `RECEIVING / INVENTORY RECORD
Receipt ID: RCV-2026-8841
Purchase Order: PO-45892
Lot ID: LOT-TI-001
Heat Number: H-7731
Grade: AMS4928
Quantity Received: 400
Location: Q-BAY-12
Status: AWAITING-DOCUMENT-REVIEW
`;

export const CONFLICTING_PO_HEAT = BASELINE_PO.replace("H-7731", "H-7713");
