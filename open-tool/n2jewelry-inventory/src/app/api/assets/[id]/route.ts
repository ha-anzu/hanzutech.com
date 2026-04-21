import { eq } from "drizzle-orm";
import { makeDownloadUrl } from "@/lib/assets/storage";
import { fail, ok } from "@/lib/api/response";
import { db } from "@/lib/db/client";
import { digitalAssets } from "@/lib/db/schema";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const [asset] = await db.select().from(digitalAssets).where(eq(digitalAssets.id, id));
    if (!asset) {
      throw new Error("Asset not found");
    }

    const downloadUrl = await makeDownloadUrl(asset.objectKey);
    return ok({ asset, downloadUrl });
  } catch (error) {
    return fail(error, 404);
  }
}
