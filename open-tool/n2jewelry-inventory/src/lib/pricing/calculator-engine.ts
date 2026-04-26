export type CalculatorPricingInput = {
  metalType: string;
  purity: number;
  metalWeightGrams: number;
  metalLossPct: number;
  unitPricePerGram: number;
  stoneCarats: number;
  stonePricePerCarat: number;
  laborQty: number;
  laborUnitPrice: number;
  vatPct: number;
  markupMultiplier: number;
  extraMultiplier: number;
};

export type PricingBreakdown = {
  metalCost: number;
  stoneCost: number;
  laborCost: number;
  subtotal: number;
  vatAmount: number;
  estCost: number;
  suggestedSellingPrice: number;
  inputs: CalculatorPricingInput;
};

const DEFAULTS = {
  XAG: {
    purity: 0.925,
    markup: 2.2
  },
  XAU: {
    purity: 0.75,
    markup: 2.5
  },
  XPT: {
    purity: 0.95,
    markup: 2.4
  },
  XPD: {
    purity: 0.95,
    markup: 2.4
  },
  CUSTOM: {
    purity: 1,
    markup: 2.3
  }
} as const;

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toUpper(value: unknown, fallback = "XAG") {
  const text = String(value ?? fallback).trim().toUpperCase();
  return text || fallback;
}

export function getDefaultPurity(metalType: string) {
  const key = toUpper(metalType) as keyof typeof DEFAULTS;
  return DEFAULTS[key]?.purity ?? DEFAULTS.CUSTOM.purity;
}

export function getDefaultMarkupMultiplier(metalType: string) {
  const key = toUpper(metalType) as keyof typeof DEFAULTS;
  return DEFAULTS[key]?.markup ?? DEFAULTS.CUSTOM.markup;
}

export function computeCalculatorPricing(input: CalculatorPricingInput): PricingBreakdown {
  const lossGrams = input.metalWeightGrams * (input.metalLossPct / 100);
  const totalMetalUsed = input.metalWeightGrams + lossGrams;
  const metalCost = totalMetalUsed * (input.unitPricePerGram * input.purity);

  const stoneCost = input.stoneCarats * input.stonePricePerCarat;
  const laborCost = input.laborQty * input.laborUnitPrice;
  const subtotal = metalCost + stoneCost + laborCost;
  const vatAmount = subtotal * (input.vatPct / 100);
  const estCost = subtotal + vatAmount;

  const suggestedSellingPrice = estCost * input.markupMultiplier * input.extraMultiplier;

  return {
    metalCost,
    stoneCost,
    laborCost,
    subtotal,
    vatAmount,
    estCost,
    suggestedSellingPrice,
    inputs: input
  };
}

export function parseVariantPricingInput(optionValues: Record<string, string>, silverSpotPriceUsd: number): CalculatorPricingInput {
  const metalFromValue = toUpper(optionValues.pricingMetalType || optionValues.metalType || optionValues.metal || "XAG");
  const purityDefault = getDefaultPurity(metalFromValue);

  const input: CalculatorPricingInput = {
    metalType: metalFromValue,
    purity: toNumber(optionValues.pricingPurity ?? optionValues.purity, purityDefault),
    metalWeightGrams: toNumber(optionValues.pricingMetalWeightGrams ?? optionValues.metalWeightGrams ?? optionValues.weightGrams, 19),
    metalLossPct: toNumber(optionValues.pricingMetalLossPct ?? optionValues.lossPct, 11),
    unitPricePerGram: toNumber(optionValues.pricingUnitPricePerGram, silverSpotPriceUsd),
    stoneCarats: toNumber(optionValues.pricingStoneCarats ?? optionValues.carats, 0),
    stonePricePerCarat: toNumber(optionValues.pricingStonePricePerCarat, 0),
    laborQty: toNumber(optionValues.pricingLaborQty, 1),
    laborUnitPrice: toNumber(optionValues.pricingLaborUnitPrice, 45),
    vatPct: toNumber(optionValues.pricingVatPct, 0),
    markupMultiplier: toNumber(optionValues.pricingMarkupMultiplier, getDefaultMarkupMultiplier(metalFromValue)),
    extraMultiplier: toNumber(optionValues.pricingExtraMultiplier, 1)
  };

  if (input.purity > 1.2) {
    input.purity = input.purity / 100;
  }

  return input;
}
