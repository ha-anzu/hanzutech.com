"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { BarcodeIcon, BellIcon, FactoryIcon, MoonIcon, ScanLineIcon, SunIcon, TruckIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AppRole } from "@/lib/auth";
import { APP_ROLE_COOKIE, navByRole, parseRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

type ApiResponse<T> = { ok: boolean; data: T; error?: string };
type Sku = { id: string };
type Balance = { id: string; qtyOnHand: number };
type ProductionOrder = { id: string; status: string };
type ConsignmentShipment = { id: string; lines: Array<{ qty: number; unitPrice: number }> };
type ActivityItem = { id: string; title: string; detail: string; at: string };
type DatabaseStatus = {
  connected: boolean;
  checkedAt: string;
  serverTime: string | null;
  counts: {
    products: number;
    variants: number;
    skus: number;
    barcodes: number;
    inventoryLots: number;
    inventoryBalances: number;
    stockMovements: number;
    productionOrders: number;
    consignmentAccounts: number;
    consignmentShipments: number;
    consignmentSettlements: number;
    categories: number;
    locations: number;
  };
  error?: string;
};

export default function HomePage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scanCode, setScanCode] = useState("");
  const [scanResult, setScanResult] = useState<string>("No scan yet.");
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [role, setRole] = useState<AppRole>("Viewer");
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null);
  const [stats, setStats] = useState({
    totalSkus: 0,
    lowStockItems: 0,
    activeProductionOrders: 0,
    consignmentValue: 0
  });

  useEffect(() => {
    setMounted(true);
    const roleCookie = document.cookie
      .split("; ")
      .find((cookie) => cookie.startsWith(`${APP_ROLE_COOKIE}=`))
      ?.split("=")[1];
    setRole(parseRole(roleCookie));
  }, []);

  useEffect(() => {
    const initActivities: ActivityItem[] = [
      {
        id: crypto.randomUUID(),
        title: "System Ready",
        detail: "Dashboard initialized and connected to live APIs.",
        at: new Date().toISOString()
      }
    ];
    setActivities(initActivities);
  }, []);

  useEffect(() => {
    void loadStats();
  }, []);

  async function getJson<T>(url: string): Promise<T[]> {
    const response = await fetch(url, { cache: "no-store" });
    const payload = (await response.json()) as ApiResponse<T[]>;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error ?? `Failed to load ${url}`);
    }
    return payload.data ?? [];
  }

  async function loadStats() {
    try {
      const [skus, balances, orders, shipments] = await Promise.all([
        getJson<Sku>("/api/skus"),
        getJson<Balance>("/api/inventory/balances"),
        getJson<ProductionOrder>("/api/production/orders"),
        getJson<ConsignmentShipment>("/api/consignment/shipments")
      ]);

      const lowStockItems = balances.filter((item) => item.qtyOnHand > 0 && item.qtyOnHand <= 3).length;
      const activeProductionOrders = orders.filter((order) => order.status !== "completed").length;
      const consignmentValue = shipments.reduce((sum, shipment) => {
        const value = shipment.lines.reduce((lineSum, line) => lineSum + line.qty * line.unitPrice, 0);
        return sum + value;
      }, 0);

      setStats({
        totalSkus: skus.length,
        lowStockItems,
        activeProductionOrders,
        consignmentValue
      });

      const dbResponse = await fetch("/api/system/db-status", { cache: "no-store" });
      const dbPayload = (await dbResponse.json()) as ApiResponse<DatabaseStatus>;
      if (!dbPayload.ok || !dbPayload.data) {
        throw new Error(dbPayload.error ?? "Failed to load database status");
      }
      setDbStatus(dbPayload.data);

      appendActivity("Stats Refreshed", "Live metrics updated from inventory APIs.");
    } catch (error) {
      appendActivity("Stats Warning", (error as Error).message);
    }
  }

  function appendActivity(title: string, detail: string) {
    setActivities((prev) => [{ id: crypto.randomUUID(), title, detail, at: new Date().toISOString() }, ...prev].slice(0, 8));
  }

  async function resolveScan() {
    if (!scanCode.trim()) {
      setScanResult("Enter a barcode value first.");
      return;
    }
    try {
      const response = await fetch("/api/scan/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: scanCode.trim() })
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Scan resolve failed");
      }
      const output = JSON.stringify(payload.data, null, 2);
      setScanResult(output);
      appendActivity("Scan Resolved", `Barcode ${scanCode.trim()} was resolved.`);
    } catch (error) {
      setScanResult((error as Error).message);
      appendActivity("Scan Error", (error as Error).message);
    }
  }

  const darkMode = mounted ? (theme === "system" ? resolvedTheme === "dark" : theme === "dark") : false;

  const statsCards = useMemo(
    () => [
      { label: "Total SKUs", value: stats.totalSkus, icon: BarcodeIcon },
      { label: "Low Stock Items", value: stats.lowStockItems, icon: BellIcon },
      { label: "Active Production Orders", value: stats.activeProductionOrders, icon: FactoryIcon },
      { label: "Consignment Value", value: `$${stats.consignmentValue.toLocaleString()}`, icon: TruckIcon }
    ],
    [stats]
  );

  const links = useMemo<Array<{ label: string; href: string }>>(() => navByRole[role], [role]);

  const modules = useMemo(
    () =>
      [
        { title: "Products", desc: "Manage categories, variants, and SKU definitions.", href: "/products" },
        { title: "Inventory", desc: "Track lot intake, balances, and stock movement.", href: "/inventory" },
        { title: "Production", desc: "Monitor manufacturing orders and completion rates.", href: "/production" },
        { title: "Consignment", desc: "Ship to agents and settle sold/returned lines.", href: "/consignment" },
        { title: "Scanner", desc: "Resolve barcodes and run wedge/LAN/camera scans.", href: "/scan" },
        { title: "Settings", desc: "Configure prices, printer, storage, and admin defaults.", href: "/settings" }
      ].filter((module) => links.some((link) => link.href === module.href)),
    [links]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FactoryIcon data-icon="inline-start" />
            </div>
            <span className="font-heading text-lg font-semibold">N2Jewelry Inventory</span>
          </div>

          <nav className="hidden items-center gap-2 lg:flex">
            {links.map((link) => (
              <Link key={link.label} href={link.href} className={cn(buttonVariants({ variant: "ghost" }))}>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              {mounted ? (
                <>
                  <SunIcon data-icon="inline-start" />
                  <Switch checked={darkMode} onCheckedChange={(value) => setTheme(value ? "dark" : "light")} />
                  <MoonIcon data-icon="inline-end" />
                </>
              ) : null}
            </div>

            <Sheet>
              <SheetTrigger render={<Button variant="outline" className="lg:hidden" />}>Menu</SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader>
                  <SheetTitle>Navigate</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-2">
                  {links.map((link) => (
                    <Link key={link.label} href={link.href} className={cn(buttonVariants({ variant: "ghost" }))}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6">
        <section id="dashboard" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-2xl font-semibold sm:text-3xl">Operations Dashboard</h1>
              <p className="text-sm text-muted-foreground">Real-time overview of SKUs, production flow, and consignment performance.</p>
            </div>
            <Dialog>
              <DialogTrigger render={<Button size="lg" className="h-12 px-6" />}>
                <ScanLineIcon data-icon="inline-start" />
                Scan Barcode
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Barcode Scanner</DialogTitle>
                  <DialogDescription>Paste scanner input or type a barcode to resolve SKU, lot, or product details.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                  <Input value={scanCode} onChange={(e) => setScanCode(e.target.value)} placeholder="e.g. N2-RING-N21001-925-SZ7-0001" />
                  <div className="flex gap-2">
                    <Button onClick={() => void resolveScan()}>
                      <ScanLineIcon data-icon="inline-start" />
                      Resolve
                    </Button>
                    <Link href="/scan" className={cn(buttonVariants({ variant: "outline" }))}>
                      Open Advanced Scanner
                    </Link>
                  </div>
                  <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs">{scanResult}</pre>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {statsCards.map((card) => (
              <Card key={card.label}>
                <CardHeader className="pb-2">
                  <CardDescription>{card.label}</CardDescription>
                  <CardTitle className="flex items-center justify-between text-2xl">
                    {card.value}
                    <card.icon data-icon="inline-end" />
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Database Status</CardTitle>
                  <CardDescription>Live connectivity and record counts from Neon/Postgres.</CardDescription>
                </div>
                <Badge variant={dbStatus?.connected ? "secondary" : "destructive"}>
                  {dbStatus?.connected ? "Connected" : "Disconnected"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="text-muted-foreground">Checked At</p>
                <p className="mt-1 font-medium">{dbStatus ? new Date(dbStatus.checkedAt).toLocaleString() : "Not checked yet"}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="text-muted-foreground">Products / Variants</p>
                <p className="mt-1 font-medium">
                  {(dbStatus?.counts.products ?? 0).toLocaleString()} / {(dbStatus?.counts.variants ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="text-muted-foreground">SKUs / Barcodes</p>
                <p className="mt-1 font-medium">
                  {(dbStatus?.counts.skus ?? 0).toLocaleString()} / {(dbStatus?.counts.barcodes ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="text-muted-foreground">Lots / Movements</p>
                <p className="mt-1 font-medium">
                  {(dbStatus?.counts.inventoryLots ?? 0).toLocaleString()} / {(dbStatus?.counts.stockMovements ?? 0).toLocaleString()}
                </p>
              </div>
              {dbStatus?.error ? (
                <div className="sm:col-span-2 xl:col-span-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                  {dbStatus.error}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Card id="products">
            <CardHeader>
              <CardTitle>Module Overview</CardTitle>
              <CardDescription>Navigate operations quickly across the full inventory lifecycle.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {modules.map((item) => (
                <Card key={item.title} className="bg-muted/20">
                  <CardHeader>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription>{item.desc}</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Link href={item.href} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                      Open
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </CardContent>
          </Card>

          <Card id="scanner">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest actions from dashboard and API events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activities.map((item) => (
                <div key={item.id} className="rounded-lg border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{item.title}</p>
                    <span className="text-xs text-muted-foreground">{new Date(item.at).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section id="inventory" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick API Checks</CardTitle>
              <CardDescription>Useful links for validating operational data.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/api/products" target="_blank" className={cn(buttonVariants({ variant: "outline" }))}>
                Products API
              </Link>
              <Link href="/api/inventory/balances" target="_blank" className={cn(buttonVariants({ variant: "outline" }))}>
                Inventory Balances API
              </Link>
              <Link href="/api/production/orders" target="_blank" className={cn(buttonVariants({ variant: "outline" }))}>
                Production Orders API
              </Link>
              <Link href="/api/consignment/shipments" target="_blank" className={cn(buttonVariants({ variant: "outline" }))}>
                Consignment Shipments API
              </Link>
            </CardContent>
          </Card>

          <Card id="production">
            <CardHeader>
              <CardTitle>Operational Priorities</CardTitle>
              <CardDescription>Suggested daily workflow for team execution.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>1</TableCell>
                    <TableCell>Confirm low-stock SKUs and replenish.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>2</TableCell>
                    <TableCell>Review active production orders and completion targets.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>3</TableCell>
                    <TableCell>Reconcile consignment shipments and settlement status.</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>4</TableCell>
                    <TableCell>Run scanner validation on incoming/outgoing stock.</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>

        <section id="consignment">
          <Separator />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Need detailed operations? Use dedicated pages and APIs from top navigation modules.</p>
            <div className="flex gap-2">
              <Link href="/scan" className={cn(buttonVariants({ variant: "outline" }))}>
                Scanner Page
              </Link>
              <Button onClick={() => void loadStats()}>Refresh Stats</Button>
            </div>
          </div>
        </section>

        <section id="settings" />
      </main>
    </div>
  );
}
