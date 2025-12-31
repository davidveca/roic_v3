/**
 * Decision Framework Engine
 *
 * Calculates RAG indicators, recommendations, and review levels
 * based on ROIC vs hurdle rate, risk profile, and investment size.
 */

import type {
  CalculationOutput,
  DecisionMetrics,
  RAGStatus,
  DecisionRecommendation,
  ReviewLevel,
} from "./types";
import { prisma } from "@/lib/db";

// Default settings if database is not available
const DEFAULT_SETTINGS = {
  hurdleRate: 12,
  boardReviewThreshold: 2000000,
  lightTouchThreshold: 50000,
};

/**
 * Get settings from database
 */
async function getSettings() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { id: "singleton" },
    });
    return settings ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Calculate RAG status based on ROIC vs hurdle rate and probability
 */
function calculateRAGStatus(
  roic: number,
  hurdleRate: number,
  probability: number
): RAGStatus {
  // Buffer zone is 25% of hurdle rate
  const buffer = hurdleRate * 0.25;

  // GREEN: ROIC significantly above hurdle with good probability
  if (roic >= hurdleRate + buffer && probability >= 0.7) {
    return "GREEN";
  }

  // AMBER: ROIC meets hurdle (with buffer) and acceptable probability
  if (roic >= hurdleRate - buffer && probability >= 0.5) {
    return "AMBER";
  }

  // RED: Below hurdle or low probability
  return "RED";
}

/**
 * Calculate recommendation based on ROIC, risk profile, and variance
 */
function calculateRecommendation(
  roic: number,
  hurdleRate: number,
  probability: number,
  conservativeRoic: number,
  aggressiveRoic: number
): DecisionRecommendation {
  const variance = aggressiveRoic - conservativeRoic;
  const highVariance = variance > 0.2; // >20% spread indicates high risk
  const nearHurdle = Math.abs(roic - hurdleRate) < 0.03; // Within 3% of hurdle

  // If ROIC is below hurdle, it's a below hurdle recommendation
  if (roic < hurdleRate) {
    return "BELOW_HURDLE";
  }

  // High variance with low probability = high risk profile
  if (highVariance && probability < 0.7) {
    return "HIGH_RISK_PROFILE";
  }

  // Near hurdle with high variance = marginal with high exposure
  if (nearHurdle && highVariance) {
    return "MARGINAL_ROIC_HIGH_EXPOSURE";
  }

  // If we pass all checks, it's a strong candidate
  return "STRONG_CANDIDATE";
}

/**
 * Calculate review level based on investment size
 */
function calculateReviewLevel(
  investmentSize: number,
  lightTouchThreshold: number,
  boardReviewThreshold: number
): ReviewLevel {
  if (investmentSize <= lightTouchThreshold) {
    return "LIGHT_TOUCH";
  }
  if (investmentSize >= boardReviewThreshold) {
    return "BOARD_REVIEW";
  }
  return "STANDARD";
}

/**
 * Calculate risk score (0-100) based on probability and variance
 */
function calculateRiskScore(
  probability: number,
  conservativeRoic: number,
  aggressiveRoic: number
): number {
  const variance = aggressiveRoic - conservativeRoic;

  // Risk score is combination of:
  // - Probability component (lower probability = higher risk)
  // - Variance component (higher variance = higher risk)
  const probabilityRisk = (1 - probability) * 50; // 0-50 points
  const varianceRisk = Math.min(50, variance * 200); // 0-50 points

  return Math.min(100, Math.round(probabilityRisk + varianceRisk));
}

/**
 * Main function: Calculate decision metrics from scenario outputs
 */
export async function calculateDecisionMetrics(
  baseCase: CalculationOutput,
  conservative?: CalculationOutput,
  aggressive?: CalculationOutput
): Promise<DecisionMetrics> {
  const settings = await getSettings();
  const hurdleRate = settings.hurdleRate / 100; // Convert from percentage to decimal

  // Extract key metrics from base case
  const expectedRoic = baseCase.summary.roic;
  const expectedNopat = baseCase.summary.steadyStateNopat;
  const probability = (baseCase.inputs.probability_of_success ?? 100) / 100;
  const investmentSize = baseCase.summary.tufi;

  // Get conservative and aggressive ROIC (use haircuts if scenarios not provided)
  const conservativeRoic =
    conservative?.summary.roic ??
    expectedRoic * (1 - (baseCase.inputs.haircut_conservative ?? 20) / 100);

  const aggressiveRoic =
    aggressive?.summary.roic ??
    expectedRoic * (1 + (baseCase.inputs.haircut_aggressive ?? 20) / 100);

  // Get conservative and aggressive NOPAT
  const conservativeNopat =
    conservative?.summary.steadyStateNopat ??
    expectedNopat * (1 - (baseCase.inputs.haircut_conservative ?? 20) / 100);

  const aggressiveNopat =
    aggressive?.summary.steadyStateNopat ??
    expectedNopat * (1 + (baseCase.inputs.haircut_aggressive ?? 20) / 100);

  // Calculate decision framework metrics
  const ragStatus = calculateRAGStatus(expectedRoic, hurdleRate, probability);

  const recommendation = calculateRecommendation(
    expectedRoic,
    hurdleRate,
    probability,
    conservativeRoic,
    aggressiveRoic
  );

  const reviewLevel = calculateReviewLevel(
    investmentSize,
    settings.lightTouchThreshold,
    settings.boardReviewThreshold
  );

  const riskScore = calculateRiskScore(
    probability,
    conservativeRoic,
    aggressiveRoic
  );

  return {
    ragStatus,
    recommendation,
    reviewLevel,
    roicRange: {
      conservative: conservativeRoic,
      expected: expectedRoic,
      aggressive: aggressiveRoic,
    },
    absoluteReturnRange: {
      conservative: conservativeNopat,
      expected: expectedNopat,
      aggressive: aggressiveNopat,
    },
    expectedValue: expectedNopat * probability,
    riskScore,
    vsHurdleRate: expectedRoic - hurdleRate,
    investmentSize,
  };
}

