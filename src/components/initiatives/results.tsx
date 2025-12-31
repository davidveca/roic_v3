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
  CheckCircle2,
  Minus,
  ShieldAlert,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Scenario, CalculationResult } from "@prisma/client";
import type { RAGStatus, DecisionRecommendation, ReviewLevel } from "@/lib/calculations/types";
import { RECOMMENDATION_LABELS, REVIEW_LEVEL_LABELS } from "@/lib/calculations/types";

interface ScenarioWithResults extends Scenario {
  results: CalculationResult[];
}

interface ResultsProps {
  scenarios: ScenarioWithResults[];
  hurdleRate?: number; // as decimal (e.g., 0.12 for 12%)
  probability?: number; // as decimal (e.g., 0.8 for 80%)
  conservativeHaircut?: number; // as percentage (e.g., 20)
  aggressiveHaircut?: number; // as percentage (e.g., 20)
  lightTouchThreshold?: number;
  boardReviewThreshold?: number;
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

// RAG Status calculation
function calculateRAGStatus(
  roic: number,
  hurdleRate: number,
  probability: number
): RAGStatus {
  const buffer = hurdleRate * 0.25;
  if (roic >= hurdleRate + buffer && probability >= 0.7) return "GREEN";
  if (roic >= hurdleRate - buffer && probability >= 0.5) return "AMBER";
  return "RED";
}

// Recommendation calculation
function calculateRecommendation(
  roic: number,
  hurdleRate: number,
  probability: number,
  conservativeRoic: number,
  aggressiveRoic: number
): DecisionRecommendation {
  const variance = aggressiveRoic - conservativeRoic;
  const highVariance = variance > 0.2;
  const nearHurdle = Math.abs(roic - hurdleRate) < 0.03;

  if (roic < hurdleRate) return "BELOW_HURDLE";
  if (highVariance && probability < 0.7) return "HIGH_RISK_PROFILE";
  if (nearHurdle && highVariance) return "MARGINAL_ROIC_HIGH_EXPOSURE";
  return "STRONG_CANDIDATE";
}

// Review level calculation
function calculateReviewLevel(
  investmentSize: number,
  lightTouch: number,
  boardReview: number
): ReviewLevel {
  if (investmentSize <= lightTouch) return "LIGHT_TOUCH";
  if (investmentSize >= boardReview) return "BOARD_REVIEW";
  return "STANDARD";
}

// RAG Indicator Component
function RAGIndicator({ status, size = "lg" }: { status: RAGStatus; size?: "sm" | "lg" }) {
  const styles = {
    GREEN: "bg-rag-green text-white",
    AMBER: "bg-rag-amber text-black",
    RED: "bg-rag-red text-white",
  };

  const icons = {
    GREEN: <TrendingUp className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} />,
    AMBER: <Minus className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} />,
    RED: <TrendingDown className={size === "lg" ? "h-6 w-6" : "h-4 w-4"} />,
  };

  const labels = {
    GREEN: "Strong",
    AMBER: "Marginal",
    RED: "Below Target",
  };

  return (
    <div className="flex items-center gap-3">
      <div className={cn(
        "flex items-center justify-center rounded-full",
        size === "lg" ? "w-12 h-12" : "w-8 h-8",
        styles[status]
      )}>
        {icons[status]}
      </div>
      {size === "lg" && (
        <div>
          <p className="font-semibold">{status}</p>
          <p className="text-sm text-muted-foreground">{labels[status]}</p>
        </div>
      )}
    </div>
  );
}

// Recommendation Badge Component
function RecommendationBadge({ recommendation }: { recommendation: DecisionRecommendation }) {
  const styles: Record<DecisionRecommendation, string> = {
    STRONG_CANDIDATE: "bg-rag-green/10 text-rag-green border-rag-green/30",
    BELOW_HURDLE: "bg-rag-red/10 text-rag-red border-rag-red/30",
    HIGH_RISK_PROFILE: "bg-rag-amber/10 text-rag-amber border-rag-amber/30",
    MARGINAL_ROIC_HIGH_EXPOSURE: "bg-rag-amber/10 text-rag-amber border-rag-amber/30",
  };

  const icons: Record<DecisionRecommendation, React.ReactNode> = {
    STRONG_CANDIDATE: <CheckCircle2 className="h-3 w-3" />,
    BELOW_HURDLE: <AlertTriangle className="h-3 w-3" />,
    HIGH_RISK_PROFILE: <ShieldAlert className="h-3 w-3" />,
    MARGINAL_ROIC_HIGH_EXPOSURE: <Scale className="h-3 w-3" />,
  };

  return (
    <Badge variant="outline" className={cn("gap-1", styles[recommendation])}>
      {icons[recommendation]}
      {RECOMMENDATION_LABELS[recommendation]}
    </Badge>
  );
}

// Review Level Badge Component
function ReviewLevelBadge({ level }: { level: ReviewLevel }) {
  const styles: Record<ReviewLevel, string> = {
    LIGHT_TOUCH: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    STANDARD: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    BOARD_REVIEW: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <Badge variant="secondary" className={styles[level]}>
      {REVIEW_LEVEL_LABELS[level]}
    </Badge>
  );
}

