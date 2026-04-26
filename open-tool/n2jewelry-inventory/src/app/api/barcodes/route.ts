import bwipjs from "bwip-js";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { fail, ok } from "@/lib/api/response";
import { requireRole, roleFromHeaders } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { oneRow } from "@/lib/db/results";
import { barcodes, skus } from "@/lib/db/schema";
import { generateBarcodeValue } from "@/lib/inventory/sku";

const schema = z.object({
  skuId: z.string().uuid(),
  barcodeValue: z.string().optional()
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const value = url.searchParams.get("value");
    const format = (url.searchParams.get("format") ?? "code128").toLowerCase();
    if (!value) {
      return ok(await db.select().from(barcodes));
    }

    const png = await bwipjs.toBuffer({
      bcid: format === "qrcode" ? "qrcode" : "code128",
      text: value,
      scale: format === "qrcode" ? 4 : 2,
      height: format === "qrcode" ? undefined : 12,
      includetext: format === "qrcode" ? false : true,
      textxalign: "center"
    });

    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return fail(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    requireRole(roleFromHeaders(new Headers(request.headers)), "Production");
    const payload = schema.parse(await request.json());
    const [sku] = await db.select().from(skus).where(eq(skus.id, payload.skuId));
    if (!sku) {
      throw new Error("SKU not found");
    }

    const barcodeValue = payload.barcodeValue ?? generateBarcodeValue(sku.skuCode);
    const created = oneRow(
      await db
      .insert(barcodes)
      .values({
        skuId: payload.skuId,
        barcodeValue,
        symbology: "CODE128"
      })
      .returning(),
      "Create barcode"
    );

    return ok(created, 201);
  } catch (error) {
    return fail(error, 400);
  }
}
