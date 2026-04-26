import { getCategoryOptions, getProductsList } from "@/lib/products/queries";
import { ProductsListClient } from "./products-list-client";

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProductsList(), getCategoryOptions()]);

  return <ProductsListClient initialProducts={products} categories={categories} />;
}
