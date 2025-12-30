import { requireAuth } from "@/lib/auth-utils";
import { getPortfolioMetrics } from "@/app/actions/portfolio";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, TrendingUp, DollarSign, Clock, FileStack } from "lucide-react";
import Link from "next/link";

const statusColors: Record<string, string> = {
  IDEA: "bg-gray-100 text-gray-700",
  DRAFT: "bg-yellow-100 text-yellow-700",
  IN_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  IN_FLIGHT: "bg-purple-100 text-purple-700",
  REALIZED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-gray-100 text-gray-500",
};

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default async function PortfolioPage() {
  await requireAuth();
  const portfolio = await getPortfolioMetrics();

  const initiativesWithMetrics = portfolio.initiatives.filter((i) => i.metrics);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Portfolio View
        </h1>
        <p className="text-muted-foreground mt-1">
          Aggregate view of all initiatives with rollup metrics.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileStack className="h-4 w-4" />
              Total Initiatives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{portfolio.totalInitiatives}</div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {Object.entries(portfolio.byStatus).map(([status, count]) => (
                <Badge key={status} variant="outline" className="text-xs">
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total NOPAT
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(portfolio.totalNopat)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Combined annual benefit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Average ROIC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatPercent(portfolio.averageRoic)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {initiativesWithMetrics.length} computed initiatives
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Average Payback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {portfolio.averagePayback.toFixed(1)} years
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Time to recover investment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Investment Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Summary</CardTitle>
          <CardDescription>
            Total upfront investment required across all initiatives
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div>
              <p className="text-sm text-muted-foreground">Total Investment (TUFI)</p>
              <p className="text-3xl font-bold">{formatCurrency(portfolio.totalTufi)}</p>
            </div>
            <div className="h-16 border-l" />
            <div>
              <p className="text-sm text-muted-foreground">Portfolio ROI</p>
              <p className="text-3xl font-bold text-green-600">
                {portfolio.totalTufi > 0
                  ? formatPercent(portfolio.totalNopat / portfolio.totalTufi)
                  : "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Initiatives Table */}
      <Card>
        <CardHeader>
          <CardTitle>Initiative Details</CardTitle>
          <CardDescription>
            All initiatives with their computed metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {portfolio.initiatives.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Initiative</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">NOPAT</TableHead>
                  <TableHead className="text-right">TUFI</TableHead>
                  <TableHead className="text-right">ROIC</TableHead>
                  <TableHead className="text-right">NPV</TableHead>
                  <TableHead className="text-right">Payback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolio.initiatives.map((initiative) => (
                  <TableRow key={initiative.id}>
                    <TableCell>
                      <Link
                        href={`/initiatives/${initiative.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {initiative.title}
                      </Link>
                      {initiative.latestVersion && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {initiative.latestVersion.versionLabel}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {initiative.owner.name || initiative.owner.email}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[initiative.status]}>
                        {initiative.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {initiative.metrics
                        ? formatCurrency(initiative.metrics.nopat)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {initiative.metrics
                        ? formatCurrency(initiative.metrics.tufi)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {initiative.metrics
                        ? formatPercent(initiative.metrics.roic)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {initiative.metrics
                        ? formatCurrency(initiative.metrics.npv)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {initiative.metrics
                        ? `${initiative.metrics.paybackYears.toFixed(1)}y`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No initiatives found. Create your first initiative to see portfolio metrics.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
