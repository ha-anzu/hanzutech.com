import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { inventoryBalances, stockMovements } from "@/lib/db/schema";

export type MovementInput = {
  movementType: "in" | "out" | "adjust" | "transfer" | "consume" | "produce" | "consignment" | "sale" | "return";
  skuId: string;
  fromLocationId?: string;
  toLocationId?: string;
  quantity: number;
  currency?: "USD" | "THB" | "MYR";
  referenceType: string;
  referenceId?: string;
  notes?: string;
  performedBy?: string;
  overrideNegative?: boolean;
};

export type BalanceState = {
  skuId: string;
  locationId: string;
  qtyOnHand: number;
  qtyReserved: number;
};

export function applyMovementRule(
  before: BalanceState | null,
  input: MovementInput,
  allowNegative: boolean
): { nextQtyOnHand: number } {
  const current = before?.qtyOnHand ?? 0;
  let next = current;

  if (["out", "consume", "sale", "consignment"].includes(input.movementType)) {
    next = current - input.quantity;
  } else if (["in", "produce", "return"].includes(input.movementType)) {
    next = current + input.quantity;
  } else if (input.movementType === "adjust") {
    next = input.quantity;
  }

  if (next < 0 && !allowNegative) {
    throw new Error("Negative inventory is blocked. Admin override required.");
  }

  return { nextQtyOnHand: next };
}

async function upsertBalance(skuId: string, locationId: string, nextQty: number) {
  const existing = await db.query.inventoryBalances.findFirst({
    where: and(eq(inventoryBalances.skuId, skuId), eq(inventoryBalances.locationId, locationId))
  });

  if (!existing) {
    await db.insert(inventoryBalances).values({
      skuId,
      locationId,
      qtyOnHand: nextQty,
      qtyReserved: 0
    });
    return;
  }

  await db
    .update(inventoryBalances)
    .set({ qtyOnHand: nextQty, updatedAt: new Date() })
    .where(and(eq(inventoryBalances.skuId, skuId), eq(inventoryBalances.locationId, locationId)));
}

export async function recordMovement(input: MovementInput) {
  if (!Number.isInteger(input.quantity) || input.quantity < 0) {
    throw new Error("Quantity must be a positive integer.");
  }

  const outboundLocation = input.fromLocationId ?? input.toLocationId;
  if (!outboundLocation) {
    throw new Error("Movement must include at least one location.");
  }

  const fromBalance = await db.query.inventoryBalances.findFirst({
    where: and(eq(inventoryBalances.skuId, input.skuId), eq(inventoryBalances.locationId, outboundLocation))
  });

  const applyOnFrom = ["out", "consume", "sale", "consignment", "adjust"].includes(input.movementType);
  if (applyOnFrom) {
    const afterFrom = applyMovementRule(fromBalance ?? null, input, !!input.overrideNegative);
    await upsertBalance(input.skuId, outboundLocation, afterFrom.nextQtyOnHand);
  }

  if (input.movementType === "transfer" && input.toLocationId) {
    const toBalance = await db.query.inventoryBalances.findFirst({
      where: and(eq(inventoryBalances.skuId, input.skuId), eq(inventoryBalances.locationId, input.toLocationId))
    });
    const afterTo = applyMovementRule(
      toBalance
        ? {
            skuId: toBalance.skuId,
            locationId: toBalance.locationId,
            qtyOnHand: toBalance.qtyOnHand,
            qtyReserved: toBalance.qtyReserved
          }
        : null,
      { ...input, movementType: "in" },
      true
    );
    await upsertBalance(input.skuId, input.toLocationId, afterTo.nextQtyOnHand);
  }

  if (["in", "produce", "return"].includes(input.movementType) && input.toLocationId) {
    const toBalance = await db.query.inventoryBalances.findFirst({
      where: and(eq(inventoryBalances.skuId, input.skuId), eq(inventoryBalances.locationId, input.toLocationId))
    });
    const afterTo = applyMovementRule(
      toBalance
        ? {
            skuId: toBalance.skuId,
            locationId: toBalance.locationId,
            qtyOnHand: toBalance.qtyOnHand,
            qtyReserved: toBalance.qtyReserved
          }
        : null,
      input,
      true
    );
    await upsertBalance(input.skuId, input.toLocationId, afterTo.nextQtyOnHand);
  }

  const [movement] = await db
    .insert(stockMovements)
    .values({
      movementType: input.movementType,
      skuId: input.skuId,
      fromLocationId: input.fromLocationId,
      toLocationId: input.toLocationId,
      quantity: input.quantity,
      currency: input.currency ?? "USD",
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      notes: input.notes,
      performedBy: input.performedBy,
      overrideNegative: !!input.overrideNegative
    })
    .returning();

  return movement;
}
