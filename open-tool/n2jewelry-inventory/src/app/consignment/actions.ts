"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { consignmentAccounts, consignmentSettlements, consignmentShipments } from "@/lib/db/schema";
import { recordMovement } from "@/lib/inventory/movement";
import { ensureAgentLocation } from "@/lib/consignment/queries";

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function num(formData: FormData, key: string) {
  const value = Number(text(formData, key));
  return Number.isFinite(value) ? value : 0;
}

export async function createAgentAction(formData: FormData): Promise<ActionResult<{ agentId: string }>> {
  try {
    const accountCode = text(formData, "accountCode").toUpperCase();
    const accountName = text(formData, "accountName");
    const country = text(formData, "country") || "Malaysia";
    const currency = (text(formData, "currency") || "MYR") as "USD" | "THB" | "MYR";

    if (!accountCode || !accountName) {
      throw new Error("Agent code and name are required");
    }

    const account = oneRow(
      await db
        .insert(consignmentAccounts)
        .values({
          accountCode,
          accountName,
          country,
          currency
        })
        .onConflictDoUpdate({
          target: consignmentAccounts.accountCode,
          set: { accountName, country, currency }
        })
        .returning(),
      "Create agent"
    );

    await ensureAgentLocation(account.id);

    revalidatePath("/consignment");
    revalidatePath("/inventory");

    return { ok: true, data: { agentId: account.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create agent" };
  }
}

export async function createShipmentAction(formData: FormData): Promise<ActionResult<{ shipmentId: string }>> {
  try {
    const accountId = text(formData, "accountId");
    const fromLocationId = text(formData, "fromLocationId");
    const skuId = text(formData, "skuId");
    const qty = Math.trunc(num(formData, "qty"));
    const unitPrice = num(formData, "unitPrice");

    if (!accountId || !fromLocationId || !skuId || qty <= 0 || unitPrice <= 0) {
      throw new Error("Agent, source location, SKU, quantity, and unit price are required");
    }

    const agentLocation = await ensureAgentLocation(accountId);
    const shipmentCode = `CS-${Date.now().toString().slice(-8)}-${skuId.slice(0, 6)}`;

    const shipment = oneRow(
      await db
        .insert(consignmentShipments)
        .values({
          shipmentCode,
          accountId,
          fromLocationId,
          toLocationId: agentLocation.id,
          lines: [{ skuId, qty, unitPrice }],
          status: "shipped"
        })
        .returning(),
      "Create shipment"
    );

    await recordMovement({
      movementType: "consignment",
      skuId,
      fromLocationId,
      toLocationId: agentLocation.id,
      quantity: qty,
      referenceType: "consignment_shipment",
      referenceId: shipment.id,
      notes: `Consignment to ${agentLocation.name}`
    });

    revalidatePath("/consignment");
    revalidatePath("/inventory");

    return { ok: true, data: { shipmentId: shipment.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create shipment" };
  }
}

export async function createSettlementAction(formData: FormData): Promise<ActionResult<{ settlementId: string }>> {
  try {
    const shipmentId = text(formData, "shipmentId");
    const skuId = text(formData, "skuId");
    const soldQty = Math.trunc(num(formData, "soldQty"));
    const soldAmount = num(formData, "soldAmount");
    const returnedQty = Math.trunc(num(formData, "returnedQty"));
    const commissionPct = num(formData, "commissionPct");

    if (!shipmentId || !skuId || soldQty < 0 || soldAmount < 0 || returnedQty < 0) {
      throw new Error("Shipment, SKU, sold amounts, and return qty are required");
    }

    const [shipment] = await db.select().from(consignmentShipments).where(eq(consignmentShipments.id, shipmentId));
    if (!shipment) {
      throw new Error("Shipment not found");
    }

    const shipmentLines = (Array.isArray(shipment.lines) ? shipment.lines : []) as Array<{ skuId: string; qty: number; unitPrice: number }>;
    const line = shipmentLines.find((item) => item.skuId === skuId);
    if (!line) {
      throw new Error("Shipment line for selected SKU not found");
    }

    if (soldQty + returnedQty > line.qty) {
      throw new Error("Sold + returned qty cannot exceed shipped qty");
    }

    const cogs = soldQty * Number(line.unitPrice || 0);
    const agentPayout = soldAmount * (commissionPct / 100);
    const grossProfit = soldAmount - cogs - agentPayout;

    const soldLines = soldQty
      ? [
          {
            skuId,
            soldQty,
            soldAmount,
            cogs,
            agentPayout,
            grossProfit
          }
        ]
      : [];

    const returnedLines = returnedQty ? [{ skuId, qty: returnedQty }] : [];

    for (const sold of soldLines) {
      await recordMovement({
        movementType: "sale",
        skuId: sold.skuId,
        fromLocationId: shipment.toLocationId,
        quantity: sold.soldQty,
        referenceType: "consignment_settlement",
        referenceId: shipmentId,
        notes: `Settlement sold amount ${sold.soldAmount.toFixed(2)}, payout ${sold.agentPayout?.toFixed(2) ?? "0.00"}`
      });
    }

    for (const returned of returnedLines) {
      await recordMovement({
        movementType: "return",
        skuId: returned.skuId,
        fromLocationId: shipment.toLocationId,
        toLocationId: shipment.fromLocationId,
        quantity: returned.qty,
        referenceType: "consignment_settlement",
        referenceId: shipmentId,
        notes: "Returned from agent"
      });
    }

    const settlementCode = `STL-${Date.now().toString().slice(-8)}-${skuId.slice(0, 6)}`;
    const settlement = oneRow(
      await db
        .insert(consignmentSettlements)
        .values({
          settlementCode,
          shipmentId,
          soldLines,
          returnedLines,
          currency: "MYR"
        })
        .returning(),
      "Create settlement"
    );

    revalidatePath("/consignment");
    revalidatePath("/inventory");

    return { ok: true, data: { settlementId: settlement.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create settlement" };
  }
}
