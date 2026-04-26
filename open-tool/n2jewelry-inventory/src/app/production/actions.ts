"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { inventoryLots, productionOrders } from "@/lib/db/schema";
import { recordMovement } from "@/lib/inventory/movement";
import { ensureSkuForVariant } from "@/lib/products/sku-ops";
import { calculateMetalCost } from "@/lib/production/costing";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

type InputLotEntry = {
  lotId: string;
  grams?: number;
  plannedGrams?: number;
  actualGrams?: number;
  unitCost?: number;
  purity?: number;
  lossPct?: number;
  totalCost?: number;
  lotCode?: string;
  consumedAt?: string;
};

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function num(formData: FormData, key: string) {
  const value = Number(text(formData, key));
  return Number.isFinite(value) ? value : 0;
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function createProductionOrderAction(formData: FormData): Promise<ActionResult<{ orderId: string; orderCode: string }>> {
  try {
    const variantId = text(formData, "variantId");
    const targetQty = Math.trunc(num(formData, "targetQty"));
    const lotId = text(formData, "lotId");
    const plannedFinishedWeightGrams = num(formData, "plannedFinishedWeightGrams");
    const plannedLossPct = num(formData, "plannedLossPct");

    if (!variantId || !lotId || targetQty <= 0 || plannedFinishedWeightGrams <= 0) {
      throw new Error("Variant, quantity, lot, and planned grams are required");
    }

    const sku = await ensureSkuForVariant(variantId);
    const [lot] = await db.select().from(inventoryLots).where(eq(inventoryLots.id, lotId));
    if (!lot) {
      throw new Error("Metal lot not found");
    }

    const unitCost = toNumber(lot.costTotal) / Math.max(1, toNumber(lot.gramsReceived));
    const purity = toNumber(lot.purity);

    const costing = calculateMetalCost({
      finishedWeightGrams: plannedFinishedWeightGrams,
      lossPct: plannedLossPct,
      unitPricePerGram: unitCost,
      purity
    });

    if (toNumber(lot.gramsAvailable) < costing.totalMetalUsedGrams) {
      throw new Error("Planned metal usage exceeds available grams in selected lot");
    }

    const stamp = Date.now().toString();
    const orderCode = `PO-${stamp.slice(-8)}-${sku.skuCode.slice(0, 6)}`;

    const inputLots: InputLotEntry[] = [
      {
        lotId,
        lotCode: lot.lotCode,
        plannedGrams: Number(costing.totalMetalUsedGrams.toFixed(4)),
        lossPct: plannedLossPct,
        purity,
        unitCost,
        totalCost: Number(costing.metalTotalCost.toFixed(4))
      }
    ];

    const order = oneRow(
      await db
        .insert(productionOrders)
        .values({
          orderCode,
          skuId: sku.id,
          targetQty,
          completedQty: 0,
          status: "open",
          inputLots
        })
        .returning(),
      "Create production order"
    );

    revalidatePath("/production");
    revalidatePath("/products");

    return { ok: true, data: { orderId: order.id, orderCode: order.orderCode } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create production order" };
  }
}

export async function completeProductionOrderAction(formData: FormData): Promise<ActionResult<{ orderId: string }>> {
  try {
    const orderId = text(formData, "orderId");
    const toLocationId = text(formData, "toLocationId");
    const completeQty = Math.trunc(num(formData, "completeQty"));
    const actualFinishedWeightGrams = num(formData, "actualFinishedWeightGrams");
    const actualLossPct = num(formData, "actualLossPct");

    if (!orderId || !toLocationId || completeQty <= 0 || actualFinishedWeightGrams <= 0) {
      throw new Error("Order, location, quantity, and actual grams are required");
    }

    const [order] = await db.select().from(productionOrders).where(eq(productionOrders.id, orderId));
    if (!order) {
      throw new Error("Production order not found");
    }
    if (order.status === "completed") {
      throw new Error("Order already completed");
    }

    const entries = (order.inputLots ?? []) as InputLotEntry[];
    if (entries.length === 0) {
      throw new Error("Order has no planned lot consumption");
    }

    const lotIds = entries.map((entry) => entry.lotId);
    const lots = await db.select().from(inventoryLots).where(eq(inventoryLots.id, lotIds[0]));
    const lotMap = new Map(lots.map((lot) => [lot.id, lot]));
    if (lotIds.length > 1) {
      const remainingIds = lotIds.slice(1);
      for (const lotId of remainingIds) {
        const [lot] = await db.select().from(inventoryLots).where(eq(inventoryLots.id, lotId));
        if (lot) {
          lotMap.set(lot.id, lot);
        }
      }
    }

    const plannedTotal = entries.reduce((sum, entry) => sum + toNumber(entry.plannedGrams ?? entry.grams), 0);
    if (plannedTotal <= 0) {
      throw new Error("Order planned grams are invalid");
    }

    const blendedUnitPrice = entries.reduce((sum, entry) => sum + toNumber(entry.unitCost), 0) / Math.max(1, entries.length);
    const blendedPurity = entries.reduce((sum, entry) => sum + toNumber(entry.purity), 0) / Math.max(1, entries.length);

    const costing = calculateMetalCost({
      finishedWeightGrams: actualFinishedWeightGrams,
      lossPct: actualLossPct,
      unitPricePerGram: blendedUnitPrice,
      purity: blendedPurity || 1
    });

    const actualTotalUsed = costing.totalMetalUsedGrams;

    const updates: Array<{ lotId: string; nextAvailable: number; entry: InputLotEntry }> = [];

    for (const entry of entries) {
      const planned = toNumber(entry.plannedGrams ?? entry.grams);
      const ratio = planned / plannedTotal;
      const actualGrams = Number((actualTotalUsed * ratio).toFixed(4));
      const lot = lotMap.get(entry.lotId);
      if (!lot) {
        throw new Error("Linked lot not found while completing order");
      }

      const available = toNumber(lot.gramsAvailable);
      if (available < actualGrams) {
        throw new Error(`Insufficient grams in lot ${lot.lotCode}`);
      }

      const unitCost = toNumber(entry.unitCost || toNumber(lot.costTotal) / Math.max(1, toNumber(lot.gramsReceived)));
      const purity = toNumber(entry.purity || lot.purity || 1);
      const lotCosting = calculateMetalCost({
        finishedWeightGrams: actualGrams,
        lossPct: 0,
        unitPricePerGram: unitCost,
        purity
      });

      updates.push({
        lotId: lot.id,
        nextAvailable: Number((available - actualGrams).toFixed(4)),
        entry: {
          ...entry,
          lotCode: lot.lotCode,
          actualGrams,
          consumedAt: new Date().toISOString(),
          lossPct: actualLossPct,
          unitCost,
          purity,
          totalCost: Number(lotCosting.metalTotalCost.toFixed(4))
        }
      });
    }

    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx.update(inventoryLots).set({ gramsAvailable: String(update.nextAvailable) }).where(eq(inventoryLots.id, update.lotId));
      }

      await tx
        .update(productionOrders)
        .set({
          completedQty: order.completedQty + completeQty,
          status: "completed",
          inputLots: updates.map((update) => update.entry)
        })
        .where(eq(productionOrders.id, orderId));
    });

    await recordMovement({
      movementType: "produce",
      skuId: order.skuId,
      toLocationId,
      quantity: completeQty,
      referenceType: "production_order",
      referenceId: order.id,
      notes: `Auto completed with actual ${actualFinishedWeightGrams.toFixed(2)}g and ${actualLossPct.toFixed(2)}% loss`
    });

    revalidatePath("/production");
    revalidatePath("/inventory");

    return { ok: true, data: { orderId } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to complete production order" };
  }
}
