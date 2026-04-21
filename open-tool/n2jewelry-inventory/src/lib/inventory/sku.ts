type SkuInput = {
  categoryCode: string;
  productCode: string;
  materialCode: string;
  variantCode: string;
  sequence: number;
};

const clean = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);

export function generateSku(input: SkuInput): string {
  if (input.sequence < 1) {
    throw new Error("Sequence must be >= 1");
  }
  const seq = String(input.sequence).padStart(4, "0");
  return [clean(input.categoryCode), clean(input.productCode), clean(input.materialCode), clean(input.variantCode), seq]
    .filter(Boolean)
    .join("-");
}

export function generateBarcodeValue(sku: string): string {
  return `N2-${sku}`;
}
