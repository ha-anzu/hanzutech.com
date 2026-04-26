import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appSettings } from "@/lib/db/schema";

export const SETTINGS_KEYS = {
  pricing: "pricing",
  labelPrinter: "label_printer",
  storage: "storage"
} as const;

export type PricingSettings = {
  silverUsdPerGram: number;
  goldUsdPerGram: number;
  diamondUsdPerCarat: number;
  updatedAt: string;
};

export type LabelPrinterSettings = {
  defaultSize: "58mm" | "80mm";
  printerName: string;
  copies: number;
};

export type StorageSettings = {
  endpoint: string;
  region: string;
  bucket: string;
  publicBaseUrl: string;
};

export type AppSettingsPayload = {
  pricing: PricingSettings;
  labelPrinter: LabelPrinterSettings;
  storage: StorageSettings;
};

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const defaultSettings: AppSettingsPayload = {
  pricing: {
    silverUsdPerGram: Number(process.env.FALLBACK_SILVER_USD_PER_GRAM || 0.95),
    goldUsdPerGram: Number(process.env.FALLBACK_GOLD_USD_PER_GRAM || 76),
    diamondUsdPerCarat: Number(process.env.FALLBACK_DIAMOND_USD_PER_CARAT || 350),
    updatedAt: new Date().toISOString()
  },
  labelPrinter: {
    defaultSize: "58mm",
    printerName: "Default Browser Printer",
    copies: 1
  },
  storage: {
    endpoint: process.env.S3_ENDPOINT?.trim() || "",
    region: process.env.S3_REGION?.trim() || "ap-southeast-1",
    bucket: process.env.S3_BUCKET?.trim() || "",
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL?.trim() || ""
  }
};

async function readSetting<T extends Record<string, unknown>>(key: string, fallback: T): Promise<T> {
  const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  if (!row) {
    return fallback;
  }

  return {
    ...fallback,
    ...row.value
  } as T;
}

export async function getAppSettings(): Promise<AppSettingsPayload> {
  const [pricingRaw, labelPrinterRaw, storageRaw] = await Promise.all([
    readSetting(SETTINGS_KEYS.pricing, defaultSettings.pricing),
    readSetting(SETTINGS_KEYS.labelPrinter, defaultSettings.labelPrinter),
    readSetting(SETTINGS_KEYS.storage, defaultSettings.storage)
  ]);

  return {
    pricing: {
      silverUsdPerGram: toNumber(pricingRaw.silverUsdPerGram, defaultSettings.pricing.silverUsdPerGram),
      goldUsdPerGram: toNumber(pricingRaw.goldUsdPerGram, defaultSettings.pricing.goldUsdPerGram),
      diamondUsdPerCarat: toNumber(pricingRaw.diamondUsdPerCarat, defaultSettings.pricing.diamondUsdPerCarat),
      updatedAt: String(pricingRaw.updatedAt || defaultSettings.pricing.updatedAt)
    },
    labelPrinter: {
      defaultSize: labelPrinterRaw.defaultSize === "80mm" ? "80mm" : "58mm",
      printerName: String(labelPrinterRaw.printerName || defaultSettings.labelPrinter.printerName),
      copies: Math.max(1, Math.trunc(toNumber(labelPrinterRaw.copies, defaultSettings.labelPrinter.copies)))
    },
    storage: {
      endpoint: String(storageRaw.endpoint || defaultSettings.storage.endpoint),
      region: String(storageRaw.region || defaultSettings.storage.region),
      bucket: String(storageRaw.bucket || defaultSettings.storage.bucket),
      publicBaseUrl: String(storageRaw.publicBaseUrl || defaultSettings.storage.publicBaseUrl)
    }
  };
}

export async function saveSetting(key: string, value: Record<string, unknown>) {
  await db
    .insert(appSettings)
    .values({
      key,
      value,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value,
        updatedAt: new Date()
      }
    });
}
