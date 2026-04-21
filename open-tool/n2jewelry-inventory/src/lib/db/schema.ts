import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["Admin", "Production", "Warehouse", "Sales", "Viewer"]);
export const currencyEnum = pgEnum("currency", ["USD", "THB", "MYR"]);
export const locationTypeEnum = pgEnum("location_type", ["Factory", "Warehouse", "Branch", "Agent"]);
export const movementTypeEnum = pgEnum("movement_type", [
  "in",
  "out",
  "adjust",
  "transfer",
  "consume",
  "produce",
  "consignment",
  "sale",
  "return"
]);

const id = uuid("id").defaultRandom().primaryKey();
const createdAt = timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export const users = pgTable("users", {
  id,
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: roleEnum("role").notNull().default("Viewer"),
  active: boolean("active").default(true).notNull(),
  createdAt
});

export const categories = pgTable("categories", {
  id,
  code: varchar("code", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: uuid("parent_id"),
  createdAt
});

export const products = pgTable(
  "products",
  {
    id,
    productCode: varchar("product_code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    categoryId: uuid("category_id").notNull(),
    subcategoryId: uuid("subcategory_id"),
    description: text("description"),
    active: boolean("active").default(true).notNull(),
    createdAt
  },
  (table) => ({
    productCodeIdx: uniqueIndex("products_product_code_uq").on(table.productCode)
  })
);

export const variants = pgTable("variants", {
  id,
  productId: uuid("product_id").notNull(),
  optionValues: jsonb("option_values").$type<Record<string, string>>().notNull(),
  imageUrl: text("image_url"),
  createdAt
});

export const skus = pgTable(
  "skus",
  {
    id,
    variantId: uuid("variant_id").notNull(),
    skuCode: varchar("sku_code", { length: 120 }).notNull(),
    manualOverride: boolean("manual_override").default(false).notNull(),
    createdAt
  },
  (table) => ({
    skuCodeIdx: uniqueIndex("skus_sku_code_uq").on(table.skuCode)
  })
);

export const barcodes = pgTable(
  "barcodes",
  {
    id,
    skuId: uuid("sku_id").notNull(),
    symbology: varchar("symbology", { length: 32 }).notNull().default("CODE128"),
    barcodeValue: varchar("barcode_value", { length: 255 }).notNull(),
    createdAt
  },
  (table) => ({
    barcodeIdx: uniqueIndex("barcodes_barcode_value_uq").on(table.barcodeValue)
  })
);

export const locations = pgTable(
  "locations",
  {
    id,
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: locationTypeEnum("type").notNull(),
    currency: currencyEnum("currency").notNull().default("USD"),
    createdAt
  },
  (table) => ({
    locationCodeIdx: uniqueIndex("locations_code_uq").on(table.code)
  })
);

export const metalLots = pgTable(
  "metal_lots",
  {
    id,
    lotCode: varchar("lot_code", { length: 80 }).notNull(),
    material: varchar("material", { length: 30 }).notNull(),
    purity: numeric("purity", { precision: 10, scale: 4 }).notNull(),
    gramsReceived: numeric("grams_received", { precision: 14, scale: 4 }).notNull(),
    gramsAvailable: numeric("grams_available", { precision: 14, scale: 4 }).notNull(),
    costCurrency: currencyEnum("cost_currency").notNull().default("USD"),
    costTotal: numeric("cost_total", { precision: 14, scale: 4 }).notNull(),
    locationId: uuid("location_id").notNull(),
    createdAt
  },
  (table) => ({
    lotCodeIdx: uniqueIndex("metal_lots_lot_code_uq").on(table.lotCode)
  })
);

export const inventoryBalances = pgTable(
  "inventory_balances",
  {
    id,
    skuId: uuid("sku_id").notNull(),
    locationId: uuid("location_id").notNull(),
    qtyOnHand: integer("qty_on_hand").notNull().default(0),
    qtyReserved: integer("qty_reserved").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt
  },
  (table) => ({
    balanceUnique: uniqueIndex("inventory_balances_sku_location_uq").on(table.skuId, table.locationId)
  })
);

export const stockMovements = pgTable("stock_movements", {
  id,
  movementType: movementTypeEnum("movement_type").notNull(),
  skuId: uuid("sku_id").notNull(),
  fromLocationId: uuid("from_location_id"),
  toLocationId: uuid("to_location_id"),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 14, scale: 4 }),
  currency: currencyEnum("currency").notNull().default("USD"),
  referenceType: varchar("reference_type", { length: 40 }).notNull(),
  referenceId: uuid("reference_id"),
  notes: text("notes"),
  performedBy: uuid("performed_by"),
  overrideNegative: boolean("override_negative").default(false).notNull(),
  createdAt
});

