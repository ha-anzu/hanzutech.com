import { eq } from "drizzle-orm";
import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { consignmentSettlements, consignmentShipments } from "@/lib/db/schema";
import { recordMovement } from "@/lib/inventory/movement";

const schema = z.object({
  settlementCode: z.string().min(2),
  shipmentId: z.string().uuid(),
  soldLines: z.array(z.object({ skuId: z.string().uuid(), soldQty: z.number().int().nonnegative(), soldAmount: z.number().nonnegative() })),
  returnedLines: z.array(z.object({ skuId: z.string().uuid(), qty: z.number().int().nonnegative() })).default([]),
  currency: z.enum(["USD", "THB", "MYR"]).default("USD")
});

export async function GET() {
  try {
    return ok(await db.select().from(consignmentSettlements));
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    requireRole(roleFromHeaders(new Headers(request.headers)), "Sales");
    const payload = schema.parse(await request.json());
    const [shipment] = await db.select().from(consignmentShipments).where(eq(consignmentShipments.id, payload.shipmentId));
    if (!shipment) {
      throw new Error("Shipment not found");
    }

    for (const sold of payload.soldLines) {
      if (sold.soldQty > 0) {
        await recordMovement({
          movementType: "sale",
          skuId: sold.skuId,
          fromLocationId: shipment.toLocationId,
          quantity: sold.soldQty,
          referenceType: "consignment_settlement",
          referenceId: payload.shipmentId
        });
      }
    }

    for (const returned of payload.returnedLines) {
      if (returned.qty > 0) {
        await recordMovement({
          movementType: "return",
          skuId: returned.skuId,
          fromLocationId: shipment.toLocationId,
          toLocationId: shipment.fromLocationId,
          quantity: returned.qty,
          referenceType: "consignment_settlement",
          referenceId: payload.shipmentId
        });
      }
    }

    const settlement = oneRow(await db.insert(consignmentSettlements).values(payload).returning(), "Create consignment settlement");
    return ok(settlement, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
