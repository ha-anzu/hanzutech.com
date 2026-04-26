CREATE TABLE "app_settings" (
	"key" varchar(80) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "app_settings_updated_idx" ON "app_settings" USING btree ("updated_at");