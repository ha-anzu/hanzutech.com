"use client";

import Link from "next/link";
import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, BarcodeIcon, FactoryIcon, PackagePlusIcon, SparklesIcon } from "lucide-react";
import {
  addVariantAction,
  createProductionOrderForVariantAction,
  generateBarcodeForVariantAction,
  syncPricingFromCalculatorAction,
  updateVariantPricingAction
} from "../actions";
import type { ProductDetail } from "@/lib/products/queries";
import { PrintLabelModal } from "@/components/labels/print-label-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { computeCalculatorPricing, getDefaultMarkupMultiplier, getDefaultPurity } from "@/lib/pricing/calculator-engine";

type CategoryOption = {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
};

type Props = {
  detail: ProductDetail;
  categories: CategoryOption[];
};

type OptimisticEvent =
  | { type: "variant:add"; payload: ProductDetail["variants"][number] }
  | { type: "history:add"; payload: ProductDetail["history"][number] }
  | { type: "barcode:add"; payload: { variantId: string; barcode: string } };

function stringifyOptionValues(values: Record<string, string>) {
  const entries = Object.entries(values).filter(([, value]) => value.trim().length > 0);
  if (!entries.length) {
    return "-";
  }
  return entries.map(([key, value]) => `${key}: ${value}`).join(" | ");
}

function labelMetal(optionValues: Record<string, string>) {
  const metal = optionValues.metal || optionValues.material || "925";
  if (metal.includes("925")) {
    return "925 Silver";
  }
  return metal;
}

function labelCarats(optionValues: Record<string, string>) {
  return optionValues.carats || optionValues.carat || optionValues.stoneCarats || "N/A";
}

