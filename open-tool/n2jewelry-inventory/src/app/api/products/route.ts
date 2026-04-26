import { eq } from "drizzle-orm";
import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { products } from "@/lib/db/schema";

const createSchema = z.object({
  productCode: z.string().min(2),
  name: z.string().min(2),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional(),
  description: z.string().optional()
});

export async function GET() {
  try {
    const rows = await db.select().from(products);
    return ok(rows);
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const role = roleFromHeaders(new Headers(request.headers));
    requireRole(role, "Production");
    const payload = createSchema.parse(await request.json());

    const product = oneRow(await db.insert(products).values(payload).returning(), "Create product");
    return ok(product, 201);
  } catch (error) {
    return fail(error, 400);
  }
}

export async function PATCH(request: Request) {
  try {
    const role = roleFromHeaders(new Headers(request.headers));
    requireRole(role, "Production");

    const payload = z
      .object({
        id: z.string().uuid(),
        name: z.string().optional(),
        description: z.string().optional(),
        active: z.boolean().optional()
      })
      .parse(await request.json());

    const updateValues: Record<string, unknown> = {};
    if (payload.name !== undefined) updateValues.name = payload.name;
    if (payload.description !== undefined) updateValues.description = payload.description;
    if (payload.active !== undefined) updateValues.active = payload.active;

    const updated = oneRow(await db.update(products).set(updateValues).where(eq(products.id, payload.id)).returning(), "Update product");

    return ok(updated);
  } catch (error) {
    return fail(error, 400);
  }
}
