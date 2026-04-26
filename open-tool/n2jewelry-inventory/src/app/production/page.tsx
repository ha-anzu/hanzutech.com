import { getProductionWorkspaceData } from "@/lib/production/queries";
import { ProductionClient } from "./production-client";

export default async function ProductionPage() {
  const data = await getProductionWorkspaceData();
  return <ProductionClient initialData={data} />;
}
