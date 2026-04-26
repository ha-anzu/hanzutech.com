"use client";

import { useMemo, useState } from "react";
import { PrinterIcon, QrCodeIcon, TagsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type LabelPayload = {
  skuCode: string;
  productName: string;
  price: number;
  metal: string;
  carats: string;
  barcodeValue: string;
  qrValue?: string;
};

type Props = {
  payload: LabelPayload;
  triggerLabel?: string;
  defaultQty?: number;
  allowBulk?: boolean;
  className?: string;
};

function currency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value || 0);
}

function renderPrintHtml(labels: LabelPayload[], sizeMm: 58 | 80) {
  const pageWidth = `${sizeMm}mm`;
  const rowHeight = sizeMm === 58 ? "38mm" : "50mm";

  const labelBlocks = labels
    .map((label) => {
      const qr = label.qrValue ?? label.barcodeValue;
      return `
        <article class="label">
          <header class="head">
            <div>
              <p class="brand">N2JEWELRY</p>
              <p class="sku">${escapeHtml(label.skuCode)}</p>
            </div>
            <div class="price">${escapeHtml(currency(label.price))}</div>
          </header>

          <p class="name">${escapeHtml(label.productName)}</p>
          <p class="meta">Metal: ${escapeHtml(label.metal)} | Carats: ${escapeHtml(label.carats)}</p>

          <div class="codes">
            <div class="qr-wrap">
              <img class="qr" src="/api/barcodes?value=${encodeURIComponent(qr)}&format=qrcode" alt="QR" />
            </div>
            <div class="bar-wrap">
              <img class="bar" src="/api/barcodes?value=${encodeURIComponent(label.barcodeValue)}&format=code128" alt="Barcode" />
              <p class="bar-text">${escapeHtml(label.barcodeValue)}</p>
            </div>
          </div>
        </article>
      `;
    })
    .join("\n");

  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>N2Jewelry Labels</title>
<style>
  @page { size: ${pageWidth} auto; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; width: ${pageWidth}; }
  .label {
    width: ${pageWidth};
    height: ${rowHeight};
    box-sizing: border-box;
    padding: 2.5mm 2.5mm 1.5mm;
    border-bottom: 1px dashed #aaa;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    page-break-after: always;
  }
  .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 2mm; }
  .brand { font-size: 8pt; letter-spacing: 0.18em; margin: 0; font-weight: 700; }
  .sku { font-size: 8pt; margin: 1mm 0 0; font-weight: 700; }
  .price { font-size: 10pt; font-weight: 700; }
  .name { font-size: 8.5pt; margin: 1mm 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .meta { font-size: 7pt; margin: 1mm 0 0; color: #333; }
  .codes { display: flex; align-items: center; justify-content: space-between; gap: 2mm; margin-top: 1mm; }
  .qr-wrap { width: 20mm; text-align: center; }
  .qr { width: 17mm; height: 17mm; object-fit: contain; }
  .bar-wrap { flex: 1; text-align: center; }
  .bar { width: 100%; max-height: 15mm; object-fit: contain; }
  .bar-text { margin: 0.5mm 0 0; font-size: 7pt; letter-spacing: 0.04em; }
</style>
</head>
<body>
${labelBlocks}
<script>
  const waitImages = () => Promise.all(Array.from(document.images).map((img) => img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = () => r(); })));
  waitImages().then(() => setTimeout(() => { window.print(); }, 120));
  window.onafterprint = () => setTimeout(() => window.close(), 120);
