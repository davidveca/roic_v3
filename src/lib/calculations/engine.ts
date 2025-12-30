/**
 * ROIC Calculation Engine
 *
 * Orchestrates the calculation of NOPAT, TUFI, ROIC, and other metrics
 * following McKinsey/Deloitte-style initiative modeling.
 */

import { createHash } from "crypto";
import type {
  CalculationInputs,
  PeriodMetrics,
  SummaryMetrics,
  CalculationOutput,
} from "./types";

// Default values for missing inputs
const DEFAULTS: Partial<CalculationInputs> = {
  effective_tax_rate: 25,
  depreciation_years: 5,
  model_periods: 5,
  probability_of_success: 100,
  cost_of_capital: 10,
  revenue_ramp_curve: [100, 100, 100, 100, 100],
  cost_ramp_curve: [100, 100, 100, 100, 100],
};

/**
 * Main calculation function
 */
export function calculateMetrics(rawInputs: CalculationInputs): CalculationOutput {
  const warnings: string[] = [];
  const inputs = { ...DEFAULTS, ...rawInputs };

  // Validate and normalize inputs
  const normalized = normalizeInputs(inputs, warnings);

  // Calculate period-by-period metrics
  const periods = calculatePeriods(normalized, warnings);

  // Calculate summary metrics
  const summary = calculateSummary(normalized, periods, warnings);

  // Generate compute hash for reproducibility
  const computeHash = generateHash(normalized);

  return {
    summary,
    periods,
    inputs: normalized,
    computeHash,
    computedAt: new Date().toISOString(),
    warnings,
  };
}

/**
 * Normalize and validate inputs
 */
function normalizeInputs(
  inputs: CalculationInputs,
  warnings: string[]
): CalculationInputs {
  const normalized = { ...inputs };

  // Ensure percentages are in decimal form for calculations
  // (We'll keep them as percentages in the output)

  // Validate required fields
  if (!normalized.baseline_revenue && normalized.baseline_revenue !== 0) {
    warnings.push("Baseline revenue not provided; revenue impacts will be zero");
    normalized.baseline_revenue = 0;
  }

  // Ensure ramp curves have correct length
  const periods = normalized.model_periods ?? 5;

  if (normalized.revenue_ramp_curve) {
    while (normalized.revenue_ramp_curve.length < periods) {
      normalized.revenue_ramp_curve.push(
        normalized.revenue_ramp_curve[normalized.revenue_ramp_curve.length - 1] ?? 100
      );
    }
  }

  if (normalized.cost_ramp_curve) {
    while (normalized.cost_ramp_curve.length < periods) {
      normalized.cost_ramp_curve.push(
        normalized.cost_ramp_curve[normalized.cost_ramp_curve.length - 1] ?? 100
      );
    }
  }

  return normalized;
}

/**
 * Calculate metrics for each period
 */
