"use server";

import { prisma } from "@/lib/db";
import { requireAuth, getAccessibleInitiativesFilter } from "@/lib/auth-utils";

interface PortfolioMetrics {
  totalInitiatives: number;
  byStatus: Record<string, number>;
  totalNopat: number;
  totalTufi: number;
  averageRoic: number;
  averagePayback: number;
  initiatives: Array<{
    id: string;
    title: string;
    status: string;
    owner: { name: string | null; email: string };
    latestVersion: {
      versionLabel: string;
      state: string;
    } | null;
    metrics: {
      nopat: number;
      tufi: number;
      roic: number;
      npv: number;
      paybackYears: number;
    } | null;
  }>;
}

export async function getPortfolioMetrics(): Promise<PortfolioMetrics> {
  await requireAuth();

  // Get filter for accessible initiatives
  const accessFilter = await getAccessibleInitiativesFilter();

  // Get all accessible initiatives with their latest version and results
  const initiatives = await prisma.initiative.findMany({
    where: accessFilter,
    include: {
      owner: { select: { name: true, email: true } },
      versions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          scenarios: {
            where: { isBaseline: true },
            include: {
              results: {
                where: { period: 0 }, // Summary period
              },
            },
          },
        },
      },
    },
  });

  // Calculate status counts
  const byStatus: Record<string, number> = {};
  initiatives.forEach((i) => {
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  });

  // Process each initiative to extract metrics
  const processedInitiatives = initiatives.map((i) => {
    const latestVersion = i.versions[0];
    const baselineScenario = latestVersion?.scenarios.find((s) => s.isBaseline);
    const summaryResult = baselineScenario?.results[0];
    const metrics = summaryResult?.metrics as {
      steadyStateNopat?: number;
      totalInvestment?: number;
      roic?: number;
      npv?: number;
      paybackYears?: number;
    } | null;

    return {
      id: i.id,
      title: i.title,
      status: i.status,
      owner: i.owner,
      latestVersion: latestVersion
        ? {
            versionLabel: latestVersion.versionLabel,
            state: latestVersion.state,
          }
        : null,
      metrics: metrics
        ? {
            nopat: metrics.steadyStateNopat || 0,
            tufi: metrics.totalInvestment || 0,
            roic: metrics.roic || 0,
            npv: metrics.npv || 0,
            paybackYears: metrics.paybackYears || 0,
          }
        : null,
    };
  });

  // Calculate totals
  const initiativesWithMetrics = processedInitiatives.filter((i) => i.metrics);
  const totalNopat = initiativesWithMetrics.reduce((sum, i) => sum + (i.metrics?.nopat || 0), 0);
  const totalTufi = initiativesWithMetrics.reduce((sum, i) => sum + (i.metrics?.tufi || 0), 0);
  const averageRoic =
    initiativesWithMetrics.length > 0
      ? initiativesWithMetrics.reduce((sum, i) => sum + (i.metrics?.roic || 0), 0) /
        initiativesWithMetrics.length
      : 0;
  const averagePayback =
    initiativesWithMetrics.length > 0
      ? initiativesWithMetrics.reduce((sum, i) => sum + (i.metrics?.paybackYears || 0), 0) /
        initiativesWithMetrics.length
      : 0;

  return {
    totalInitiatives: initiatives.length,
    byStatus,
    totalNopat,
    totalTufi,
    averageRoic,
    averagePayback,
    initiatives: processedInitiatives,
  };
}
