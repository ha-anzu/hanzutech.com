import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
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

export const users = pgTable(
  "users",
  {
    id,
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    role: roleEnum("role").notNull().default("Viewer"),
    active: boolean("active").default(true).notNull(),
    createdAt
  },
  (table) => ({
    userEmailUq: uniqueIndex("users_email_uq").on(table.email),
    userRoleIdx: index("users_role_idx").on(table.role)
  })
);

export const categories = pgTable(
  "categories",
  {
    id,
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, { onDelete: "set null" }),
    createdAt
  },
  (table) => ({
    categoryCodeUq: uniqueIndex("categories_code_uq").on(table.code),
    categoryParentIdx: index("categories_parent_idx").on(table.parentId)
  })
);

export const products = pgTable(
  "products",
  {
    id,
    productCode: varchar("product_code", { length: 64 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    subcategoryId: uuid("subcategory_id").references(() => categories.id, { onDelete: "set null" }),
    description: text("description"),
    active: boolean("active").default(true).notNull(),
    createdAt
  },
  (table) => ({
    productCodeUq: uniqueIndex("products_product_code_uq").on(table.productCode),
    productsCategoryIdx: index("products_category_idx").on(table.categoryId),
    productsSubcategoryIdx: index("products_subcategory_idx").on(table.subcategoryId),
    productsActiveIdx: index("products_active_idx").on(table.active)
  })
);

export const variants = pgTable(
  "variants",
  {
    id,
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    optionValues: jsonb("option_values").$type<Record<string, string>>().notNull(),
    imageUrl: text("image_url"),
    createdAt
  },
  (table) => ({
    variantsProductIdx: index("variants_product_idx").on(table.productId)
  })
);

export const skus = pgTable(
  "skus",
  {
    id,
    variantId: uuid("variant_id")
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    skuCode: varchar("sku_code", { length: 120 }).notNull(),
    manualOverride: boolean("manual_override").default(false).notNull(),
    createdAt
  },
  (table) => ({
    skuCodeUq: uniqueIndex("skus_sku_code_uq").on(table.skuCode),
    skusVariantIdx: index("skus_variant_idx").on(table.variantId)
  })
);

export const barcodes = pgTable(
  "barcodes",
  {
    id,
    skuId: uuid("sku_id")
      .notNull()
      .references(() => skus.id, { onDelete: "cascade" }),
    symbology: varchar("symbology", { length: 32 }).notNull().default("CODE128"),
    barcodeValue: varchar("barcode_value", { length: 255 }).notNull(),
    createdAt
  },
  (table) => ({
    barcodeValueUq: uniqueIndex("barcodes_barcode_value_uq").on(table.barcodeValue),
    barcodesSkuIdx: index("barcodes_sku_idx").on(table.skuId)
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
    locationCodeUq: uniqueIndex("locations_code_uq").on(table.code),
    locationsTypeIdx: index("locations_type_idx").on(table.type)
  })
);

export const inventoryLots = pgTable(
  "inventory_lots",
  {
    id,
    lotCode: varchar("lot_code", { length: 80 }).notNull(),
    material: varchar("material", { length: 30 }).notNull(),
    purity: numeric("purity", { precision: 10, scale: 4 }).notNull(),
    gramsReceived: numeric("grams_received", { precision: 14, scale: 4 }).notNull(),
    gramsAvailable: numeric("grams_available", { precision: 14, scale: 4 }).notNull(),
    costCurrency: currencyEnum("cost_currency").notNull().default("USD"),
    costTotal: numeric("cost_total", { precision: 14, scale: 4 }).notNull(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    createdAt
  },
  (table) => ({
    lotCodeUq: uniqueIndex("inventory_lots_lot_code_uq").on(table.lotCode),
    inventoryLotsLocationIdx: index("inventory_lots_location_idx").on(table.locationId),
    inventoryLotsMaterialIdx: index("inventory_lots_material_idx").on(table.material)
  })
);

// Backward-compatible alias used by existing handlers.
export const metalLots = inventoryLots;

export const inventoryBalances = pgTable(
  "inventory_balances",
  {
    id,
    skuId: uuid("sku_id")
      .notNull()
      .references(() => skus.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    qtyOnHand: integer("qty_on_hand").notNull().default(0),
    qtyReserved: integer("qty_reserved").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt
  },
  (table) => ({
    balanceUnique: uniqueIndex("inventory_balances_sku_location_uq").on(table.skuId, table.locationId),
    balancesLocationIdx: index("inventory_balances_location_idx").on(table.locationId),
    balancesSkuIdx: index("inventory_balances_sku_idx").on(table.skuId)
  })
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id,
    movementType: movementTypeEnum("movement_type").notNull(),
    skuId: uuid("sku_id")
      .notNull()
      .references(() => skus.id, { onDelete: "restrict" }),
    fromLocationId: uuid("from_location_id").references(() => locations.id, { onDelete: "set null" }),
    toLocationId: uuid("to_location_id").references(() => locations.id, { onDelete: "set null" }),
    quantity: integer("quantity").notNull(),
    unitCost: numeric("unit_cost", { precision: 14, scale: 4 }),
    currency: currencyEnum("currency").notNull().default("USD"),
    referenceType: varchar("reference_type", { length: 40 }).notNull(),
    referenceId: uuid("reference_id"),
    notes: text("notes"),
    performedBy: uuid("performed_by").references(() => users.id, { onDelete: "set null" }),
    overrideNegative: boolean("override_negative").default(false).notNull(),
    createdAt
  },
  (table) => ({
    movementsSkuIdx: index("stock_movements_sku_idx").on(table.skuId),
    movementsTypeIdx: index("stock_movements_type_idx").on(table.movementType),
    movementsCreatedAtIdx: index("stock_movements_created_at_idx").on(table.createdAt),
    movementsFromLocationIdx: index("stock_movements_from_location_idx").on(table.fromLocationId),
    movementsToLocationIdx: index("stock_movements_to_location_idx").on(table.toLocationId),
    movementsReferenceIdx: index("stock_movements_reference_idx").on(table.referenceType, table.referenceId)
  })
);

export const productionOrders = pgTable(
  "production_orders",
  {
    id,
    orderCode: varchar("order_code", { length: 64 }).notNull(),
    skuId: uuid("sku_id")
      .notNull()
      .references(() => skus.id, { onDelete: "restrict" }),
    targetQty: integer("target_qty").notNull(),
    completedQty: integer("completed_qty").notNull().default(0),
    inputLots: jsonb("input_lots")
      .$type<
        Array<{
          lotId: string;
          grams?: number;
          plannedGrams?: number;
          actualGrams?: number;
          unitCost?: number;
          purity?: number;
          lossPct?: number;
          totalCost?: number;
          lotCode?: string;
          consumedAt?: string;
        }>
      >()
      .notNull()
      .default([]),
    status: varchar("status", { length: 24 }).notNull().default("draft"),
    createdAt
  },
  (table) => ({
    orderCodeUq: uniqueIndex("production_orders_order_code_uq").on(table.orderCode),
    productionOrdersSkuIdx: index("production_orders_sku_idx").on(table.skuId),
    productionOrdersStatusIdx: index("production_orders_status_idx").on(table.status)
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
    accountCodeUq: uniqueIndex("consignment_accounts_code_uq").on(table.accountCode),
    consignmentAccountsCountryIdx: index("consignment_accounts_country_idx").on(table.country)
  })
);

export const consignmentShipments = pgTable(
  "consignment_shipments",
  {
    id,
    shipmentCode: varchar("shipment_code", { length: 64 }).notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => consignmentAccounts.id, { onDelete: "restrict" }),
    fromLocationId: uuid("from_location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    toLocationId: uuid("to_location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    lines: jsonb("lines").$type<Array<{ skuId: string; qty: number; unitPrice: number }>>().notNull(),
    status: varchar("status", { length: 24 }).notNull().default("shipped"),
    createdAt
  },
  (table) => ({
    shipmentCodeUq: uniqueIndex("consignment_shipments_code_uq").on(table.shipmentCode),
    consignmentShipmentsAccountIdx: index("consignment_shipments_account_idx").on(table.accountId),
    consignmentShipmentsStatusIdx: index("consignment_shipments_status_idx").on(table.status)
  })
);

export const consignmentSettlements = pgTable(
  "consignment_settlements",
  {
    id,
    settlementCode: varchar("settlement_code", { length: 64 }).notNull(),
    shipmentId: uuid("shipment_id")
      .notNull()
      .references(() => consignmentShipments.id, { onDelete: "cascade" }),
    soldLines: jsonb("sold_lines")
      .$type<Array<{ skuId: string; soldQty: number; soldAmount: number; cogs?: number; agentPayout?: number; grossProfit?: number }>>()
      .notNull(),
    returnedLines: jsonb("returned_lines").$type<Array<{ skuId: string; qty: number }>>().notNull().default([]),
    currency: currencyEnum("currency").notNull().default("USD"),
    createdAt
  },
  (table) => ({
    settlementCodeUq: uniqueIndex("consignment_settlements_code_uq").on(table.settlementCode),
    consignmentSettlementsShipmentIdx: index("consignment_settlements_shipment_idx").on(table.shipmentId)
  })
);

export const digitalAssets = pgTable(
  "digital_assets",
  {
    id,
    fileName: varchar("file_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 120 }).notNull(),
    objectKey: varchar("object_key", { length: 500 }).notNull(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    variantId: uuid("variant_id").references(() => variants.id, { onDelete: "set null" }),
    lotId: uuid("lot_id").references(() => inventoryLots.id, { onDelete: "set null" }),
    productionOrderId: uuid("production_order_id").references(() => productionOrders.id, { onDelete: "set null" }),
    createdAt
  },
  (table) => ({
    digitalAssetsProductIdx: index("digital_assets_product_idx").on(table.productId),
    digitalAssetsVariantIdx: index("digital_assets_variant_idx").on(table.variantId),
    digitalAssetsLotIdx: index("digital_assets_lot_idx").on(table.lotId),
    digitalAssetsProductionOrderIdx: index("digital_assets_production_order_idx").on(table.productionOrderId)
  })
);

export const fxSnapshots = pgTable(
  "fx_snapshots",
  {
    id,
    baseCurrency: currencyEnum("base_currency").notNull().default("USD"),
    quoteCurrency: currencyEnum("quote_currency").notNull(),
    rate: numeric("rate", { precision: 14, scale: 6 }).notNull(),
    effectiveAt: timestamp("effective_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt
  },
  (table) => ({
    fxSnapshotsEffectiveIdx: index("fx_snapshots_effective_idx").on(table.quoteCurrency, table.effectiveAt)
  })
);

export const appSettings = pgTable(
  "app_settings",
  {
    key: varchar("key", { length: 80 }).primaryKey(),
    value: jsonb("value").$type<Record<string, unknown>>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt
  },
  (table) => ({
    appSettingsUpdatedIdx: index("app_settings_updated_idx").on(table.updatedAt)
  })
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, { fields: [categories.parentId], references: [categories.id], relationName: "category_parent" }),
  children: many(categories, { relationName: "category_parent" }),
  products: many(products, { relationName: "product_category" }),
  subcategoryProducts: many(products, { relationName: "product_subcategory" })
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id], relationName: "product_category" }),
  subcategory: one(categories, {
    fields: [products.subcategoryId],
    references: [categories.id],
    relationName: "product_subcategory"
  }),
  variants: many(variants),
  assets: many(digitalAssets)
}));

