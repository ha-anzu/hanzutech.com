import { fail, ok } from "@/lib/api/response";
import { getDatabaseStatus } from "@/lib/db/status";

export async function GET() {
  try {
    const status = await getDatabaseStatus();

    return ok(status, status.connected ? 200 : 503);
  } catch (error) {
    return fail(error, 500);
  }
}
