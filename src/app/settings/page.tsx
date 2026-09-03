import { SettingsForm } from "@/components/settings-form";
import { getSettingsData } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettingsData();
  return <SettingsForm initial={settings} />;
}
