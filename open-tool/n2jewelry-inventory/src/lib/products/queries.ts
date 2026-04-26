import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { barcodes, categories, digitalAssets, inventoryBalances, products, productionOrders, skus, stockMovements, variants } from "@/lib/db/schema";
import { estimateOrderUnitCost } from "@/lib/labels/pricing";

export type ProductListItem = {
  id: string;
  productCode: string;
  name: string;
  category: string;
  collection: string;
  totalVariants: number;
  totalStock: number;
  active: boolean;
  createdAt: string;
};

export type ProductDetail = {
  product: {
    id: string;
    productCode: string;
    name: string;
    description: string | null;
    active: boolean;
    category: string;
    collection: string;
    createdAt: string;
    imageUrl: string | null;
  };
  variants: Array<{
    id: string;
    optionValues: Record<string, string>;
    imageUrl: string | null;
    createdAt: string;
    stock: number;
    skus: Array<{
      id: string;
      skuCode: string;
      manualOverride: boolean;
      barcodes: string[];
      stock: number;
      suggestedPrice: number;
    }>;
  }>;
  history: Array<{
    id: string;
    type: "movement" | "production";
    title: string;
    description: string;
    at: string;
  }>;
};

function categoryName(id: string | null, map: Map<string, string>) {
  if (!id) return "Uncategorized";
  return map.get(id) ?? "Uncategorized";
}

function resolveAssetUrl(objectKey: string | undefined) {
  if (!objectKey) return null;
  const base = process.env.S3_PUBLIC_BASE_URL?.trim();
  return base ? `${base}/${objectKey}` : objectKey;
}

export async function getCategoryOptions() {
  const rows = await db.select().from(categories);
  return rows
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => ({
      id: item.id,
      name: item.name,
      code: item.code,
      parentId: item.parentId
    }));
}

