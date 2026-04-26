"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { consignmentShipments, productionOrders } from "@/lib/db/schema";
import { recordMovement } from "@/lib/inventory/movement";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function text(formData: FormData, key: string) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function moveStockAction(formData: FormData): Promise<ActionResult<{ movementId: string }>> {
  try {
    const skuId = text(formData, "skuId");
    const fromLocationId = text(formData, "fromLocationId");
    const toLocationId = text(formData, "toLocationId");
    const quantity = Number(text(formData, "quantity"));
    const notes = text(formData, "notes");
    const overrideNegative = text(formData, "overrideNegative") === "on";

    if (!skuId || !fromLocationId || !toLocationId || fromLocationId === toLocationId) {
      throw new Error("Valid from/to locations and SKU are required");
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    const movement = await recordMovement({
      movementType: "transfer",
      skuId,
      fromLocationId,
      toLocationId,
      quantity: Math.trunc(quantity),
      referenceType: "scanner_move",
      notes,
      overrideNegative
    });

    revalidatePath("/inventory");
    revalidatePath("/scan");

    return { ok: true, data: { movementId: movement.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to move stock" };
  }
}

export async function startProductionAction(formData: FormData): Promise<ActionResult<{ orderCode: string }>> {
  try {
    const skuId = text(formData, "skuId");
    const targetQty = Number(text(formData, "targetQty"));
    if (!skuId || !Number.isFinite(targetQty) || targetQty <= 0) {
      throw new Error("SKU and positive target qty are required");
    }

    const orderCode = `PO-${Date.now().toString().slice(-8)}-${skuId.slice(0, 6)}`;
    const order = oneRow(
      await db
        .insert(productionOrders)
        .values({
          orderCode,
          skuId,
          targetQty: Math.trunc(targetQty),
          completedQty: 0,
          status: "open",
          inputLots: []
        })
        .returning(),
      "Create production order"
    );

    revalidatePath("/scan");
    return { ok: true, data: { orderCode: order.orderCode } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to start production" };
  }
}

export async function shipConsignmentAction(formData: FormData): Promise<ActionResult<{ shipmentCode: string }>> {
  try {
    const skuId = text(formData, "skuId");
    const accountId = text(formData, "accountId");
    const fromLocationId = text(formData, "fromLocationId");
    const toLocationId = text(formData, "toLocationId");
    const quantity = Number(text(formData, "quantity"));
    const unitPrice = Number(text(formData, "unitPrice"));

    if (!skuId || !accountId || !fromLocationId || !toLocationId) {
      throw new Error("Account, locations, and SKU are required");
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Quantity must be positive");
    }
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error("Unit price must be positive");
    }

    const shipmentCode = `CS-${Date.now().toString().slice(-8)}-${skuId.slice(0, 6)}`;
    const shipment = oneRow(
      await db
        .insert(consignmentShipments)
        .values({
          shipmentCode,
          accountId,
          fromLocationId,
          toLocationId,
          lines: [{ skuId, qty: Math.trunc(quantity), unitPrice }],
          status: "shipped"
        })
        .returning(),
      "Create consignment shipment"
    );

    await recordMovement({
      movementType: "consignment",
      skuId,
      fromLocationId,
      toLocationId,
      quantity: Math.trunc(quantity),
      referenceType: "consignment_shipment",
      referenceId: shipment.id
    });

    revalidatePath("/inventory");
    revalidatePath("/scan");

    return { ok: true, data: { shipmentCode: shipment.shipmentCode } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to ship consignment" };
  }
}
