"use client";

import { type ReactNode, useMemo, useState, useTransition } from "react";
import { BeakerIcon, FactoryIcon, FlaskConicalIcon, PlusIcon } from "lucide-react";
import { completeProductionOrderAction, createProductionOrderAction } from "./actions";
import type { ProductionWorkspaceData } from "@/lib/production/queries";
import { PrintLabelModal } from "@/components/labels/print-label-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  initialData: ProductionWorkspaceData;
};

function optionLabel(values: Record<string, string>) {
  const entries = Object.entries(values).filter(([, value]) => value && value.trim().length > 0);
  return entries.length ? entries.map(([k, v]) => `${k}:${v}`).join(" | ") : "Default variant";
}

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value || 0);
}

function labelMetal(values: Record<string, string>) {
  const metal = values.metal || values.material || "925";
  if (metal.includes("925")) return "925 Silver";
  return metal;
}

function labelCarats(values: Record<string, string>) {
  return values.carats || values.carat || values.stoneCarats || "N/A";
}

export function ProductionClient({ initialData }: Props) {
  const [isPending, startTransition] = useTransition();
  const [data] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>(initialData.products[0]?.id ?? "");
  const [completeDialogOrderId, setCompleteDialogOrderId] = useState<string | null>(null);

  const variantsForProduct = useMemo(
    () => data.variants.filter((variant) => variant.productId === selectedProduct),
    [data.variants, selectedProduct]
  );

  const metrics = useMemo(() => {
    const totalPlannedCost = data.activeOrders.reduce((sum, order) => sum + order.plannedCost, 0);
    const totalActualCost = data.activeOrders.reduce((sum, order) => sum + order.actualCost, 0);
    const totalPlannedGrams = data.activeOrders.reduce((sum, order) => sum + order.plannedUsageGrams, 0);
    return {
      totalOrders: data.activeOrders.length,
      totalPlannedCost,
      totalActualCost,
      totalPlannedGrams
    };
  }, [data.activeOrders]);

  async function refreshData() {
    const response = await fetch("/api/production/orders", { cache: "no-store" });
    const payload = (await response.json()) as { ok: boolean; data: Array<{ id: string }> };
    if (!payload.ok) {
      return;
    }

    // Pull full workspace data from SSR endpoint fallback by hard reload style refresh.
    location.reload();
  }

  function onCreateOrder(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createProductionOrderAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      await refreshData();
    });
  }

  function onCompleteOrder(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await completeProductionOrderAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCompleteDialogOrderId(null);
      await refreshData();
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--primary)_10%,transparent),transparent_50%),linear-gradient(to_bottom,var(--background),color-mix(in_oklab,var(--muted)_48%,var(--background)))]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Manufacturing Control</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Production</h1>
            <p className="mt-2 text-sm text-muted-foreground">Plan, consume lots, complete orders, and trace silver grams to finished stock.</p>
          </div>

          <Dialog>
            <DialogTrigger render={<Button size="lg" />}> 
              <PlusIcon data-icon="inline-start" />
              New Production Order
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Production Order</DialogTitle>
                <DialogDescription>Select product/variant, quantity, and initial lot plan.</DialogDescription>
              </DialogHeader>

              <form action={onCreateOrder} className="grid gap-3">
                <label className="grid gap-1 text-sm">
                  Product
                  <select
                    name="productId"
                    value={selectedProduct}
                    onChange={(event) => setSelectedProduct(event.target.value)}
                    required
                    className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                  >
                    <option value="">Select product</option>
                    {data.products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.productCode})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1 text-sm">
                  Variant
                  <select name="variantId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                    <option value="">Select variant</option>
                    {variantsForProduct.map((variant) => (
                      <option key={variant.id} value={variant.id}>
                        {optionLabel(variant.optionValues)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    Quantity
                    <Input type="number" name="targetQty" min={1} defaultValue={50} required />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Metal Lot
                    <select name="lotId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                      <option value="">Select lot</option>
                      {data.lots
                        .filter((lot) => lot.gramsAvailable > 0)
                        .map((lot) => (
                          <option key={lot.id} value={lot.id}>
                            {lot.lotCode} | {lot.material} | {lot.gramsAvailable.toFixed(2)}g @ {currency(lot.unitCost)}/g
                          </option>
                        ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    Planned Finished Weight (g)
                    <Input type="number" name="plannedFinishedWeightGrams" min={0.01} step="0.01" defaultValue={19} required />
                  </label>
                  <label className="grid gap-1 text-sm">
                    Planned Loss %
                    <Input type="number" name="plannedLossPct" min={0} step="0.1" defaultValue={11} required />
                  </label>
                </div>

                {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

                <Button type="submit" disabled={isPending}>{isPending ? "Creating..." : "Create Order"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Active Orders" value={String(metrics.totalOrders)} icon={<FactoryIcon className="size-5" />} />
          <MetricCard label="Planned Silver (g)" value={metrics.totalPlannedGrams.toFixed(2)} icon={<FlaskConicalIcon className="size-5" />} />
          <MetricCard label="Planned Cost" value={currency(metrics.totalPlannedCost)} icon={<BeakerIcon className="size-5" />} />
          <MetricCard label="Actual Cost" value={currency(metrics.totalActualCost)} icon={<BeakerIcon className="size-5" />} />
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Active Orders</CardTitle>
            <CardDescription>Track progress, lot traceability, and planned vs actual metal usage.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Product / SKU</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Lot Traceability</TableHead>
                  <TableHead>Usage (Planned vs Actual)</TableHead>
                  <TableHead>Cost (Planned vs Actual)</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.activeOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <p className="font-medium">{order.orderCode}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleString()}</p>
                    </TableCell>
                    <TableCell>
                      <p>{order.productName}</p>
                      <p className="text-xs text-muted-foreground">{order.skuCode}</p>
                    </TableCell>
                    <TableCell className="min-w-48">
                      <div className="space-y-2">
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${order.progressPct}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground">{order.completedQty}/{order.targetQty} ({order.progressPct}%)</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {order.lots.map((lot) => (
                          <Badge key={`${order.id}-${lot.lotId}`} variant="outline">
                            {lot.lotCode} ({lot.plannedGrams.toFixed(2)}g)
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{order.plannedUsageGrams.toFixed(2)}g / {order.actualUsageGrams.toFixed(2)}g</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{currency(order.plannedCost)} / {currency(order.actualCost)}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Dialog open={completeDialogOrderId === order.id} onOpenChange={(open) => setCompleteDialogOrderId(open ? order.id : null)}>
                          <DialogTrigger render={<Button size="sm" />}>Complete</DialogTrigger>
                          <DialogContent className="sm:max-w-xl">
                            <DialogHeader>
                              <DialogTitle>Complete {order.orderCode}</DialogTitle>
                              <DialogDescription>Auto-consume linked lots, post finished goods stock, and record actual usage.</DialogDescription>
                            </DialogHeader>

                            <form action={onCompleteOrder} className="grid gap-3">
                              <input type="hidden" name="orderId" value={order.id} />

                              <label className="grid gap-1 text-sm">
                                Finish To Location
                                <select name="toLocationId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                                  <option value="">Select location</option>
                                  {data.locations.filter((location) => location.type !== "Agent").map((location) => (
                                    <option key={location.id} value={location.id}>{location.name}</option>
                                  ))}
                                </select>
                              </label>

                              <div className="grid gap-3 sm:grid-cols-2">
                                <label className="grid gap-1 text-sm">
                                  Completed Qty
                                  <Input type="number" name="completeQty" min={1} defaultValue={order.targetQty - order.completedQty} required />
                                </label>
                                <label className="grid gap-1 text-sm">
                                  Actual Finished Weight (g)
                                  <Input type="number" name="actualFinishedWeightGrams" min={0.01} step="0.01" defaultValue={order.plannedUsageGrams} required />
                                </label>
                              </div>

                              <label className="grid gap-1 text-sm">
                                Actual Loss %
                                <Input type="number" name="actualLossPct" min={0} step="0.1" defaultValue={11} required />
                              </label>

                              {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
                              <Button type="submit" disabled={isPending}>{isPending ? "Completing..." : "Complete Order"}</Button>
                            </form>
                          </DialogContent>
                        </Dialog>

                        <PrintLabelModal
                          triggerLabel="Bulk Print"
                          defaultQty={Math.max(1, order.completedQty || order.targetQty)}
                          allowBulk
                          payload={{
                            skuCode: order.skuCode,
                            productName: order.productName,
                            price: order.labelUnitPrice,
                            metal: labelMetal(order.variantOptionValues),
                            carats: labelCarats(order.variantOptionValues),
                            barcodeValue: `N2-${order.skuCode}`,
                            qrValue: order.skuCode
                          }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="flex items-center justify-between text-2xl">
          {value}
          {icon}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