export const variantsRelations = relations(variants, ({ one, many }) => ({
  product: one(products, { fields: [variants.productId], references: [products.id] }),
  skus: many(skus),
  assets: many(digitalAssets)
}));

export const skusRelations = relations(skus, ({ one, many }) => ({
  variant: one(variants, { fields: [skus.variantId], references: [variants.id] }),
  barcodes: many(barcodes),
  balances: many(inventoryBalances),
  movements: many(stockMovements),
  productionOrders: many(productionOrders)
}));

export const barcodesRelations = relations(barcodes, ({ one }) => ({
  sku: one(skus, { fields: [barcodes.skuId], references: [skus.id] })
}));

export const locationsRelations = relations(locations, ({ many }) => ({
  lots: many(inventoryLots),
  balances: many(inventoryBalances)
}));

export const inventoryLotsRelations = relations(inventoryLots, ({ one, many }) => ({
  location: one(locations, { fields: [inventoryLots.locationId], references: [locations.id] }),
  assets: many(digitalAssets)
}));

export const inventoryBalancesRelations = relations(inventoryBalances, ({ one }) => ({
  sku: one(skus, { fields: [inventoryBalances.skuId], references: [skus.id] }),
  location: one(locations, { fields: [inventoryBalances.locationId], references: [locations.id] })
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  sku: one(skus, { fields: [stockMovements.skuId], references: [skus.id] }),
  fromLocation: one(locations, { fields: [stockMovements.fromLocationId], references: [locations.id], relationName: "from_location" }),
  toLocation: one(locations, { fields: [stockMovements.toLocationId], references: [locations.id], relationName: "to_location" }),
  performer: one(users, { fields: [stockMovements.performedBy], references: [users.id] })
}));

