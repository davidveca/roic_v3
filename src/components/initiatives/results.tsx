"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Clock,
  Target,
  AlertTriangle,
} from "lucide-react";
import type { Scenario, CalculationResult } from "@prisma/client";

interface ScenarioWithResults extends Scenario {
  results: CalculationResult[];
}

interface ResultsProps {
  scenarios: ScenarioWithResults[];
}

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function InitiativeResults({ scenarios }: ResultsProps) {
  const baselineScenario = scenarios.find((s) => s.isBaseline);

  if (!baselineScenario?.results?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          No calculation results available. Run a computation to see results.
        </CardContent>
      </Card>
    );
  }

  // Extract metrics from period results
  const periodResults = baselineScenario.results
    .filter((r) => r.period > 0)
    .sort((a, b) => a.period - b.period);

  const summaryResult = baselineScenario.results.find((r) => r.period === 0);

  // Calculate summary metrics from period data
  const metrics = periodResults.map((r) => r.metrics as Record<string, number>);

  const totalNopat = metrics.reduce((sum, m) => sum + (m.nopat || 0), 0);
  const steadyStateNopat = metrics[metrics.length - 1]?.nopat || 0;

  // Get TUFI from first period's working capital or summary
  const initialInvestment = Math.abs(baselineScenario.results[0]?.metrics?.freeCashFlow as number || 0);

  // Calculate ROIC
  const roic = initialInvestment > 0 ? steadyStateNopat / initialInvestment : 0;

  // Find payback period
  let paybackPeriod: number | null = null;
  let cumulativeCash = -initialInvestment;
  for (const m of metrics) {
    cumulativeCash += m.freeCashFlow || m.operatingCashFlow || 0;
    if (cumulativeCash >= 0 && paybackPeriod === null) {
      paybackPeriod = m.period || periodResults.indexOf(m as unknown as typeof periodResults[0]) + 1;
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Steady-State NOPAT</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(steadyStateNopat)}
                </p>
                <p className="text-xs text-gray-400">per year</p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Investment (TUFI)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(initialInvestment)}
                </p>
                <p className="text-xs text-gray-400">upfront</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">ROIC</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatPercent(roic)}
                </p>
                <p className="text-xs text-gray-400">return on invested capital</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <Percent className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Payback Period</p>
                <p className="text-2xl font-bold text-amber-600">
                  {paybackPeriod !== null ? `${paybackPeriod.toFixed(1)} yrs` : "N/A"}
                </p>
                <p className="text-xs text-gray-400">to recover investment</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-full">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="breakdown">Impact Breakdown</TabsTrigger>
          <TabsTrigger value="scenarios">Scenario Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Year-by-Year Results</CardTitle>
              <CardDescription>
                Financial impact over the modeling period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Revenue Impact</TableHead>
                    <TableHead className="text-right">Cost Savings</TableHead>
                    <TableHead className="text-right">Gross Impact</TableHead>
                    <TableHead className="text-right">NOPAT</TableHead>
                    <TableHead className="text-right">Cash Flow</TableHead>
                    <TableHead className="text-right">Cumulative</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periodResults.map((result) => {
                    const m = result.metrics as Record<string, number>;
                    return (
                      <TableRow key={result.id}>
                        <TableCell className="font-medium">Year {result.period}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(m.revenueImpact || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(m.costSavings || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(m.grossImpact || 0)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(m.nopat || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(m.freeCashFlow || m.operatingCashFlow || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={m.cumulativeCashFlow >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(m.cumulativeCashFlow || 0)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Revenue Impact (Steady State)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Price Impact", key: "priceImpact" },
                  { label: "Volume Impact", key: "volumeImpact" },
                  { label: "Mix Improvement", key: "mixImpact" },
                  { label: "Churn Reduction", key: "churnImpact" },
                  { label: "New Revenue", key: "newRevenue" },
                ].map(({ label, key }) => {
                  const value = metrics[metrics.length - 1]?.[key] || 0;
                  if (value === 0) return null;
                  return (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium text-green-600">{formatCurrency(value)}</span>
                    </div>
                  );
                })}
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total Revenue Impact</span>
                  <span className="text-green-600">
                    {formatCurrency(metrics[metrics.length - 1]?.revenueImpact || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-blue-600" />
                  Cost Savings (Steady State)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Variable Cost Savings", key: "variableCostSavings" },
                  { label: "Fixed Cost Savings", key: "fixedCostSavings" },
                  { label: "Freight Savings", key: "freightSavings" },
                  { label: "Labor Savings", key: "laborSavings" },
                  { label: "Vendor Savings", key: "vendorSavings" },
                ].map(({ label, key }) => {
                  const value = metrics[metrics.length - 1]?.[key] || 0;
                  if (value === 0) return null;
                  return (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-medium text-blue-600">{formatCurrency(value)}</span>
                    </div>
                  );
                })}
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total Cost Savings</span>
                  <span className="text-blue-600">
                    {formatCurrency(metrics[metrics.length - 1]?.costSavings || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scenarios" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Scenario Comparison</CardTitle>
              <CardDescription>
                Compare results across different scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scenario</TableHead>
                    <TableHead className="text-right">NOPAT</TableHead>
                    <TableHead className="text-right">ROIC</TableHead>
                    <TableHead className="text-right">Overrides</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenarios.map((scenario) => {
                    const scenarioMetrics = scenario.results
                      .filter((r) => r.period > 0)
                      .map((r) => r.metrics as Record<string, number>);
                    const scenarioNopat = scenarioMetrics[scenarioMetrics.length - 1]?.nopat || 0;
                    const scenarioRoic = initialInvestment > 0 ? scenarioNopat / initialInvestment : 0;

                    return (
                      <TableRow key={scenario.id}>
                        <TableCell className="font-medium">
                          {scenario.name}
                          {scenario.isBaseline && (
                            <Badge variant="outline" className="ml-2 text-xs">Baseline</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(scenarioNopat)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercent(scenarioRoic)}
                        </TableCell>
                        <TableCell className="text-right text-gray-500">
                          {Object.keys(scenario.overrides as object || {}).length}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
