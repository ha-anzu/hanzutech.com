export type MetalCostInput = {
  finishedWeightGrams: number;
  lossPct: number;
  unitPricePerGram: number;
  purity: number;
};

export type MetalCostOutput = {
  lossGrams: number;
  totalMetalUsedGrams: number;
  effectiveUnitPricePerGram: number;
  metalTotalCost: number;
};

export function calculateMetalCost(input: MetalCostInput): MetalCostOutput {
  const finishedWeight = Number.isFinite(input.finishedWeightGrams) ? input.finishedWeightGrams : 0;
  const lossPct = Number.isFinite(input.lossPct) ? input.lossPct : 0;
  const unitPrice = Number.isFinite(input.unitPricePerGram) ? input.unitPricePerGram : 0;
  const purity = Number.isFinite(input.purity) ? input.purity : 1;

  const lossGrams = finishedWeight * (lossPct / 100);
  const totalMetalUsedGrams = finishedWeight + lossGrams;
  const effectiveUnitPricePerGram = unitPrice * purity;
  const metalTotalCost = totalMetalUsedGrams * effectiveUnitPricePerGram;

  return {
    lossGrams,
    totalMetalUsedGrams,
    effectiveUnitPricePerGram,
    metalTotalCost
  };
}
