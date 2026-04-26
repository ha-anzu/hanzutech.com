export type OrderLotEntry = {
  plannedGrams?: number;
  grams?: number;
  actualGrams?: number;
  unitCost?: number;
  purity?: number;
  totalCost?: number;
};

export type OrderCostInput = {
  targetQty: number;
  completedQty: number;
  inputLots?: OrderLotEntry[];
};

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function estimateOrderUnitCost(order: OrderCostInput): number {
  const lots = Array.isArray(order.inputLots) ? order.inputLots : [];

  const actualCost = lots.reduce((sum, lot) => {
    const direct = toNumber(lot.totalCost);
    if (direct > 0) return sum + direct;
    const grams = toNumber(lot.actualGrams);
    const unit = toNumber(lot.unitCost);
    const purity = toNumber(lot.purity) || 1;
    return sum + grams * unit * purity;
  }, 0);

  if (actualCost > 0 && order.completedQty > 0) {
    return actualCost / order.completedQty;
  }

  const plannedCost = lots.reduce((sum, lot) => {
    const grams = toNumber(lot.plannedGrams ?? lot.grams);
    const unit = toNumber(lot.unitCost);
    const purity = toNumber(lot.purity) || 1;
    return sum + grams * unit * purity;
  }, 0);

  if (plannedCost > 0 && order.targetQty > 0) {
    return plannedCost / order.targetQty;
  }

  return 0;
}