export function ProductDetailClient({ detail, categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);
  const [silverSpotUsd, setSilverSpotUsd] = useState(0.95);

  const [pricingMetalType, setPricingMetalType] = useState("XAG");
  const [pricingPurity, setPricingPurity] = useState(0.925);
  const [pricingWeight, setPricingWeight] = useState(19);
  const [pricingLoss, setPricingLoss] = useState(11);
  const [pricingUnitPrice, setPricingUnitPrice] = useState(0.95);
  const [pricingStoneCarats, setPricingStoneCarats] = useState(0);
  const [pricingStonePricePerCarat, setPricingStonePricePerCarat] = useState(0);
  const [pricingLaborQty, setPricingLaborQty] = useState(1);
  const [pricingLaborUnitPrice, setPricingLaborUnitPrice] = useState(45);
  const [pricingVatPct, setPricingVatPct] = useState(0);
  const [pricingMarkup, setPricingMarkup] = useState<number>(getDefaultMarkupMultiplier("XAG"));

  const [optimistic, applyOptimistic] = useOptimistic(detail, (state, event: OptimisticEvent) => {
    if (event.type === "variant:add") {
      return {
        ...state,
        variants: [event.payload, ...state.variants]
      };
    }

    if (event.type === "history:add") {
      return {
        ...state,
        history: [event.payload, ...state.history].slice(0, 80)
      };
    }

    if (event.type === "barcode:add") {
      return {
        ...state,
        variants: state.variants.map((variant) => {
          if (variant.id !== event.payload.variantId) {
            return variant;
          }

          const firstSku = variant.skus[0];
          if (!firstSku) {
            return variant;
          }

          return {
            ...variant,
            skus: [
              {
                ...firstSku,
                barcodes: Array.from(new Set([event.payload.barcode, ...firstSku.barcodes]))
              },
              ...variant.skus.slice(1)
            ]
          };
        })
      };
    }

    return state;
  });

  const totalStock = useMemo(() => optimistic.variants.reduce((sum, variant) => sum + variant.stock, 0), [optimistic.variants]);
  const livePricing = useMemo(
    () =>
      computeCalculatorPricing({
        metalType: pricingMetalType,
        purity: pricingPurity,
        metalWeightGrams: pricingWeight,
        metalLossPct: pricingLoss,
        unitPricePerGram: pricingUnitPrice,
        stoneCarats: pricingStoneCarats,
        stonePricePerCarat: pricingStonePricePerCarat,
        laborQty: pricingLaborQty,
        laborUnitPrice: pricingLaborUnitPrice,
        vatPct: pricingVatPct,
        markupMultiplier: pricingMarkup,
        extraMultiplier: 1
      }),
    [
      pricingLaborQty,
      pricingLaborUnitPrice,
      pricingLoss,
      pricingMarkup,
      pricingMetalType,
      pricingPurity,
      pricingStoneCarats,
      pricingStonePricePerCarat,
      pricingUnitPrice,
      pricingVatPct,
      pricingWeight
    ]
  );

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/pricing/silver", { cache: "no-store" });
      const payload = (await response.json()) as { ok: boolean; data?: { pricePerGramUsd: number } };
      if (payload.ok && payload.data?.pricePerGramUsd) {
        setSilverSpotUsd(payload.data.pricePerGramUsd);
        setPricingUnitPrice(payload.data.pricePerGramUsd);
      }
    })();
  }, []);

  async function onAddVariant(formData: FormData) {
    setError(null);

    const style = String(formData.get("style") ?? "").trim();
    const size = String(formData.get("size") ?? "").trim();
    const color = String(formData.get("color") ?? "").trim();
    const finish = String(formData.get("finish") ?? "").trim();
    const material = String(formData.get("material") ?? "925").trim();

    const optionValues = Object.fromEntries(
      Object.entries({ style, size, color, finish, material }).filter(([, value]) => value.length > 0)
    );
    optionValues.pricingMetalType = String(formData.get("pricingMetalType") ?? pricingMetalType);
    optionValues.pricingPurity = String(formData.get("pricingPurity") ?? pricingPurity);
    optionValues.pricingMetalWeightGrams = String(formData.get("pricingMetalWeightGrams") ?? pricingWeight);
    optionValues.pricingMetalLossPct = String(formData.get("pricingMetalLossPct") ?? pricingLoss);
    optionValues.pricingUnitPricePerGram = String(formData.get("pricingUnitPricePerGram") ?? pricingUnitPrice);
    optionValues.pricingStoneCarats = String(formData.get("pricingStoneCarats") ?? pricingStoneCarats);
    optionValues.pricingStonePricePerCarat = String(formData.get("pricingStonePricePerCarat") ?? pricingStonePricePerCarat);
    optionValues.pricingLaborQty = String(formData.get("pricingLaborQty") ?? pricingLaborQty);
    optionValues.pricingLaborUnitPrice = String(formData.get("pricingLaborUnitPrice") ?? pricingLaborUnitPrice);
    optionValues.pricingVatPct = String(formData.get("pricingVatPct") ?? pricingVatPct);
    optionValues.pricingMarkupMultiplier = String(formData.get("pricingMarkupMultiplier") ?? pricingMarkup);
    optionValues.pricingSilverSpotUsdPerGram = String(silverSpotUsd);
    optionValues.pricingEstCost = livePricing.estCost.toFixed(4);
    optionValues.pricingSuggestedSellingPrice = livePricing.suggestedSellingPrice.toFixed(4);

    formData.set("optionValues", JSON.stringify(optionValues));

    const optimisticVariant: ProductDetail["variants"][number] = {
      id: `temp-${crypto.randomUUID()}`,
      optionValues,
      imageUrl: null,
      createdAt: new Date().toISOString(),
      stock: 0,
      skus: []
    };

    startTransition(async () => {
      applyOptimistic({ type: "variant:add", payload: optimisticVariant });
      applyOptimistic({
        type: "history:add",
        payload: {
          id: `temp-h-${crypto.randomUUID()}`,
          type: "production",
          title: "Variant draft created",
          description: stringifyOptionValues(optionValues),
          at: new Date().toISOString()
        }
      });

      const result = await addVariantAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  function onGenerateBarcode(variantId: string) {
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("variantId", variantId);

      const result = await generateBarcodeForVariantAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      applyOptimistic({ type: "barcode:add", payload: { variantId, barcode: result.data.barcode } });
      applyOptimistic({
        type: "history:add",
        payload: {
          id: `temp-barcode-${crypto.randomUUID()}`,
          type: "movement",
          title: "Barcode generated",
          description: result.data.barcode,
          at: new Date().toISOString()
        }
      });

      router.refresh();
    });
  }

  function onCreateProductionOrder(variantId: string, targetQty: number) {
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("variantId", variantId);
      formData.set("targetQty", String(targetQty));

      const result = await createProductionOrderForVariantAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      applyOptimistic({
        type: "history:add",
        payload: {
          id: `temp-po-${crypto.randomUUID()}`,
          type: "production",
          title: "Production order opened",
          description: result.data.orderCode,
          at: new Date().toISOString()
        }
      });

      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_color-mix(in_oklab,var(--primary)_15%,transparent),transparent_45%),linear-gradient(to_bottom,var(--background),color-mix(in_oklab,var(--muted)_55%,var(--background)))]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/products" className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
              <ArrowLeftIcon className="size-3" />
              Back to Products
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{optimistic.product.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{optimistic.product.productCode}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{optimistic.product.category}</Badge>
            <Badge variant="outline">{optimistic.product.collection}</Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setError(null);
                setSyncInfo(null);
                startTransition(async () => {
                  const result = await syncPricingFromCalculatorAction();
                  if (!result.ok) {
                    setError(result.error);
                    return;
                  }
                  setSyncInfo(`Synced ${result.data.variantsUpdated} variants / ${result.data.skusUpdated} SKUs.`);
                  router.refresh();
                });
              }}
            >
              <SparklesIcon data-icon="inline-start" />
              Sync Pricing
            </Button>
          </div>
        </section>

        {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        {syncInfo ? <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">{syncInfo}</p> : null}

        <Tabs defaultValue="overview" className="gap-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="skus">SKUs</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Product Snapshot</CardTitle>
                <CardDescription>{optimistic.product.description || "No description yet."}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border bg-muted/25 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Variants</p>
                  <p className="mt-2 text-2xl font-semibold">{optimistic.variants.length}</p>
                </div>
                <div className="rounded-xl border bg-muted/25 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Total SKUs</p>
                  <p className="mt-2 text-2xl font-semibold">{optimistic.variants.reduce((sum, variant) => sum + variant.skus.length, 0)}</p>
                </div>
                <div className="rounded-xl border bg-muted/25 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Stock</p>
                  <p className="mt-2 text-2xl font-semibold">{totalStock}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Image</CardTitle>
                <CardDescription>Primary visual from digital repository.</CardDescription>
              </CardHeader>
              <CardContent>
                {optimistic.product.imageUrl ? (
                  <img src={optimistic.product.imageUrl} alt={optimistic.product.name} className="aspect-square w-full rounded-xl border object-cover" />
                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-xl border bg-muted/25 text-sm text-muted-foreground">No image uploaded</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="variants" className="space-y-4">
            <div className="flex justify-end">
              <Dialog>
                <DialogTrigger render={<Button />}>
                  <PackagePlusIcon data-icon="inline-start" />
                  Add Variant
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Create Variant</DialogTitle>
                    <DialogDescription>Add variant attributes and optionally upload variant image.</DialogDescription>
                  </DialogHeader>

                  <form action={onAddVariant} className="grid gap-3">
                    <input type="hidden" name="productId" value={optimistic.product.id} />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-1 text-sm">
                        Style
                        <Input name="style" placeholder="Halo" />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Size
                        <Input name="size" placeholder="7" />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Color
                        <Input name="color" placeholder="Silver" />
                      </label>
                      <label className="grid gap-1 text-sm">
                        Finish
                        <Input name="finish" placeholder="Polished" />
                      </label>
                      <label className="grid gap-1 text-sm sm:col-span-2">
                        Material
                        <Input name="material" defaultValue="925" placeholder="925" />
                      </label>
                    </div>

                    <label className="grid gap-1 text-sm">
                      Variant Image
                      <input name="image" type="file" accept="image/*" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                    </label>

                    <label className="inline-flex items-center gap-2 text-sm">
                      <input name="createSku" type="checkbox" defaultChecked className="size-4 rounded border border-input" />
                      Auto-create first SKU
                    </label>

                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Calculator Pricing</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-3">
                        <label className="grid gap-1 text-xs">
                          Metal Type
                          <select
                            name="pricingMetalType"
                            value={pricingMetalType}
                            onChange={(event) => {
                              const next = event.target.value;
                              setPricingMetalType(next);
                              setPricingPurity(getDefaultPurity(next));
                              setPricingMarkup(getDefaultMarkupMultiplier(next));
                            }}
                            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                          >
                            <option value="XAG">Silver (XAG)</option>
                            <option value="XAU">Gold (XAU)</option>
                            <option value="XPT">Platinum (XPT)</option>
                            <option value="XPD">Palladium (XPD)</option>
                            <option value="CUSTOM">Custom</option>
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs">
                          Purity
                          <Input name="pricingPurity" type="number" step="0.001" value={pricingPurity} onChange={(e) => setPricingPurity(Number(e.target.value) || 0)} />
                        </label>
                        <label className="grid gap-1 text-xs">
                          Unit Price / g (USD)
                          <Input name="pricingUnitPricePerGram" type="number" step="0.0001" value={pricingUnitPrice} onChange={(e) => setPricingUnitPrice(Number(e.target.value) || 0)} />
                        </label>
                        <label className="grid gap-1 text-xs">
                          Weight (g)
                          <Input name="pricingMetalWeightGrams" type="number" step="0.01" value={pricingWeight} onChange={(e) => setPricingWeight(Number(e.target.value) || 0)} />
                        </label>
                        <label className="grid gap-1 text-xs">
                          Loss %
                          <Input name="pricingMetalLossPct" type="number" step="0.1" value={pricingLoss} onChange={(e) => setPricingLoss(Number(e.target.value) || 0)} />
                        </label>
                        <label className="grid gap-1 text-xs">
                          Markup
                          <Input name="pricingMarkupMultiplier" type="number" step="0.01" value={pricingMarkup} onChange={(e) => setPricingMarkup(Number(e.target.value) || 0)} />
                        </label>
                        <label className="grid gap-1 text-xs">
                          Carats
                          <Input name="pricingStoneCarats" type="number" step="0.01" value={pricingStoneCarats} onChange={(e) => setPricingStoneCarats(Number(e.target.value) || 0)} />
                        </label>
                        <label className="grid gap-1 text-xs">
                          Stone Price / Ct
                          <Input name="pricingStonePricePerCarat" type="number" step="0.01" value={pricingStonePricePerCarat} onChange={(e) => setPricingStonePricePerCarat(Number(e.target.value) || 0)} />
                        </label>
                        <label className="grid gap-1 text-xs">
                          Labor (qty x unit)
                          <div className="grid grid-cols-2 gap-2">
                            <Input name="pricingLaborQty" type="number" step="0.1" value={pricingLaborQty} onChange={(e) => setPricingLaborQty(Number(e.target.value) || 0)} />
                            <Input name="pricingLaborUnitPrice" type="number" step="0.01" value={pricingLaborUnitPrice} onChange={(e) => setPricingLaborUnitPrice(Number(e.target.value) || 0)} />
                          </div>
                        </label>
                      </div>
                      <Input type="hidden" name="pricingVatPct" value={pricingVatPct} />
                      <p className="mt-2 text-xs text-muted-foreground">Silver spot: {silverSpotUsd.toFixed(4)} USD/g</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border bg-background p-2 text-xs">
                          <p className="text-muted-foreground">Est. Cost</p>
                          <p className="text-sm font-semibold">${livePricing.estCost.toFixed(2)}</p>
                        </div>
                        <div className="rounded-lg border bg-background p-2 text-xs">
                          <p className="text-muted-foreground">Suggested Selling Price</p>
                          <p className="text-sm font-semibold">${livePricing.suggestedSellingPrice.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" disabled={isPending}>
                      <SparklesIcon data-icon="inline-start" />
                      {isPending ? "Saving..." : "Create Variant"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Variant Matrix</CardTitle>
                <CardDescription>Each variant shows SKU list, stock, and operation shortcuts.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead>SKU List</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {optimistic.variants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{stringifyOptionValues(variant.optionValues)}</p>
                            <p className="text-xs text-muted-foreground">Created {new Date(variant.createdAt).toLocaleString()}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {variant.skus.length ? (
                              variant.skus.map((sku) => (
                                <Badge key={sku.id} variant="outline">
                                  {sku.skuCode}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No SKUs yet</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{variant.stock}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => onGenerateBarcode(variant.id)} disabled={isPending}>
                              <BarcodeIcon data-icon="inline-start" />
                              Generate Barcode
                            </Button>
                            <EditVariantPricingDialog variant={variant} pending={isPending} />
                            <CreateProductionOrderInline onSubmit={(qty) => onCreateProductionOrder(variant.id, qty)} pending={isPending} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skus">
            <Card>
              <CardHeader>
                <CardTitle>SKU & Barcode Workspace</CardTitle>
                <CardDescription>Preview live barcodes ready for scanner validation and label print.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {optimistic.variants.flatMap((variant) => variant.skus).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No SKUs generated yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Barcode Preview</TableHead>
                        <TableHead>Label</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optimistic.variants.flatMap((variant) =>
                        variant.skus.map((sku) => (
                          <TableRow key={sku.id}>
                            <TableCell>{sku.skuCode}</TableCell>
                            <TableCell>{sku.stock}</TableCell>
                            <TableCell>
                              {sku.barcodes.length === 0 ? (
                                <span className="text-xs text-muted-foreground">No barcode yet</span>
                              ) : (
                                <div className="flex flex-wrap gap-3">
                                  {sku.barcodes.slice(0, 2).map((barcode) => (
                                    <div key={barcode} className="rounded-lg border bg-white p-2 text-black">
                                      <img
                                        src={`/api/barcodes?value=${encodeURIComponent(barcode)}`}
                                        alt={barcode}
                                        className="h-16 w-56 object-contain"
                                      />
                                      <p className="max-w-56 truncate text-center text-[10px]">{barcode}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <PrintLabelModal
                                payload={{
                                  skuCode: sku.skuCode,
                                  productName: optimistic.product.name,
                                  price: sku.suggestedPrice,
                                  metal: labelMetal(variant.optionValues),
                                  carats: labelCarats(variant.optionValues),
                                  barcodeValue: sku.barcodes[0] ?? `N2-${sku.skuCode}`,
                                  qrValue: sku.barcodes[0] ?? sku.skuCode
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Activity Timeline</CardTitle>
                <CardDescription>Movements, production events, and optimistic actions appear here.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {optimistic.history.map((entry) => (
                  <div key={entry.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="inline-flex items-center gap-1 text-sm font-medium">
                        {entry.type === "production" ? <FactoryIcon className="size-4" /> : <BarcodeIcon className="size-4" />}
                        {entry.title}
                      </p>
                      <span className="text-xs text-muted-foreground">{new Date(entry.at).toLocaleString()}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{entry.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function CreateProductionOrderInline({ onSubmit, pending }: { onSubmit: (qty: number) => void; pending: boolean }) {
  const [qty, setQty] = useState(25);

  return (
    <div className="inline-flex items-center gap-2">
      <Input
        type="number"
        min={1}
        value={qty}
        onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))}
        className="h-7 w-20"
      />
      <Button variant="secondary" size="sm" onClick={() => onSubmit(qty)} disabled={pending}>
        <FactoryIcon data-icon="inline-start" />
        Create Production Order
      </Button>
    </div>
  );
}

function EditVariantPricingDialog({
  variant,
  pending
}: {
  variant: ProductDetail["variants"][number];
  pending: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultMetalType = variant.optionValues.pricingMetalType || "XAG";
  const defaultPurity = Number(variant.optionValues.pricingPurity ?? getDefaultPurity(defaultMetalType));
  const defaultUnitPrice = Number(variant.optionValues.pricingUnitPricePerGram ?? 0.95);
  const defaultWeight = Number(variant.optionValues.pricingMetalWeightGrams ?? 19);
  const defaultLoss = Number(variant.optionValues.pricingMetalLossPct ?? 11);
  const defaultStoneCarats = Number(variant.optionValues.pricingStoneCarats ?? 0);
  const defaultStonePricePerCarat = Number(variant.optionValues.pricingStonePricePerCarat ?? 0);
  const defaultLaborQty = Number(variant.optionValues.pricingLaborQty ?? 1);
  const defaultLaborUnitPrice = Number(variant.optionValues.pricingLaborUnitPrice ?? 45);
  const defaultVat = Number(variant.optionValues.pricingVatPct ?? 0);
  const defaultMarkup = Number(variant.optionValues.pricingMarkupMultiplier ?? getDefaultMarkupMultiplier(defaultMetalType));
  const defaultExtra = Number(variant.optionValues.pricingExtraMultiplier ?? 1);

  const [metalType, setMetalType] = useState(defaultMetalType);
  const [purity, setPurity] = useState(defaultPurity);
  const [unitPrice, setUnitPrice] = useState(defaultUnitPrice);
  const [weight, setWeight] = useState(defaultWeight);
  const [loss, setLoss] = useState(defaultLoss);
  const [stoneCarats, setStoneCarats] = useState(defaultStoneCarats);
  const [stonePricePerCarat, setStonePricePerCarat] = useState(defaultStonePricePerCarat);
  const [laborQty, setLaborQty] = useState(defaultLaborQty);
  const [laborUnitPrice, setLaborUnitPrice] = useState(defaultLaborUnitPrice);
  const [vatPct, setVatPct] = useState(defaultVat);
  const [markup, setMarkup] = useState<number>(defaultMarkup);
  const [extra, setExtra] = useState(defaultExtra);

  const pricing = useMemo(
    () =>
      computeCalculatorPricing({
        metalType,
        purity,
        metalWeightGrams: weight,
        metalLossPct: loss,
        unitPricePerGram: unitPrice,
        stoneCarats,
        stonePricePerCarat,
        laborQty,
        laborUnitPrice,
        vatPct,
        markupMultiplier: markup,
        extraMultiplier: extra
      }),
    [extra, laborQty, laborUnitPrice, loss, markup, metalType, purity, stoneCarats, stonePricePerCarat, unitPrice, vatPct, weight]
  );

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("variantId", variant.id);

    startTransition(async () => {
      const result = await updateVariantPricingAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="secondary" size="sm" disabled={pending || isPending} />}>
        <SparklesIcon data-icon="inline-start" />
        Edit Pricing
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Variant Pricing</DialogTitle>
          <DialogDescription>Uses N2 Calculator formula for Est. Cost and Suggested Selling Price.</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="grid gap-1 text-xs">
              Metal Type
              <select
                name="pricingMetalType"
                value={metalType}
                onChange={(event) => {
                  const next = event.target.value;
                  setMetalType(next);
                  setPurity(getDefaultPurity(next));
                  setMarkup(getDefaultMarkupMultiplier(next));
                }}
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="XAG">Silver (XAG)</option>
                <option value="XAU">Gold (XAU)</option>
                <option value="XPT">Platinum (XPT)</option>
                <option value="XPD">Palladium (XPD)</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs">
              Purity
              <Input name="pricingPurity" type="number" step="0.001" value={purity} onChange={(e) => setPurity(Number(e.target.value) || 0)} />
            </label>
            <label className="grid gap-1 text-xs">
              Unit Price / g (USD)
              <Input name="pricingUnitPricePerGram" type="number" step="0.0001" value={unitPrice} onChange={(e) => setUnitPrice(Number(e.target.value) || 0)} />
            </label>
            <label className="grid gap-1 text-xs">
              Weight (g)
              <Input name="pricingMetalWeightGrams" type="number" step="0.01" value={weight} onChange={(e) => setWeight(Number(e.target.value) || 0)} />
            </label>
            <label className="grid gap-1 text-xs">
              Loss %
              <Input name="pricingMetalLossPct" type="number" step="0.1" value={loss} onChange={(e) => setLoss(Number(e.target.value) || 0)} />
            </label>
            <label className="grid gap-1 text-xs">
              Markup
              <Input name="pricingMarkupMultiplier" type="number" step="0.01" value={markup} onChange={(e) => setMarkup(Number(e.target.value) || 0)} />
            </label>
            <label className="grid gap-1 text-xs">
              Carats
              <Input name="pricingStoneCarats" type="number" step="0.01" value={stoneCarats} onChange={(e) => setStoneCarats(Number(e.target.value) || 0)} />
            </label>
            <label className="grid gap-1 text-xs">
              Stone Price / Ct
              <Input
                name="pricingStonePricePerCarat"
                type="number"
                step="0.01"
                value={stonePricePerCarat}
                onChange={(e) => setStonePricePerCarat(Number(e.target.value) || 0)}
              />
            </label>
            <label className="grid gap-1 text-xs">
              Labor (qty x unit)
              <div className="grid grid-cols-2 gap-2">
                <Input name="pricingLaborQty" type="number" step="0.1" value={laborQty} onChange={(e) => setLaborQty(Number(e.target.value) || 0)} />
                <Input
                  name="pricingLaborUnitPrice"
                  type="number"
                  step="0.01"
                  value={laborUnitPrice}
                  onChange={(e) => setLaborUnitPrice(Number(e.target.value) || 0)}
                />
              </div>
            </label>
            <label className="grid gap-1 text-xs">
              VAT %
              <Input name="pricingVatPct" type="number" step="0.01" value={vatPct} onChange={(e) => setVatPct(Number(e.target.value) || 0)} />
            </label>
            <label className="grid gap-1 text-xs">
              Extra Multiplier
              <Input name="pricingExtraMultiplier" type="number" step="0.01" value={extra} onChange={(e) => setExtra(Number(e.target.value) || 0)} />
            </label>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border bg-muted/20 p-2 text-xs">
              <p className="text-muted-foreground">Est. Cost</p>
              <p className="text-sm font-semibold">${pricing.estCost.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-2 text-xs">
              <p className="text-muted-foreground">Suggested Selling Price</p>
              <p className="text-sm font-semibold">${pricing.suggestedSellingPrice.toFixed(2)}</p>
            </div>
          </div>

          {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p> : null}

          <Button type="submit" disabled={pending || isPending}>
            <SparklesIcon data-icon="inline-start" />
            {isPending ? "Saving..." : "Save Pricing"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
