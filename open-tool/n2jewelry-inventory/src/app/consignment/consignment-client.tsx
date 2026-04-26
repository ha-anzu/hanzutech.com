"use client";

import { type ReactNode, useMemo, useState, useTransition } from "react";
import { DollarSignIcon, GlobeIcon, HandCoinsIcon, PackagePlusIcon, ShipIcon } from "lucide-react";
import { createAgentAction, createSettlementAction, createShipmentAction } from "./actions";
import type { ConsignmentWorkspaceData } from "@/lib/consignment/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "MYR", maximumFractionDigits: 2 }).format(value || 0);
}

type Props = {
  initialData: ConsignmentWorkspaceData;
};

export function ConsignmentClient({ initialData }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    return {
      stockValue: initialData.agents.reduce((sum, agent) => sum + agent.currentStockValue, 0),
      pending: initialData.agents.reduce((sum, agent) => sum + agent.pendingSettlement, 0),
      realizedProfit: initialData.settlements.reduce((sum, settlement) => sum + settlement.grossProfit, 0)
    };
  }, [initialData]);

  function submitWithRefresh(action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>) {
    return (formData: FormData) => {
      setError(null);
      startTransition(async () => {
        const result = await action(formData);
        if (!result.ok) {
          setError(result.error ?? "Action failed");
          return;
        }
        location.reload();
      });
    };
  }

  const onCreateAgent = submitWithRefresh(createAgentAction);
  const onCreateShipment = submitWithRefresh(createShipmentAction);
  const onCreateSettlement = submitWithRefresh(createSettlementAction);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--primary)_12%,transparent),transparent_50%),linear-gradient(to_bottom,var(--background),color-mix(in_oklab,var(--muted)_45%,var(--background)))]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Global Agent Network</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Consignment</h1>
            <p className="mt-2 text-sm text-muted-foreground">Manage agents, shipments, settlements, and payout profitability in one flow.</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Current Agent Stock Value" value={currency(totals.stockValue)} icon={<PackagePlusIcon className="size-5" />} />
          <MetricCard label="Pending Settlement" value={currency(totals.pending)} icon={<HandCoinsIcon className="size-5" />} />
          <MetricCard label="Realized Profit" value={currency(totals.realizedProfit)} icon={<DollarSignIcon className="size-5" />} />
        </section>

        {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

        <Tabs defaultValue="agents" className="gap-4">
          <TabsList>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="shipments">Shipments</TabsTrigger>
            <TabsTrigger value="settlements">Settlements</TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Agent Directory</CardTitle>
                <CardDescription>Current stock value, pending settlement, and linked consignment locations.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Stock Units</TableHead>
                      <TableHead className="text-right">Stock Value</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialData.agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell>
                          <p className="font-medium">{agent.accountName}</p>
                          <p className="text-xs text-muted-foreground">{agent.accountCode}</p>
                        </TableCell>
                        <TableCell>{agent.country}</TableCell>
                        <TableCell>{agent.locationName ?? "Auto-created on first shipment"}</TableCell>
                        <TableCell className="text-right">{agent.stockUnits}</TableCell>
                        <TableCell className="text-right">{currency(agent.currentStockValue)}</TableCell>
                        <TableCell className="text-right">{currency(agent.pendingSettlement)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Agent</CardTitle>
                <CardDescription>Create a new agent account and linked "Consignment - Agent Name" location.</CardDescription>
              </CardHeader>
              <CardContent>
                <form action={onCreateAgent} className="grid gap-3 sm:grid-cols-4">
                  <Input name="accountCode" placeholder="AG001" required />
                  <Input name="accountName" placeholder="Kuala Lumpur Partner" required />
                  <Input name="country" placeholder="Malaysia" defaultValue="Malaysia" required />
                  <select name="currency" className="h-8 rounded-lg border border-input bg-background px-2 text-sm" defaultValue="MYR">
                    <option value="MYR">MYR</option>
                    <option value="USD">USD</option>
                    <option value="THB">THB</option>
                  </select>
                  <div className="sm:col-span-4">
                    <Button type="submit" disabled={isPending}><GlobeIcon data-icon="inline-start" />Save Agent</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipments">
            <Card>
              <CardHeader>
                <CardTitle>Create Shipment</CardTitle>
                <CardDescription>When shipping, stock moves from source (Thailand/Malaysia) to agent consignment location.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={onCreateShipment} className="grid gap-3 lg:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    Agent
                    <select name="accountId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                      <option value="">Select agent</option>
                      {initialData.lookups.accounts.map((account) => (
                        <option key={account.id} value={account.id}>{account.accountCode} - {account.accountName}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    Source Location
                    <select name="fromLocationId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                      <option value="">Select source</option>
                      {initialData.lookups.sourceLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name} ({location.type}){location.specialMalaysia ? " - Malaysia Branch" : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    SKU
                    <select name="skuId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                      <option value="">Select SKU</option>
                      {initialData.lookups.skus.map((sku) => (
                        <option key={sku.id} value={sku.id}>{sku.skuCode} - {sku.productName}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    Quantity
                    <Input type="number" name="qty" min={1} defaultValue={10} required />
                  </label>

                  <label className="grid gap-1 text-sm">
                    Unit Price (for settlement COGS)
                    <Input type="number" name="unitPrice" min={0.01} step="0.01" defaultValue={100} required />
                  </label>

                  <div className="lg:col-span-2">
                    <Button type="submit" disabled={isPending}><ShipIcon data-icon="inline-start" />Create Shipment</Button>
                  </div>
                </form>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shipment</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialData.shipments.map((shipment) => (
                      <TableRow key={shipment.id}>
                        <TableCell>
                          <p className="font-medium">{shipment.shipmentCode}</p>
                          <p className="text-xs text-muted-foreground">{new Date(shipment.createdAt).toLocaleString()}</p>
                        </TableCell>
                        <TableCell>{shipment.accountName}</TableCell>
                        <TableCell className="text-xs">{shipment.fromLocationName} ? {shipment.toLocationName}</TableCell>
                        <TableCell>{currency(shipment.lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0))}</TableCell>
                        <TableCell><Badge variant="secondary">{shipment.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settlements">
            <Card>
              <CardHeader>
                <CardTitle>Settlement Flow</CardTitle>
                <CardDescription>Record sold qty, compute payout and profit, and settle with agent.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form action={onCreateSettlement} className="grid gap-3 lg:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    Shipment
                    <select name="shipmentId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                      <option value="">Select shipment</option>
                      {initialData.shipments.map((shipment) => (
                        <option key={shipment.id} value={shipment.id}>{shipment.shipmentCode} - {shipment.accountName}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    SKU
                    <select name="skuId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                      <option value="">Select SKU</option>
                      {initialData.lookups.skus.map((sku) => (
                        <option key={sku.id} value={sku.id}>{sku.skuCode}</option>
                      ))}
                    </select>
                  </label>

                  <label className="grid gap-1 text-sm">
                    Sold Qty
                    <Input type="number" name="soldQty" min={0} defaultValue={1} required />
                  </label>

                  <label className="grid gap-1 text-sm">
                    Sold Amount (MYR)
                    <Input type="number" name="soldAmount" min={0} step="0.01" defaultValue={150} required />
                  </label>

                  <label className="grid gap-1 text-sm">
                    Returned Qty
                    <Input type="number" name="returnedQty" min={0} defaultValue={0} required />
                  </label>

                  <label className="grid gap-1 text-sm">
                    Agent Commission %
                    <Input type="number" name="commissionPct" min={0} step="0.1" defaultValue={12} required />
                  </label>

                  <div className="lg:col-span-2">
                    <Button type="submit" disabled={isPending}><HandCoinsIcon data-icon="inline-start" />Record Settlement & Pay Agent</Button>
                  </div>
                </form>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Settlement</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">COGS</TableHead>
                      <TableHead className="text-right">Agent Payout</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialData.settlements.map((settlement) => (
                      <TableRow key={settlement.id}>
                        <TableCell>
                          <p className="font-medium">{settlement.settlementCode}</p>
                          <p className="text-xs text-muted-foreground">{new Date(settlement.createdAt).toLocaleString()}</p>
                        </TableCell>
                        <TableCell>{settlement.accountName}</TableCell>
                        <TableCell className="text-right">{currency(settlement.soldAmount)}</TableCell>
                        <TableCell className="text-right">{currency(settlement.cogs)}</TableCell>
                        <TableCell className="text-right">{currency(settlement.agentPayout)}</TableCell>
                        <TableCell className="text-right font-semibold">{currency(settlement.grossProfit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
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
