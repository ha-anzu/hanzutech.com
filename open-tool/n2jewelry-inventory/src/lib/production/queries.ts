import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { inventoryLots, locations, products, productionOrders, skus, variants } from "@/lib/db/schema";
import { estimateOrderUnitCost } from "@/lib/labels/pricing";

export type ProductionWorkspaceData = {
  activeOrders: Array<{
    id: string;
    orderCode: string;
    skuId: string;
    productName: string;
    productCode: string;
    skuCode: string;
    variantOptionValues: Record<string, string>;
    targetQty: number;
    completedQty: number;
    status: string;
    progressPct: number;
    plannedUsageGrams: number;
    actualUsageGrams: number;
    plannedCost: number;
    actualCost: number;
    labelUnitPrice: number;
    lots: Array<{
      lotId: string;
      lotCode: string;
      plannedGrams: number;
      actualGrams: number;
      purity: number;
      unitCost: number;
      totalCost: number;
      consumedAt?: string;
    }>;
    createdAt: string;
  }>;
  products: Array<{ id: string; name: string; productCode: string }>;
  variants: Array<{ id: string; productId: string; optionValues: Record<string, string> }>;
  lots: Array<{
    id: string;
    lotCode: string;
    material: string;
    purity: number;
    gramsAvailable: number;
    gramsReceived: number;
    unitCost: number;
    locationId: string;
    locationName: string;
  }>;
  locations: Array<{ id: string; name: string; type: string }>;
};

function toNumber(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function optionSummary(values: Record<string, string>) {
  const entries = Object.entries(values).filter(([, value]) => value && value.trim().length > 0);
  return entries.map(([key, value]) => `${key}:${value}`).join(" |");
}

export async function getProductionWorkspaceData(): Promise<ProductionWorkspaceData> {
  const [orders, skuRows, variantRows, productRows, lotRows, locationRows] = await Promise.all([
    db.select().from(productionOrders).orderBy(desc(productionOrders.createdAt)),
    db.select().from(skus),
    db.select().from(variants),
    db.select().from(products),
    db.select().from(inventoryLots),
    db.select().from(locations)
  ]);

  const skuMap = new Map(skuRows.map((item) => [item.id, item]));
  const variantMap = new Map(variantRows.map((item) => [item.id, item]));
  const productMap = new Map(productRows.map((item) => [item.id, item]));
  const locationMap = new Map(locationRows.map((item) => [item.id, item]));
  const lotMap = new Map(lotRows.map((item) => [item.id, item]));

  const activeOrders = orders
    .filter((order) => order.status !== "completed")
    .map((order) => {
      const sku = skuMap.get(order.skuId);
      const variant = sku ? variantMap.get(sku.variantId) : null;
      const product = variant ? productMap.get(variant.productId) : null;

      const lots = (order.inputLots ?? []).map((entry) => {
        const lot = lotMap.get(entry.lotId);
        return {
          lotId: entry.lotId,
          lotCode: entry.lotCode ?? lot?.lotCode ?? "Unknown Lot",
          plannedGrams: toNumber(entry.plannedGrams ?? entry.grams),
          actualGrams: toNumber(entry.actualGrams),
          purity: toNumber(entry.purity ?? lot?.purity),
          unitCost: toNumber(entry.unitCost ?? (toNumber(lot?.costTotal) / Math.max(1, toNumber(lot?.gramsReceived)))),
          totalCost: toNumber(entry.totalCost),
          consumedAt: entry.consumedAt
        };
      });

      const plannedUsageGrams = lots.reduce((sum, lot) => sum + lot.plannedGrams, 0);
      const actualUsageGrams = lots.reduce((sum, lot) => sum + lot.actualGrams, 0);
      const plannedCost = lots.reduce((sum, lot) => sum + lot.plannedGrams * lot.unitCost * lot.purity, 0);
      const actualCost = lots.reduce((sum, lot) => sum + (lot.totalCost || lot.actualGrams * lot.unitCost * lot.purity), 0);
      const progressPct = Math.min(100, Math.round((order.completedQty / Math.max(1, order.targetQty)) * 100));

      return {
        id: order.id,
        orderCode: order.orderCode,
        skuId: order.skuId,
        productName: product?.name ?? "Unknown Product",
        productCode: product?.productCode ?? "-",
        skuCode: sku?.skuCode ?? `Variant ${variant ? optionSummary(variant.optionValues) : "unknown"}`,
        variantOptionValues: variant?.optionValues ?? {},
        targetQty: order.targetQty,
        completedQty: order.completedQty,
        status: order.status,
        progressPct,
        plannedUsageGrams,
        actualUsageGrams,
        plannedCost,
        actualCost,
        labelUnitPrice: estimateOrderUnitCost(order),
        lots,
        createdAt: order.createdAt.toISOString()
      };
    });

  const lots = lotRows.map((lot) => {
    const unitCost = toNumber(lot.costTotal) / Math.max(1, toNumber(lot.gramsReceived));
    return {
      id: lot.id,
      lotCode: lot.lotCode,
      material: lot.material,
      purity: toNumber(lot.purity),
      gramsAvailable: toNumber(lot.gramsAvailable),
      gramsReceived: toNumber(lot.gramsReceived),
      unitCost,
      locationId: lot.locationId,
      locationName: locationMap.get(lot.locationId)?.name ?? "Unknown"
    };
  });

  return {
    activeOrders,
    products: productRows.map((item) => ({ id: item.id, name: item.name, productCode: item.productCode })),
    variants: variantRows.map((item) => ({ id: item.id, productId: item.productId, optionValues: item.optionValues })),
    lots,
    locations: locationRows.map((item) => ({ id: item.id, name: item.name, type: item.type }))
  };
}
