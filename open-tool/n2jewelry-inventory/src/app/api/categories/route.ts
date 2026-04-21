import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { categories } from "@/lib/db/schema";

const schema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  parentId: z.string().uuid().optional()
});

export async function GET() {
  try {
    return ok(await db.select().from(categories));
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    requireRole(roleFromHeaders(new Headers(request.headers)), "Production");
    const payload = schema.parse(await request.json());
    const [created] = await db.insert(categories).values(payload).returning();
    return ok(created, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
