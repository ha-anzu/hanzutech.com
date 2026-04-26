"use server";

import path from "node:path";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import * as XLSX from "xlsx";
import { uploadObject } from "@/lib/assets/storage";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { barcodes, categories, digitalAssets, products, productionOrders, skus, variants } from "@/lib/db/schema";
import { generateBarcodeValue } from "@/lib/inventory/sku";
import { metalUnitPriceForType, getCurrentMetalReferencePrices } from "@/lib/pricing/reference-prices";
import { ensureSkuForVariant } from "@/lib/products/sku-ops";
import { computeCalculatorPricing, parseVariantPricingInput } from "@/lib/pricing/calculator-engine";

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function toText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
}

function normalizeKey(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function pickRowValue(row: Record<string, unknown>, aliases: string[]) {
  const normalized = new Map(Object.entries(row).map(([key, value]) => [normalizeKey(key), value]));
  for (const alias of aliases) {
    const value = normalized.get(normalizeKey(alias));
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function toCode(text: string, fallbackPrefix: string) {
  const cleaned = text
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || `${fallbackPrefix}-${Date.now()}`;
}

export async function createProductAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const productCode = toText(formData.get("productCode")).toUpperCase();
    const name = toText(formData.get("name"));
    const categoryId = toText(formData.get("categoryId"));
    const subcategoryId = toText(formData.get("subcategoryId"));
    const description = toText(formData.get("description"));
    const active = toText(formData.get("active")) === "on";

    if (!productCode || !name || !categoryId) {
      throw new Error("Product code, name, and category are required");
    }

    const created = oneRow(
      await db
        .insert(products)
        .values({
          productCode,
          name,
          categoryId,
          subcategoryId: subcategoryId || null,
          description: description || null,
          active
        })
        .returning(),
      "Create product"
    );

    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      const bytes = Buffer.from(await image.arrayBuffer());
      const safeName = cleanFileName(image.name || `product-${created.id}.jpg`);
      const ext = path.extname(safeName) || ".jpg";
      const objectKey = `products/${created.id}/${Date.now()}${ext}`;

      await uploadObject(objectKey, image.type || "application/octet-stream", bytes);

      await db.insert(digitalAssets).values({
        fileName: safeName,
        mimeType: image.type || "application/octet-stream",
        objectKey,
        productId: created.id
      });
    }

    revalidatePath("/products");
    revalidatePath(`/products/${created.id}`);

    return { ok: true, data: { id: created.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create product" };
  }
}

export async function importProductsFromExcelAction(
  formData: FormData
): Promise<ActionResult<{ productsUpserted: number; variantsCreated: number; categoriesUpserted: number }>> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Excel file is required");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(bytes, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("Workbook has no sheet");
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: false });
    if (!rows.length) {
      throw new Error("No rows found in first sheet");
    }

    const categoryByCode = new Map<string, string>();
    const existingCategories = await db.select().from(categories);
    for (const item of existingCategories) {
      categoryByCode.set(item.code, item.id);
    }

    let categoriesUpserted = 0;
    let productsUpserted = 0;
    let variantsCreated = 0;

    for (const row of rows) {
      const categoryName = pickRowValue(row, ["category", "category_name", "group"]) || "Uncategorized";
      const categoryCode = toCode(pickRowValue(row, ["categoryCode", "category_code"]) || categoryName, "CAT");
      const subcategoryName = pickRowValue(row, ["subcategory", "collection", "collection_name"]);
      const subcategoryCode = subcategoryName
        ? toCode(pickRowValue(row, ["subcategoryCode", "collectionCode", "subcategory_code"]) || `${categoryCode}-${subcategoryName}`, "SUB")
        : "";

      let categoryId = categoryByCode.get(categoryCode);
      if (!categoryId) {
        const category = oneRow(
          await db
            .insert(categories)
            .values({
              code: categoryCode,
              name: categoryName
            })
            .onConflictDoUpdate({ target: categories.code, set: { name: categoryName } })
            .returning({ id: categories.id, code: categories.code }),
          "Upsert category"
        );
        categoryId = category.id;
        categoryByCode.set(category.code, category.id);
        categoriesUpserted += 1;
      }

      let subcategoryId: string | null = null;
      if (subcategoryName) {
        const existingSubcategoryId = categoryByCode.get(subcategoryCode);
        if (existingSubcategoryId) {
          subcategoryId = existingSubcategoryId;
        } else {
          const subcategory = oneRow(
            await db
              .insert(categories)
              .values({
                code: subcategoryCode,
                name: subcategoryName,
                parentId: categoryId
              })
              .onConflictDoUpdate({ target: categories.code, set: { name: subcategoryName, parentId: categoryId } })
              .returning({ id: categories.id, code: categories.code }),
            "Upsert subcategory"
          );
          subcategoryId = subcategory.id;
          categoryByCode.set(subcategory.code, subcategory.id);
          categoriesUpserted += 1;
        }
      }

      const productName = pickRowValue(row, ["name", "product_name", "title"]);
      const productCodeSource = pickRowValue(row, ["productCode", "product_code", "code", "style_code"]) || productName;
      if (!productName || !productCodeSource) {
        continue;
      }
      const productCode = toCode(productCodeSource, "PDT");

      const product = oneRow(
        await db
          .insert(products)
          .values({
            productCode,
            name: productName,
            categoryId,
            subcategoryId,
            description: pickRowValue(row, ["description", "notes", "product_description"]) || null,
            active: true
          })
          .onConflictDoUpdate({
            target: products.productCode,
            set: {
              name: productName,
              categoryId,
              subcategoryId,
              description: pickRowValue(row, ["description", "notes", "product_description"]) || null
            }
          })
          .returning({ id: products.id }),
        "Upsert product"
      );
      productsUpserted += 1;

      const variantOptions: Record<string, string> = {};
      const optionMappings: Array<[string, string[]]> = [
        ["style", ["style", "design", "model"]],
        ["size", ["size", "ring_size"]],
        ["color", ["color", "tone"]],
        ["finish", ["finish", "polish"]],
        ["material", ["material", "metal", "alloy"]]
      ];
      for (const [key, aliases] of optionMappings) {
        const value = pickRowValue(row, aliases);
        if (value) {
          variantOptions[key] = value;
        }
      }

      const maybeWeight = pickRowValue(row, ["metalWeightGrams", "weight_g", "weight"]);
      const maybeCarats = pickRowValue(row, ["carats", "stoneCarats"]);
      if (maybeWeight) variantOptions.pricingMetalWeightGrams = maybeWeight;
      if (maybeCarats) variantOptions.pricingStoneCarats = maybeCarats;

      await db.insert(variants).values({
        productId: product.id,
        optionValues: variantOptions,
        imageUrl: pickRowValue(row, ["imageUrl", "image", "photo"]) || null
      });
      variantsCreated += 1;
    }

    revalidatePath("/products");

    return {
      ok: true,
      data: {
        productsUpserted,
        variantsCreated,
        categoriesUpserted
      }
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to import from Excel" };
  }
}