export const productionOrders = pgTable(
  "production_orders",
  {
    id,
    orderCode: varchar("order_code", { length: 64 }).notNull(),
    skuId: uuid("sku_id").notNull(),
    targetQty: integer("target_qty").notNull(),
    completedQty: integer("completed_qty").notNull().default(0),
    inputLots: jsonb("input_lots").$type<Array<{ lotId: string; grams: number }>>().notNull().default([]),
    status: varchar("status", { length: 24 }).notNull().default("draft"),
    createdAt
  },
  (table) => ({
    orderCodeIdx: uniqueIndex("production_orders_order_code_uq").on(table.orderCode)
  })
);

export const consignmentAccounts = pgTable(
  "consignment_accounts",
  {
    id,
    accountCode: varchar("account_code", { length: 64 }).notNull(),
    accountName: varchar("account_name", { length: 255 }).notNull(),
    country: varchar("country", { length: 80 }).notNull(),
    currency: currencyEnum("currency").notNull().default("USD"),
    createdAt
  },
  (table) => ({
    accountCodeIdx: uniqueIndex("consignment_accounts_code_uq").on(table.accountCode)
  })
);

export const consignmentShipments = pgTable(
  "consignment_shipments",
  {
    id,
    shipmentCode: varchar("shipment_code", { length: 64 }).notNull(),
    accountId: uuid("account_id").notNull(),
    fromLocationId: uuid("from_location_id").notNull(),
    toLocationId: uuid("to_location_id").notNull(),
    lines: jsonb("lines").$type<Array<{ skuId: string; qty: number; unitPrice: number }>>().notNull(),
    status: varchar("status", { length: 24 }).notNull().default("shipped"),
    createdAt
  },
  (table) => ({
    shipmentCodeIdx: uniqueIndex("consignment_shipments_code_uq").on(table.shipmentCode)
  })
);

export const consignmentSettlements = pgTable(
  "consignment_settlements",
  {
    id,
    settlementCode: varchar("settlement_code", { length: 64 }).notNull(),
    shipmentId: uuid("shipment_id").notNull(),
    soldLines: jsonb("sold_lines").$type<Array<{ skuId: string; soldQty: number; soldAmount: number }>>().notNull(),
    returnedLines: jsonb("returned_lines").$type<Array<{ skuId: string; qty: number }>>().notNull().default([]),
    currency: currencyEnum("currency").notNull().default("USD"),
    createdAt
  },
  (table) => ({
    settlementCodeIdx: uniqueIndex("consignment_settlements_code_uq").on(table.settlementCode)
  })
);

export const digitalAssets = pgTable("digital_assets", {
  id,
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 120 }).notNull(),
  objectKey: varchar("object_key", { length: 500 }).notNull(),
  productId: uuid("product_id"),
  variantId: uuid("variant_id"),
  lotId: uuid("lot_id"),
  productionOrderId: uuid("production_order_id"),
  createdAt
});

export const fxSnapshots = pgTable("fx_snapshots", {
  id,
  baseCurrency: currencyEnum("base_currency").notNull().default("USD"),
  quoteCurrency: currencyEnum("quote_currency").notNull(),
  rate: numeric("rate", { precision: 14, scale: 6 }).notNull(),
  effectiveAt: timestamp("effective_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt
});
