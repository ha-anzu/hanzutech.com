import "dotenv/config";

import fs from "node:fs";
import process from "node:process";
import { eq } from "drizzle-orm";
import type { QueryResult, QueryResultRow } from "pg";
import * as XLSX from "xlsx";
import { db, pool } from "../src/lib/db/client";
import {
  barcodes,
  categories,
  consignmentAccounts,
  consignmentSettlements,
  consignmentShipments,
  inventoryBalances,
  inventoryLots,
  locations,
  products,
  productionOrders,
  skus,
  variants
} from "../src/lib/db/schema";

type JsonRow = Record<string, unknown>;

type SheetMap = {
  categories: JsonRow[];
  locations: JsonRow[];
  products: JsonRow[];
  variants: JsonRow[];
  skus: JsonRow[];
  barcodes: JsonRow[];
  inventoryLots: JsonRow[];
  inventoryBalances: JsonRow[];
  productionOrders: JsonRow[];
  consignmentAccounts: JsonRow[];
  consignmentShipments: JsonRow[];
  consignmentSettlements: JsonRow[];
};

const EMPTY_SHEETS: SheetMap = {
  categories: [],
  locations: [],
  products: [],
  variants: [],
  skus: [],
  barcodes: [],
  inventoryLots: [],
  inventoryBalances: [],
  productionOrders: [],
  consignmentAccounts: [],
  consignmentShipments: [],
  consignmentSettlements: []
};

const SHEET_ALIASES: Record<keyof SheetMap, string[]> = {
  categories: ["categories", "category"],
  locations: ["locations", "location"],
  products: ["products", "product"],
  variants: ["variants", "variant"],
  skus: ["skus", "sku"],
  barcodes: ["barcodes", "barcode"],
  inventoryLots: ["inventory_lots", "inventorylots", "lots", "metal_lots", "metallots"],
  inventoryBalances: ["inventory_balances", "inventorybalances", "balances"],
  productionOrders: ["production_orders", "productionorders", "orders"],
  consignmentAccounts: ["consignment_accounts", "consignmentaccounts", "accounts"],
  consignmentShipments: ["consignment_shipments", "consignmentshipments", "shipments"],
  consignmentSettlements: ["consignment_settlements", "consignmentsettlements", "settlements"]
};

function normalize(input: string): string {
  return input.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function parseArgs() {
  const args = process.argv.slice(2);
  const fileArgIndex = args.findIndex((arg) => arg === "--file");
  if (fileArgIndex >= 0 && args[fileArgIndex + 1]) {
    return { file: args[fileArgIndex + 1] };
  }

  const directPath = args[0];
  return { file: directPath };
}

function requiredString(row: JsonRow, key: string, sheet: string, rowNumber: number): string {
  const value = row[key];
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error(`${sheet} row ${rowNumber}: '${key}' is required`);
  }

  return String(value).trim();
}

function optionalString(row: JsonRow, key: string): string | undefined {
  const value = row[key];
  if (value === undefined || value === null) {
    return undefined;
  }

  const text = String(value).trim();
  return text ? text : undefined;
}

