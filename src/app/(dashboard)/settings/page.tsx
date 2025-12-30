import { requireAuth } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Building2 } from "lucide-react";

interface OrgSettings {
  taxRate?: number;
  discountRate?: number;
  modelingPeriods?: number;
}

export default async function SettingsPage() {
  const user = await requireAuth();

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId! },
    select: {
      name: true,
      slug: true,
      settings: true,
      createdAt: true,
    },
  });

  const settings = (org?.settings as OrgSettings) || {};

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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization
            </CardTitle>
            <CardDescription>
              Basic organization information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-lg font-medium">{org?.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Slug</label>
              <p className="font-mono text-sm">{org?.slug}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm">{org?.createdAt.toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Model Defaults</CardTitle>
            <CardDescription>
              Default values used in new initiatives
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Tax Rate</span>
              <span className="font-medium">{((settings.taxRate || 0.25) * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Discount Rate (WACC)</span>
              <span className="font-medium">{((settings.discountRate || 0.10) * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Modeling Periods</span>
              <span className="font-medium">{settings.modelingPeriods || 5} years</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
