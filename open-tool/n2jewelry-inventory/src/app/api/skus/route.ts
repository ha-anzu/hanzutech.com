import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { skus } from "@/lib/db/schema";
import { generateSku } from "@/lib/inventory/sku";

const schema = z.object({
  variantId: z.string().uuid(),
  categoryCode: z.string().min(1),
  productCode: z.string().min(1),
  materialCode: z.string().min(1),
  variantCode: z.string().min(1),
  sequence: z.number().int().positive(),
  manualSkuCode: z.string().optional()
});

export async function GET() {
  try {
    return ok(await db.select().from(skus));
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    requireRole(roleFromHeaders(new Headers(request.headers)), "Production");
    const payload = schema.parse(await request.json());
    const skuCode = payload.manualSkuCode ? payload.manualSkuCode.trim().toUpperCase() : generateSku(payload);

    const [created] = await db
      .insert(skus)
      .values({
        variantId: payload.variantId,
        skuCode,
        manualOverride: !!payload.manualSkuCode
      })
      .returning();

    return ok(created, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