</script>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function PrintLabelModal({ payload, triggerLabel = "Print Label", defaultQty = 1, allowBulk = true, className }: Props) {
  const [size, setSize] = useState<58 | 80>(58);
  const [qty, setQty] = useState(defaultQty);
  const [sku, setSku] = useState(payload.skuCode);
  const [productName, setProductName] = useState(payload.productName);
  const [price, setPrice] = useState(payload.price);
  const [metal, setMetal] = useState(payload.metal);
  const [carats, setCarats] = useState(payload.carats);
  const [barcodeValue, setBarcodeValue] = useState(payload.barcodeValue);
  const [qrValue, setQrValue] = useState(payload.qrValue ?? payload.barcodeValue);

  const preview = useMemo(
    () => ({ skuCode: sku, productName, price, metal, carats, barcodeValue, qrValue }),
    [barcodeValue, carats, metal, price, productName, qrValue, sku]
  );

  function printNow() {
    const win = window.open("", "_blank", "noopener,noreferrer,width=420,height=760");
    if (!win) {
      return;
    }

    const labels = Array.from({ length: Math.max(1, allowBulk ? qty : 1) }, () => preview);
    const html = renderPrintHtml(labels, size);
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button size="sm" variant="outline" className={className} />}>
        <PrinterIcon data-icon="inline-start" />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Thermal Label Printing</DialogTitle>
          <DialogDescription>Preview, tune fields, and print in jewelry-grade thermal format (58mm/80mm).</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <label className="grid gap-1 text-sm">
              Label Width
              <select
                value={size}
                onChange={(event) => setSize((Number(event.target.value) === 80 ? 80 : 58) as 58 | 80)}
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value={58}>58mm</option>
                <option value={80}>80mm</option>
              </select>
            </label>

            {allowBulk ? (
              <label className="grid gap-1 text-sm">
                Quantity
                <Input type="number" min={1} value={qty} onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))} />
              </label>
            ) : null}

            <label className="grid gap-1 text-sm">
              SKU
              <Input value={sku} onChange={(event) => setSku(event.target.value)} />
            </label>

            <label className="grid gap-1 text-sm">
              Product Name
              <Input value={productName} onChange={(event) => setProductName(event.target.value)} />
            </label>

            <label className="grid gap-1 text-sm">
              Price (Calculator)
              <Input type="number" min={0} step="0.01" value={price} onChange={(event) => setPrice(Number(event.target.value) || 0)} />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                Metal
                <Input value={metal} onChange={(event) => setMetal(event.target.value)} />
              </label>
              <label className="grid gap-1 text-sm">
                Carats
                <Input value={carats} onChange={(event) => setCarats(event.target.value)} />
              </label>
            </div>

            <label className="grid gap-1 text-sm">
              Code128 Value
              <Input value={barcodeValue} onChange={(event) => setBarcodeValue(event.target.value)} />
            </label>

            <label className="grid gap-1 text-sm">
              QR Value
              <Input value={qrValue} onChange={(event) => setQrValue(event.target.value)} />
            </label>

            <Button onClick={printNow}>
              <TagsIcon data-icon="inline-start" />
              Print
            </Button>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Preview</p>
            <div
              className="rounded-lg border bg-white p-3 text-black"
              style={{ width: size === 58 ? "58mm" : "80mm", minHeight: size === 58 ? "38mm" : "50mm" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em]">N2JEWELRY</p>
                  <p className="text-[11px] font-semibold">{preview.skuCode}</p>
                </div>
                <p className="text-sm font-bold">{currency(preview.price)}</p>
              </div>
              <p className="mt-1 truncate text-[11px]">{preview.productName}</p>
              <p className="mt-1 text-[10px] text-neutral-700">Metal: {preview.metal} | Carats: {preview.carats}</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <img src={`/api/barcodes?value=${encodeURIComponent(preview.qrValue)}&format=qrcode`} alt="QR" className="h-16 w-16 object-contain" />
                <div className="flex-1 text-center">
                  <img src={`/api/barcodes?value=${encodeURIComponent(preview.barcodeValue)}&format=code128`} alt="Barcode" className="h-14 w-full object-contain" />
                  <p className="truncate text-[9px]">{preview.barcodeValue}</p>
                </div>
              </div>
              <p className="mt-1 text-center text-[8px] text-neutral-500">Thermal {size}mm label • Jewelry standard</p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Uses browser print CSS sizing for thermal printers. Compatible with 58mm and 80mm setups.
            </p>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <QrCodeIcon className="size-3" /> Includes QR + Code128 for retail and warehouse scanning.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

