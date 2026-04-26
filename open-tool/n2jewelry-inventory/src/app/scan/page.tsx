import { getScanSupportData } from "@/lib/inventory/overview";
import { ScanClient } from "./scan-client";

export default async function ScanPage() {
  const support = await getScanSupportData();
  return <ScanClient support={support} />;
}
