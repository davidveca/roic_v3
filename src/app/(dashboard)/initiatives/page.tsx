import Link from "next/link";
import { Suspense } from "react";
import { getInitiatives, getTemplates } from "@/app/actions/initiatives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileStack, ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getSettings } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  IDEA: "bg-gray-100 text-gray-700",
  DRAFT: "bg-yellow-100 text-yellow-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  IN_FLIGHT: "bg-purple-100 text-purple-700",
  REALIZED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

const typeColors: Record<string, string> = {
  COST_REDUCTION: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  ACQUISITION: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  NEW_PRODUCT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  CAPEX_PROJECT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  OTHER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const typeLabels: Record<string, string> = {
  COST_REDUCTION: "Cost Reduction",
  ACQUISITION: "Acquisition",
  NEW_PRODUCT: "New Product",
  CAPEX_PROJECT: "CapEx",
  OTHER: "Other",
};

type RAGStatus = "GREEN" | "AMBER" | "RED" | null;

function getRAGStatus(roic: number | null, hurdleRate: number): RAGStatus {
  if (roic === null) return null;
  const buffer = hurdleRate * 0.25;
  if (roic >= hurdleRate + buffer) return "GREEN";
  if (roic >= hurdleRate - buffer) return "AMBER";
  return "RED";
}

function RAGIndicator({ status }: { status: RAGStatus }) {
  if (!status) return <span className="text-gray-400">—</span>;

  const styles = {
    GREEN: "bg-rag-green text-white",
    AMBER: "bg-rag-amber text-black",
    RED: "bg-rag-red text-white",
  };

  const icons = {
    GREEN: <TrendingUp className="h-3 w-3" />,
    AMBER: <Minus className="h-3 w-3" />,
    RED: <TrendingDown className="h-3 w-3" />,
  };

  return (
    <div className={cn("flex items-center justify-center w-6 h-6 rounded-full", styles[status])}>
      {icons[status]}
    </div>
  );
}

async function InitiativesList() {
  const [{ initiatives, pagination }, settings] = await Promise.all([
    getInitiatives(),
    getSettings(),
  ]);
  const hurdleRate = settings.hurdleRate / 100; // Convert to decimal

  if (initiatives.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileStack className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">No initiatives yet</h3>
          <p className="text-muted-foreground mb-4 text-center max-w-sm">
            Create your first initiative to start modeling ROIC impact
          </p>
          <Button asChild>
            <Link href="/initiatives/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Initiative
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Initiative</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">ROIC</TableHead>
            <TableHead className="text-center">RAG</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initiatives.map((initiative) => {
            // Extract ROIC from calculation results
            const latestVersion = initiative.versions[0];
            const baselineScenario = latestVersion?.scenarios?.[0];
            const summaryResult = baselineScenario?.results?.[0];
            const metrics = summaryResult?.metrics as { roic?: number } | undefined;
            const roic = metrics?.roic ?? null;
            const ragStatus = getRAGStatus(roic, hurdleRate);

            return (
              <TableRow key={initiative.id}>
                <TableCell>
                  <div>
                    <Link
                      href={`/initiatives/${initiative.id}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {initiative.title}
                    </Link>
                    {initiative.description && (
                      <p className="text-sm text-muted-foreground truncate max-w-xs">
                        {initiative.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={typeColors[initiative.type]}>
                    {typeLabels[initiative.type] ?? initiative.type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-black text-white dark:bg-amber-500/20 flex items-center justify-center text-xs font-medium">
                      <span className="dark:text-amber-400">
                        {initiative.owner.name?.charAt(0) ??
                          initiative.owner.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm">
                      {initiative.owner.name ?? initiative.owner.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={statusColors[initiative.status]}>
                    {initiative.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {roic !== null ? (
                    <span className={cn(
                      ragStatus === "GREEN" && "text-rag-green",
                      ragStatus === "RED" && "text-rag-red"
                    )}>
                      {(roic * 100).toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <RAGIndicator status={ragStatus} />
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(initiative.updatedAt), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/initiatives/${initiative.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {initiatives.length} of {pagination.total} initiatives
          </p>
        </div>
      )}
    </Card>
  );
}

function InitiativesListSkeleton() {
  return (
    <Card>
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

async function QuickStats() {
  const { initiatives } = await getInitiatives({ limit: 100 });

  const stats = {
    total: initiatives.length,
    draft: initiatives.filter((i) => i.status === "DRAFT").length,
    inReview: initiatives.filter((i) => i.status === "IN_REVIEW").length,
    approved: initiatives.filter((i) => i.status === "APPROVED").length,
    inFlight: initiatives.filter((i) => i.status === "IN_FLIGHT").length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold">{stats.total}</div>
          <p className="text-xs text-muted-foreground">Total Initiatives</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-rag-amber">{stats.draft}</div>
          <p className="text-xs text-muted-foreground">In Draft</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-blue-600">{stats.inReview}</div>
          <p className="text-xs text-muted-foreground">In Review</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-rag-green">{stats.approved}</div>
          <p className="text-xs text-muted-foreground">Approved</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-purple-600">{stats.inFlight}</div>
          <p className="text-xs text-muted-foreground">In Flight</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InitiativesPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Initiatives</h1>
          <p className="text-muted-foreground">Model and track ROIC initiatives</p>
        </div>
        <Button asChild>
          <Link href="/initiatives/new">
            <Plus className="h-4 w-4 mr-2" />
            New Initiative
          </Link>
        </Button>
      </div>

      <Suspense fallback={<div className="grid grid-cols-5 gap-4 mb-6">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24" />)}</div>}>
        <QuickStats />
      </Suspense>

      <Suspense fallback={<InitiativesListSkeleton />}>
        <InitiativesList />
      </Suspense>
    </div>
  );
}
