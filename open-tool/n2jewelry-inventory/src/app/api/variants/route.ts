import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { variants } from "@/lib/db/schema";

const schema = z.object({
  productId: z.string().uuid(),
  optionValues: z.record(z.string(), z.string()),
  imageUrl: z.string().url().optional()
});

export async function GET() {
  try {
    return ok(await db.select().from(variants));
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    requireRole(roleFromHeaders(new Headers(request.headers)), "Production");
    const payload = schema.parse(await request.json());
    const [item] = await db.insert(variants).values(payload).returning();
    return ok(item, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
