import { eq } from "drizzle-orm";
import { fail, ok } from "@/lib/api/response";
import { db } from "@/lib/db/client";
import { barcodes, inventoryBalances, locations, metalLots, products, skus, variants } from "@/lib/db/schema";

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
      const balances = await db.select().from(inventoryBalances).where(eq(inventoryBalances.skuId, sku.id));
      const allLocations = await db.select().from(locations);
      const locationMap = new Map(allLocations.map((item) => [item.id, item]));

      const byLocation = balances.map((balance) => ({
        locationId: balance.locationId,
        locationName: locationMap.get(balance.locationId)?.name ?? "Unknown",
        locationType: locationMap.get(balance.locationId)?.type ?? "Unknown",
        qtyOnHand: balance.qtyOnHand,
        qtyReserved: balance.qtyReserved
      }));

      return ok({
        kind: "product_variant",
        barcode: barcodeRow,
        sku,
        variant,
        product,
        stock: {
          totalOnHand: byLocation.reduce((sum, item) => sum + item.qtyOnHand, 0),
          byLocation
        }
      });
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
