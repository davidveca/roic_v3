/**
 * Types for the ROIC Calculation Engine
 */

// Input drivers organized by category
export interface CalculationInputs {
  // Revenue drivers
  baseline_revenue?: number;
  price_change_pct?: number;
  volume_change_pct?: number;
  mix_improvement_pct?: number;
  churn_reduction_pct?: number;
  attach_rate_improvement?: number;
  new_revenue_annual?: number;
  revenue_ramp_curve?: number[];

  // Cost drivers
  baseline_cogs?: number;
  baseline_opex?: number;
  variable_cost_reduction_pct?: number;
  fixed_cost_reduction?: number;
  freight_savings_pct?: number;
  freight_baseline?: number;
  shrink_reduction_pct?: number;
  productivity_improvement_pct?: number;
  headcount_reduction?: number;
  avg_fully_loaded_cost?: number;
  vendor_savings_annual?: number;
  cost_ramp_curve?: number[];

  // Working capital drivers
  baseline_receivables?: number;
  baseline_inventory?: number;
  baseline_payables?: number;
  dso_improvement_days?: number;
  dio_improvement_days?: number;
  dpo_improvement_days?: number;
  working_capital_delta?: number;

  // Capex & one-time costs
  upfront_capex?: number;
  implementation_cost?: number;
  depreciation_years?: number;
  ongoing_maintenance?: number;

  // Tax & financial
  effective_tax_rate?: number;
  cost_of_capital?: number;

  // Risk
  probability_of_success?: number;
  haircut_conservative?: number;
  haircut_aggressive?: number;
  confidence_level?: string;

  // Model parameters
  model_periods?: number;
  start_date?: string;

  // Allow additional custom drivers
  [key: string]: number | string | boolean | number[] | undefined;
}

// Period-level calculation results
export interface PeriodMetrics {
  period: number; // 0 = summary, 1-N = years

  // Revenue impact
  revenueImpact: number;
  priceImpact: number;
  volumeImpact: number;
  mixImpact: number;
  churnImpact: number;
  newRevenue: number;

  // Cost impact
  costSavings: number;
  variableCostSavings: number;
  fixedCostSavings: number;
  freightSavings: number;
  laborSavings: number;
  vendorSavings: number;

  // Gross impact (before tax)
  grossImpact: number;

  // NOPAT (after-tax operating impact)
  nopat: number;

  // Investment metrics
  depreciation: number;
  maintenanceCost: number;

  // Working capital impact
  workingCapitalImpact: number;
  arImpact: number;
  inventoryImpact: number;
  apImpact: number;

  // Cash flow
  operatingCashFlow: number;
  freeCashFlow: number;
  cumulativeCashFlow: number;

  // Ramp percentage applied
  rampPct: number;
}

// Summary metrics
export interface SummaryMetrics {
  // Total upfront investment
  tufi: number;
  tufiBreakdown: {
    capex: number;
    oneTimeCosts: number;
    workingCapitalDelta: number;
  };

  // Steady-state annual NOPAT
  steadyStateNopat: number;

  // Weighted average NOPAT (accounting for ramp)
  avgAnnualNopat: number;

  // Total NOPAT over model period
  totalNopat: number;

  // ROIC = NOPAT / Invested Capital
  roic: number;
  roicPct: string;

  // Payback period (years)
  paybackPeriod: number | null;

  // NPV at cost of capital
  npv: number;

  // IRR (internal rate of return)
  irr: number | null;
  irrPct: string | null;

  // Risk-adjusted metrics
  probabilityAdjustedNopat: number;
  probabilityAdjustedRoic: number;

  // Data quality score (0-100)
  dataQualityScore: number;

  // Input completeness
  completenessScore: number;
}

// Full calculation output
export interface CalculationOutput {
  summary: SummaryMetrics;
  periods: PeriodMetrics[];
  inputs: CalculationInputs;
  computeHash: string;
  computedAt: string;
  warnings: string[];
}

// Scenario comparison
export interface ScenarioComparison {
  baseCase: CalculationOutput;
  conservative?: CalculationOutput;
  aggressive?: CalculationOutput;
  scenarios: Record<string, CalculationOutput>;
}
