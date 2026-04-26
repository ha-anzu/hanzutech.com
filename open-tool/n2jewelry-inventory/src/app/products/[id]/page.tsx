import { notFound } from "next/navigation";
import { getProductAndCategories } from "@/lib/products/queries";
import { ProductDetailClient } from "./product-detail-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const { detail, categories } = await getProductAndCategories(id);

  if (!detail) {
    notFound();
  }

  return <ProductDetailClient detail={detail} categories={categories} />;
}
