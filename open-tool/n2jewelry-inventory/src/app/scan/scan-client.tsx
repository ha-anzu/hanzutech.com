"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BarcodeIcon, CameraIcon, FactoryIcon, SendIcon, ShuffleIcon } from "lucide-react";
import { moveStockAction, shipConsignmentAction, startProductionAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ScanEvent = {
  code: string;
  source: "wedge" | "lan" | "camera";
  deviceId?: string;
  at: string;
};

type ResolvePayload = {
  kind: "product_variant" | "metal_lot" | "unknown";
  barcode?: { barcodeValue: string };
  sku?: { id: string; skuCode: string };
  variant?: { id: string; optionValues: Record<string, string> };
  product?: { id: string; name: string; productCode: string } | null;
  lot?: { id: string; lotCode: string; material: string; gramsAvailable: string };
  stock?: {
    totalOnHand: number;
    byLocation: Array<{
      locationId: string;
      locationName: string;
      locationType: string;
      qtyOnHand: number;
      qtyReserved: number;
    }>;
  };
};

type SupportData = {
  locations: Array<{ id: string; name: string; type: string }>;
  accounts: Array<{ id: string; accountCode: string; accountName: string }>;
};

type Props = {
  support: SupportData;
};

export function ScanClient({ support }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [result, setResult] = useState<ResolvePayload | null>(null);
  const [status, setStatus] = useState("Ready for scan");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moveQty, setMoveQty] = useState(1);
  const [prodQty, setProdQty] = useState(25);
  const [consignQty, setConsignQty] = useState(10);
  const [consignPrice, setConsignPrice] = useState(50);

  const wedgeBuffer = useRef("");
  const lastKeyAt = useRef(0);
  const lastProcessed = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const html5Instance = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/scan/events");
    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as ScanEvent;
      setEvents((prev) => [data, ...prev].slice(0, 60));

      if (data.source === "lan") {
        void processScan(data.code, "lan");
      }
    };
    return () => source.close();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typingInInput = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (typingInInput && target !== inputRef.current) {
        return;
      }

      const now = Date.now();
      if (now - lastKeyAt.current > 90) {
        wedgeBuffer.current = "";
      }
      lastKeyAt.current = now;

      if (e.key === "Enter") {
        const code = wedgeBuffer.current.trim() || barcodeInput.trim();
        wedgeBuffer.current = "";
        if (code) {
          e.preventDefault();
          void processScan(code, "wedge");
          setBarcodeInput("");
        }
        return;
      }

      if (e.key.length === 1) {
        wedgeBuffer.current += e.key;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [barcodeInput]);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, []);

  async function ingest(code: string, source: "wedge" | "lan" | "camera") {
    await fetch("/api/scan/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, source, deviceId: "scan-workstation" })
    });
  }

  async function resolve(code: string) {
    const response = await fetch("/api/scan/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ barcode: code })
    });
    const json = (await response.json()) as { ok: boolean; data: ResolvePayload; error?: string };
    if (!json.ok) {
      throw new Error(json.error || "Resolve failed");
    }
    return json.data;
  }

  async function processScan(code: string, source: "wedge" | "lan" | "camera") {
    const clean = code.trim();
    if (!clean) return;

    const now = Date.now();
    if (lastProcessed.current.code === clean && now - lastProcessed.current.at < 400) {
      return;
    }
    lastProcessed.current = { code: clean, at: now };

    setStatus(`Scanning ${clean}...`);
    setError(null);

    try {
      await ingest(clean, source);
      const payload = await resolve(clean);
      setResult(payload);
      setStatus(`Resolved ${clean}`);
    } catch (scanError) {
      setStatus("Scan failed");
      setError(scanError instanceof Error ? scanError.message : "Scan failed");
    }
  }

  async function startCamera() {
    setCameraError(null);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const camera = new Html5Qrcode("scan-camera-region", { verbose: false });
      html5Instance.current = camera;

      await camera.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 140 } },
        async (decodedText: string) => {
          await processScan(decodedText, "camera");
          setCameraOpen(false);
          await stopCamera();
        },
        () => {}
      );
    } catch (cameraStartError) {
      setCameraError(cameraStartError instanceof Error ? cameraStartError.message : "Failed to start camera scanner");
    }
  }

  async function stopCamera() {
    if (!html5Instance.current) return;

    try {
      await html5Instance.current.stop();
      html5Instance.current.clear();
    } catch {
      // no-op
    } finally {
      html5Instance.current = null;
    }
  }

  async function onMoveStock(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await moveStockAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStatus("Stock moved successfully");
      if (result?.barcode?.barcodeValue) {
        const fresh = await resolve(result.barcode.barcodeValue);
        setResult(fresh);
      }
    });
  }

  async function onStartProduction(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await startProductionAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStatus(`Production order created: ${res.data.orderCode}`);
    });
  }

  async function onShipConsignment(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await shipConsignmentAction(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStatus(`Consignment shipped: ${res.data.shipmentCode}`);
      if (result?.barcode?.barcodeValue) {
        const fresh = await resolve(result.barcode.barcodeValue);
        setResult(fresh);
      }
    });
  }

  const currentSku = result?.sku;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--primary)_12%,transparent),transparent_45%),linear-gradient(to_bottom,var(--background),color-mix(in_oklab,var(--muted)_50%,var(--background)))]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
        <section className="text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Scanner Workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Instant Barcode Operations</h1>
          <p className="mt-2 text-sm text-muted-foreground">Keyboard wedge, camera, and LAN scanner ingest run in one real-time workspace.</p>
        </section>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 pt-8">
            <label htmlFor="barcode-input" className="text-sm text-muted-foreground">Scan barcode</label>
            <Input
              id="barcode-input"
              ref={inputRef}
              value={barcodeInput}
              onChange={(event) => setBarcodeInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const value = barcodeInput.trim();
                  if (value) {
                    void processScan(value, "wedge");
                    setBarcodeInput("");
                  }
                }
              }}
              placeholder="Scan barcode here..."
              className="h-14 w-full max-w-3xl text-center text-xl font-medium"
              autoComplete="off"
              spellCheck={false}
            />

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Dialog
                open={cameraOpen}
                onOpenChange={(open) => {
                  setCameraOpen(open);
                  if (!open) {
                    void stopCamera();
                  }
                }}
              >
                <DialogTrigger render={<Button variant="outline" size="lg" />}>
                  <CameraIcon data-icon="inline-start" />
                  Camera Scan
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Camera Scanner</DialogTitle>
                    <DialogDescription>Use phone or webcam camera to decode barcode instantly.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div id="scan-camera-region" className="min-h-64 rounded-lg border bg-black/5" />
                    <div className="flex gap-2">
                      <Button onClick={() => void startCamera()}>Start Camera</Button>
                      <Button variant="outline" onClick={() => void stopCamera()}>Stop</Button>
                    </div>
                    {cameraError ? <p className="text-sm text-destructive">{cameraError}</p> : null}
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="secondary" size="lg" onClick={() => inputRef.current?.focus()}>
                <BarcodeIcon data-icon="inline-start" />
                Focus Wedge Input
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">{status}</p>
            {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
          </CardContent>
        </Card>

        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Resolved Item</CardTitle>
              <CardDescription>Product details, stock by location, and action shortcuts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!result ? (
                <p className="text-sm text-muted-foreground">No barcode resolved yet.</p>
              ) : result.kind === "unknown" ? (
                <p className="text-sm text-muted-foreground">Unknown barcode. Check printed label or master data.</p>
              ) : result.kind === "metal_lot" ? (
                <div className="rounded-lg border p-3">
                  <p className="font-medium">Lot {result.lot?.lotCode}</p>
                  <p className="text-sm text-muted-foreground">Material: {result.lot?.material}</p>
                  <p className="text-sm text-muted-foreground">Available grams: {result.lot?.gramsAvailable}</p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border p-3">
                    <p className="font-medium">{result.product?.name}</p>
                    <p className="text-sm text-muted-foreground">{result.product?.productCode}</p>
                    <p className="text-sm text-muted-foreground">SKU: {result.sku?.skuCode}</p>
                    <p className="text-sm text-muted-foreground">Total Stock: {result.stock?.totalOnHand ?? 0}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(result.stock?.byLocation ?? []).map((loc) => (
                      <Badge key={`${loc.locationId}-${loc.qtyOnHand}`} variant="outline">
                        {loc.locationName}: {loc.qtyOnHand}
                      </Badge>
                    ))}
                  </div>

                  {currentSku ? (
                    <div className="grid gap-4 lg:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Move Stock</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <form action={onMoveStock} className="grid gap-2">
                            <input type="hidden" name="skuId" value={currentSku.id} />
                            <select name="fromLocationId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                              <option value="">From location</option>
                              {support.locations.map((l) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                              ))}
                            </select>
                            <select name="toLocationId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                              <option value="">To location</option>
                              {support.locations.map((l) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                              ))}
                            </select>
                            <Input name="quantity" type="number" min={1} value={moveQty} onChange={(e) => setMoveQty(Math.max(1, Number(e.target.value) || 1))} />
                            <Input name="notes" placeholder="Transfer reason" />
                            <label className="inline-flex items-center gap-2 text-xs">
                              <input name="overrideNegative" type="checkbox" className="size-3" />
                              Admin override
                            </label>
                            <Button size="sm" disabled={isPending}><ShuffleIcon data-icon="inline-start" />Move</Button>
                          </form>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Start Production</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <form action={onStartProduction} className="grid gap-2">
                            <input type="hidden" name="skuId" value={currentSku.id} />
                            <Input name="targetQty" type="number" min={1} value={prodQty} onChange={(e) => setProdQty(Math.max(1, Number(e.target.value) || 1))} />
                            <Button size="sm" disabled={isPending}><FactoryIcon data-icon="inline-start" />Start</Button>
                          </form>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Ship Consignment</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <form action={onShipConsignment} className="grid gap-2">
                            <input type="hidden" name="skuId" value={currentSku.id} />
                            <select name="accountId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                              <option value="">Agent account</option>
                              {support.accounts.map((a) => (
                                <option key={a.id} value={a.id}>{a.accountCode} - {a.accountName}</option>
                              ))}
                            </select>
                            <select name="fromLocationId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                              <option value="">From location</option>
                              {support.locations.filter((l) => l.type !== "Agent").map((l) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                              ))}
                            </select>
                            <select name="toLocationId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                              <option value="">To agent location</option>
                              {support.locations.filter((l) => l.type === "Agent").map((l) => (
                                <option key={l.id} value={l.id}>{l.name}</option>
                              ))}
                            </select>
                            <Input name="quantity" type="number" min={1} value={consignQty} onChange={(e) => setConsignQty(Math.max(1, Number(e.target.value) || 1))} />
                            <Input name="unitPrice" type="number" min={0.01} step="0.01" value={consignPrice} onChange={(e) => setConsignPrice(Math.max(0.01, Number(e.target.value) || 0.01))} />
                            <Button size="sm" disabled={isPending}><SendIcon data-icon="inline-start" />Ship</Button>
                          </form>
                        </CardContent>
                      </Card>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live Feed</CardTitle>
              <CardDescription>LAN scanner and wedge events in real time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {events.map((event) => (
                <div key={`${event.at}-${event.code}`} className="rounded-lg border p-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{event.code}</p>
                    <Badge variant="secondary">{event.source}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(event.at).toLocaleTimeString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
