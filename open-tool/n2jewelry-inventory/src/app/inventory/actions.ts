"use server";

import { revalidatePath } from "next/cache";
import { recordMovement } from "@/lib/inventory/movement";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function adjustStockAction(formData: FormData): Promise<ActionResult<{ movementId: string }>> {
  try {
    const skuId = getText(formData, "skuId");
    const locationId = getText(formData, "locationId");
    const reason = getText(formData, "reason");
    const delta = Number(getText(formData, "delta"));
    const overrideNegative = getText(formData, "overrideNegative") === "on";
    const adminOverrideNote = getText(formData, "adminOverrideNote");

    if (!skuId || !locationId) {
      throw new Error("SKU and location are required");
    }
    if (!Number.isFinite(delta) || delta === 0) {
      throw new Error("Adjustment delta must be a non-zero number");
    }
    if (!reason) {
      throw new Error("Reason is required");
    }
    if (delta < 0 && overrideNegative && !adminOverrideNote) {
      throw new Error("Admin override note is required when negative override is enabled");
    }

    const movement =
      delta > 0
        ? await recordMovement({
            movementType: "in",
            skuId,
            toLocationId: locationId,
            quantity: Math.trunc(Math.abs(delta)),
            referenceType: "manual_adjustment",
            notes: `Stock adjustment: ${reason}`
          })
        : await recordMovement({
            movementType: "out",
            skuId,
            fromLocationId: locationId,
            quantity: Math.trunc(Math.abs(delta)),
            referenceType: "manual_adjustment",
            notes: `Stock adjustment: ${reason}${adminOverrideNote ? ` | override: ${adminOverrideNote}` : ""}`,
            overrideNegative
          });

    revalidatePath("/inventory");
    revalidatePath("/scan");

    return { ok: true, data: { movementId: movement.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to adjust stock" };
  }
}