function calculatePeriods(
  inputs: CalculationInputs,
  warnings: string[]
): PeriodMetrics[] {
  const periods: PeriodMetrics[] = [];
  const numPeriods = inputs.model_periods ?? 5;
  const taxRate = (inputs.effective_tax_rate ?? 25) / 100;

  let cumulativeCashFlow = -(
    (inputs.upfront_capex ?? 0) +
    (inputs.implementation_cost ?? 0)
  );

  // Period 0 = Initial investment
  const period0: PeriodMetrics = {
    period: 0,
    revenueImpact: 0,
    priceImpact: 0,
    volumeImpact: 0,
    mixImpact: 0,
    churnImpact: 0,
    newRevenue: 0,
    costSavings: 0,
    variableCostSavings: 0,
    fixedCostSavings: 0,
    freightSavings: 0,
    laborSavings: 0,
    vendorSavings: 0,
    grossImpact: 0,
    nopat: 0,
    depreciation: 0,
    maintenanceCost: 0,
    workingCapitalImpact: inputs.working_capital_delta ?? 0,
    arImpact: 0,
    inventoryImpact: 0,
    apImpact: 0,
    operatingCashFlow: -(inputs.implementation_cost ?? 0),
    freeCashFlow: cumulativeCashFlow,
    cumulativeCashFlow,
    rampPct: 0,
  };
  periods.push(period0);

  // Calculate each operating period
  for (let p = 1; p <= numPeriods; p++) {
    const revenueRamp = (inputs.revenue_ramp_curve?.[p - 1] ?? 100) / 100;
    const costRamp = (inputs.cost_ramp_curve?.[p - 1] ?? 100) / 100;

    // Revenue calculations
    const baseRevenue = inputs.baseline_revenue ?? 0;
    const priceImpact =
      baseRevenue * ((inputs.price_change_pct ?? 0) / 100) * revenueRamp;
    const volumeImpact =
      baseRevenue * ((inputs.volume_change_pct ?? 0) / 100) * revenueRamp;
    const mixImpact =
      baseRevenue * ((inputs.mix_improvement_pct ?? 0) / 100) * revenueRamp;
    const churnImpact =
      baseRevenue * ((inputs.churn_reduction_pct ?? 0) / 100) * revenueRamp;
    const attachImpact =
      baseRevenue * ((inputs.attach_rate_improvement ?? 0) / 100) * revenueRamp;
    const newRevenue = (inputs.new_revenue_annual ?? 0) * revenueRamp;

    const totalRevenueImpact =
      priceImpact + volumeImpact + mixImpact + churnImpact + attachImpact + newRevenue;

    // Cost calculations
    const baseCogs = inputs.baseline_cogs ?? 0;
    const baseOpex = inputs.baseline_opex ?? 0;

    const variableCostSavings =
      baseCogs * ((inputs.variable_cost_reduction_pct ?? 0) / 100) * costRamp;

    const fixedCostSavings = (inputs.fixed_cost_reduction ?? 0) * costRamp;

    const freightSavings =
      (inputs.freight_baseline ?? 0) *
      ((inputs.freight_savings_pct ?? 0) / 100) *
      costRamp;

    const shrinkSavings =
      baseRevenue * ((inputs.shrink_reduction_pct ?? 0) / 100) * costRamp;

    // Labor savings (either from headcount or productivity)
    let laborSavings = 0;
    if (inputs.headcount_reduction && inputs.avg_fully_loaded_cost) {
      laborSavings =
        inputs.headcount_reduction * inputs.avg_fully_loaded_cost * costRamp;
    } else if (inputs.productivity_improvement_pct && baseOpex > 0) {
      // Estimate labor portion as 50% of opex if not specified
      const laborBase = baseOpex * 0.5;
      laborSavings =
        laborBase * ((inputs.productivity_improvement_pct ?? 0) / 100) * costRamp;
    }

    const vendorSavings = (inputs.vendor_savings_annual ?? 0) * costRamp;

    const totalCostSavings =
      variableCostSavings +
      fixedCostSavings +
      freightSavings +
      shrinkSavings +
      laborSavings +
      vendorSavings;

    // Gross impact (before tax and depreciation)
    const grossImpact = totalRevenueImpact + totalCostSavings;

    // Depreciation
    const depreciation =
      (inputs.upfront_capex ?? 0) / (inputs.depreciation_years ?? 5);

    // Maintenance cost
    const maintenanceCost = inputs.ongoing_maintenance ?? 0;

    // NOPAT = (Gross Impact - Depreciation - Maintenance) * (1 - Tax Rate)
    const nopat = (grossImpact - depreciation - maintenanceCost) * (1 - taxRate);

    // Working capital impact
    const dailyRevenue = baseRevenue / 365;
    const dailyCogs = baseCogs / 365;

    const arImpact = dailyRevenue * (inputs.dso_improvement_days ?? 0);
    const inventoryImpact = dailyCogs * (inputs.dio_improvement_days ?? 0);
    const apImpact = dailyCogs * (inputs.dpo_improvement_days ?? 0);

    // Working capital release (positive = cash inflow)
    const workingCapitalImpact =
      p === 1 ? arImpact + inventoryImpact + apImpact : 0;

    // Cash flows
    const operatingCashFlow = nopat + depreciation - maintenanceCost;
    const freeCashFlowThisPeriod =
      operatingCashFlow + (p === 1 ? workingCapitalImpact : 0);

    cumulativeCashFlow += freeCashFlowThisPeriod;

    periods.push({
      period: p,
      revenueImpact: totalRevenueImpact,
      priceImpact,
      volumeImpact,
      mixImpact,
      churnImpact,
      newRevenue,
      costSavings: totalCostSavings,
      variableCostSavings,
      fixedCostSavings,
      freightSavings,
      laborSavings,
      vendorSavings,
      grossImpact,
      nopat,
      depreciation,
      maintenanceCost,
      workingCapitalImpact,
      arImpact: p === 1 ? arImpact : 0,
      inventoryImpact: p === 1 ? inventoryImpact : 0,
      apImpact: p === 1 ? apImpact : 0,
      operatingCashFlow,
      freeCashFlow: freeCashFlowThisPeriod,
      cumulativeCashFlow,
      rampPct: Math.max(revenueRamp, costRamp) * 100,
    });
  }

  return periods;
}

