"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Building2, Calculator } from "lucide-react";
import { toast } from "sonner";
import { updateOrgSettings } from "@/app/actions/settings";

interface OrgSettings {
  taxRate?: number;
  discountRate?: number;
  modelingPeriods?: number;
}

interface SettingsFormProps {
  org: {
    name: string;
    slug: string;
    settings: OrgSettings;
    createdAt: Date;
    _count: {
      users: number;
      initiatives: number;
    };
  };
  isAdmin: boolean;
}

export function SettingsForm({ org, isAdmin }: SettingsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: org.name,
    taxRate: ((org.settings?.taxRate || 0.25) * 100).toString(),
    discountRate: ((org.settings?.discountRate || 0.10) * 100).toString(),
    modelingPeriods: (org.settings?.modelingPeriods || 5).toString(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateOrgSettings({
        name: form.name,
        taxRate: parseFloat(form.taxRate) / 100,
        discountRate: parseFloat(form.discountRate) / 100,
        modelingPeriods: parseInt(form.modelingPeriods, 10),
      });
      toast.success("Settings saved");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Slug</Label>
              <p className="font-mono text-sm bg-muted p-2 rounded">{org.slug}</p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Created</Label>
              <p className="text-sm">{new Date(org.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{org._count.users}</p>
                <p className="text-xs text-muted-foreground">Team Members</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{org._count.initiatives}</p>
                <p className="text-xs text-muted-foreground">Initiatives</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Model Defaults
            </CardTitle>
            <CardDescription>
              Default values used in new initiatives
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Applied to calculate NOPAT from operating profit
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="discountRate">Discount Rate / WACC (%)</Label>
              <Input
                id="discountRate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.discountRate}
                onChange={(e) => setForm({ ...form, discountRate: e.target.value })}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Used for NPV calculations
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modelingPeriods">Modeling Periods (years)</Label>
              <Input
                id="modelingPeriods"
                type="number"
                min="1"
                max="20"
                step="1"
                value={form.modelingPeriods}
                onChange={(e) => setForm({ ...form, modelingPeriods: e.target.value })}
                disabled={!isAdmin}
              />
              <p className="text-xs text-muted-foreground">
                Number of years to project cash flows
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>
      )}

      {!isAdmin && (
        <p className="text-sm text-muted-foreground text-center">
          Only administrators can modify organization settings.
        </p>
      )}
    </form>
  );
}
