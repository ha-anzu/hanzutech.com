import { sql } from "drizzle-orm";
import type { AnyPgTable } from "drizzle-orm/pg-core";
import { db, checkDatabaseConnection } from "@/lib/db/client";
import {
  barcodes,
  categories,
  consignmentAccounts,
  consignmentShipments,
  consignmentSettlements,
  inventoryBalances,
  inventoryLots,
  locations,
  products,
  productionOrders,
  skus,
  stockMovements,
  variants
} from "@/lib/db/schema";

export type DbStatus = {
  connected: boolean;
  checkedAt: string;
  serverTime: string | null;
  counts: {
    products: number;
    variants: number;
    skus: number;
    barcodes: number;
    inventoryLots: number;
    inventoryBalances: number;
    stockMovements: number;
    productionOrders: number;
    consignmentAccounts: number;
    consignmentShipments: number;
    consignmentSettlements: number;
    categories: number;
    locations: number;
  };
  error?: string;
};

async function countRows(table: AnyPgTable): Promise<number> {
  const result = await db.select({ value: sql<number>`count(*)::int` }).from(table);
  return result[0]?.value ?? 0;
}

export async function getDatabaseStatus(): Promise<DbStatus> {
  const checkedAt = new Date().toISOString();

  try {
    const connection = await checkDatabaseConnection();

    const [
      productsCount,
      variantsCount,
      skusCount,
      barcodesCount,
      inventoryLotsCount,
      inventoryBalancesCount,
      stockMovementsCount,
      productionOrdersCount,
      consignmentAccountsCount,
      consignmentShipmentsCount,
      consignmentSettlementsCount,
      categoriesCount,
      locationsCount
    ] = await Promise.all([
      countRows(products),
      countRows(variants),
      countRows(skus),
      countRows(barcodes),
      countRows(inventoryLots),
      countRows(inventoryBalances),
      countRows(stockMovements),
      countRows(productionOrders),
      countRows(consignmentAccounts),
      countRows(consignmentShipments),
      countRows(consignmentSettlements),
      countRows(categories),
      countRows(locations)
    ]);

    return {
      connected: connection.ok,
      checkedAt,
      serverTime: connection.now ? new Date(connection.now).toISOString() : null,
      counts: {
        products: productsCount,
        variants: variantsCount,
        skus: skusCount,
        barcodes: barcodesCount,
        inventoryLots: inventoryLotsCount,
        inventoryBalances: inventoryBalancesCount,
        stockMovements: stockMovementsCount,
        productionOrders: productionOrdersCount,
        consignmentAccounts: consignmentAccountsCount,
        consignmentShipments: consignmentShipmentsCount,
        consignmentSettlements: consignmentSettlementsCount,
        categories: categoriesCount,
        locations: locationsCount
      }
    };
  } catch (error) {
    return {
      connected: false,
      checkedAt,
      serverTime: null,
      counts: {
        products: 0,
        variants: 0,
        skus: 0,
        barcodes: 0,
        inventoryLots: 0,
        inventoryBalances: 0,
        stockMovements: 0,
        productionOrders: 0,
        consignmentAccounts: 0,
        consignmentShipments: 0,
        consignmentSettlements: 0,
        categories: 0,
        locations: 0
      },
      error: error instanceof Error ? error.message : "Failed to query database"
    };
  }
}
