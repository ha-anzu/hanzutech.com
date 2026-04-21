import { eq } from "drizzle-orm";
import { fail, ok } from "@/lib/api/response";
import { db } from "@/lib/db/client";
import { barcodes, metalLots, products, skus, variants } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    const { barcode } = (await request.json()) as { barcode?: string };
    if (!barcode) {
      throw new Error("barcode is required");
    }

    const [barcodeRow] = await db.select().from(barcodes).where(eq(barcodes.barcodeValue, barcode));
    if (barcodeRow) {
      const [sku] = await db.select().from(skus).where(eq(skus.id, barcodeRow.skuId));
      if (!sku) {
        throw new Error("SKU link broken");
      }
      const [variant] = await db.select().from(variants).where(eq(variants.id, sku.variantId));
      const [product] = variant ? await db.select().from(products).where(eq(products.id, variant.productId)) : [null];
      return ok({ kind: "product_variant", barcode: barcodeRow, sku, variant, product });
    }

    const [lot] = await db.select().from(metalLots).where(eq(metalLots.lotCode, barcode));
    if (lot) {
      return ok({ kind: "metal_lot", lot });
    }

    return ok({ kind: "unknown", barcode });
  } catch (error) {
    return fail(error, 400);
  }
}
