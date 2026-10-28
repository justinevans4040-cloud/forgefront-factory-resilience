/** WSJF and Little's Law — ported from PMP Mastery (Justin Evans IP). */

export function calculateWsjf(businessValue, timeCriticality, riskReduction, jobSize) {
  const size = jobSize <= 0 ? 1 : jobSize;
  return (businessValue + timeCriticality + riskReduction) / size;
}

export function averageItemsInSystem(arrivalRate, averageTimeInSystem) {
  return arrivalRate * averageTimeInSystem;
}

export function averageTimeInSystem(itemsInSystem, throughputRate) {
  return throughputRate === 0 ? 0 : itemsInSystem / throughputRate;
}
