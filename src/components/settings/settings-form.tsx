"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Building2, Calculator, Scale, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { updateAppSettings } from "@/app/actions/settings";

interface SettingsFormProps {
  settings: {
    id: string;
    companyName: string;
    hurdleRate: number;
    taxRate: number;
    currency: string;
    fiscalYearStart: number;
    boardReviewThreshold: number;
    lightTouchThreshold: number;
    updatedAt: Date;
    _count: {
      initiatives: number;
    };
  };
}

const months = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    companyName: settings.companyName,
    hurdleRate: settings.hurdleRate.toString(),
    taxRate: settings.taxRate.toString(),
    currency: settings.currency,
    fiscalYearStart: settings.fiscalYearStart.toString(),
    boardReviewThreshold: settings.boardReviewThreshold.toString(),
    lightTouchThreshold: settings.lightTouchThreshold.toString(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateAppSettings({
        companyName: form.companyName,
        hurdleRate: parseFloat(form.hurdleRate),
        taxRate: parseFloat(form.taxRate),
        currency: form.currency,
        fiscalYearStart: parseInt(form.fiscalYearStart, 10),
        boardReviewThreshold: parseFloat(form.boardReviewThreshold),
        lightTouchThreshold: parseFloat(form.lightTouchThreshold),
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
        {/* Company Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company
            </CardTitle>
            <CardDescription>
              Basic company information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(value) => setForm({ ...form, currency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (&euro;)</SelectItem>
                  <SelectItem value="GBP">GBP (&pound;)</SelectItem>
                  <SelectItem value="CAD">CAD ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiscalYearStart">Fiscal Year Start</Label>
              <Select
                value={form.fiscalYearStart}
                onValueChange={(value) => setForm({ ...form, fiscalYearStart: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-2 text-center p-3 bg-muted rounded-lg">
              <p className="text-2xl font-bold">{settings._count.initiatives}</p>
              <p className="text-xs text-muted-foreground">Total Initiatives</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Financial Defaults
            </CardTitle>
            <CardDescription>
              Default rates for ROIC calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hurdleRate">Hurdle Rate (%)</Label>
              <Input
                id="hurdleRate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.hurdleRate}
                onChange={(e) => setForm({ ...form, hurdleRate: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Minimum acceptable ROIC for new initiatives
              </p>
            </div>
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
              />
              <p className="text-xs text-muted-foreground">
                Applied to calculate NOPAT from operating profit
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Review Thresholds */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Review Thresholds
            </CardTitle>
            <CardDescription>
              Investment size thresholds that determine the required review level
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="lightTouchThreshold">Light Touch Threshold</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="lightTouchThreshold"
                    type="number"
                    min="0"
                    step="1000"
                    className="pl-7"
                    value={form.lightTouchThreshold}
                    onChange={(e) =>
                      setForm({ ...form, lightTouchThreshold: e.target.value })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Investments below this amount use streamlined review
                </p>
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">
                    Light Touch
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-500">
                    &le; {formatCurrency(parseFloat(form.lightTouchThreshold) || 0)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="boardReviewThreshold">Board Review Threshold</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="boardReviewThreshold"
                    type="number"
                    min="0"
                    step="100000"
                    className="pl-7"
                    value={form.boardReviewThreshold}
                    onChange={(e) =>
                      setForm({ ...form, boardReviewThreshold: e.target.value })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Investments at or above this amount require board approval
                </p>
                <div className="mt-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-400">
                    Board Review
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-500">
                    &ge; {formatCurrency(parseFloat(form.boardReviewThreshold) || 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                Standard Review
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-500">
                {formatCurrency(parseFloat(form.lightTouchThreshold) || 0)} to{" "}
                {formatCurrency(parseFloat(form.boardReviewThreshold) || 0)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

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
    </form>
  );
}
