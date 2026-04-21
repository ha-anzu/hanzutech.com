import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { publishScan } from "@/lib/scanner/session";

const schema = z.object({
  code: z.string().min(1),
  source: z.enum(["wedge", "lan", "camera"]).default("lan"),
  deviceId: z.string().optional()
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    publishScan({ ...payload, at: new Date().toISOString() });
    return ok({ accepted: true });
  } catch (error) {
    return fail(error, 400);
  }
}
