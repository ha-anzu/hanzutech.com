import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { productionOrders } from "@/lib/db/schema";

const schema = z.object({
  orderCode: z.string().min(2),
  skuId: z.string().uuid(),
  targetQty: z.number().int().positive(),
  inputLots: z.array(z.object({ lotId: z.string().uuid(), grams: z.number().positive() })).default([])
});

export async function GET() {
  try {
    return ok(await db.select().from(productionOrders));
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    requireRole(roleFromHeaders(new Headers(request.headers)), "Production");
    const payload = schema.parse(await request.json());
    const created = oneRow(
      await db
        .insert(productionOrders)
        .values({
          ...payload,
          completedQty: 0,
          status: "open"
        })
        .returning(),
      "Create production order"
    );
    return ok(created, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
