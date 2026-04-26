"use client";

import Link from "next/link";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheetIcon, PlusIcon, SearchIcon, SparklesIcon } from "lucide-react";
import { createProductAction, importProductsFromExcelAction, syncPricingFromCalculatorAction } from "./actions";
import type { ProductListItem } from "@/lib/products/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CategoryOption = {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
};

type Props = {
  initialProducts: ProductListItem[];
  categories: CategoryOption[];
};

export function ProductsListClient({ initialProducts, categories }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState<string | null>(null);
  const [importInfo, setImportInfo] = useState<string | null>(null);

  const [optimisticProducts, pushOptimisticProduct] = useOptimistic(initialProducts, (state, newItem: ProductListItem) => [newItem, ...state]);

  const categoryNames = useMemo(() => Array.from(new Set(initialProducts.map((item) => item.category))).sort(), [initialProducts]);
  const collectionNames = useMemo(() => Array.from(new Set(initialProducts.map((item) => item.collection))).sort(), [initialProducts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return optimisticProducts.filter((item) => {
      const matchesSearch = q
        ? item.name.toLowerCase().includes(q) || item.productCode.toLowerCase().includes(q) || item.category.toLowerCase().includes(q)
        : true;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchesCollection = collectionFilter === "all" || item.collection === collectionFilter;
      return matchesSearch && matchesCategory && matchesCollection;
    });
  }, [categoryFilter, collectionFilter, optimisticProducts, query]);

  async function onCreateProduct(formData: FormData) {
    setError(null);

    const name = String(formData.get("name") ?? "").trim();
    const productCode = String(formData.get("productCode") ?? "").trim().toUpperCase();
    const categoryId = String(formData.get("categoryId") ?? "");
    const subcategoryId = String(formData.get("subcategoryId") ?? "");

    const category = categories.find((item) => item.id === categoryId)?.name ?? "Pending";
    const collection = categories.find((item) => item.id === subcategoryId)?.name ?? "Uncategorized";

    const optimistic: ProductListItem = {
      id: `temp-${crypto.randomUUID()}`,
      productCode,
      name,
      category,
      collection,
      totalVariants: 0,
      totalStock: 0,
      active: true,
      createdAt: new Date().toISOString()
    };

    startTransition(async () => {
      pushOptimisticProduct(optimistic);
      const result = await createProductAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.refresh();
      router.push(`/products/${result.data.id}`);
    });
  }

  function onSyncPricing() {
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
  }

  function onImportExcel(formData: FormData) {
    setError(null);
    setImportInfo(null);

    startTransition(async () => {
      const result = await importProductsFromExcelAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setImportInfo(
        `Imported ${result.data.productsUpserted} products, ${result.data.variantsCreated} variants, and ${result.data.categoriesUpserted} new categories.`
      );
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_color-mix(in_oklab,var(--primary)_12%,transparent),transparent_45%),linear-gradient(to_bottom,var(--background),color-mix(in_oklab,var(--muted)_55%,var(--background)))]">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">N2 Jewelry Master Data</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Products</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Manage styles, collections, variants, SKUs, barcode lifecycle, and manufacturing readiness in one premium workspace.
            </p>
          </div>

          <Dialog>
            <DialogTrigger render={<Button size="lg" />}>
              <PlusIcon data-icon="inline-start" />
              Add New Product
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Product</DialogTitle>
                <DialogDescription>Add product master data and optional hero image to digital assets.</DialogDescription>
              </DialogHeader>

              <form action={onCreateProduct} className="grid gap-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    Product Code
                    <Input name="productCode" placeholder="N2-RING-001" required />
                  </label>
                  <label className="grid gap-2 text-sm">
                    Product Name
                    <Input name="name" placeholder="Silver Halo Ring" required />
                  </label>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    Category
                    <select name="categoryId" required className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm">
                    Collection / Subcategory
                    <select name="subcategoryId" className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                      <option value="">None</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="grid gap-2 text-sm">
                  Description
                  <textarea
                    name="description"
                    rows={4}
                    className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Stone details, finish notes, manufacturing notes..."
                  />
                </label>

                <label className="grid gap-2 text-sm">
                  Product Image
                  <input name="image" type="file" accept="image/*" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
                </label>

                <label className="inline-flex items-center gap-2 text-sm">
                  <input name="active" type="checkbox" defaultChecked className="size-4 rounded border border-input" />
                  Active product
                </label>

                {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={isPending}>
                    <SparklesIcon data-icon="inline-start" />
                    {isPending ? "Saving..." : "Create Product"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger render={<Button variant="outline" size="lg" />}>
                <FileSpreadsheetIcon data-icon="inline-start" />
                Import from Excel
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Import Product Data.xlsx</DialogTitle>
                  <DialogDescription>
                    Upload your sheet and columns will be auto-mapped (product code/name/category/collection plus variant options).
                  </DialogDescription>
                </DialogHeader>
                <form action={onImportExcel} className="grid gap-3">
                  <label className="grid gap-1 text-sm">
                    Excel File
                    <input
                      name="file"
                      type="file"
                      accept=".xlsx,.xls"
                      required
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Tip: first sheet is used. Example headers accepted: `productCode`, `name`, `category`, `collection`, `style`, `size`, `color`, `finish`, `material`.
                  </p>
                  <Button type="submit" disabled={isPending}>
                    <FileSpreadsheetIcon data-icon="inline-start" />
                    {isPending ? "Importing..." : "Run Import"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            <Button variant="secondary" size="lg" onClick={onSyncPricing} disabled={isPending}>
              <SparklesIcon data-icon="inline-start" />
              Sync Pricing
            </Button>
          </div>
        </section>

        {syncInfo ? <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">{syncInfo}</p> : null}
        {importInfo ? <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">{importInfo}</p> : null}

        <Card>
          <CardHeader>
            <CardTitle>Catalog Grid</CardTitle>
            <CardDescription>Search and filter by category/collection, then open a product workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <label className="relative block">
                <SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-8" placeholder="Search product name, code, category" />
              </label>

              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="all">All Categories</option>
                {categoryNames.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={collectionFilter}
                onChange={(event) => setCollectionFilter(event.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="all">All Collections</option>
                {collectionNames.map((collection) => (
                  <option key={collection} value={collection}>
                    {collection}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border bg-card/70 backdrop-blur">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead className="text-right">Total Variants</TableHead>
                    <TableHead className="text-right">Total Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/products/${item.id}`)}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.productCode}</p>
                        </div>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.collection}</TableCell>
                      <TableCell className="text-right">{item.totalVariants}</TableCell>
                      <TableCell className="text-right">{item.totalStock}</TableCell>
                      <TableCell>
                        <Badge variant={item.active ? "secondary" : "outline"}>{item.active ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filtered.length === 0 ? <p className="text-sm text-muted-foreground">No products matched your filters.</p> : null}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
