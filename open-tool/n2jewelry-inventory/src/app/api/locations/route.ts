import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { locations } from "@/lib/db/schema";

const schema = z.object({
  code: z.string().min(2),
  name: z.string().min(2),
  type: z.enum(["Factory", "Warehouse", "Branch", "Agent"]),
  currency: z.enum(["USD", "THB", "MYR"]).default("USD")
});

export async function GET() {
  try {
    return ok(await db.select().from(locations));
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    requireRole(roleFromHeaders(new Headers(request.headers)), "Warehouse");
    const payload = schema.parse(await request.json());
    const created = oneRow(await db.insert(locations).values(payload).returning(), "Create location");
    return ok(created, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
