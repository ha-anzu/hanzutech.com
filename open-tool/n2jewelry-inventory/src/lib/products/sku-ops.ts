import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { categories, products, skus, variants } from "@/lib/db/schema";
import { generateSku } from "@/lib/inventory/sku";

export async function ensureSkuForVariant(variantId: string) {
  const [variant] = await db.select().from(variants).where(eq(variants.id, variantId));
  if (!variant) {
    throw new Error("Variant not found");
  }

  const [existingSku] = await db.select().from(skus).where(eq(skus.variantId, variant.id));
  if (existingSku) {
    return existingSku;
  }

  const [product] = await db.select().from(products).where(eq(products.id, variant.productId));
  if (!product) {
    throw new Error("Product not found for variant");
  }

  const [category] = await db.select().from(categories).where(eq(categories.id, product.categoryId));

  const siblingVariants = await db.select({ id: variants.id }).from(variants).where(eq(variants.productId, product.id));
  const siblingVariantIds = siblingVariants.map((item) => item.id);
  const siblingSkus = siblingVariantIds.length ? await db.select().from(skus).where(inArray(skus.variantId, siblingVariantIds)) : [];

  const optionValues = variant.optionValues ?? {};
  const materialCode = String(optionValues.material ?? optionValues.metal ?? "925");
  const variantCode = String(optionValues.size ?? optionValues.color ?? optionValues.finish ?? variant.id.slice(0, 6));

  let sequence = siblingSkus.length + 1;
  let candidate = generateSku({
    categoryCode: category?.code ?? "N2",
    productCode: product.productCode,
    materialCode,
    variantCode,
    sequence
  });

  while ((await db.select({ id: skus.id }).from(skus).where(eq(skus.skuCode, candidate))).length > 0) {
    sequence += 1;
    candidate = generateSku({
      categoryCode: category?.code ?? "N2",
      productCode: product.productCode,
      materialCode,
      variantCode,
      sequence
    });
  }

  return oneRow(
    await db
      .insert(skus)
      .values({
        variantId: variant.id,
        skuCode: candidate,
        manualOverride: false
      })
      .returning(),
    "Create auto SKU"
  );
}
