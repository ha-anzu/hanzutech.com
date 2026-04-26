import fs from "node:fs/promises";
import path from "node:path";
import { getAppSettings } from "@/lib/settings/store";

export type MetalReferencePrices = {
  silverUsdPerGram: number;
  goldUsdPerGram: number;
  diamondUsdPerCarat: number;
  source: "settings" | "calculator-file" | "env-fallback";
  updatedAt: string | null;
};

function fallbackFromEnv() {
  return {
    silverUsdPerGram: Number(process.env.FALLBACK_SILVER_USD_PER_GRAM || 0.95),
    goldUsdPerGram: Number(process.env.FALLBACK_GOLD_USD_PER_GRAM || 76),
    diamondUsdPerCarat: Number(process.env.FALLBACK_DIAMOND_USD_PER_CARAT || 350),
    source: "env-fallback" as const,
    updatedAt: null
  };
}

export async function getCurrentMetalReferencePrices(): Promise<MetalReferencePrices> {
  const fallback = fallbackFromEnv();

  try {
    const settings = await getAppSettings();
    if (settings.pricing.silverUsdPerGram > 0 && settings.pricing.goldUsdPerGram > 0) {
      return {
        silverUsdPerGram: settings.pricing.silverUsdPerGram,
        goldUsdPerGram: settings.pricing.goldUsdPerGram,
        diamondUsdPerCarat: settings.pricing.diamondUsdPerCarat,
        source: "settings",
        updatedAt: settings.pricing.updatedAt
      };
    }
  } catch {
    // continue to calculator/env fallback
  }

  const calculatorPath = path.resolve(process.cwd(), "..", "..", "Calculator", "daily-metal-prices.json");
  try {
    const raw = await fs.readFile(calculatorPath, "utf8");
    const parsed = JSON.parse(raw) as {
      updated_at?: string | null;
      prices?: {
        XAG?: { price_per_gram_usd?: number | null };
        XAU?: { price_per_gram_usd?: number | null };
      };
    };

    const silver = Number(parsed.prices?.XAG?.price_per_gram_usd);
    const gold = Number(parsed.prices?.XAU?.price_per_gram_usd);

    return {
      silverUsdPerGram: Number.isFinite(silver) ? silver : fallback.silverUsdPerGram,
      goldUsdPerGram: Number.isFinite(gold) ? gold : fallback.goldUsdPerGram,
      diamondUsdPerCarat: fallback.diamondUsdPerCarat,
      source: "calculator-file",
      updatedAt: parsed.updated_at ?? null
    };
  } catch {
    return fallback;
  }
}

export function metalUnitPriceForType(metalType: string, prices: MetalReferencePrices) {
  const type = String(metalType || "XAG").toUpperCase();
  if (type === "XAU") {
    return prices.goldUsdPerGram;
  }
  return prices.silverUsdPerGram;
}
