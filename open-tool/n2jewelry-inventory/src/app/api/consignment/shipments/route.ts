import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { consignmentShipments } from "@/lib/db/schema";
import { recordMovement } from "@/lib/inventory/movement";

const schema = z.object({
  shipmentCode: z.string().min(2),
  accountId: z.string().uuid(),
  fromLocationId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  lines: z.array(z.object({ skuId: z.string().uuid(), qty: z.number().int().positive(), unitPrice: z.number().positive() })).min(1)
});

export async function GET() {
  try {
    return ok(await db.select().from(consignmentShipments));
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    requireRole(roleFromHeaders(new Headers(request.headers)), "Sales");
    const payload = schema.parse(await request.json());
    const shipment = oneRow(await db.insert(consignmentShipments).values(payload).returning(), "Create consignment shipment");

    for (const line of payload.lines) {
      await recordMovement({
        movementType: "consignment",
        skuId: line.skuId,
        fromLocationId: payload.fromLocationId,
        toLocationId: payload.toLocationId,
        quantity: line.qty,
        referenceType: "consignment_shipment",
        referenceId: shipment.id
      });
    }

    return ok(shipment, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
