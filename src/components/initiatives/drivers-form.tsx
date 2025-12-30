"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Save, Loader2, Lock, AlertCircle } from "lucide-react";
import { getDriverDefinitions } from "@/app/actions/initiatives";
import { updateDriverValues } from "@/app/actions/versions";
import { toast } from "sonner";
import type { DriverDefinition, DriverValue } from "@prisma/client";

interface DriversFormProps {
  versionId: string;
  templateId: string | null;
  driverValues: DriverValue[];
  isLocked: boolean;
}

type DriverDef = DriverDefinition;

const categoryLabels: Record<string, string> = {
  revenue: "Revenue Impact",
  cost: "Cost Savings",
  working_capital: "Working Capital",
  capex: "Capital & One-Time Costs",
  tax: "Tax & Financial Parameters",
  risk: "Risk & Adjustments",
  model: "Model Parameters",
};

const categoryOrder = ["revenue", "cost", "working_capital", "capex", "tax", "risk", "model"];

export function InitiativeDriversForm({
  versionId,
  templateId,
  driverValues,
  isLocked,
}: DriversFormProps) {
  const [drivers, setDrivers] = useState<DriverDef[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    async function loadDrivers() {
      try {
        const defs = await getDriverDefinitions(templateId ?? undefined);
        setDrivers(defs);

        // Initialize values from existing driver values
        const initialValues: Record<string, unknown> = {};
        for (const dv of driverValues) {
          initialValues[dv.driverKey] = dv.value;
        }

        // Fill in defaults for missing values
        for (const def of defs) {
          if (initialValues[def.key] === undefined && def.defaultValue !== null) {
            initialValues[def.key] = def.defaultValue;
          }
        }

        setValues(initialValues);
      } catch (error) {
        console.error("Failed to load drivers", error);
        toast.error("Failed to load driver definitions");
      } finally {
        setIsLoading(false);
      }
    }

    loadDrivers();
  }, [templateId, driverValues]);

  const handleValueChange = (key: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const driverValueUpdates = Object.entries(values)
        .filter(([_, v]) => v !== undefined && v !== null && v !== "")
        .map(([driverKey, value]) => ({
          driverKey,
          value: value as number | string | boolean | number[],
        }));

      await updateDriverValues({
        versionId,
        values: driverValueUpdates,
      });

      toast.success("Driver values saved");
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save", error);
      toast.error("Failed to save driver values");
    } finally {
      setIsSaving(false);
    }
  };

  const groupedDrivers = categoryOrder
    .map((category) => ({
      category,
      label: categoryLabels[category] ?? category,
      drivers: drivers.filter((d) => d.category === category),
    }))
    .filter((g) => g.drivers.length > 0);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-500 mt-2">Loading driver definitions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {isLocked && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            <Lock className="h-4 w-4" />
            This version is locked. Create a new version to make changes.
          </div>
        )}

        <Tabs defaultValue={groupedDrivers[0]?.category} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            {groupedDrivers.map((group) => (
              <TabsTrigger key={group.category} value={group.category} className="text-sm">
                {group.label}
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {group.drivers.length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {groupedDrivers.map((group) => (
            <TabsContent key={group.category} value={group.category}>
              <Card>
                <CardHeader>
                  <CardTitle>{group.label}</CardTitle>
                  <CardDescription>
                    Enter values for {group.label.toLowerCase()} drivers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {group.drivers.map((driver) => (
                    <DriverInput
                      key={driver.id}
                      driver={driver}
                      value={values[driver.key]}
                      onChange={(v) => handleValueChange(driver.key, v)}
                      disabled={isLocked}
                    />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {!isLocked && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
            <div>
              {hasChanges && (
                <span className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Unsaved changes
                </span>
              )}
            </div>
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

interface DriverInputProps {
  driver: DriverDef;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled: boolean;
}

function DriverInput({ driver, value, onChange, disabled }: DriverInputProps) {
  const validation = driver.validation as {
    min?: number;
    max?: number;
    required?: boolean;
    options?: string[];
  } | null;

  const renderInput = () => {
    switch (driver.dataType) {
      case "PERCENTAGE":
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Slider
                value={[Number(value) || 0]}
                onValueChange={([v]) => onChange(v)}
                min={validation?.min ?? -100}
                max={validation?.max ?? 100}
                step={0.5}
                disabled={disabled}
                className="flex-1"
              />
              <div className="flex items-center gap-1 w-24">
                <Input
                  type="number"
                  value={value !== undefined ? String(value) : ""}
                  onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                  disabled={disabled}
                  className="w-20 text-right"
                />
                <span className="text-gray-500">%</span>
              </div>
            </div>
          </div>
        );

      case "CURRENCY":
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <Input
              type="number"
              value={value !== undefined ? String(value) : ""}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              className="pl-7"
              placeholder="0"
            />
          </div>
        );

      case "INTEGER":
      case "NUMBER":
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={value !== undefined ? String(value) : ""}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              disabled={disabled}
              min={validation?.min}
              max={validation?.max}
            />
            {driver.units && driver.units !== "$" && driver.units !== "%" && (
              <span className="text-gray-500 text-sm">{driver.units}</span>
            )}
          </div>
        );

      case "BOOLEAN":
        return (
          <Switch
            checked={Boolean(value)}
            onCheckedChange={onChange}
            disabled={disabled}
          />
        );

      case "SELECT":
        return (
          <select
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select...</option>
            {validation?.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "CURVE":
        const curveValue = (Array.isArray(value) ? value : [100, 100, 100, 100, 100]) as number[];
        return (
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-2">
              {curveValue.map((v, i) => (
                <div key={i} className="text-center">
                  <Label className="text-xs text-gray-500">Year {i + 1}</Label>
                  <Input
                    type="number"
                    value={v}
                    onChange={(e) => {
                      const newCurve = [...curveValue];
                      newCurve[i] = parseFloat(e.target.value) || 0;
                      onChange(newCurve);
                    }}
                    disabled={disabled}
                    className="text-center"
                    min={0}
                    max={100}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Enter the percentage of full impact realized each year
            </p>
          </div>
        );

      default:
        return (
          <Input
            type="text"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor={driver.key} className="font-medium">
            {driver.name}
            {validation?.required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          {driver.helpText && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-gray-400 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>{driver.helpText}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {driver.units && !["CURVE", "PERCENTAGE", "CURRENCY"].includes(driver.dataType) && (
          <Badge variant="outline" className="text-xs">
            {driver.units}
          </Badge>
        )}
      </div>
      {driver.description && (
        <p className="text-sm text-gray-500">{driver.description}</p>
      )}
      {renderInput()}
    </div>
  );
}
