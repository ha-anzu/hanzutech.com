"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { ActivityIcon, FactoryIcon, PackageSearchIcon, WarehouseIcon } from "lucide-react";
import { adjustStockAction } from "./actions";
import type { InventoryOverview } from "@/lib/inventory/overview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Props = {
  initialData: InventoryOverview;
};

type OptimisticEvent =
  | { type: "sync"; payload: InventoryOverview }
  | {
      type: "adjust";
      payload: {
        skuId: string;
        locationId: string;
        delta: number;
        reason: string;
      };
    };

export function InventoryClient({ initialData }: Props) {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [data, applyOptimistic] = useOptimistic(initialData, (state, event: OptimisticEvent): InventoryOverview => {
    if (event.type === "sync") {
      return event.payload;
    }

    if (event.type === "adjust") {
      const rows = state.rows.map((row) => {
        if (row.skuId !== event.payload.skuId) return row;

        const byLocation = [...row.byLocation];
        const locationIdx = byLocation.findIndex((item) => item.locationId === event.payload.locationId);
        if (locationIdx >= 0) {
          byLocation[locationIdx] = { ...byLocation[locationIdx], qty: byLocation[locationIdx].qty + event.payload.delta };
        }

        return {
          ...row,
          totalStock: row.totalStock + event.payload.delta,
          byLocation
        };
      });

      const sku = state.rows.find((item) => item.skuId === event.payload.skuId);
      const location = state.lookups.locations.find((item) => item.id === event.payload.locationId);

      const movement = {
        id: `temp-${crypto.randomUUID()}`,
        movementType: event.payload.delta >= 0 ? "in" : "out",
        skuCode: sku?.skuCode ?? "-",
        productName: sku?.productName ?? "-",
        quantity: Math.abs(event.payload.delta),
        fromLocation: event.payload.delta < 0 ? location?.name ?? null : null,
        toLocation: event.payload.delta > 0 ? location?.name ?? null : null,
        notes: `Stock adjustment: ${event.payload.reason}`,
        createdAt: new Date().toISOString(),
        referenceType: "manual_adjustment"
      };

      return {
        ...state,
        rows,
        movements: [movement, ...state.movements].slice(0, 120)
      };
    }

    return state;
  });

  useEffect(() => {
    const timer = setInterval(async () => {
      const response = await fetch("/api/inventory/overview", { cache: "no-store" });
      const json = (await response.json()) as { ok: boolean; data: InventoryOverview; error?: string };
      if (json.ok) {
        startTransition(() => {
          applyOptimistic({ type: "sync", payload: json.data });
        });
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [applyOptimistic, startTransition]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.rows;

    return data.rows.filter((row) => row.skuCode.toLowerCase().includes(q) || row.productName.toLowerCase().includes(q));
  }, [data.rows, query]);

  async function onAdjustStock(formData: FormData) {
    setError(null);

    const skuId = String(formData.get("skuId") ?? "").trim();
    const locationId = String(formData.get("locationId") ?? "").trim();
    const delta = Number(String(formData.get("delta") ?? "0"));
    const reason = String(formData.get("reason") ?? "").trim();

    startTransition(async () => {
      applyOptimistic({
        type: "adjust",
        payload: {
          skuId,
          locationId,
          delta,
          reason
        }
      });

      const result = await adjustStockAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const response = await fetch("/api/inventory/overview", { cache: "no-store" });
      const json = (await response.json()) as { ok: boolean; data: InventoryOverview };
      if (json.ok) {
        applyOptimistic({ type: "sync", payload: json.data });
      }
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--primary)_12%,transparent),transparent_50%),linear-gradient(to_bottom,var(--background),color-mix(in_oklab,var(--muted)_50%,var(--background)))]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Live Warehouse Control</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Inventory</h1>
          </div>
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger render={<Button />}>Adjust Stock</DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Adjust Stock</DialogTitle>
                  <DialogDescription>
                    Positive delta adds stock, negative delta removes stock. Enable admin override to allow negative result.
                  </DialogDescription>
                </DialogHeader>
                <form action={onAdjustStock} className="grid gap-3">
                  <label className="grid gap-1 text-sm">
                    SKU
                    <select name="skuId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                      <option value="">Select SKU</option>
                      {data.lookups.skus.map((sku) => (
                        <option key={sku.id} value={sku.id}>
                          {sku.skuCode} - {sku.productName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    Location
                    <select name="locationId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                      <option value="">Select location</option>
                      {data.lookups.locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name} ({location.type})
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    Delta Quantity
                    <Input type="number" name="delta" required placeholder="e.g. 20 or -8" />
                  </label>

                  <label className="grid gap-1 text-sm">
                    Reason
                    <Input name="reason" required placeholder="Cycle count correction" />
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" name="overrideNegative" className="size-4 rounded border border-input" />
                    Admin override for negative stock
                  </label>

                  <label className="grid gap-1 text-sm">
                    Admin override note
                    <Input name="adminOverrideNote" placeholder="Approved by ..." />
                  </label>

                  {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

                  <Button type="submit" disabled={isPending}>{isPending ? "Applying..." : "Apply Adjustment"}</Button>
                </form>
              </DialogContent>
            </Dialog>

            <Link href="/scan" className="inline-flex h-8 items-center rounded-lg border border-input px-3 text-sm hover:bg-muted">
              Open Scanner
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Thailand Factory</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                {data.summary.thailandFactory.toLocaleString()}
                <FactoryIcon className="size-5" />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Malaysia Branch</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                {data.summary.malaysiaBranch.toLocaleString()}
                <WarehouseIcon className="size-5" />
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Consignment Agents</CardDescription>
              <CardTitle className="flex items-center justify-between text-2xl">
                {data.summary.consignmentAgents.toLocaleString()}
                <ActivityIcon className="size-5" />
              </CardTitle>
            </CardHeader>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Stock Overview</CardTitle>
            <CardDescription>Search by SKU or product name.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="relative block max-w-md">
              <PackageSearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-8" placeholder="Search SKU / Product" />
            </label>

            <div className="rounded-xl border bg-card/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>By Location</TableHead>
                    <TableHead className="text-right">Total Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow key={row.skuId}>
                      <TableCell className="font-medium">{row.skuCode}</TableCell>
                      <TableCell>
                        <div>
                          <p>{row.productName}</p>
                          <p className="text-xs text-muted-foreground">{row.productCode}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.byLocation.map((location) => (
                            <Badge key={`${row.skuId}-${location.locationId}`} variant="outline">
                              {location.locationName}: {location.qty}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{row.totalStock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movement History</CardTitle>
            <CardDescription>Newest stock events across all operations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-card/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="text-xs text-muted-foreground">{new Date(movement.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{movement.movementType}</Badge>
                      </TableCell>
                      <TableCell>{movement.skuCode}</TableCell>
                      <TableCell>{movement.productName}</TableCell>
                      <TableCell className="text-right">{movement.quantity}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(movement.fromLocation ?? "-")} ? {(movement.toLocation ?? "-")}
                      </TableCell>
                      <TableCell className="text-xs">{movement.notes ?? movement.referenceType}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
