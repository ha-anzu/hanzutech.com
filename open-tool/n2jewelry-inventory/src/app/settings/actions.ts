"use server";

import { revalidatePath } from "next/cache";
import { saveSetting, SETTINGS_KEYS } from "@/lib/settings/store";

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function asNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(typeof value === "string" ? value.trim() : value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function savePricingSettingsAction(formData: FormData): Promise<ActionResult<null>> {
  try {
    await saveSetting(SETTINGS_KEYS.pricing, {
      silverUsdPerGram: asNumber(formData.get("silverUsdPerGram"), 0.95),
      goldUsdPerGram: asNumber(formData.get("goldUsdPerGram"), 76),
      diamondUsdPerCarat: asNumber(formData.get("diamondUsdPerCarat"), 350),
      updatedAt: new Date().toISOString()
    });

    revalidatePath("/settings");
    revalidatePath("/products");
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save pricing settings" };
  }
}

export async function saveLabelPrinterSettingsAction(formData: FormData): Promise<ActionResult<null>> {
  try {
    await saveSetting(SETTINGS_KEYS.labelPrinter, {
      defaultSize: asText(formData.get("defaultSize")) === "80mm" ? "80mm" : "58mm",
      printerName: asText(formData.get("printerName")) || "Default Browser Printer",
      copies: Math.max(1, Math.trunc(asNumber(formData.get("copies"), 1)))
    });

    revalidatePath("/settings");
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save label printer settings" };
  }
}

export async function saveStorageSettingsAction(formData: FormData): Promise<ActionResult<null>> {
  try {
    await saveSetting(SETTINGS_KEYS.storage, {
      endpoint: asText(formData.get("endpoint")),
      region: asText(formData.get("region")) || "ap-southeast-1",
      bucket: asText(formData.get("bucket")),
      publicBaseUrl: asText(formData.get("publicBaseUrl"))
    });

    revalidatePath("/settings");
    return { ok: true, data: null };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to save storage settings" };
  }
}
