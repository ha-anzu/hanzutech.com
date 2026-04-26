"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SaveIcon, Settings2Icon, WrenchIcon } from "lucide-react";
import { saveLabelPrinterSettingsAction, savePricingSettingsAction, saveStorageSettingsAction } from "./actions";
import type { AppSettingsPayload } from "@/lib/settings/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Props = {
  settings: AppSettingsPayload;
};

export function SettingsClient({ settings }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function runAction(
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string }>,
    formData: FormData,
    message: string
  ) {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.error ?? "Failed to save");
        return;
      }
      setSuccess(message);
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--primary)_16%,transparent),transparent_40%),linear-gradient(to_bottom,var(--background),color-mix(in_oklab,var(--muted)_55%,var(--background)))]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <section>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin Console</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure live market references, printer preferences, and object storage endpoints used by the inventory platform.
          </p>
        </section>

        {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        {success ? <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">{success}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Settings2Icon className="size-4" />
              Market Reference Prices
            </CardTitle>
            <CardDescription>Used by Calculator pricing sync for variants and SKUs.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={(formData) => runAction(savePricingSettingsAction, formData, "Pricing settings saved.")}
              className="grid gap-3 sm:grid-cols-3"
            >
              <label className="grid gap-1 text-sm">
                Silver (USD/g)
                <Input name="silverUsdPerGram" type="number" step="0.0001" defaultValue={settings.pricing.silverUsdPerGram} />
              </label>
              <label className="grid gap-1 text-sm">
                Gold (USD/g)
                <Input name="goldUsdPerGram" type="number" step="0.0001" defaultValue={settings.pricing.goldUsdPerGram} />
              </label>
              <label className="grid gap-1 text-sm">
                Diamond (USD/carat)
                <Input name="diamondUsdPerCarat" type="number" step="0.01" defaultValue={settings.pricing.diamondUsdPerCarat} />
              </label>
              <div className="sm:col-span-3 flex justify-end">
                <Button type="submit" disabled={isPending}>
                  <SaveIcon data-icon="inline-start" />
                  Save Prices
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <WrenchIcon className="size-4" />
              Label Printer
            </CardTitle>
            <CardDescription>Default thermal print profile and copies.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={(formData) => runAction(saveLabelPrinterSettingsAction, formData, "Label settings saved.")}
              className="grid gap-3 sm:grid-cols-3"
            >
              <label className="grid gap-1 text-sm">
                Label Size
                <select name="defaultSize" defaultValue={settings.labelPrinter.defaultSize} className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                  <option value="58mm">58mm</option>
                  <option value="80mm">80mm</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Printer Name
                <Input name="printerName" defaultValue={settings.labelPrinter.printerName} />
              </label>
              <label className="grid gap-1 text-sm">
                Default Copies
                <Input name="copies" type="number" min={1} step="1" defaultValue={settings.labelPrinter.copies} />
              </label>
              <div className="sm:col-span-3 flex justify-end">
                <Button type="submit" disabled={isPending}>
                  <SaveIcon data-icon="inline-start" />
                  Save Printer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>S3/Object Storage</CardTitle>
            <CardDescription>Used for digital assets and product imagery.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={(formData) => runAction(saveStorageSettingsAction, formData, "Storage settings saved.")}
              className="grid gap-3 sm:grid-cols-2"
            >
              <label className="grid gap-1 text-sm">
                Endpoint
                <Input name="endpoint" defaultValue={settings.storage.endpoint} placeholder="https://s3.region.amazonaws.com" />
              </label>
              <label className="grid gap-1 text-sm">
                Region
                <Input name="region" defaultValue={settings.storage.region} />
              </label>
              <label className="grid gap-1 text-sm">
                Bucket
                <Input name="bucket" defaultValue={settings.storage.bucket} />
              </label>
              <label className="grid gap-1 text-sm">
                Public Base URL
                <Input name="publicBaseUrl" defaultValue={settings.storage.publicBaseUrl} placeholder="https://cdn.n2jewels.com" />
              </label>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={isPending}>
                  <SaveIcon data-icon="inline-start" />
                  Save Storage
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
