import { fail, ok } from "@/lib/api/response";
import { getInventoryOverview } from "@/lib/inventory/overview";

export async function GET() {
  try {
    return ok(await getInventoryOverview());
  } catch (error) {
    return fail(error, 500);
  }
}
