import { getInventoryOverview } from "@/lib/inventory/overview";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const initialData = await getInventoryOverview();
  return <InventoryClient initialData={initialData} />;
}
