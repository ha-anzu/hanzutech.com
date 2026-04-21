import { describe, expect, it } from "vitest";
import { applyMovementRule, type MovementInput } from "@/lib/inventory/movement";

const outbound: MovementInput = {
  movementType: "sale",
  skuId: "a",
  quantity: 2,
  referenceType: "test"
};

describe("Movement engine", () => {
  it("blocks negatives by default", () => {
    expect(() =>
      applyMovementRule(
        { skuId: "a", locationId: "l1", qtyOnHand: 1, qtyReserved: 0 },
        outbound,
        false
      )
    ).toThrow(/Negative inventory/);
  });

  it("allows negatives with admin override", () => {
    const result = applyMovementRule(
      { skuId: "a", locationId: "l1", qtyOnHand: 1, qtyReserved: 0 },
      outbound,
      true
    );
    expect(result.nextQtyOnHand).toBe(-1);
  });

  it("adds stock on produce", () => {
    const result = applyMovementRule(
      { skuId: "a", locationId: "l1", qtyOnHand: 10, qtyReserved: 0 },
      { ...outbound, movementType: "produce", quantity: 5 },
      false
    );
    expect(result.nextQtyOnHand).toBe(15);
  });
});
