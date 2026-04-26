import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { consignmentAccounts, inventoryBalances, locations, products, skus, stockMovements, variants } from "@/lib/db/schema";

export type InventoryOverview = {
  summary: {
    thailandFactory: number;
    malaysiaBranch: number;
    consignmentAgents: number;
  };
  rows: Array<{
    skuId: string;
    skuCode: string;
    productName: string;
    productCode: string;
    totalStock: number;
    byLocation: Array<{ locationId: string; locationName: string; qty: number }>;
  }>;
  movements: Array<{
    id: string;
    movementType: string;
    skuCode: string;
    productName: string;
    quantity: number;
    fromLocation: string | null;
    toLocation: string | null;
    notes: string | null;
    createdAt: string;
    referenceType: string;
  }>;
  lookups: {
    locations: Array<{ id: string; name: string; type: string }>;
    skus: Array<{ id: string; skuCode: string; productName: string }>;
  };
};

function locationBucket(name: string, type: string) {
  const n = name.toLowerCase();
  if (n.includes("thailand") || n.includes("bangkok") || type === "Factory") {
    return "thailandFactory" as const;
  }
  if (n.includes("malaysia") || type === "Branch") {
    return "malaysiaBranch" as const;
  }
  if (type === "Agent") {
    return "consignmentAgents" as const;
  }
  return "thailandFactory" as const;
}

export async function getInventoryOverview(limit = 120): Promise<InventoryOverview> {
  const [locationRows, balanceRows, skuRows, variantRows, productRows, movementRows] = await Promise.all([
    db.select().from(locations),
    db.select().from(inventoryBalances),
    db.select().from(skus),
    db.select().from(variants),
    db.select().from(products),
    db.select().from(stockMovements).orderBy(desc(stockMovements.createdAt)).limit(limit)
  ]);

  const locationMap = new Map(locationRows.map((item) => [item.id, item]));
  const variantMap = new Map(variantRows.map((item) => [item.id, item]));
  const productMap = new Map(productRows.map((item) => [item.id, item]));

  const summary = {
    thailandFactory: 0,
    malaysiaBranch: 0,
    consignmentAgents: 0
  };

  const bySku = new Map<string, { totalStock: number; byLocation: Map<string, number> }>();
  for (const balance of balanceRows) {
    const location = locationMap.get(balance.locationId);
    if (!location) continue;

    const bucket = locationBucket(location.name, location.type);
    summary[bucket] += balance.qtyOnHand;

    const entry = bySku.get(balance.skuId) ?? { totalStock: 0, byLocation: new Map<string, number>() };
    entry.totalStock += balance.qtyOnHand;
    entry.byLocation.set(balance.locationId, (entry.byLocation.get(balance.locationId) ?? 0) + balance.qtyOnHand);
    bySku.set(balance.skuId, entry);
  }

  const rows = skuRows
    .map((sku) => {
      const variant = variantMap.get(sku.variantId);
      const product = variant ? productMap.get(variant.productId) : null;
      const stock = bySku.get(sku.id);
      return {
        skuId: sku.id,
        skuCode: sku.skuCode,
        productName: product?.name ?? "Unknown Product",
        productCode: product?.productCode ?? "-",
        totalStock: stock?.totalStock ?? 0,
        byLocation: Array.from(stock?.byLocation.entries() ?? []).map(([locationId, qty]) => ({
          locationId,
          locationName: locationMap.get(locationId)?.name ?? "Unknown",
          qty
        }))
      };
    })
    .sort((a, b) => b.totalStock - a.totalStock);

  const skuMap = new Map(skuRows.map((item) => [item.id, item]));

  const movements = movementRows.map((movement) => {
    const sku = skuMap.get(movement.skuId);
    const variant = sku ? variantMap.get(sku.variantId) : null;
    const product = variant ? productMap.get(variant.productId) : null;

    return {
      id: movement.id,
      movementType: movement.movementType,
      skuCode: sku?.skuCode ?? "Unknown SKU",
      productName: product?.name ?? "Unknown Product",
      quantity: movement.quantity,
      fromLocation: movement.fromLocationId ? locationMap.get(movement.fromLocationId)?.name ?? "Unknown" : null,
      toLocation: movement.toLocationId ? locationMap.get(movement.toLocationId)?.name ?? "Unknown" : null,
      notes: movement.notes,
      createdAt: movement.createdAt.toISOString(),
      referenceType: movement.referenceType
    };
  });

  return {
    summary,
    rows,
    movements,
    lookups: {
      locations: locationRows.map((item) => ({ id: item.id, name: item.name, type: item.type })),
      skus: rows.map((item) => ({ id: item.skuId, skuCode: item.skuCode, productName: item.productName }))
    }
  };
}

export async function getScanSupportData() {
  const [locationRows, accounts] = await Promise.all([
    db.select().from(locations),
    db.select().from(consignmentAccounts)
  ]);

  return {
    locations: locationRows.map((item) => ({ id: item.id, name: item.name, type: item.type })),
    accounts: accounts.map((item) => ({ id: item.id, accountCode: item.accountCode, accountName: item.accountName }))
  };
}
