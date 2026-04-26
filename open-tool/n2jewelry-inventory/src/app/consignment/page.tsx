import { getConsignmentWorkspaceData } from "@/lib/consignment/queries";
import { ConsignmentClient } from "./consignment-client";

export default async function ConsignmentPage() {
  const data = await getConsignmentWorkspaceData();
  return <ConsignmentClient initialData={data} />;
}
