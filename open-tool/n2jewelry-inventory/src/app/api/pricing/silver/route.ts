import { fail, ok } from "@/lib/api/response";
import { getCurrentMetalReferencePrices } from "@/lib/pricing/reference-prices";

export async function GET() {
  try {
    const prices = await getCurrentMetalReferencePrices();
    return ok({
      pricePerGramUsd: prices.silverUsdPerGram,
      source: prices.source,
      updatedAt: prices.updatedAt
    });
  } catch (error) {
    return fail(error, 500);
  }
}
