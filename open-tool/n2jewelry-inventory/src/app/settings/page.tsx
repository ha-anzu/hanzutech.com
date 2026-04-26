import { getAppSettings } from "@/lib/settings/store";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const settings = await getAppSettings();
  return <SettingsClient settings={settings} />;
}
