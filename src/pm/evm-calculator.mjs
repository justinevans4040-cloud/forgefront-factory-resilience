/** Earned value metrics — ported from PMP Mastery EvmCalculatorService. */

export function calculateEvm(inputs) {
  const pv = inputs.plannedValue;
  const ev = inputs.earnedValue;
  const ac = inputs.actualCost;
  const bac = inputs.budgetAtCompletion;

  const cv = ev - ac;
  const sv = ev - pv;
  const cpi = ac === 0 ? 0 : ev / ac;
  const spi = pv === 0 ? 0 : ev / pv;
  const eac = cpi === 0 ? bac : bac / cpi;
  const etc = eac - ac;
  const vac = bac - eac;
  const denom = bac - ac;
  const tcpi = denom === 0 ? 0 : (bac - ev) / denom;

  const cost = cpi >= 1 ? "under or at budget" : "over budget";
  const schedule = spi >= 1 ? "ahead or on schedule" : "behind schedule";
  const interpretation = `Cost: ${cost} (CV ${cv.toFixed(2)}, CPI ${cpi.toFixed(3)}). Schedule: ${schedule} (SV ${sv.toFixed(2)}, SPI ${spi.toFixed(3)}).`;

  return {
    plannedValue: +pv.toFixed(2),
    earnedValue: +ev.toFixed(2),
    actualCost: +ac.toFixed(2),
    budgetAtCompletion: +bac.toFixed(2),
    costVariance: +cv.toFixed(2),
    scheduleVariance: +sv.toFixed(2),
    costPerformanceIndex: +cpi.toFixed(4),
    schedulePerformanceIndex: +spi.toFixed(4),
    estimateAtCompletion: +eac.toFixed(2),
    estimateToComplete: +etc.toFixed(2),
    varianceAtCompletion: +vac.toFixed(2),
    toCompletePerformanceIndex: +tcpi.toFixed(4),
    interpretation,
    synthetic: true
  };
}