/**
 * Calculate summary metrics
 */
function calculateSummary(
  inputs: CalculationInputs,
  periods: PeriodMetrics[],
  warnings: string[]
): SummaryMetrics {
  const operatingPeriods = periods.filter((p) => p.period > 0);
  const numPeriods = operatingPeriods.length;

  // TUFI calculation
  const capex = inputs.upfront_capex ?? 0;
  const oneTimeCosts = inputs.implementation_cost ?? 0;
  const workingCapitalDelta = -(operatingPeriods[0]?.workingCapitalImpact ?? 0);

  const tufi = capex + oneTimeCosts + Math.max(0, workingCapitalDelta);

  // NOPAT metrics
  const totalNopat = operatingPeriods.reduce((sum, p) => sum + p.nopat, 0);
  const avgAnnualNopat = totalNopat / numPeriods;

  // Steady-state = last period (full ramp)
  const steadyStateNopat = operatingPeriods[operatingPeriods.length - 1]?.nopat ?? 0;

  // ROIC calculation
  // ROIC = Annual NOPAT / Invested Capital
  // Using steady-state NOPAT and TUFI as invested capital
  const roic = tufi > 0 ? steadyStateNopat / tufi : 0;
  const roicPct = `${(roic * 100).toFixed(1)}%`;

  // Payback period
  let paybackPeriod: number | null = null;
  for (const period of operatingPeriods) {
    if (period.cumulativeCashFlow >= 0) {
      // Linear interpolation within the period
      const prevCash = operatingPeriods[period.period - 2]?.cumulativeCashFlow ?? periods[0].cumulativeCashFlow;
      const cashGap = -prevCash;
      const cashGenerated = period.cumulativeCashFlow - prevCash;
      const fractionOfYear = cashGenerated > 0 ? cashGap / cashGenerated : 0;
      paybackPeriod = period.period - 1 + fractionOfYear;
      break;
    }
  }

  // NPV calculation
  const costOfCapital = (inputs.cost_of_capital ?? 10) / 100;
  let npv = periods[0].freeCashFlow; // Initial investment (negative)

  for (const period of operatingPeriods) {
    npv += period.freeCashFlow / Math.pow(1 + costOfCapital, period.period);
  }

  // IRR calculation (Newton-Raphson method)
  const irr = calculateIRR(periods);
  const irrPct = irr !== null ? `${(irr * 100).toFixed(1)}%` : null;

  // Probability-adjusted metrics
  const probability = (inputs.probability_of_success ?? 100) / 100;
  const probabilityAdjustedNopat = steadyStateNopat * probability;
  const probabilityAdjustedRoic = tufi > 0 ? probabilityAdjustedNopat / tufi : 0;

  // Data quality score
  const completenessScore = calculateCompletenessScore(inputs);
  const dataQualityScore = calculateDataQualityScore(inputs, completenessScore);

  return {
    tufi,
    tufiBreakdown: {
      capex,
      oneTimeCosts,
      workingCapitalDelta,
    },
    steadyStateNopat,
    avgAnnualNopat,
    totalNopat,
    roic,
    roicPct,
    paybackPeriod,
    npv,
    irr,
    irrPct,
    probabilityAdjustedNopat,
    probabilityAdjustedRoic,
    dataQualityScore,
    completenessScore,
  };
}

/**
 * Calculate IRR using Newton-Raphson method
 */
function calculateIRR(periods: PeriodMetrics[]): number | null {
  const cashFlows = periods.map((p) => p.freeCashFlow);

  // Check if IRR is calculable
  const hasNegative = cashFlows.some((cf) => cf < 0);
  const hasPositive = cashFlows.some((cf) => cf > 0);

  if (!hasNegative || !hasPositive) {
    return null;
  }

  let rate = 0.1; // Initial guess
  const maxIterations = 100;
  const tolerance = 0.0001;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivative = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      const discountFactor = Math.pow(1 + rate, t);
      npv += cashFlows[t] / discountFactor;
      if (t > 0) {
        derivative -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npv) < tolerance) {
      return rate;
    }

    if (derivative === 0) {
      return null;
    }

    rate = rate - npv / derivative;

    // Bound the rate
    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  return rate;
}

/**
 * Calculate input completeness score
 */
