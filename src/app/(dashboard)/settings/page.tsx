import { requireAuth } from "@/lib/auth-utils";
import { getOrgSettings } from "@/app/actions/settings";
import { SettingsForm } from "@/components/settings/settings-form";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const user = await requireAuth();
  const org = await getOrgSettings();

  const settings = (org.settings as {
    taxRate?: number;
    discountRate?: number;
    modelingPeriods?: number;
  }) || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your organization settings and defaults.
        </p>
      </div>

      <SettingsForm
        org={{
          name: org.name,
          slug: org.slug,
          settings,
          createdAt: org.createdAt,
          _count: org._count,
        }}
        isAdmin={user.orgRole === "ADMIN"}
      />
    </div>
  );
}
