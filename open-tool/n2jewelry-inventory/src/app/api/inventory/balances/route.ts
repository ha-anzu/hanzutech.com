import { fail, ok } from "@/lib/api/response";
import { db } from "@/lib/db/client";
import { inventoryBalances } from "@/lib/db/schema";

export async function GET() {
  try {
    return ok(await db.select().from(inventoryBalances));
  } catch (error) {
    return fail(error, 500);
  }
}
