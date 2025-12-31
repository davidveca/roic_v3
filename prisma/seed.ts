import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, DriverDataType } from "@prisma/client";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ============================================================================
// DRIVER DEFINITIONS - The "paint by numbers" library
// ============================================================================

const driverDefinitions = [
  // -------------------------------------------------------------------------
  // REVENUE DRIVERS
  // -------------------------------------------------------------------------
  {
    key: "baseline_revenue",
    name: "Baseline Annual Revenue",
    description: "Current annual revenue for the affected scope",
    helpText:
      "What's the total annual revenue for the business unit, product line, or customer segment this initiative affects?",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "revenue",
    validation: { min: 0, required: true },
    sortOrder: 1,
  },
  {
    key: "price_change_pct",
    name: "Price Change",
    description: "Percentage change in average selling price",
    helpText:
      "If you're raising prices by 3%, enter 3. If lowering by 2%, enter -2.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "revenue",
    validation: { min: -50, max: 100, required: false },
    defaultValue: 0,
    sortOrder: 2,
  },
  {
    key: "volume_change_pct",
    name: "Volume Change",
    description: "Percentage change in unit volume",
    helpText:
      "Expected change in units sold or transactions. Growth is positive, decline is negative.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "revenue",
    validation: { min: -100, max: 500, required: false },
    defaultValue: 0,
    sortOrder: 3,
  },
  {
    key: "mix_improvement_pct",
    name: "Mix Improvement",
    description:
      "Revenue lift from shifting to higher-margin products/services",
    helpText:
      "If shifting 10% of volume from a 30% margin product to a 40% margin product, the mix improvement might be around 1-2%.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "revenue",
    validation: { min: 0, max: 50, required: false },
    defaultValue: 0,
    sortOrder: 4,
  },
  {
    key: "new_revenue_annual",
    name: "New Revenue (Annual)",
    description: "Incremental annual revenue from new products/markets",
    helpText:
      "Expected annual revenue from net-new sources not captured in existing baseline.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "revenue",
    validation: { min: 0, required: false },
    defaultValue: 0,
    sortOrder: 5,
  },
  {
    key: "revenue_ramp_curve",
    name: "Revenue Ramp Curve",
    description: "Year-by-year realization of revenue impact",
    helpText:
      "What percentage of the full annual benefit do you expect in each year?",
    units: "curve",
    dataType: DriverDataType.CURVE,
    category: "revenue",
    validation: { periods: 5, min: 0, max: 100 },
    defaultValue: [25, 75, 100, 100, 100],
    sortOrder: 6,
  },

  // -------------------------------------------------------------------------
  // COST DRIVERS
  // -------------------------------------------------------------------------
  {
    key: "baseline_cogs",
    name: "Baseline COGS",
    description: "Current annual cost of goods sold for the affected scope",
    helpText:
      "Total direct costs (materials, labor, freight) for the products/services in scope.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "cost",
    validation: { min: 0, required: true },
    sortOrder: 10,
  },
  {
    key: "baseline_opex",
    name: "Baseline Operating Expenses",
    description: "Current annual operating expenses for the affected scope",
    helpText:
      "SG&A, R&D, and other operating expenses attributable to this scope.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "cost",
    validation: { min: 0, required: false },
    sortOrder: 11,
  },
  {
    key: "variable_cost_reduction_pct",
    name: "Variable Cost Reduction",
    description: "Percentage reduction in variable/direct costs",
    helpText:
      "If you expect to reduce COGS by 5% through procurement savings, enter 5.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "cost",
    validation: { min: 0, max: 50, required: false },
    defaultValue: 0,
    sortOrder: 12,
  },
  {
    key: "fixed_cost_reduction",
    name: "Fixed Cost Reduction (Annual)",
    description: "Annual reduction in fixed operating costs",
    helpText:
      "Total annual savings from headcount, facilities, or other fixed costs.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "cost",
    validation: { min: 0, required: false },
    defaultValue: 0,
    sortOrder: 13,
  },
  {
    key: "freight_savings_pct",
    name: "Freight/Logistics Savings",
    description: "Percentage reduction in freight and logistics costs",
    helpText: "If current freight is $10M and you expect to save $500K, enter 5.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "cost",
    validation: { min: 0, max: 50, required: false },
    defaultValue: 0,
    sortOrder: 14,
  },
  {
    key: "freight_baseline",
    name: "Baseline Freight Cost",
    description: "Current annual freight and logistics spend",
    helpText:
      "Total annual spend on shipping, warehousing, and logistics for the scope.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "cost",
    validation: { min: 0, required: false },
    sortOrder: 15,
  },
  {
    key: "headcount_reduction",
    name: "Headcount Reduction (FTEs)",
    description: "Number of full-time equivalent positions eliminated",
    helpText:
      "Net FTE reduction (don't double-count with productivity if this is an absolute number).",
    units: "FTEs",
    dataType: DriverDataType.NUMBER,
    category: "cost",
    validation: { min: 0, max: 10000, required: false },
    defaultValue: 0,
    sortOrder: 16,
  },
  {
    key: "avg_fully_loaded_cost",
    name: "Average Fully-Loaded Cost per FTE",
    description: "Annual cost including salary, benefits, taxes, overhead",
    helpText:
      "Typical range is 1.25x to 1.5x base salary. Include benefits, payroll taxes, allocated overhead.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "cost",
    validation: { min: 0, required: false },
    defaultValue: 85000,
    sortOrder: 17,
  },
  {
    key: "vendor_savings_annual",
    name: "Vendor/Procurement Savings (Annual)",
    description: "Annual savings from vendor consolidation or renegotiation",
    helpText: "Total expected annual savings from procurement initiatives.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "cost",
    validation: { min: 0, required: false },
    defaultValue: 0,
    sortOrder: 18,
  },
  {
    key: "gross_margin_pct",
    name: "Gross Margin",
    description: "Expected gross margin percentage for new revenue",
    helpText: "What gross margin do you expect on new product revenue? Wahl averages 35-45%.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "cost",
    validation: { min: 0, max: 100, required: false },
    defaultValue: 40,
    sortOrder: 19,
  },
  {
    key: "marketing_spend",
    name: "Marketing Investment",
    description: "Marketing and launch investment required",
    helpText: "Trade spend, advertising, promotions, and launch support costs.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "cost",
    validation: { min: 0, required: false },
    defaultValue: 0,
    sortOrder: 20,
  },
  {
    key: "cannibalization_pct",
    name: "Cannibalization Rate",
    description: "Percentage of new revenue that cannibalizes existing products",
    helpText: "If 20% of new SKU sales come from existing product customers, enter 20.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "revenue",
    validation: { min: 0, max: 100, required: false },
    defaultValue: 15,
    sortOrder: 7,
  },
  {
    key: "tooling_cost",
    name: "Tooling & Mold Investment",
    description: "One-time tooling, molds, and manufacturing setup costs",
    helpText: "Injection molds, blade dies, assembly fixtures, packaging tooling.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "capex",
    validation: { min: 0, required: false },
    defaultValue: 0,
    sortOrder: 44,
  },
  {
    key: "revenue_synergy_pct",
    name: "Revenue Synergy",
    description: "Expected revenue uplift from acquisition synergies",
    helpText: "Cross-sell, channel access, geographic expansion. Typically 5-15% of acquired revenue.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "revenue",
    validation: { min: 0, max: 50, required: false },
    defaultValue: 10,
    sortOrder: 8,
  },
  {
    key: "cost_synergy_annual",
    name: "Cost Synergy (Annual)",
    description: "Annual cost savings from acquisition integration",
    helpText: "SG&A consolidation, procurement leverage, manufacturing rationalization.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "cost",
    validation: { min: 0, required: false },
    defaultValue: 0,
    sortOrder: 21,
  },
  {
    key: "integration_cost",
    name: "Integration Cost",
    description: "One-time M&A integration expenses",
    helpText: "IT integration, severance, facility consolidation, rebranding.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "capex",
    validation: { min: 0, required: false },
    defaultValue: 0,
    sortOrder: 45,
  },
  {
    key: "acquired_revenue",
    name: "Acquired Revenue (Annual)",
    description: "Annual revenue of the target company",
    helpText: "Current annual revenue of the acquisition target.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "revenue",
    validation: { min: 0, required: true },
    sortOrder: 9,
  },
  {
    key: "sku_count_reduction",
    name: "SKU Count Reduction",
    description: "Number of SKUs to be eliminated",
    helpText: "How many SKUs will be discontinued or consolidated?",
    units: "SKUs",
    dataType: DriverDataType.INTEGER,
    category: "cost",
    validation: { min: 0, max: 10000, required: false },
    defaultValue: 0,
    sortOrder: 22,
  },
  {
    key: "complexity_savings_pct",
    name: "Complexity Savings Rate",
    description: "COGS savings per SKU eliminated",
    helpText: "Each SKU eliminated typically saves 0.5-2% of that SKU's COGS in complexity costs.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "cost",
    validation: { min: 0, max: 10, required: false },
    defaultValue: 1,
    sortOrder: 23,
  },
  {
    key: "write_off_cost",
    name: "Inventory Write-Off",
    description: "One-time inventory write-off for discontinued SKUs",
    helpText: "Value of stranded inventory that must be written off or liquidated.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "capex",
    validation: { min: 0, required: false },
    defaultValue: 0,
    sortOrder: 46,
  },
  {
    key: "revenue_lift_pct",
    name: "Revenue Lift",
    description: "Expected revenue increase from product/brand refresh",
    helpText: "Typical brand refreshes drive 5-20% revenue lift. Enter expected percentage.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "revenue",
    validation: { min: 0, max: 100, required: false },
    defaultValue: 10,
    sortOrder: 10,
  },
  {
    key: "redesign_cost",
    name: "Redesign & Development Cost",
    description: "Product redesign, packaging, and development costs",
    helpText: "Industrial design, engineering, new packaging, regulatory testing.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "capex",
    validation: { min: 0, required: false },
    defaultValue: 0,
    sortOrder: 47,
  },
  {
    key: "cost_ramp_curve",
    name: "Cost Savings Ramp Curve",
    description: "Year-by-year realization of cost savings",
    helpText: "What percentage of full annual savings do you expect each year?",
    units: "curve",
    dataType: DriverDataType.CURVE,
    category: "cost",
    validation: { periods: 5, min: 0, max: 100 },
    defaultValue: [50, 100, 100, 100, 100],
    sortOrder: 19,
  },

  // -------------------------------------------------------------------------
  // WORKING CAPITAL DRIVERS
  // -------------------------------------------------------------------------
  {
    key: "baseline_receivables",
    name: "Baseline Accounts Receivable",
    description: "Current AR balance",
    helpText: "Average or period-end AR balance for the scope.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "working_capital",
    validation: { min: 0, required: false },
    sortOrder: 30,
  },
  {
    key: "baseline_inventory",
    name: "Baseline Inventory",
    description: "Current inventory balance",
    helpText: "Average or period-end inventory for the scope.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "working_capital",
    validation: { min: 0, required: false },
    sortOrder: 31,
  },
  {
    key: "dso_improvement_days",
    name: "DSO Improvement",
    description: "Reduction in days sales outstanding",
    helpText: "If DSO goes from 45 days to 40 days, enter 5.",
    units: "days",
    dataType: DriverDataType.INTEGER,
    category: "working_capital",
    validation: { min: 0, max: 90, required: false },
    defaultValue: 0,
    sortOrder: 32,
  },
  {
    key: "dio_improvement_days",
    name: "DIO Improvement",
    description: "Reduction in days inventory outstanding",
    helpText: "If DIO goes from 60 days to 50 days, enter 10.",
    units: "days",
    dataType: DriverDataType.INTEGER,
    category: "working_capital",
    validation: { min: 0, max: 120, required: false },
    defaultValue: 0,
    sortOrder: 33,
  },

  // -------------------------------------------------------------------------
  // CAPEX & ONE-TIME COSTS
  // -------------------------------------------------------------------------
  {
    key: "upfront_capex",
    name: "Upfront Capital Expenditure",
    description: "One-time capital investment required",
    helpText:
      "Equipment, technology, facilities, or other capitalized costs.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "capex",
    validation: { min: 0, required: false },
    defaultValue: 0,
    sortOrder: 40,
  },
  {
    key: "implementation_cost",
    name: "Implementation Cost (One-Time)",
    description: "One-time implementation expenses (expensed, not capitalized)",
    helpText:
      "Consulting, training, temporary labor, change management costs.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "capex",
    validation: { min: 0, required: false },
    defaultValue: 0,
    sortOrder: 41,
  },
  {
    key: "depreciation_years",
    name: "Depreciation Period",
    description: "Years over which capex is depreciated",
    helpText:
      "Standard periods: 3-5 years for technology, 7-10 for equipment.",
    units: "years",
    dataType: DriverDataType.INTEGER,
    category: "capex",
    validation: { min: 1, max: 30, required: false },
    defaultValue: 5,
    sortOrder: 42,
  },
  {
    key: "ongoing_maintenance",
    name: "Ongoing Maintenance/Support Cost",
    description: "Annual maintenance or support cost for new assets",
    helpText:
      "Typically 15-20% of software cost, 5-10% of equipment cost annually.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "capex",
    validation: { min: 0, required: false },
    defaultValue: 0,
    sortOrder: 43,
  },

  // -------------------------------------------------------------------------
  // TAX & FINANCIAL PARAMETERS
  // -------------------------------------------------------------------------
  {
    key: "effective_tax_rate",
    name: "Effective Tax Rate",
    description: "Blended effective tax rate for NOPAT calculation",
    helpText:
      "Use your company's effective tax rate (usually 21-28% for US companies).",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "tax",
    validation: { min: 0, max: 50, required: true },
    defaultValue: 25,
    sortOrder: 50,
  },
  {
    key: "cost_of_capital",
    name: "Cost of Capital (WACC)",
    description: "Weighted average cost of capital for NPV/IRR calculations",
    helpText:
      "Your company's hurdle rate or WACC. Typically 8-12% for established companies.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "tax",
    validation: { min: 0, max: 30, required: false },
    defaultValue: 12,
    sortOrder: 51,
  },

  // -------------------------------------------------------------------------
  // RISK & ADJUSTMENT DRIVERS
  // -------------------------------------------------------------------------
  {
    key: "probability_of_success",
    name: "Probability of Success",
    description: "Likelihood the initiative achieves projected results",
    helpText:
      "Be realistic: 50% = coin flip, 80% = high confidence, 95% = near-certain.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "risk",
    validation: { min: 0, max: 100, required: false },
    defaultValue: 75,
    sortOrder: 60,
  },
  {
    key: "haircut_conservative",
    name: "Conservative Adjustment",
    description: "Haircut for conservative scenario",
    helpText:
      "What percentage reduction represents a conservative view? E.g., 20 means 20% lower than base case.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "risk",
    validation: { min: 0, max: 80, required: false },
    defaultValue: 20,
    sortOrder: 61,
  },
  {
    key: "haircut_aggressive",
    name: "Aggressive Uplift",
    description: "Uplift for aggressive/stretch scenario",
    helpText:
      "What percentage increase represents an optimistic view? E.g., 30 means 30% higher than base case.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "risk",
    validation: { min: 0, max: 100, required: false },
    defaultValue: 30,
    sortOrder: 62,
  },

  // -------------------------------------------------------------------------
  // TIME/MODELING PARAMETERS
  // -------------------------------------------------------------------------
  {
    key: "model_periods",
    name: "Modeling Periods",
    description: "Number of years to model",
    helpText:
      "How many years should the financial model project? Typically 3-5 years.",
    units: "years",
    dataType: DriverDataType.INTEGER,
    category: "model",
    validation: { min: 1, max: 10, required: true },
    defaultValue: 5,
    sortOrder: 70,
  },
  {
    key: "start_date",
    name: "Implementation Start Date",
    description: "When does the initiative begin?",
    helpText: "First month of implementation activities.",
    units: "date",
    dataType: DriverDataType.DATE,
    category: "model",
    validation: { required: false },
    sortOrder: 71,
  },
];

