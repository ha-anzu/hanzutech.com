import { eq } from "drizzle-orm";
import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { metalLots, productionOrders } from "@/lib/db/schema";

const schema = z.object({
  orderId: z.string().uuid(),
  lotId: z.string().uuid(),
  grams: z.number().positive()
});

export async function POST(request: Request) {
  try {
    requireRole(roleFromHeaders(new Headers(request.headers)), "Production");
    const payload = schema.parse(await request.json());
    const [order] = await db.select().from(productionOrders).where(eq(productionOrders.id, payload.orderId));
    if (!order) {
      throw new Error("Production order not found");
    }

    const [lot] = await db.select().from(metalLots).where(eq(metalLots.id, payload.lotId));
    if (!lot) {
      throw new Error("Metal lot not found");
    }
    if (Number(lot.gramsAvailable) < payload.grams) {
      throw new Error("Insufficient grams in lot");
    }

    await db
      .update(metalLots)
      .set({ gramsAvailable: String(Number(lot.gramsAvailable) - payload.grams) })
      .where(eq(metalLots.id, payload.lotId));

    const updatedLots = [...order.inputLots, { lotId: payload.lotId, grams: payload.grams }];
    const [updatedOrder] = await db
      .update(productionOrders)
      .set({ inputLots: updatedLots })
      .where(eq(productionOrders.id, payload.orderId))
      .returning();

    return ok(updatedOrder);
  } catch (error) {
    return fail(error, 400);
  }
}