export const productionOrdersRelations = relations(productionOrders, ({ one, many }) => ({
  sku: one(skus, { fields: [productionOrders.skuId], references: [skus.id] }),
  assets: many(digitalAssets)
}));

export const consignmentAccountsRelations = relations(consignmentAccounts, ({ many }) => ({
  shipments: many(consignmentShipments)
}));

export const consignmentShipmentsRelations = relations(consignmentShipments, ({ one, many }) => ({
  account: one(consignmentAccounts, { fields: [consignmentShipments.accountId], references: [consignmentAccounts.id] }),
  fromLocation: one(locations, {
    fields: [consignmentShipments.fromLocationId],
    references: [locations.id],
    relationName: "shipment_from_location"
  }),
  toLocation: one(locations, {
    fields: [consignmentShipments.toLocationId],
    references: [locations.id],
    relationName: "shipment_to_location"
  }),
  settlements: many(consignmentSettlements)
}));

export const consignmentSettlementsRelations = relations(consignmentSettlements, ({ one }) => ({
  shipment: one(consignmentShipments, { fields: [consignmentSettlements.shipmentId], references: [consignmentShipments.id] })
}));

export const digitalAssetsRelations = relations(digitalAssets, ({ one }) => ({
  product: one(products, { fields: [digitalAssets.productId], references: [products.id] }),
  variant: one(variants, { fields: [digitalAssets.variantId], references: [variants.id] }),
  lot: one(inventoryLots, { fields: [digitalAssets.lotId], references: [inventoryLots.id] }),
  productionOrder: one(productionOrders, { fields: [digitalAssets.productionOrderId], references: [productionOrders.id] })
}));
