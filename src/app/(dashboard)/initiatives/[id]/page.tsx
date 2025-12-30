import { notFound } from "next/navigation";
import Link from "next/link";
import { getInitiative } from "@/app/actions/initiatives";
import { getVersion } from "@/app/actions/versions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Edit,
  Play,
  FileText,
  Settings,
  MessageSquare,
  GitBranch,
  Calculator,
  TrendingUp,
  DollarSign,
  Percent,
  Clock,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { InitiativeDriversForm } from "@/components/initiatives/drivers-form";
import { InitiativeResults } from "@/components/initiatives/results";

const statusColors: Record<string, string> = {
  IDEA: "bg-gray-100 text-gray-700",
  DRAFT: "bg-yellow-100 text-yellow-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  IN_FLIGHT: "bg-purple-100 text-purple-700",
  REALIZED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

const versionStateColors: Record<string, string> = {
  DRAFT: "bg-yellow-100 text-yellow-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  SUPERSEDED: "bg-gray-100 text-gray-500",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InitiativeDetailPage({ params }: PageProps) {
  const { id } = await params;

  let initiative;
  try {
    initiative = await getInitiative(id);
  } catch {
    notFound();
  }

  const latestVersion = initiative.versions[0];
  let versionDetails = null;

  if (latestVersion) {
    try {
      versionDetails = await getVersion(latestVersion.id);
    } catch (e) {
      console.error("Failed to load version details", e);
    }
  }

  const tags = (initiative.tags as { type: string; value: string }[]) || [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/initiatives"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Initiatives
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{initiative.title}</h1>
              <Badge className={statusColors[initiative.status]}>
                {initiative.status.replace("_", " ")}
              </Badge>
            </div>
            {initiative.description && (
              <p className="text-gray-500 max-w-2xl">{initiative.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span>
                Owner: <span className="font-medium text-gray-700">{initiative.owner.name ?? initiative.owner.email}</span>
              </span>
              <span>
                Template: <span className="font-medium text-gray-700">{initiative.template?.name ?? "Custom"}</span>
              </span>
              <span>
                Updated {formatDistanceToNow(new Date(initiative.updatedAt), { addSuffix: true })}
              </span>
            </div>
            {tags.length > 0 && (
              <div className="flex gap-2 mt-3">
                {tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tag.type}: {tag.value}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button size="sm">
              <Play className="h-4 w-4 mr-2" />
              Compute
            </Button>
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Version Selector */}
      {initiative.versions.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">Version</span>
            </div>
            <Button variant="outline" size="sm">
              New Version
            </Button>
          </div>
          <div className="flex gap-2">
            {initiative.versions.slice(0, 5).map((version) => (
              <Badge
                key={version.id}
                variant={version.id === latestVersion?.id ? "default" : "outline"}
                className="cursor-pointer"
              >
                {version.versionLabel}
                <span className={`ml-2 text-xs ${versionStateColors[version.state]?.replace("bg-", "text-").replace("-100", "-600")}`}>
                  {version.state}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="inputs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="inputs" className="gap-2">
            <FileText className="h-4 w-4" />
            Inputs
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="gap-2">
            <Settings className="h-4 w-4" />
            Scenarios
          </TabsTrigger>
          <TabsTrigger value="results" className="gap-2">
            <Calculator className="h-4 w-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Comments
            {versionDetails && versionDetails.comments.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {versionDetails.comments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inputs">
          {latestVersion && versionDetails ? (
            <InitiativeDriversForm
              versionId={latestVersion.id}
              templateId={initiative.templateId}
              driverValues={versionDetails.driverValues}
              isLocked={latestVersion.state !== "DRAFT"}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                No version found. Create a version to start entering drivers.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="scenarios">
          <Card>
            <CardHeader>
              <CardTitle>Scenarios</CardTitle>
              <CardDescription>
                Create what-if scenarios by overriding key drivers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {versionDetails?.scenarios && versionDetails.scenarios.length > 0 ? (
                <div className="space-y-4">
                  {versionDetails.scenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{scenario.name}</span>
                          {scenario.isBaseline && (
                            <Badge variant="outline" className="text-xs">Baseline</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {Object.keys(scenario.overrides as object || {}).length} overrides
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No scenarios created yet
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          {versionDetails?.scenarios?.find((s) => s.isBaseline)?.results?.length ? (
            <InitiativeResults
              scenarios={versionDetails.scenarios}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calculator className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">No results yet</h3>
                <p className="text-gray-500 mb-4">
                  Fill in the required drivers and click Compute to see results
                </p>
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  Compute Results
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle>Discussion</CardTitle>
              <CardDescription>
                Comments and notes on this version
              </CardDescription>
            </CardHeader>
            <CardContent>
              {versionDetails?.comments && versionDetails.comments.length > 0 ? (
                <div className="space-y-4">
                  {versionDetails.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                        {comment.author.name?.charAt(0) ?? comment.author.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {comment.author.name ?? comment.author.email}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                          {comment.driverKey && (
                            <Badge variant="outline" className="text-xs">
                              {comment.driverKey}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">
                  No comments yet. Start a discussion about this initiative.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
