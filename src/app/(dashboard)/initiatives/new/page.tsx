"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Truck,
  TrendingUp,
  Wallet,
  Users,
  Building,
  Loader2,
} from "lucide-react";
import { createInitiative, getTemplates } from "@/app/actions/initiatives";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  Truck,
  TrendingUp,
  Wallet,
  Users,
  Building,
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  iconName: string | null;
  requiredDrivers: string[];
  optionalDrivers: string[];
};

type Tag = {
  type: "bu" | "site" | "function" | "customer_tier" | "product_family" | "custom";
  value: string;
  label?: string;
};

const tagTypes = [
  { value: "bu", label: "Business Unit" },
  { value: "site", label: "Site/Location" },
  { value: "function", label: "Function" },
  { value: "customer_tier", label: "Customer Tier" },
  { value: "product_family", label: "Product Family" },
];

export default function NewInitiativePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);

  // Form state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagType, setNewTagType] = useState<Tag["type"]>("bu");
  const [newTagValue, setNewTagValue] = useState("");

  // Load templates
  const loadTemplates = async () => {
    if (!templatesLoaded) {
      const data = await getTemplates();
      setTemplates(data as Template[]);
      setTemplatesLoaded(true);
    }
  };

  // Start loading templates on mount
  useState(() => {
    loadTemplates();
  });

  const addTag = () => {
    if (newTagValue.trim()) {
      setTags([...tags, { type: newTagType, value: newTagValue.trim() }]);
      setNewTagValue("");
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title for your initiative");
      return;
    }

    setIsLoading(true);
    try {
      const initiative = await createInitiative({
        title: title.trim(),
        description: description.trim() || undefined,
        templateId: selectedTemplate?.id,
        tags,
        type: "OTHER",
        isPublic: false,
      });

      toast.success("Initiative created successfully");
      router.push(`/initiatives/${initiative.id}`);
    } catch (error) {
      toast.error("Failed to create initiative");
      console.error(error);
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/initiatives"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Initiatives
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Initiative</h1>
        <p className="text-gray-500">
          Follow the wizard to set up your initiative modeling
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium",
                step === s
                  ? "bg-blue-600 text-white"
                  : step > s
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              )}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                step === s ? "text-gray-900" : "text-gray-500"
              )}
            >
              {s === 1 && "Template"}
              {s === 2 && "Details"}
              {s === 3 && "Scope"}
            </span>
            {s < 3 && <div className="w-12 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step 1: Template Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-2">Choose a Template</h2>
            <p className="text-gray-500 text-sm">
              Templates provide pre-configured drivers and calculations for common initiative types
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {templates.map((template) => {
              const Icon = iconMap[template.iconName ?? ""] ?? Building;
              return (
                <Card
                  key={template.id}
                  className={cn(
                    "cursor-pointer transition-all hover:border-blue-300",
                    selectedTemplate?.id === template.id && "border-blue-600 ring-2 ring-blue-100"
                  )}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-50">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {template.description}
                        </CardDescription>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <Check className="h-5 w-5 text-blue-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {template.requiredDrivers.length} required drivers
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {template.optionalDrivers.length} optional
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card
            className={cn(
              "cursor-pointer transition-all hover:border-gray-400",
              selectedTemplate === null && "border-gray-400"
            )}
            onClick={() => setSelectedTemplate(null)}
          >
            <CardContent className="py-6 text-center">
              <p className="font-medium">Start from Scratch</p>
              <p className="text-sm text-gray-500">
                Create a custom initiative without a template
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button onClick={() => setStep(2)}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Basic Details */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium mb-2">Initiative Details</h2>
            <p className="text-gray-500 text-sm">
              Provide basic information about your initiative
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., 2025 Freight Cost Reduction Program"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the initiative objectives and expected outcomes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              {selectedTemplate && (
                <div className="pt-2">
                  <p className="text-sm text-gray-500">
                    Using template:{" "}
                    <span className="font-medium text-gray-700">
                      {selectedTemplate.name}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => setStep(3)} disabled={!title.trim()}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Scope Tags */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-medium mb-2">Define Scope</h2>
            <p className="text-gray-500 text-sm">
              Add tags to categorize and filter this initiative
            </p>
          </div>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-2">
                <select
                  className="flex h-10 w-40 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  value={newTagType}
                  onChange={(e) => setNewTagType(e.target.value as Tag["type"])}
                >
                  {tagTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder="Enter value..."
                  value={newTagValue}
                  onChange={(e) => setNewTagValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                  className="flex-1"
                />
                <Button type="button" onClick={addTag} variant="secondary">
                  Add
                </Button>
              </div>

              {tags.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-2">
                  {tags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      <span className="text-gray-500 text-xs">
                        {tagTypes.find((t) => t.value === tag.type)?.label}:
                      </span>
                      {tag.value}
                      <button
                        onClick={() => removeTag(index)}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {tags.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No tags added yet. Tags help you filter and organize initiatives.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Title:</span>
                <span className="font-medium">{title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Template:</span>
                <span className="font-medium">
                  {selectedTemplate?.name ?? "Custom"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tags:</span>
                <span className="font-medium">{tags.length} tags</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Initiative
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
