import { describe, expect, it } from "vitest";
import { generateBarcodeValue, generateSku } from "@/lib/inventory/sku";

describe("SKU generation", () => {
  it("builds normalized deterministic SKU", () => {
    const sku = generateSku({
      categoryCode: "ring",
      productCode: "n2-1101",
      materialCode: "925",
      variantCode: "7-blk",
      sequence: 12
    });

    expect(sku).toBe("RING-N21101-925-7BLK-0012");
    expect(generateBarcodeValue(sku)).toBe("N2-RING-N21101-925-7BLK-0012");
  });

  it("rejects invalid sequence", () => {
    expect(() =>
      generateSku({
        categoryCode: "ring",
        productCode: "p1",
        materialCode: "925",
        variantCode: "x",
        sequence: 0
      })
    ).toThrow();
  });
});
