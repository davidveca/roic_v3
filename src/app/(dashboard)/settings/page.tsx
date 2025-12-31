import { requireAuth } from "@/lib/auth-utils";
import { getAppSettings } from "@/app/actions/settings";
import { SettingsForm } from "@/components/settings/settings-form";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  await requireAuth();
  const settings = await getAppSettings();

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure application settings and financial defaults.
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