export function InitiativeResults({
  scenarios,
  hurdleRate = 0.12,
  probability = 0.8,
  conservativeHaircut = 20,
  aggressiveHaircut = 20,
  lightTouchThreshold = 50000,
  boardReviewThreshold = 2000000,
}: ResultsProps) {
  const baselineScenario = scenarios.find((s) => s.isBaseline);

  if (!baselineScenario?.results?.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
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
  const initialInvestment = Math.abs((baselineScenario.results[0]?.metrics as Record<string, number>)?.freeCashFlow || 0);

  // Calculate ROIC
  const roic = initialInvestment > 0 ? steadyStateNopat / initialInvestment : 0;

  // Calculate conservative and aggressive ROIC
  const conservativeRoic = roic * (1 - conservativeHaircut / 100);
  const aggressiveRoic = roic * (1 + aggressiveHaircut / 100);

  // Calculate conservative and aggressive NOPAT
  const conservativeNopat = steadyStateNopat * (1 - conservativeHaircut / 100);
  const aggressiveNopat = steadyStateNopat * (1 + aggressiveHaircut / 100);

  // Calculate expected value (probability-weighted NOPAT)
  const expectedValue = steadyStateNopat * probability;

  // Calculate decision framework metrics
  const ragStatus = calculateRAGStatus(roic, hurdleRate, probability);
  const recommendation = calculateRecommendation(
    roic,
    hurdleRate,
    probability,
    conservativeRoic,
    aggressiveRoic
  );
  const reviewLevel = calculateReviewLevel(
    initialInvestment,
    lightTouchThreshold,
    boardReviewThreshold
  );

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
      {/* Decision Framework Card */}
      <Card className="border-2 border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Decision Framework
              </CardTitle>
              <CardDescription>
                Assessment vs {formatPercent(hurdleRate)} hurdle rate
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <ReviewLevelBadge level={reviewLevel} />
              <RAGIndicator status={ragStatus} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* ROIC Range */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">ROIC Range</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Conservative</span>
                  <span className={cn(
                    "font-mono font-medium",
                    conservativeRoic < hurdleRate ? "text-rag-red" : "text-rag-green"
                  )}>
                    {formatPercent(conservativeRoic)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Expected</span>
                  <span className={cn(
                    "font-mono font-bold text-lg",
                    roic < hurdleRate ? "text-rag-red" : roic >= hurdleRate * 1.25 ? "text-rag-green" : "text-rag-amber"
                  )}>
                    {formatPercent(roic)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Aggressive</span>
                  <span className="font-mono font-medium text-rag-green">
                    {formatPercent(aggressiveRoic)}
                  </span>
                </div>
                <div className="mt-2 pt-2 border-t flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Hurdle Rate</span>
                  <span className="font-mono">{formatPercent(hurdleRate)}</span>
                </div>
              </div>
            </div>

            {/* Absolute Return Range */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">Annual NOPAT Range</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Conservative</span>
                  <span className="font-mono font-medium">{formatCurrency(conservativeNopat)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Expected</span>
                  <span className="font-mono font-bold text-lg">{formatCurrency(steadyStateNopat)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Aggressive</span>
                  <span className="font-mono font-medium">{formatCurrency(aggressiveNopat)}</span>
                </div>
                <div className="mt-2 pt-2 border-t flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Expected Value ({formatPercent(probability)} prob.)</span>
                  <span className="font-mono font-medium">{formatCurrency(expectedValue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendation */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Recommendation:</span>
                <RecommendationBadge recommendation={recommendation} />
              </div>
              <div className="text-sm text-muted-foreground">
                vs Hurdle: <span className={cn(
                  "font-medium",
                  roic >= hurdleRate ? "text-rag-green" : "text-rag-red"
                )}>
                  {roic >= hurdleRate ? "+" : ""}{formatPercent(roic - hurdleRate)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Steady-State NOPAT</p>
                <p className="text-2xl font-bold text-rag-green">
                  {formatCurrency(steadyStateNopat)}
                </p>
                <p className="text-xs text-muted-foreground">per year</p>
              </div>
              <div className="p-3 bg-rag-green/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-rag-green" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Investment (TUFI)</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(initialInvestment)}
                </p>
                <p className="text-xs text-muted-foreground">upfront</p>
              </div>
              <div className="p-3 bg-muted rounded-full">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ROIC</p>
                <p className={cn(
                  "text-2xl font-bold",
                  ragStatus === "GREEN" ? "text-rag-green" :
                  ragStatus === "AMBER" ? "text-rag-amber" : "text-rag-red"
                )}>
                  {formatPercent(roic)}
                </p>
                <p className="text-xs text-muted-foreground">return on invested capital</p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                ragStatus === "GREEN" ? "bg-rag-green/10" :
                ragStatus === "AMBER" ? "bg-rag-amber/10" : "bg-rag-red/10"
              )}>
                <Percent className={cn(
                  "h-5 w-5",
                  ragStatus === "GREEN" ? "text-rag-green" :
                  ragStatus === "AMBER" ? "text-rag-amber" : "text-rag-red"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payback Period</p>
                <p className="text-2xl font-bold text-rag-amber">
                  {paybackPeriod !== null ? `${paybackPeriod.toFixed(1)} yrs` : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">to recover investment</p>
              </div>
              <div className="p-3 bg-rag-amber/10 rounded-full">
                <Clock className="h-5 w-5 text-rag-amber" />
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
                        <TableCell className="text-right font-medium text-rag-green">
                          {formatCurrency(m.nopat || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(m.freeCashFlow || m.operatingCashFlow || 0)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={m.cumulativeCashFlow >= 0 ? "text-rag-green" : "text-rag-red"}>
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
                  <TrendingUp className="h-4 w-4 text-rag-green" />
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
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-rag-green">{formatCurrency(value)}</span>
                    </div>
                  );
                })}
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total Revenue Impact</span>
                  <span className="text-rag-green">
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
                      <span className="text-muted-foreground">{label}</span>
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
                        <TableCell className="text-right text-muted-foreground">
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
