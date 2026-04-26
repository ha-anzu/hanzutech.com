import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { consignmentAccounts } from "@/lib/db/schema";

const schema = z.object({
  accountCode: z.string().min(2),
  accountName: z.string().min(2),
  country: z.string().min(2),
  currency: z.enum(["USD", "THB", "MYR"]).default("USD")
});

export async function GET() {
  try {
    return ok(await db.select().from(consignmentAccounts));
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    requireRole(roleFromHeaders(new Headers(request.headers)), "Sales");
    const payload = schema.parse(await request.json());
    const created = oneRow(await db.insert(consignmentAccounts).values(payload).returning(), "Create consignment account");
    return ok(created, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
