CREATE TYPE "public"."currency" AS ENUM('USD', 'THB', 'MYR');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('Factory', 'Warehouse', 'Branch', 'Agent');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('in', 'out', 'adjust', 'transfer', 'consume', 'produce', 'consignment', 'sale', 'return');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('Admin', 'Production', 'Warehouse', 'Sales', 'Viewer');--> statement-breakpoint
CREATE TABLE "barcodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_id" uuid NOT NULL,
	"symbology" varchar(32) DEFAULT 'CODE128' NOT NULL,
	"barcode_value" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consignment_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_code" varchar(64) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"country" varchar(80) NOT NULL,
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consignment_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_code" varchar(64) NOT NULL,
	"shipment_id" uuid NOT NULL,
	"sold_lines" jsonb NOT NULL,
	"returned_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consignment_shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_code" varchar(64) NOT NULL,
	"account_id" uuid NOT NULL,
	"from_location_id" uuid NOT NULL,
	"to_location_id" uuid NOT NULL,
	"lines" jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'shipped' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "digital_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(120) NOT NULL,
	"object_key" varchar(500) NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"lot_id" uuid,
	"production_order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"base_currency" "currency" DEFAULT 'USD' NOT NULL,
	"quote_currency" "currency" NOT NULL,
	"rate" numeric(14, 6) NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"qty_on_hand" integer DEFAULT 0 NOT NULL,
	"qty_reserved" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_code" varchar(80) NOT NULL,
	"material" varchar(30) NOT NULL,
	"purity" numeric(10, 4) NOT NULL,
	"grams_received" numeric(14, 4) NOT NULL,
	"grams_available" numeric(14, 4) NOT NULL,
	"cost_currency" "currency" DEFAULT 'USD' NOT NULL,
	"cost_total" numeric(14, 4) NOT NULL,
	"location_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "location_type" NOT NULL,
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_code" varchar(64) NOT NULL,
	"sku_id" uuid NOT NULL,
	"target_qty" integer NOT NULL,
	"completed_qty" integer DEFAULT 0 NOT NULL,
	"input_lots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(24) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_code" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"category_id" uuid NOT NULL,
	"subcategory_id" uuid,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skus" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid NOT NULL,
	"sku_code" varchar(120) NOT NULL,
	"manual_override" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movement_type" "movement_type" NOT NULL,
	"sku_id" uuid NOT NULL,
	"from_location_id" uuid,
	"to_location_id" uuid,
	"quantity" integer NOT NULL,
	"unit_cost" numeric(14, 4),
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"reference_type" varchar(40) NOT NULL,
	"reference_id" uuid,
	"notes" text,
	"performed_by" uuid,
	"override_negative" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "role" DEFAULT 'Viewer' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"option_values" jsonb NOT NULL,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "barcodes" ADD CONSTRAINT "barcodes_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_settlements" ADD CONSTRAINT "consignment_settlements_shipment_id_consignment_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."consignment_shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_shipments" ADD CONSTRAINT "consignment_shipments_account_id_consignment_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."consignment_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_shipments" ADD CONSTRAINT "consignment_shipments_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consignment_shipments" ADD CONSTRAINT "consignment_shipments_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_lot_id_inventory_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."inventory_lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "digital_assets" ADD CONSTRAINT "digital_assets_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_subcategory_id_categories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skus" ADD CONSTRAINT "skus_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_sku_id_skus_id_fk" FOREIGN KEY ("sku_id") REFERENCES "public"."skus"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "barcodes_barcode_value_uq" ON "barcodes" USING btree ("barcode_value");--> statement-breakpoint
CREATE INDEX "barcodes_sku_idx" ON "barcodes" USING btree ("sku_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_code_uq" ON "categories" USING btree ("code");--> statement-breakpoint
CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "consignment_accounts_code_uq" ON "consignment_accounts" USING btree ("account_code");--> statement-breakpoint
CREATE INDEX "consignment_accounts_country_idx" ON "consignment_accounts" USING btree ("country");--> statement-breakpoint
CREATE UNIQUE INDEX "consignment_settlements_code_uq" ON "consignment_settlements" USING btree ("settlement_code");--> statement-breakpoint
CREATE INDEX "consignment_settlements_shipment_idx" ON "consignment_settlements" USING btree ("shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "consignment_shipments_code_uq" ON "consignment_shipments" USING btree ("shipment_code");--> statement-breakpoint
CREATE INDEX "consignment_shipments_account_idx" ON "consignment_shipments" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "consignment_shipments_status_idx" ON "consignment_shipments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "digital_assets_product_idx" ON "digital_assets" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "digital_assets_variant_idx" ON "digital_assets" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "digital_assets_lot_idx" ON "digital_assets" USING btree ("lot_id");--> statement-breakpoint
CREATE INDEX "digital_assets_production_order_idx" ON "digital_assets" USING btree ("production_order_id");--> statement-breakpoint
CREATE INDEX "fx_snapshots_effective_idx" ON "fx_snapshots" USING btree ("quote_currency","effective_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_balances_sku_location_uq" ON "inventory_balances" USING btree ("sku_id","location_id");--> statement-breakpoint
CREATE INDEX "inventory_balances_location_idx" ON "inventory_balances" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "inventory_balances_sku_idx" ON "inventory_balances" USING btree ("sku_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_lots_lot_code_uq" ON "inventory_lots" USING btree ("lot_code");--> statement-breakpoint
CREATE INDEX "inventory_lots_location_idx" ON "inventory_lots" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "inventory_lots_material_idx" ON "inventory_lots" USING btree ("material");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_code_uq" ON "locations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "locations_type_idx" ON "locations" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "production_orders_order_code_uq" ON "production_orders" USING btree ("order_code");--> statement-breakpoint
CREATE INDEX "production_orders_sku_idx" ON "production_orders" USING btree ("sku_id");--> statement-breakpoint
CREATE INDEX "production_orders_status_idx" ON "production_orders" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "products_product_code_uq" ON "products" USING btree ("product_code");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "products_subcategory_idx" ON "products" USING btree ("subcategory_id");--> statement-breakpoint
CREATE INDEX "products_active_idx" ON "products" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "skus_sku_code_uq" ON "skus" USING btree ("sku_code");--> statement-breakpoint
CREATE INDEX "skus_variant_idx" ON "skus" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "stock_movements_sku_idx" ON "stock_movements" USING btree ("sku_id");--> statement-breakpoint
CREATE INDEX "stock_movements_type_idx" ON "stock_movements" USING btree ("movement_type");--> statement-breakpoint
CREATE INDEX "stock_movements_created_at_idx" ON "stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_from_location_idx" ON "stock_movements" USING btree ("from_location_id");--> statement-breakpoint
CREATE INDEX "stock_movements_to_location_idx" ON "stock_movements" USING btree ("to_location_id");--> statement-breakpoint
CREATE INDEX "stock_movements_reference_idx" ON "stock_movements" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "variants_product_idx" ON "variants" USING btree ("product_id");