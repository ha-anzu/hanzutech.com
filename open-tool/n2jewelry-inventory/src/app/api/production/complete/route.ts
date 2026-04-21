import { eq } from "drizzle-orm";
import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { productionOrders } from "@/lib/db/schema";
import { recordMovement } from "@/lib/inventory/movement";

const schema = z.object({
  orderId: z.string().uuid(),
  toLocationId: z.string().uuid(),
  quantity: z.number().int().positive()
});

export async function POST(request: Request) {
  try {
    requireRole(roleFromHeaders(new Headers(request.headers)), "Production");
    const payload = schema.parse(await request.json());
    const [order] = await db.select().from(productionOrders).where(eq(productionOrders.id, payload.orderId));
    if (!order) {
      throw new Error("Order not found");
    }

    const movement = await recordMovement({
      movementType: "produce",
      skuId: order.skuId,
      toLocationId: payload.toLocationId,
      quantity: payload.quantity,
      referenceType: "production_order",
      referenceId: order.id
    });

    const [updated] = await db
      .update(productionOrders)
      .set({ completedQty: order.completedQty + payload.quantity, status: "completed" })
      .where(eq(productionOrders.id, payload.orderId))
      .returning();

    return ok({ order: updated, movement });
  } catch (error) {
    return fail(error, 400);
  }
}
