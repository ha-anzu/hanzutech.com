import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { metalLots } from "@/lib/db/schema";

const schema = z.object({
  lotCode: z.string().min(2),
  material: z.string().min(2),
  purity: z.number().positive(),
  gramsReceived: z.number().positive(),
  gramsAvailable: z.number().positive(),
  costCurrency: z.enum(["USD", "THB", "MYR"]).default("USD"),
  costTotal: z.number().positive(),
  locationId: z.string().uuid()
});

export async function GET() {
  try {
    return ok(await db.select().from(metalLots));
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    requireRole(roleFromHeaders(new Headers(request.headers)), "Production");
    const payload = schema.parse(await request.json());
    const lot = oneRow(
      await db
        .insert(metalLots)
        .values({
          ...payload,
          purity: String(payload.purity),
          gramsReceived: String(payload.gramsReceived),
          gramsAvailable: String(payload.gramsAvailable),
          costTotal: String(payload.costTotal)
        })
        .returning(),
      "Create metal lot"
    );
    return ok(lot, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