function numberValue(row: JsonRow, key: string, fallback = 0): number {
  const value = row[key];
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number '${value}' for '${key}'`);
  }

  return parsed;
}

function booleanValue(row: JsonRow, key: string, fallback = true): boolean {
  const value = row[key];
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  const text = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "y", "active"].includes(text);
}

function parseJsonArray(value: unknown, fallback: unknown[] = []): unknown[] {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(String(value));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function parseOptionValues(row: JsonRow): Record<string, string> {
  const jsonColumn = optionalString(row, "optionValues") ?? optionalString(row, "options");
  if (jsonColumn) {
    try {
      const parsed = JSON.parse(jsonColumn) as Record<string, unknown>;
      return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]));
    } catch {
      throw new Error(`Invalid optionValues JSON: ${jsonColumn}`);
    }
  }

  const pairs = Object.entries(row)
    .filter(([key, value]) => key.startsWith("option_") && value !== null && value !== undefined && String(value).trim() !== "")
    .map(([key, value]) => [key.replace(/^option_/, ""), String(value)]);

  return Object.fromEntries(pairs);
}

function oneRow<T extends QueryResultRow>(result: T[] | QueryResult<T>, context: string): T {
  const row = Array.isArray(result) ? result[0] : result.rows[0];
  if (!row) {
    throw new Error(`${context} returned no rows`);
  }

  return row;
}

function readWorkbook(filePath: string): SheetMap {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const normalizedNameMap = new Map(workbook.SheetNames.map((name) => [normalize(name), name]));

  const result: SheetMap = { ...EMPTY_SHEETS };

  for (const [sheetKey, aliases] of Object.entries(SHEET_ALIASES) as Array<[keyof SheetMap, string[]]>) {
    const target = aliases.map(normalize).find((alias) => normalizedNameMap.has(alias));
    if (!target) {
      continue;
    }

    const sheetName = normalizedNameMap.get(target)!;
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<JsonRow>(sheet, { defval: null, raw: false });
    result[sheetKey] = rows;
  }

  return result;
}

async function main() {
  const { file } = parseArgs();

  if (!file) {
    throw new Error("Missing Excel file path. Use: npm run seed:excel -- --file C:/path/to/file.xlsx");
  }

  if (!fs.existsSync(file)) {
    throw new Error(`File not found: ${file}`);
  }

  const sheets = readWorkbook(file);

  const summary = await db.transaction(async (tx) => {
    const categoryByCode = new Map<string, string>();
    const locationByCode = new Map<string, string>();
    const productByCode = new Map<string, string>();
    const variantByExternal = new Map<string, string>();
    const skuByCode = new Map<string, string>();
    const shipmentByCode = new Map<string, string>();

    for (const [index, row] of sheets.categories.entries()) {
      const rowNumber = index + 2;
      const code = requiredString(row, "code", "categories", rowNumber);
      const name = requiredString(row, "name", "categories", rowNumber);

      const saved = oneRow(
        await tx
          .insert(categories)
          .values({ code, name })
          .onConflictDoUpdate({ target: categories.code, set: { name } })
          .returning({ id: categories.id, code: categories.code }),
        "Upsert category"
      );

      categoryByCode.set(saved.code, saved.id);
    }

    for (const [index, row] of sheets.categories.entries()) {
      const rowNumber = index + 2;
      const code = requiredString(row, "code", "categories", rowNumber);
      const parentCode = optionalString(row, "parentCode");
      if (!parentCode) continue;

      const childId = categoryByCode.get(code);
      const parentId = categoryByCode.get(parentCode);
      if (!childId || !parentId) {
        throw new Error(`categories row ${rowNumber}: parentCode '${parentCode}' not found`);
      }

      await tx.update(categories).set({ parentId }).where(eq(categories.id, childId));
    }

    for (const [index, row] of sheets.locations.entries()) {
      const rowNumber = index + 2;
      const code = requiredString(row, "code", "locations", rowNumber);
      const name = requiredString(row, "name", "locations", rowNumber);
      const type = requiredString(row, "type", "locations", rowNumber) as "Factory" | "Warehouse" | "Branch" | "Agent";
      const currency = (optionalString(row, "currency") ?? "USD") as "USD" | "THB" | "MYR";

      const saved = oneRow(
        await tx
          .insert(locations)
          .values({ code, name, type, currency })
          .onConflictDoUpdate({ target: locations.code, set: { name, type, currency } })
          .returning({ id: locations.id, code: locations.code }),
        "Upsert location"
      );

      locationByCode.set(saved.code, saved.id);
    }

    for (const [index, row] of sheets.products.entries()) {
      const rowNumber = index + 2;
      const productCode = requiredString(row, "productCode", "products", rowNumber);
      const name = requiredString(row, "name", "products", rowNumber);
      const categoryCode = requiredString(row, "categoryCode", "products", rowNumber);
      const subcategoryCode = optionalString(row, "subcategoryCode");
      const categoryId = categoryByCode.get(categoryCode);
      const subcategoryId = subcategoryCode ? categoryByCode.get(subcategoryCode) : undefined;

      if (!categoryId) {
        throw new Error(`products row ${rowNumber}: categoryCode '${categoryCode}' not found`);
      }

      const saved = oneRow(
        await tx
          .insert(products)
          .values({
            productCode,
            name,
            categoryId,
            subcategoryId,
            description: optionalString(row, "description"),
            active: booleanValue(row, "active", true)
          })
          .onConflictDoUpdate({
            target: products.productCode,
            set: {
              name,
              categoryId,
              subcategoryId,
              description: optionalString(row, "description"),
              active: booleanValue(row, "active", true)
            }
          })
          .returning({ id: products.id, productCode: products.productCode }),
        "Upsert product"
      );

      productByCode.set(saved.productCode, saved.id);
    }

    for (const [index, row] of sheets.variants.entries()) {
      const rowNumber = index + 2;
      const productCode = requiredString(row, "productCode", "variants", rowNumber);
      const productId = productByCode.get(productCode);
      if (!productId) {
        throw new Error(`variants row ${rowNumber}: productCode '${productCode}' not found`);
      }

      const saved = oneRow(
        await tx
          .insert(variants)
          .values({
            productId,
            optionValues: parseOptionValues(row),
            imageUrl: optionalString(row, "imageUrl")
          })
          .returning({ id: variants.id }),
        "Create variant"
      );

      const externalKey = optionalString(row, "externalKey");
      if (externalKey) {
        variantByExternal.set(externalKey, saved.id);
      }
    }

    for (const [index, row] of sheets.skus.entries()) {
      const rowNumber = index + 2;
      const skuCode = requiredString(row, "skuCode", "skus", rowNumber);
      const variantExternalKey = optionalString(row, "variantExternalKey");
      const directVariantId = optionalString(row, "variantId");
      const variantId = directVariantId ?? (variantExternalKey ? variantByExternal.get(variantExternalKey) : undefined);
      if (!variantId) {
        throw new Error(`skus row ${rowNumber}: variantId or variantExternalKey is required`);
      }

      const saved = oneRow(
        await tx
          .insert(skus)
          .values({
            variantId,
            skuCode,
            manualOverride: booleanValue(row, "manualOverride", false)
          })
          .onConflictDoUpdate({ target: skus.skuCode, set: { variantId, manualOverride: booleanValue(row, "manualOverride", false) } })
          .returning({ id: skus.id, skuCode: skus.skuCode }),
        "Upsert SKU"
      );

      skuByCode.set(saved.skuCode, saved.id);
    }

    for (const [index, row] of sheets.barcodes.entries()) {
      const rowNumber = index + 2;
      const skuCode = optionalString(row, "skuCode");
      const skuId = optionalString(row, "skuId") ?? (skuCode ? skuByCode.get(skuCode) : undefined);
      if (!skuId) {
        throw new Error(`barcodes row ${rowNumber}: skuId/skuCode not found`);
      }

      const barcodeValue = requiredString(row, "barcodeValue", "barcodes", rowNumber);
      const symbology = optionalString(row, "symbology") ?? "CODE128";

      await tx
        .insert(barcodes)
        .values({ skuId, barcodeValue, symbology })
        .onConflictDoUpdate({ target: barcodes.barcodeValue, set: { skuId, symbology } });
    }

    for (const [index, row] of sheets.inventoryLots.entries()) {
      const rowNumber = index + 2;
      const lotCode = requiredString(row, "lotCode", "inventory_lots", rowNumber);
      const locationCode = requiredString(row, "locationCode", "inventory_lots", rowNumber);
      const locationId = locationByCode.get(locationCode);
      if (!locationId) {
        throw new Error(`inventory_lots row ${rowNumber}: locationCode '${locationCode}' not found`);
      }

      await tx
        .insert(inventoryLots)
        .values({
          lotCode,
          material: requiredString(row, "material", "inventory_lots", rowNumber),
          purity: String(numberValue(row, "purity", 0)),
          gramsReceived: String(numberValue(row, "gramsReceived", 0)),
          gramsAvailable: String(numberValue(row, "gramsAvailable", 0)),
          costCurrency: (optionalString(row, "costCurrency") ?? "USD") as "USD" | "THB" | "MYR",
          costTotal: String(numberValue(row, "costTotal", 0)),
          locationId
        })
        .onConflictDoUpdate({
          target: inventoryLots.lotCode,
          set: {
            material: requiredString(row, "material", "inventory_lots", rowNumber),
            purity: String(numberValue(row, "purity", 0)),
            gramsReceived: String(numberValue(row, "gramsReceived", 0)),
            gramsAvailable: String(numberValue(row, "gramsAvailable", 0)),
            costCurrency: (optionalString(row, "costCurrency") ?? "USD") as "USD" | "THB" | "MYR",
            costTotal: String(numberValue(row, "costTotal", 0)),
            locationId
          }
        });
    }

    for (const [index, row] of sheets.inventoryBalances.entries()) {
      const rowNumber = index + 2;
      const skuCode = requiredString(row, "skuCode", "inventory_balances", rowNumber);
      const locationCode = requiredString(row, "locationCode", "inventory_balances", rowNumber);
      const skuId = skuByCode.get(skuCode);
      const locationId = locationByCode.get(locationCode);
      if (!skuId || !locationId) {
        throw new Error(`inventory_balances row ${rowNumber}: unknown skuCode/locationCode`);
      }

      await tx
        .insert(inventoryBalances)
        .values({
          skuId,
          locationId,
          qtyOnHand: Math.trunc(numberValue(row, "qtyOnHand", 0)),
          qtyReserved: Math.trunc(numberValue(row, "qtyReserved", 0))
        })
        .onConflictDoUpdate({
          target: [inventoryBalances.skuId, inventoryBalances.locationId],
          set: {
            qtyOnHand: Math.trunc(numberValue(row, "qtyOnHand", 0)),
            qtyReserved: Math.trunc(numberValue(row, "qtyReserved", 0)),
            updatedAt: new Date()
          }
        });
    }

    for (const [index, row] of sheets.productionOrders.entries()) {
      const rowNumber = index + 2;
      const orderCode = requiredString(row, "orderCode", "production_orders", rowNumber);
      const skuCode = requiredString(row, "skuCode", "production_orders", rowNumber);
      const skuId = skuByCode.get(skuCode);
      if (!skuId) {
        throw new Error(`production_orders row ${rowNumber}: skuCode '${skuCode}' not found`);
      }

      await tx
        .insert(productionOrders)
        .values({
          orderCode,
          skuId,
          targetQty: Math.trunc(numberValue(row, "targetQty", 0)),
          completedQty: Math.trunc(numberValue(row, "completedQty", 0)),
          status: optionalString(row, "status") ?? "draft",
          inputLots: parseJsonArray(row.inputLots) as Array<{ lotId: string; grams: number }>
        })
        .onConflictDoUpdate({
          target: productionOrders.orderCode,
          set: {
            skuId,
            targetQty: Math.trunc(numberValue(row, "targetQty", 0)),
            completedQty: Math.trunc(numberValue(row, "completedQty", 0)),
            status: optionalString(row, "status") ?? "draft",
            inputLots: parseJsonArray(row.inputLots) as Array<{ lotId: string; grams: number }>
          }
        });
    }

    for (const [index, row] of sheets.consignmentAccounts.entries()) {
      const rowNumber = index + 2;
      const accountCode = requiredString(row, "accountCode", "consignment_accounts", rowNumber);
      const accountName = requiredString(row, "accountName", "consignment_accounts", rowNumber);
      const country = requiredString(row, "country", "consignment_accounts", rowNumber);
      const currency = (optionalString(row, "currency") ?? "USD") as "USD" | "THB" | "MYR";

      await tx
        .insert(consignmentAccounts)
        .values({ accountCode, accountName, country, currency })
        .onConflictDoUpdate({ target: consignmentAccounts.accountCode, set: { accountName, country, currency } });
    }

    const accountRows = await tx.select({ id: consignmentAccounts.id, accountCode: consignmentAccounts.accountCode }).from(consignmentAccounts);
    const accountByCode = new Map(accountRows.map((item) => [item.accountCode, item.id]));

    for (const [index, row] of sheets.consignmentShipments.entries()) {
      const rowNumber = index + 2;
      const shipmentCode = requiredString(row, "shipmentCode", "consignment_shipments", rowNumber);
      const accountCode = requiredString(row, "accountCode", "consignment_shipments", rowNumber);
      const fromLocationCode = requiredString(row, "fromLocationCode", "consignment_shipments", rowNumber);
      const toLocationCode = requiredString(row, "toLocationCode", "consignment_shipments", rowNumber);

      const accountId = accountByCode.get(accountCode);
      const fromLocationId = locationByCode.get(fromLocationCode);
      const toLocationId = locationByCode.get(toLocationCode);
      if (!accountId || !fromLocationId || !toLocationId) {
        throw new Error(`consignment_shipments row ${rowNumber}: account/location reference not found`);
      }

      const saved = oneRow(
        await tx
          .insert(consignmentShipments)
          .values({
            shipmentCode,
            accountId,
            fromLocationId,
            toLocationId,
            lines: parseJsonArray(row.lines) as Array<{ skuId: string; qty: number; unitPrice: number }>,
            status: optionalString(row, "status") ?? "shipped"
          })
          .onConflictDoUpdate({
            target: consignmentShipments.shipmentCode,
            set: {
              accountId,
              fromLocationId,
              toLocationId,
              lines: parseJsonArray(row.lines) as Array<{ skuId: string; qty: number; unitPrice: number }>,
              status: optionalString(row, "status") ?? "shipped"
            }
          })
          .returning({ id: consignmentShipments.id, shipmentCode: consignmentShipments.shipmentCode }),
        "Upsert consignment shipment"
      );

      shipmentByCode.set(saved.shipmentCode, saved.id);
    }

    for (const [index, row] of sheets.consignmentSettlements.entries()) {
      const rowNumber = index + 2;
      const settlementCode = requiredString(row, "settlementCode", "consignment_settlements", rowNumber);
      const shipmentCode = requiredString(row, "shipmentCode", "consignment_settlements", rowNumber);
      const shipmentId = shipmentByCode.get(shipmentCode);
      if (!shipmentId) {
        throw new Error(`consignment_settlements row ${rowNumber}: shipmentCode '${shipmentCode}' not found`);
      }

      await tx
        .insert(consignmentSettlements)
        .values({
          settlementCode,
          shipmentId,
          soldLines: parseJsonArray(row.soldLines) as Array<{ skuId: string; soldQty: number; soldAmount: number }>,
          returnedLines: parseJsonArray(row.returnedLines) as Array<{ skuId: string; qty: number }>,
          currency: (optionalString(row, "currency") ?? "USD") as "USD" | "THB" | "MYR"
        })
        .onConflictDoUpdate({
          target: consignmentSettlements.settlementCode,
          set: {
            shipmentId,
            soldLines: parseJsonArray(row.soldLines) as Array<{ skuId: string; soldQty: number; soldAmount: number }>,
            returnedLines: parseJsonArray(row.returnedLines) as Array<{ skuId: string; qty: number }>,
            currency: (optionalString(row, "currency") ?? "USD") as "USD" | "THB" | "MYR"
          }
        });
    }

    return {
      categories: sheets.categories.length,
      locations: sheets.locations.length,
      products: sheets.products.length,
      variants: sheets.variants.length,
      skus: sheets.skus.length,
      barcodes: sheets.barcodes.length,
      inventoryLots: sheets.inventoryLots.length,
      inventoryBalances: sheets.inventoryBalances.length,
      productionOrders: sheets.productionOrders.length,
      consignmentAccounts: sheets.consignmentAccounts.length,
      consignmentShipments: sheets.consignmentShipments.length,
      consignmentSettlements: sheets.consignmentSettlements.length
    };
  });

  console.log("Seed import complete:", summary);
}

main()
  .catch((error) => {
    console.error("Seed import failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
