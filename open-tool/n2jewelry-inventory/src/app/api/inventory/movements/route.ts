import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { canOverrideNegative, requireRole, roleFromHeaders } from "@/lib/auth";
import { recordMovement } from "@/lib/inventory/movement";

const schema = z.object({
  movementType: z.enum(["in", "out", "adjust", "transfer", "consume", "produce", "consignment", "sale", "return"]),
  skuId: z.string().uuid(),
  fromLocationId: z.string().uuid().optional(),
  toLocationId: z.string().uuid().optional(),
  quantity: z.number().int().positive(),
  currency: z.enum(["USD", "THB", "MYR"]).optional(),
  referenceType: z.string().min(1),
  referenceId: z.string().uuid().optional(),
  notes: z.string().optional(),
  performedBy: z.string().uuid().optional(),
  overrideNegative: z.boolean().optional()
});

export async function POST(request: Request) {
  try {
    const role = roleFromHeaders(new Headers(request.headers));
    requireRole(role, "Warehouse");
    const payload = schema.parse(await request.json());
    if (payload.overrideNegative && !canOverrideNegative(role)) {
      throw new Error("Only Admin may override negative inventory");
    }

    const movement = await recordMovement(payload);
    return ok(movement, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
