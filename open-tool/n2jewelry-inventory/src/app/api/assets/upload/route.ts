import { z } from "zod";
import { makeUploadUrl } from "@/lib/assets/storage";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { digitalAssets } from "@/lib/db/schema";

const schema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  productId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  lotId: z.string().uuid().optional(),
  productionOrderId: z.string().uuid().optional()
});

export async function POST(request: Request) {
  try {
    requireRole(roleFromHeaders(new Headers(request.headers)), "Production");
    const payload = schema.parse(await request.json());
    const objectKey = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${payload.fileName}`;
    const upload = await makeUploadUrl(objectKey, payload.mimeType);

    const asset = oneRow(
      await db
      .insert(digitalAssets)
      .values({
        ...payload,
        objectKey
      })
      .returning(),
      "Create digital asset"
    );

    return ok({ asset, upload }, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