// ============================================================================
// INITIATIVE TEMPLATES
// ============================================================================

const templates = [
  {
    name: "New Product Family",
    description:
      "Launch an entirely new product category or family. Models revenue ramp, gross margin, tooling investment, and marketing spend.",
    category: "revenue",
    iconName: "Sparkles",
    requiredDrivers: [
      "new_revenue_annual",
      "gross_margin_pct",
      "effective_tax_rate",
    ],
    optionalDrivers: [
      "upfront_capex",
      "tooling_cost",
      "marketing_spend",
      "implementation_cost",
      "revenue_ramp_curve",
      "probability_of_success",
    ],
    defaultDrivers: {
      gross_margin_pct: 40,
      effective_tax_rate: 25,
      revenue_ramp_curve: [25, 60, 100, 100, 100],
      probability_of_success: 60,
      model_periods: 5,
    },
    scenarioKnobs: ["new_revenue_annual", "gross_margin_pct", "probability_of_success"],
    sortOrder: 1,
  },
  {
    name: "Major Line Extension",
    description:
      "Extend existing product lines with new SKUs or variants. Accounts for cannibalization of existing products.",
    category: "revenue",
    iconName: "GitBranch",
    requiredDrivers: [
      "new_revenue_annual",
      "cannibalization_pct",
      "gross_margin_pct",
      "effective_tax_rate",
    ],
    optionalDrivers: [
      "tooling_cost",
      "marketing_spend",
      "implementation_cost",
      "revenue_ramp_curve",
      "probability_of_success",
    ],
    defaultDrivers: {
      cannibalization_pct: 15,
      gross_margin_pct: 40,
      effective_tax_rate: 25,
      revenue_ramp_curve: [40, 80, 100, 100, 100],
      probability_of_success: 70,
      model_periods: 5,
    },
    scenarioKnobs: ["new_revenue_annual", "cannibalization_pct", "gross_margin_pct"],
    sortOrder: 2,
  },
  {
    name: "Product or Brand Overhaul",
    description:
      "Refresh or reposition existing products/brands. Models revenue lift from improved positioning, packaging, or features.",
    category: "revenue",
    iconName: "RefreshCw",
    requiredDrivers: [
      "baseline_revenue",
      "revenue_lift_pct",
      "effective_tax_rate",
    ],
    optionalDrivers: [
      "redesign_cost",
      "tooling_cost",
      "marketing_spend",
      "implementation_cost",
      "revenue_ramp_curve",
      "probability_of_success",
    ],
    defaultDrivers: {
      revenue_lift_pct: 10,
      effective_tax_rate: 25,
      revenue_ramp_curve: [50, 100, 100, 100, 100],
      probability_of_success: 70,
      model_periods: 5,
    },
    scenarioKnobs: ["revenue_lift_pct", "baseline_revenue", "probability_of_success"],
    sortOrder: 3,
  },
  {
    name: "Acquisition",
    description:
      "Model M&A value creation including revenue synergies (cross-sell, channels) and cost synergies (SG&A, procurement).",
    category: "revenue",
    iconName: "Building2",
    requiredDrivers: [
      "acquired_revenue",
      "revenue_synergy_pct",
      "cost_synergy_annual",
      "effective_tax_rate",
    ],
    optionalDrivers: [
      "gross_margin_pct",
      "integration_cost",
      "upfront_capex",
      "revenue_ramp_curve",
      "cost_ramp_curve",
      "probability_of_success",
    ],
    defaultDrivers: {
      revenue_synergy_pct: 10,
      cost_synergy_annual: 0,
      gross_margin_pct: 40,
      effective_tax_rate: 25,
      revenue_ramp_curve: [25, 50, 100, 100, 100],
      cost_ramp_curve: [25, 75, 100, 100, 100],
      probability_of_success: 65,
      model_periods: 5,
    },
    scenarioKnobs: ["acquired_revenue", "revenue_synergy_pct", "cost_synergy_annual"],
    sortOrder: 4,
  },
  {
    name: "SKU Rationalization",
    description:
      "Eliminate low-performing SKUs to reduce complexity and improve margins. Models COGS savings and inventory write-offs.",
    category: "cost",
    iconName: "Scissors",
    requiredDrivers: [
      "baseline_cogs",
      "sku_count_reduction",
      "complexity_savings_pct",
      "effective_tax_rate",
    ],
    optionalDrivers: [
      "baseline_revenue",
      "write_off_cost",
      "implementation_cost",
      "cost_ramp_curve",
      "probability_of_success",
    ],
    defaultDrivers: {
      complexity_savings_pct: 1,
      effective_tax_rate: 25,
      cost_ramp_curve: [50, 100, 100, 100, 100],
      probability_of_success: 80,
      model_periods: 5,
    },
    scenarioKnobs: ["sku_count_reduction", "complexity_savings_pct", "baseline_cogs"],
    sortOrder: 5,
  },
  {
    name: "Headcount Productivity",
    description:
      "Model savings from headcount reductions, automation, or labor productivity improvements.",
    category: "cost",
    iconName: "Users",
    requiredDrivers: ["baseline_revenue", "effective_tax_rate"],
    optionalDrivers: [
      "headcount_reduction",
      "avg_fully_loaded_cost",
      "baseline_opex",
      "upfront_capex",
      "implementation_cost",
      "cost_ramp_curve",
      "probability_of_success",
    ],
    defaultDrivers: {
      headcount_reduction: 0,
      avg_fully_loaded_cost: 85000,
      effective_tax_rate: 25,
      cost_ramp_curve: [50, 100, 100, 100, 100],
      probability_of_success: 70,
      model_periods: 5,
    },
    scenarioKnobs: ["headcount_reduction", "avg_fully_loaded_cost"],
    sortOrder: 6,
  },
];

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log("Starting seed for Wahl ROIC Tool...\n");

  // Clear existing data (in development only)
  if (process.env.NODE_ENV !== "production") {
    console.log("Clearing existing data...");
    await prisma.auditEvent.deleteMany();
    await prisma.calculationResult.deleteMany();
    await prisma.scenario.deleteMany();
    await prisma.inputRequestToken.deleteMany();
    await prisma.inputRequest.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.driverValue.deleteMany();
    await prisma.initiativeVersion.deleteMany();
    await prisma.initiative.deleteMany();
    await prisma.driverDefinition.deleteMany();
    await prisma.initiativeTemplate.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.settings.deleteMany();
  }

  // 1. Create Settings singleton
  console.log("Creating settings...");
  await prisma.settings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      hurdleRate: 12,
      taxRate: 25,
      currency: "USD",
      companyName: "Wahl Clipper Corporation",
      fiscalYearStart: 1,
      boardReviewThreshold: 2000000,
      lightTouchThreshold: 50000,
    },
    update: {},
  });
  console.log("Created settings singleton\n");

  // 2. Create driver definitions (global - no orgId)
  console.log("Creating driver definitions...");
  for (const driver of driverDefinitions) {
    await prisma.driverDefinition.create({
      data: {
        ...driver,
        dataType: driver.dataType,
        validation: driver.validation,
        defaultValue: driver.defaultValue,
      },
    });
  }
  console.log(`Created ${driverDefinitions.length} driver definitions\n`);

  // 3. Create initiative templates (global - no orgId)
  console.log("Creating initiative templates...");
  for (const template of templates) {
    await prisma.initiativeTemplate.create({
      data: {
        ...template,
        defaultDrivers: template.defaultDrivers,
      },
    });
  }
  console.log(`Created ${templates.length} initiative templates\n`);

  console.log("=".repeat(50));
  console.log("Seed completed successfully!");
  console.log("=".repeat(50));
  console.log("\nNote: Magic link authentication is enabled.");
  console.log("Allowed domains: wahlclipper.com, tedinitiatives.com, wayfinderco.com, capstonepartners.com");
  console.log("\nTo sign in:");
  console.log("1. Go to /login");
  console.log("2. Enter your company email address");
  console.log("3. Click the magic link sent to your email");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
