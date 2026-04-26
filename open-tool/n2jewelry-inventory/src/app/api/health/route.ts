import { ok } from "@/lib/api/response";
import { getDatabaseStatus } from "@/lib/db/status";

export async function GET() {
  const db = await getDatabaseStatus();

  return ok({
    status: db.connected ? "healthy" : "degraded",
    service: "n2jewelry-inventory",
    timestamp: new Date().toISOString(),
    database: {
      connected: db.connected,
      error: db.error ?? null
    }
  });
}