export async function addVariantAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  try {
    const productId = toText(formData.get("productId"));
    const optionValuesInput = toText(formData.get("optionValues"));
    const createSku = toText(formData.get("createSku")) !== "off";

    if (!productId) {
      throw new Error("Product is required");
    }

    let optionValues: Record<string, string> = {};
    if (optionValuesInput) {
      optionValues = JSON.parse(optionValuesInput) as Record<string, string>;
    }

    let imageUrl: string | null = null;
    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      const bytes = Buffer.from(await image.arrayBuffer());
      const safeName = cleanFileName(image.name || `variant-${productId}.jpg`);
      const ext = path.extname(safeName) || ".jpg";
      const objectKey = `variants/${productId}/${Date.now()}${ext}`;

      const uploaded = await uploadObject(objectKey, image.type || "application/octet-stream", bytes);
      imageUrl = uploaded.publicUrl ?? uploaded.objectKey;
    }

    const created = oneRow(
      await db
        .insert(variants)
        .values({
          productId,
          optionValues,
          imageUrl
        })
        .returning(),
      "Create variant"
    );

    if (createSku) {
      await ensureSkuForVariant(created.id);
    }

    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);

    return { ok: true, data: { id: created.id } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create variant" };
  }
}

export async function updateVariantPricingAction(formData: FormData): Promise<ActionResult<{ variantId: string }>> {
  try {
    const variantId = toText(formData.get("variantId"));
    if (!variantId) {
      throw new Error("Variant is required");
    }

    const [variant] = await db.select().from(variants).where(eq(variants.id, variantId));
    if (!variant) {
      throw new Error("Variant not found");
    }

    const refPrices = await getCurrentMetalReferencePrices();
    const detectedMetal = toText(formData.get("pricingMetalType")) || variant.optionValues.pricingMetalType || "XAG";
    const unitPrice = metalUnitPriceForType(detectedMetal, refPrices);
    const nextOptions = {
      ...variant.optionValues,
      pricingMetalType: detectedMetal,
      pricingPurity: toText(formData.get("pricingPurity")) || variant.optionValues.pricingPurity || "",
      pricingMetalWeightGrams: toText(formData.get("pricingMetalWeightGrams")) || variant.optionValues.pricingMetalWeightGrams || "",
      pricingMetalLossPct: toText(formData.get("pricingMetalLossPct")) || variant.optionValues.pricingMetalLossPct || "",
      pricingUnitPricePerGram: toText(formData.get("pricingUnitPricePerGram")) || variant.optionValues.pricingUnitPricePerGram || String(unitPrice),
      pricingStoneCarats: toText(formData.get("pricingStoneCarats")) || variant.optionValues.pricingStoneCarats || "",
      pricingStonePricePerCarat:
        toText(formData.get("pricingStonePricePerCarat")) || variant.optionValues.pricingStonePricePerCarat || String(refPrices.diamondUsdPerCarat),
      pricingLaborQty: toText(formData.get("pricingLaborQty")) || variant.optionValues.pricingLaborQty || "",
      pricingLaborUnitPrice: toText(formData.get("pricingLaborUnitPrice")) || variant.optionValues.pricingLaborUnitPrice || "",
      pricingVatPct: toText(formData.get("pricingVatPct")) || variant.optionValues.pricingVatPct || "",
      pricingMarkupMultiplier: toText(formData.get("pricingMarkupMultiplier")) || variant.optionValues.pricingMarkupMultiplier || "",
      pricingExtraMultiplier: toText(formData.get("pricingExtraMultiplier")) || variant.optionValues.pricingExtraMultiplier || ""
    };

    const pricingInput = parseVariantPricingInput(nextOptions, unitPrice);
    const pricing = computeCalculatorPricing(pricingInput);

    const optionValues = {
      ...nextOptions,
      pricingEstCost: pricing.estCost.toFixed(4),
      pricingSuggestedSellingPrice: pricing.suggestedSellingPrice.toFixed(4),
      pricingSubtotal: pricing.subtotal.toFixed(4),
      pricingSilverSpotUsdPerGram: refPrices.silverUsdPerGram.toFixed(6),
      pricingGoldSpotUsdPerGram: refPrices.goldUsdPerGram.toFixed(6),
      pricingDiamondUsdPerCarat: refPrices.diamondUsdPerCarat.toFixed(4),
      pricingSource: refPrices.source,
      pricingSyncedAt: new Date().toISOString()
    };

    await db.update(variants).set({ optionValues }).where(eq(variants.id, variantId));

    revalidatePath("/products");
    revalidatePath(`/products/${variant.productId}`);

    return { ok: true, data: { variantId } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to update variant pricing" };
  }
}

export async function syncPricingFromCalculatorAction(): Promise<ActionResult<{ variantsUpdated: number; skusUpdated: number }>> {
  try {
    const [allVariants, refPrices] = await Promise.all([db.select().from(variants), getCurrentMetalReferencePrices()]);

    let variantsUpdated = 0;
    let skusUpdated = 0;

    for (const variant of allVariants) {
      const detectedMetal = variant.optionValues.pricingMetalType || "XAG";
      const unitPrice = metalUnitPriceForType(detectedMetal, refPrices);
      const pricingInput = parseVariantPricingInput(
        {
          ...variant.optionValues,
          pricingUnitPricePerGram: variant.optionValues.pricingUnitPricePerGram || String(unitPrice),
          pricingStonePricePerCarat: variant.optionValues.pricingStonePricePerCarat || String(refPrices.diamondUsdPerCarat)
        },
        unitPrice
      );
      const pricing = computeCalculatorPricing(pricingInput);

      const optionValues = {
        ...variant.optionValues,
        pricingMetalType: pricingInput.metalType,
        pricingPurity: String(pricingInput.purity),
        pricingMetalWeightGrams: String(pricingInput.metalWeightGrams),
        pricingMetalLossPct: String(pricingInput.metalLossPct),
        pricingUnitPricePerGram: String(pricingInput.unitPricePerGram),
        pricingStoneCarats: String(pricingInput.stoneCarats),
        pricingStonePricePerCarat: String(pricingInput.stonePricePerCarat),
        pricingLaborQty: String(pricingInput.laborQty),
        pricingLaborUnitPrice: String(pricingInput.laborUnitPrice),
        pricingVatPct: String(pricingInput.vatPct),
        pricingMarkupMultiplier: String(pricingInput.markupMultiplier),
        pricingExtraMultiplier: String(pricingInput.extraMultiplier),
        pricingEstCost: pricing.estCost.toFixed(4),
        pricingSuggestedSellingPrice: pricing.suggestedSellingPrice.toFixed(4),
        pricingSubtotal: pricing.subtotal.toFixed(4),
        pricingSilverSpotUsdPerGram: refPrices.silverUsdPerGram.toFixed(6),
        pricingGoldSpotUsdPerGram: refPrices.goldUsdPerGram.toFixed(6),
        pricingDiamondUsdPerCarat: refPrices.diamondUsdPerCarat.toFixed(4),
        pricingSource: refPrices.source,
        pricingSyncedAt: new Date().toISOString()
      };

      await db.update(variants).set({ optionValues }).where(eq(variants.id, variant.id));
      variantsUpdated += 1;

      const variantSkus = await db.select().from(skus).where(eq(skus.variantId, variant.id));
      skusUpdated += variantSkus.length;
    }

    revalidatePath("/products");

    return { ok: true, data: { variantsUpdated, skusUpdated } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to sync pricing" };
  }
}

export async function generateBarcodeForVariantAction(formData: FormData): Promise<ActionResult<{ barcode: string }>> {
  try {
    const variantId = toText(formData.get("variantId"));
    if (!variantId) {
      throw new Error("Variant is required");
    }

    const [variant] = await db.select().from(variants).where(eq(variants.id, variantId));
    if (!variant) {
      throw new Error("Variant not found");
    }

    const sku = await ensureSkuForVariant(variant.id);
    const [existingBarcode] = await db.select().from(barcodes).where(eq(barcodes.skuId, sku.id));

    const barcode =
      existingBarcode ??
      oneRow(
        await db
          .insert(barcodes)
          .values({
            skuId: sku.id,
            symbology: "CODE128",
            barcodeValue: generateBarcodeValue(sku.skuCode)
          })
          .returning(),
        "Create barcode"
      );

    revalidatePath(`/products/${variant.productId}`);
    revalidatePath("/products");

    return { ok: true, data: { barcode: barcode.barcodeValue } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to generate barcode" };
  }
}

export async function createProductionOrderForVariantAction(formData: FormData): Promise<ActionResult<{ orderCode: string }>> {
  try {
    const variantId = toText(formData.get("variantId"));
    const targetQty = Number(toText(formData.get("targetQty")) || 0);

    if (!variantId || !Number.isFinite(targetQty) || targetQty <= 0) {
      throw new Error("Variant and positive target quantity are required");
    }

    const [variant] = await db.select().from(variants).where(eq(variants.id, variantId));
    if (!variant) {
      throw new Error("Variant not found");
    }

    const sku = await ensureSkuForVariant(variant.id);

    const stamp = `${Date.now()}`;
    const orderCode = `PO-${stamp.slice(-8)}-${sku.skuCode.slice(0, 6)}`;

    const order = oneRow(
      await db
        .insert(productionOrders)
        .values({
          orderCode,
          skuId: sku.id,
          targetQty: Math.trunc(targetQty),
          completedQty: 0,
          status: "open",
          inputLots: []
        })
        .returning(),
      "Create production order"
    );

    revalidatePath(`/products/${variant.productId}`);
    revalidatePath("/products");

    return { ok: true, data: { orderCode: order.orderCode } };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Failed to create production order" };
  }
}
