"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAuth, createAuditEvent } from "@/lib/auth-utils";
import {
  calculateMetrics,
  calculateScenarioMetrics,
  calculateConservativeScenario,
  calculateAggressiveScenario,
} from "@/lib/calculations/engine";
import type { CalculationInputs, CalculationOutput } from "@/lib/calculations/types";

/**
 * Compute and store results for a scenario
 */
export async function computeScenario(scenarioId: string): Promise<CalculationOutput> {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  // Get scenario with version and driver values
  const scenario = await prisma.scenario.findFirst({
    where: {
      id: scenarioId,
      version: {
        initiative: { orgId: user.orgId },
      },
    },
    include: {
      version: {
        include: {
          initiative: true,
          driverValues: true,
        },
      },
    },
  });

  if (!scenario) {
    throw new Error("Scenario not found");
  }

  // Convert driver values to calculation inputs
  const baseInputs: CalculationInputs = {};
  for (const dv of scenario.version.driverValues) {
    baseInputs[dv.driverKey] = dv.value as number | string | boolean | number[];
  }

  // Apply scenario overrides
  const overrides = (scenario.overrides as Record<string, unknown>) ?? {};

  // Calculate metrics
  const output = calculateScenarioMetrics(baseInputs, overrides);

  // Store results - delete existing and insert new
  await prisma.$transaction(async (tx) => {
    // Delete existing results
    await tx.calculationResult.deleteMany({
      where: { scenarioId },
    });

    // Insert new results
    const resultsToCreate = output.periods.map((period) => ({
      scenarioId,
      period: period.period,
      metrics: period as unknown as Record<string, unknown>,
      computeHash: output.computeHash,
    }));

    // Add summary as period 0 (already included in periods)
    await tx.calculationResult.createMany({
      data: resultsToCreate,
    });
  });

  await createAuditEvent({
    action: "SCENARIO_COMPUTED",
    resourceType: "Scenario",
    resourceId: scenarioId,
    metadata: {
      computeHash: output.computeHash,
      nopat: output.summary.steadyStateNopat,
      roic: output.summary.roicPct,
    },
  });

  revalidatePath(`/initiatives/${scenario.version.initiativeId}`);

  return output;
}

/**
 * Compute all scenarios for a version
 */
export async function computeAllScenarios(versionId: string): Promise<{
  results: Record<string, CalculationOutput>;
  summary: {
    baseCase: CalculationOutput | null;
    conservative: CalculationOutput | null;
    aggressive: CalculationOutput | null;
  };
}> {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const version = await prisma.initiativeVersion.findFirst({
    where: {
      id: versionId,
      initiative: { orgId: user.orgId },
    },
    include: {
      initiative: true,
      driverValues: true,
      scenarios: true,
    },
  });

  if (!version) {
    throw new Error("Version not found");
  }

  // Convert driver values to calculation inputs
  const baseInputs: CalculationInputs = {};
  for (const dv of version.driverValues) {
    baseInputs[dv.driverKey] = dv.value as number | string | boolean | number[];
  }

  const results: Record<string, CalculationOutput> = {};
  let baseCaseOutput: CalculationOutput | null = null;

  // Compute each scenario
  for (const scenario of version.scenarios) {
    const overrides = (scenario.overrides as Record<string, unknown>) ?? {};
    const output = calculateScenarioMetrics(baseInputs, overrides);
    results[scenario.id] = output;

    if (scenario.isBaseline) {
      baseCaseOutput = output;
    }

    // Store results
    await prisma.$transaction(async (tx) => {
      await tx.calculationResult.deleteMany({
        where: { scenarioId: scenario.id },
      });

      await tx.calculationResult.createMany({
        data: output.periods.map((period) => ({
          scenarioId: scenario.id,
          period: period.period,
          metrics: period as unknown as Record<string, unknown>,
          computeHash: output.computeHash,
        })),
      });
    });
  }

  // Calculate conservative and aggressive scenarios from base inputs
  const conservative = calculateConservativeScenario(baseInputs);
  const aggressive = calculateAggressiveScenario(baseInputs);

  await createAuditEvent({
    action: "VERSION_COMPUTED",
    resourceType: "InitiativeVersion",
    resourceId: versionId,
    metadata: {
      scenariosComputed: version.scenarios.length,
    },
  });

  revalidatePath(`/initiatives/${version.initiativeId}`);

  return {
    results,
    summary: {
      baseCase: baseCaseOutput,
      conservative,
      aggressive,
    },
  };
}

/**
 * Get stored calculation results for a scenario
 */
export async function getScenarioResults(scenarioId: string) {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const results = await prisma.calculationResult.findMany({
    where: {
      scenarioId,
      scenario: {
        version: {
          initiative: { orgId: user.orgId },
        },
      },
    },
    orderBy: { period: "asc" },
  });

  return results;
}

/**
 * Preview calculation without storing (for real-time updates)
 */
export async function previewCalculation(
  versionId: string,
  overrides: Record<string, unknown> = {}
): Promise<CalculationOutput> {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const version = await prisma.initiativeVersion.findFirst({
    where: {
      id: versionId,
      initiative: { orgId: user.orgId },
    },
    include: {
      driverValues: true,
    },
  });

  if (!version) {
    throw new Error("Version not found");
  }

  // Convert driver values to calculation inputs
  const baseInputs: CalculationInputs = {};
  for (const dv of version.driverValues) {
    baseInputs[dv.driverKey] = dv.value as number | string | boolean | number[];
  }

  // Apply overrides and calculate
  return calculateScenarioMetrics(baseInputs, overrides);
}

/**
 * Calculate sensitivity analysis for a driver
 */
export async function calculateSensitivity(
  versionId: string,
  driverKey: string,
  range: { min: number; max: number; steps: number }
): Promise<{
  driverKey: string;
  values: number[];
  nopatImpact: number[];
  roicImpact: number[];
}> {
  const user = await requireAuth();

  if (!user.orgId) {
    throw new Error("User is not associated with an organization");
  }

  const version = await prisma.initiativeVersion.findFirst({
    where: {
      id: versionId,
      initiative: { orgId: user.orgId },
    },
    include: {
      driverValues: true,
    },
  });

  if (!version) {
    throw new Error("Version not found");
  }

  // Convert driver values to calculation inputs
  const baseInputs: CalculationInputs = {};
  for (const dv of version.driverValues) {
    baseInputs[dv.driverKey] = dv.value as number | string | boolean | number[];
  }

  const { min, max, steps } = range;
  const stepSize = (max - min) / (steps - 1);

  const values: number[] = [];
  const nopatImpact: number[] = [];
  const roicImpact: number[] = [];

  for (let i = 0; i < steps; i++) {
    const value = min + i * stepSize;
    values.push(value);

    const output = calculateScenarioMetrics(baseInputs, { [driverKey]: value });
    nopatImpact.push(output.summary.steadyStateNopat);
    roicImpact.push(output.summary.roic);
  }

  return {
    driverKey,
    values,
    nopatImpact,
    roicImpact,
  };
}