/**
 * Synchronous version for when settings are already loaded
 */
export function calculateDecisionMetricsSync(
  baseCase: CalculationOutput,
  hurdleRate: number,
  lightTouchThreshold: number,
  boardReviewThreshold: number,
  conservative?: CalculationOutput,
  aggressive?: CalculationOutput
): DecisionMetrics {
  // Extract key metrics from base case
  const expectedRoic = baseCase.summary.roic;
  const expectedNopat = baseCase.summary.steadyStateNopat;
  const probability = (baseCase.inputs.probability_of_success ?? 100) / 100;
  const investmentSize = baseCase.summary.tufi;

  // Get conservative and aggressive ROIC
  const conservativeRoic =
    conservative?.summary.roic ??
    expectedRoic * (1 - (baseCase.inputs.haircut_conservative ?? 20) / 100);

  const aggressiveRoic =
    aggressive?.summary.roic ??
    expectedRoic * (1 + (baseCase.inputs.haircut_aggressive ?? 20) / 100);

  // Get conservative and aggressive NOPAT
  const conservativeNopat =
    conservative?.summary.steadyStateNopat ??
    expectedNopat * (1 - (baseCase.inputs.haircut_conservative ?? 20) / 100);

  const aggressiveNopat =
    aggressive?.summary.steadyStateNopat ??
    expectedNopat * (1 + (baseCase.inputs.haircut_aggressive ?? 20) / 100);

  // Calculate decision framework metrics
  const ragStatus = calculateRAGStatus(expectedRoic, hurdleRate, probability);

  const recommendation = calculateRecommendation(
    expectedRoic,
    hurdleRate,
    probability,
    conservativeRoic,
    aggressiveRoic
  );

  const reviewLevel = calculateReviewLevel(
    investmentSize,
    lightTouchThreshold,
    boardReviewThreshold
  );

  const riskScore = calculateRiskScore(
    probability,
    conservativeRoic,
    aggressiveRoic
  );

  return {
    ragStatus,
    recommendation,
    reviewLevel,
    roicRange: {
      conservative: conservativeRoic,
      expected: expectedRoic,
      aggressive: aggressiveRoic,
    },
    absoluteReturnRange: {
      conservative: conservativeNopat,
      expected: expectedNopat,
      aggressive: aggressiveNopat,
    },
    expectedValue: expectedNopat * probability,
    riskScore,
    vsHurdleRate: expectedRoic - hurdleRate,
    investmentSize,
  };
}

/**
 * Get formatted recommendation text with context
 */
export function getRecommendationContext(
  metrics: DecisionMetrics
): {
  title: string;
  description: string;
  actionItems: string[];
} {
  switch (metrics.recommendation) {
    case "STRONG_CANDIDATE":
      return {
        title: "Strong Candidate",
        description:
          "This initiative shows strong ROIC above the hurdle rate with acceptable risk profile.",
        actionItems: [
          "Proceed with implementation planning",
          "Validate key assumptions with stakeholders",
          "Establish success metrics and tracking",
        ],
      };

    case "BELOW_HURDLE":
      return {
        title: "Below Hurdle Rate",
        description: `Expected ROIC of ${(metrics.roicRange.expected * 100).toFixed(1)}% is below the ${((metrics.roicRange.expected - metrics.vsHurdleRate) * 100).toFixed(0)}% hurdle rate.`,
        actionItems: [
          "Identify opportunities to reduce investment cost",
          "Explore ways to increase benefit realization",
          "Consider strategic value beyond financial returns",
          "Document rationale if proceeding despite low ROIC",
        ],
      };

    case "HIGH_RISK_PROFILE":
      return {
        title: "High Risk Profile",
        description:
          "Wide variance between conservative and aggressive scenarios indicates significant uncertainty.",
        actionItems: [
          "Conduct deeper due diligence on key assumptions",
          "Consider phased rollout to reduce exposure",
          "Identify and document key risk mitigation strategies",
          "Plan for contingency scenarios",
        ],
      };

    case "MARGINAL_ROIC_HIGH_EXPOSURE":
      return {
        title: "Marginal ROIC with High Exposure",
        description:
          "ROIC is near the hurdle rate with high variance - small changes could swing results significantly.",
        actionItems: [
          "Stress test critical assumptions",
          "Consider delaying until more data is available",
          "Evaluate if investment can be restructured to reduce risk",
          "Ensure executive sponsorship before proceeding",
        ],
      };
  }
}