export async function getProductsList(): Promise<ProductListItem[]> {
  const [productRows, categoryRows, variantRows, skuRows, balanceRows] = await Promise.all([
    db.select().from(products),
    db.select().from(categories),
    db.select().from(variants),
    db.select().from(skus),
    db.select().from(inventoryBalances)
  ]);

  const categoryMap = new Map(categoryRows.map((item) => [item.id, item.name]));
  const variantsByProduct = new Map<string, typeof variantRows>();
  for (const variant of variantRows) {
    const arr = variantsByProduct.get(variant.productId) ?? [];
    arr.push(variant);
    variantsByProduct.set(variant.productId, arr);
  }

  const skuByVariant = new Map<string, typeof skuRows>();
  for (const sku of skuRows) {
    const arr = skuByVariant.get(sku.variantId) ?? [];
    arr.push(sku);
    skuByVariant.set(sku.variantId, arr);
  }

  const stockBySku = new Map<string, number>();
  for (const balance of balanceRows) {
    const next = (stockBySku.get(balance.skuId) ?? 0) + balance.qtyOnHand;
    stockBySku.set(balance.skuId, next);
  }

  return productRows
    .map((product) => {
      const productVariants = variantsByProduct.get(product.id) ?? [];
      const variantSkuIds = productVariants.flatMap((variant) => (skuByVariant.get(variant.id) ?? []).map((sku) => sku.id));
      const totalStock = variantSkuIds.reduce((sum, skuId) => sum + (stockBySku.get(skuId) ?? 0), 0);

      return {
        id: product.id,
        productCode: product.productCode,
        name: product.name,
        category: categoryName(product.categoryId, categoryMap),
        collection: categoryName(product.subcategoryId, categoryMap),
        totalVariants: productVariants.length,
        totalStock,
        active: product.active,
        createdAt: product.createdAt.toISOString()
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getProductDetail(productId: string): Promise<ProductDetail | null> {
  const [productRow] = await db.select().from(products).where(eq(products.id, productId));
  if (!productRow) {
    return null;
  }

  const [categoryRows, assetRows, variantRows] = await Promise.all([
    db.select().from(categories),
    db.select().from(digitalAssets).where(eq(digitalAssets.productId, productId)),
    db.select().from(variants).where(eq(variants.productId, productId))
  ]);

  const categoryMap = new Map(categoryRows.map((item) => [item.id, item.name]));
  const variantIds = variantRows.map((item) => item.id);

  const skuRows = variantIds.length ? await db.select().from(skus).where(inArray(skus.variantId, variantIds)) : [];
  const barcodeRows = skuRows.length ? await db.select().from(barcodes).where(inArray(barcodes.skuId, skuRows.map((item) => item.id))) : [];

  const skuIds = skuRows.map((item) => item.id);
  const [balanceRows, movementRows, orderRows] = skuIds.length
    ? await Promise.all([
        db.select().from(inventoryBalances).where(inArray(inventoryBalances.skuId, skuIds)),
        db
          .select()
          .from(stockMovements)
          .where(inArray(stockMovements.skuId, skuIds))
          .orderBy(desc(stockMovements.createdAt))
          .limit(60),
        db
          .select()
          .from(productionOrders)
          .where(inArray(productionOrders.skuId, skuIds))
          .orderBy(desc(productionOrders.createdAt))
          .limit(40)
      ])
    : [[], [], []];

  const barcodeBySku = new Map<string, string[]>();
  for (const row of barcodeRows) {
    if (!skuIds.includes(row.skuId)) continue;
    const arr = barcodeBySku.get(row.skuId) ?? [];
    arr.push(row.barcodeValue);
    barcodeBySku.set(row.skuId, arr);
  }

  const stockBySku = new Map<string, number>();
  for (const row of balanceRows) {
    stockBySku.set(row.skuId, (stockBySku.get(row.skuId) ?? 0) + row.qtyOnHand);
  }

  const skuByVariant = new Map<string, typeof skuRows>();
  for (const sku of skuRows) {
    const arr = skuByVariant.get(sku.variantId) ?? [];
    arr.push(sku);
    skuByVariant.set(sku.variantId, arr);
  }

  const variantItems = variantRows
    .map((variant) => {
      const variantSkus = skuByVariant.get(variant.id) ?? [];
      const itemSkus = variantSkus.map((sku) => {
        const latestOrder = orderRows.find((order) => order.skuId === sku.id);
        return {
          id: sku.id,
          skuCode: sku.skuCode,
          manualOverride: sku.manualOverride,
          barcodes: barcodeBySku.get(sku.id) ?? [],
          stock: stockBySku.get(sku.id) ?? 0,
          suggestedPrice: Number(variant.optionValues.pricingSuggestedSellingPrice ?? (latestOrder ? estimateOrderUnitCost(latestOrder) : 0))
        };
      });

      return {
        id: variant.id,
        optionValues: variant.optionValues,
        imageUrl: variant.imageUrl,
        createdAt: variant.createdAt.toISOString(),
        stock: itemSkus.reduce((sum, item) => sum + item.stock, 0),
        skus: itemSkus
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const history = [
    ...movementRows.map((movement) => ({
      id: `m-${movement.id}`,
      type: "movement" as const,
      title: `Stock ${movement.movementType}`,
      description: `${movement.quantity} units (${movement.referenceType})`,
      at: movement.createdAt.toISOString()
    })),
    ...orderRows.map((order) => ({
      id: `p-${order.id}`,
      type: "production" as const,
      title: `Production ${order.status}`,
      description: `${order.orderCode} target ${order.targetQty} / completed ${order.completedQty}`,
      at: order.createdAt.toISOString()
    }))
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 80);

  const primaryAsset = assetRows.find((asset) => asset.mimeType.startsWith("image/"));

  return {
    product: {
      id: productRow.id,
      productCode: productRow.productCode,
      name: productRow.name,
      description: productRow.description,
      active: productRow.active,
      category: categoryName(productRow.categoryId, categoryMap),
      collection: categoryName(productRow.subcategoryId, categoryMap),
      createdAt: productRow.createdAt.toISOString(),
      imageUrl: resolveAssetUrl(primaryAsset?.objectKey)
    },
    variants: variantItems,
    history
  };
}

export async function getProductAndCategories(productId: string) {
  const [detail, categoriesList] = await Promise.all([getProductDetail(productId), getCategoryOptions()]);
  return {
    detail,
    categories: categoriesList
  };
}
