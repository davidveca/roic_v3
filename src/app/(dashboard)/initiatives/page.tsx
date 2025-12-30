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
import { Plus, FileStack, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  IDEA: "bg-gray-100 text-gray-700",
  DRAFT: "bg-yellow-100 text-yellow-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  IN_FLIGHT: "bg-purple-100 text-purple-700",
  REALIZED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

async function InitiativesList() {
  const { initiatives, pagination } = await getInitiatives();

  if (initiatives.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileStack className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">No initiatives yet</h3>
          <p className="text-gray-500 mb-4 text-center max-w-sm">
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
            <TableHead>Template</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {initiatives.map((initiative) => (
            <TableRow key={initiative.id}>
              <TableCell>
                <div>
                  <Link
                    href={`/initiatives/${initiative.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600"
                  >
                    {initiative.title}
                  </Link>
                  {initiative.description && (
                    <p className="text-sm text-gray-500 truncate max-w-xs">
                      {initiative.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {initiative.template?.name ?? (
                  <span className="text-gray-400">Custom</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium">
                    {initiative.owner.name?.charAt(0) ??
                      initiative.owner.email.charAt(0).toUpperCase()}
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
              <TableCell>
                {initiative.versions[0]?.versionLabel ?? "—"}
              </TableCell>
              <TableCell className="text-gray-500 text-sm">
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
          ))}
        </TableBody>
      </Table>
      {pagination.totalPages > 1 && (
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <p className="text-sm text-gray-500">
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
          <p className="text-xs text-gray-500">Total Initiatives</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-yellow-600">{stats.draft}</div>
          <p className="text-xs text-gray-500">In Draft</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-blue-600">{stats.inReview}</div>
          <p className="text-xs text-gray-500">In Review</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <p className="text-xs text-gray-500">Approved</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="text-2xl font-bold text-purple-600">{stats.inFlight}</div>
          <p className="text-xs text-gray-500">In Flight</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Initiatives</h1>
          <p className="text-gray-500">Model and track ROIC initiatives across your organization</p>
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