function calculateCompletenessScore(inputs: CalculationInputs): number {
  const coreFields = [
    "baseline_revenue",
    "effective_tax_rate",
    "model_periods",
  ];

  const impactFields = [
    "price_change_pct",
    "volume_change_pct",
    "variable_cost_reduction_pct",
    "fixed_cost_reduction",
    "freight_savings_pct",
    "headcount_reduction",
  ];

  let filled = 0;
  let total = coreFields.length + impactFields.length;

  for (const field of coreFields) {
    if (inputs[field] !== undefined && inputs[field] !== null) {
      filled++;
    }
  }

  // At least one impact field should be filled
  let hasImpact = false;
  for (const field of impactFields) {
    if (inputs[field] !== undefined && inputs[field] !== null && inputs[field] !== 0) {
      hasImpact = true;
      filled++;
    }
  }

  if (!hasImpact) {
    total = coreFields.length + 1; // Just need one impact
  }

  return Math.round((filled / total) * 100);
}

/**
 * Calculate data quality score
 */
function calculateDataQualityScore(
  inputs: CalculationInputs,
  completenessScore: number
): number {
  let score = completenessScore;

  // Boost for confidence level
  const confidenceLevel = parseInt(inputs.confidence_level as string ?? "3", 10);
  score = score * (0.7 + confidenceLevel * 0.06);

  // Penalty for extreme probability adjustments
  const probability = inputs.probability_of_success ?? 100;
  if (probability < 50) {
    score = score * 0.8;
  }

  return Math.min(100, Math.round(score));
}

/**
 * Generate deterministic hash for reproducibility
 */
function generateHash(inputs: CalculationInputs): string {
  const sortedInputs = JSON.stringify(inputs, Object.keys(inputs).sort());
  return createHash("sha256").update(sortedInputs).digest("hex").substring(0, 16);
}

/**
 * Calculate metrics for a scenario (applies overrides to base inputs)
 */
export function calculateScenarioMetrics(
  baseInputs: CalculationInputs,
  overrides: Record<string, unknown>
): CalculationOutput {
  const mergedInputs = { ...baseInputs, ...overrides } as CalculationInputs;
  return calculateMetrics(mergedInputs);
}

/**
 * Calculate conservative scenario (applies haircut)
 */
export function calculateConservativeScenario(
  inputs: CalculationInputs
): CalculationOutput {
  const haircut = (inputs.haircut_conservative ?? 20) / 100;

  const conservativeInputs = { ...inputs };

  // Reduce revenue improvements
  if (conservativeInputs.price_change_pct) {
    conservativeInputs.price_change_pct *= 1 - haircut;
  }
  if (conservativeInputs.volume_change_pct) {
    conservativeInputs.volume_change_pct *= 1 - haircut;
  }
  if (conservativeInputs.new_revenue_annual) {
    conservativeInputs.new_revenue_annual *= 1 - haircut;
  }

  // Reduce cost savings
  if (conservativeInputs.variable_cost_reduction_pct) {
    conservativeInputs.variable_cost_reduction_pct *= 1 - haircut;
  }
  if (conservativeInputs.fixed_cost_reduction) {
    conservativeInputs.fixed_cost_reduction *= 1 - haircut;
  }
  if (conservativeInputs.freight_savings_pct) {
    conservativeInputs.freight_savings_pct *= 1 - haircut;
  }

  return calculateMetrics(conservativeInputs);
}

/**
 * Calculate aggressive/stretch scenario (applies uplift)
 */
export function calculateAggressiveScenario(
  inputs: CalculationInputs
): CalculationOutput {
  const uplift = (inputs.haircut_aggressive ?? 30) / 100;

  const aggressiveInputs = { ...inputs };

  // Increase revenue improvements
  if (aggressiveInputs.price_change_pct) {
    aggressiveInputs.price_change_pct *= 1 + uplift;
  }
  if (aggressiveInputs.volume_change_pct) {
    aggressiveInputs.volume_change_pct *= 1 + uplift;
  }
  if (aggressiveInputs.new_revenue_annual) {
    aggressiveInputs.new_revenue_annual *= 1 + uplift;
  }

  // Increase cost savings
  if (aggressiveInputs.variable_cost_reduction_pct) {
    aggressiveInputs.variable_cost_reduction_pct *= 1 + uplift;
  }
  if (aggressiveInputs.fixed_cost_reduction) {
    aggressiveInputs.fixed_cost_reduction *= 1 + uplift;
  }
  if (aggressiveInputs.freight_savings_pct) {
    aggressiveInputs.freight_savings_pct *= 1 + uplift;
  }

  return calculateMetrics(aggressiveInputs);
}
