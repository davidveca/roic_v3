import { PrismaClient, DriverDataType, OrgRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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
    helpText: "What's the total annual revenue for the business unit, product line, or customer segment this initiative affects?",
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
    helpText: "If you're raising prices by 3%, enter 3. If lowering by 2%, enter -2.",
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
    helpText: "Expected change in units sold or transactions. Growth is positive, decline is negative.",
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
    description: "Revenue lift from shifting to higher-margin products/services",
    helpText: "If shifting 10% of volume from a 30% margin product to a 40% margin product, the mix improvement might be around 1-2%.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "revenue",
    validation: { min: 0, max: 50, required: false },
    defaultValue: 0,
    sortOrder: 4,
  },
  {
    key: "churn_reduction_pct",
    name: "Churn Reduction",
    description: "Reduction in customer/revenue churn rate",
    helpText: "If current churn is 15% annually and you expect to reduce it to 12%, enter 3 (the absolute reduction).",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "revenue",
    validation: { min: 0, max: 50, required: false },
    defaultValue: 0,
    sortOrder: 5,
  },
  {
    key: "attach_rate_improvement",
    name: "Attach Rate Improvement",
    description: "Increase in cross-sell/upsell attach rate",
    helpText: "If attach rate goes from 20% to 25%, enter 5.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "revenue",
    validation: { min: 0, max: 50, required: false },
    defaultValue: 0,
    sortOrder: 6,
  },
  {
    key: "new_revenue_annual",
    name: "New Revenue (Annual)",
    description: "Incremental annual revenue from new products/markets",
    helpText: "Expected annual revenue from net-new sources not captured in existing baseline.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "revenue",
    validation: { min: 0, required: false },
    defaultValue: 0,
    sortOrder: 7,
  },
  {
    key: "revenue_ramp_curve",
    name: "Revenue Ramp Curve",
    description: "Year-by-year realization of revenue impact",
    helpText: "What percentage of the full annual benefit do you expect in each year? Year 1 might be 25%, Year 2 might be 75%, Year 3+ at 100%.",
    units: "curve",
    dataType: DriverDataType.CURVE,
    category: "revenue",
    validation: { periods: 5, min: 0, max: 100 },
    defaultValue: [25, 75, 100, 100, 100],
    sortOrder: 8,
  },

  // -------------------------------------------------------------------------
  // COST DRIVERS
  // -------------------------------------------------------------------------
  {
    key: "baseline_cogs",
    name: "Baseline COGS",
    description: "Current annual cost of goods sold for the affected scope",
    helpText: "Total direct costs (materials, labor, freight) for the products/services in scope.",
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
    helpText: "SG&A, R&D, and other operating expenses attributable to this scope.",
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
    helpText: "If you expect to reduce COGS by 5% through procurement savings, enter 5.",
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
    helpText: "Total annual savings from headcount, facilities, or other fixed costs.",
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
    helpText: "Total annual spend on shipping, warehousing, and logistics for the scope.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "cost",
    validation: { min: 0, required: false },
    sortOrder: 15,
  },
  {
    key: "shrink_reduction_pct",
    name: "Shrink/Waste Reduction",
    description: "Reduction in inventory shrink, spoilage, or waste",
    helpText: "If shrink goes from 3% to 2% of revenue, enter 1.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "cost",
    validation: { min: 0, max: 20, required: false },
    defaultValue: 0,
    sortOrder: 16,
  },
  {
    key: "productivity_improvement_pct",
    name: "Labor Productivity Improvement",
    description: "Improvement in output per labor hour/FTE",
    helpText: "If the same team can handle 10% more volume, enter 10.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "cost",
    validation: { min: 0, max: 100, required: false },
    defaultValue: 0,
    sortOrder: 17,
  },
  {
    key: "headcount_reduction",
    name: "Headcount Reduction (FTEs)",
    description: "Number of full-time equivalent positions eliminated",
    helpText: "Net FTE reduction (don't double-count with productivity if this is an absolute number).",
    units: "FTEs",
    dataType: DriverDataType.NUMBER,
    category: "cost",
    validation: { min: 0, max: 10000, required: false },
    defaultValue: 0,
    sortOrder: 18,
  },
  {
    key: "avg_fully_loaded_cost",
    name: "Average Fully-Loaded Cost per FTE",
    description: "Annual cost including salary, benefits, taxes, overhead",
    helpText: "Typical range is 1.25x to 1.5x base salary. Include benefits, payroll taxes, allocated overhead.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "cost",
    validation: { min: 0, required: false },
    defaultValue: 85000,
    sortOrder: 19,
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
    sortOrder: 20,
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
    sortOrder: 21,
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
    key: "baseline_payables",
    name: "Baseline Accounts Payable",
    description: "Current AP balance",
    helpText: "Average or period-end AP balance for the scope.",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "working_capital",
    validation: { min: 0, required: false },
    sortOrder: 32,
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
    sortOrder: 33,
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
    sortOrder: 34,
  },
  {
    key: "dpo_improvement_days",
    name: "DPO Improvement",
    description: "Increase in days payable outstanding",
    helpText: "If you extend payment terms from 30 to 45 days, enter 15.",
    units: "days",
    dataType: DriverDataType.INTEGER,
    category: "working_capital",
    validation: { min: 0, max: 60, required: false },
    defaultValue: 0,
    sortOrder: 35,
  },
  {
    key: "working_capital_delta",
    name: "Working Capital Change (Direct)",
    description: "Direct one-time working capital release/investment",
    helpText: "Positive = cash release (good), Negative = cash investment (more working capital needed).",
    units: "$",
    dataType: DriverDataType.CURRENCY,
    category: "working_capital",
    validation: { required: false },
    defaultValue: 0,
    sortOrder: 36,
  },

  // -------------------------------------------------------------------------
  // CAPEX & ONE-TIME COSTS
  // -------------------------------------------------------------------------
  {
    key: "upfront_capex",
    name: "Upfront Capital Expenditure",
    description: "One-time capital investment required",
    helpText: "Equipment, technology, facilities, or other capitalized costs.",
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
    helpText: "Consulting, training, temporary labor, change management costs.",
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
    helpText: "Standard periods: 3-5 years for technology, 7-10 for equipment, 15-30 for buildings.",
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
    helpText: "Typically 15-20% of software cost, 5-10% of equipment cost annually.",
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
    helpText: "Use your company's effective tax rate (usually 21-28% for US companies).",
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
    helpText: "Your company's hurdle rate or WACC. Typically 8-12% for established companies.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "tax",
    validation: { min: 0, max: 30, required: false },
    defaultValue: 10,
    sortOrder: 51,
  },

  // -------------------------------------------------------------------------
  // RISK & ADJUSTMENT DRIVERS
  // -------------------------------------------------------------------------
  {
    key: "probability_of_success",
    name: "Probability of Success",
    description: "Likelihood the initiative achieves projected results",
    helpText: "Be realistic: 50% = coin flip, 80% = high confidence, 95% = near-certain.",
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
    helpText: "What percentage reduction represents a conservative view? E.g., 20 means 20% lower than base case.",
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
    helpText: "What percentage increase represents an optimistic view? E.g., 30 means 30% higher than base case.",
    units: "%",
    dataType: DriverDataType.PERCENTAGE,
    category: "risk",
    validation: { min: 0, max: 100, required: false },
    defaultValue: 30,
    sortOrder: 62,
  },
  {
    key: "confidence_level",
    name: "Data Confidence Level",
    description: "How reliable are the input assumptions?",
    helpText: "1 = rough guess, 3 = informed estimate, 5 = validated data from systems/contracts.",
    units: "scale",
    dataType: DriverDataType.SELECT,
    category: "risk",
    validation: { options: ["1", "2", "3", "4", "5"], required: false },
    defaultValue: "3",
    sortOrder: 63,
  },

  // -------------------------------------------------------------------------
  // TIME/MODELING PARAMETERS
  // -------------------------------------------------------------------------
  {
    key: "model_periods",
    name: "Modeling Periods",
    description: "Number of years to model",
    helpText: "How many years should the financial model project? Typically 3-5 years.",
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
    name: "Freight Optimization",
    description: "Model savings from freight rate negotiations, mode optimization, carrier consolidation, or network redesign.",
    category: "cost",
    iconName: "Truck",
    requiredDrivers: [
      "baseline_revenue",
      "freight_baseline",
      "freight_savings_pct",
      "effective_tax_rate",
    ],
    optionalDrivers: [
      "upfront_capex",
      "implementation_cost",
      "cost_ramp_curve",
      "probability_of_success",
    ],
    defaultDrivers: {
      freight_savings_pct: 5,
      effective_tax_rate: 25,
      cost_ramp_curve: [50, 100, 100, 100, 100],
      probability_of_success: 75,
      model_periods: 5,
    },
    scenarioKnobs: ["freight_savings_pct", "freight_baseline", "probability_of_success"],
    sortOrder: 1,
  },
  {
    name: "Price/Mix Improvement",
    description: "Model revenue impact from pricing actions, product mix shifts, or value-based selling initiatives.",
    category: "revenue",
    iconName: "TrendingUp",
    requiredDrivers: [
      "baseline_revenue",
      "price_change_pct",
      "effective_tax_rate",
    ],
    optionalDrivers: [
      "volume_change_pct",
      "mix_improvement_pct",
      "revenue_ramp_curve",
      "implementation_cost",
      "probability_of_success",
    ],
    defaultDrivers: {
      price_change_pct: 2,
      volume_change_pct: 0,
      mix_improvement_pct: 0,
      effective_tax_rate: 25,
      revenue_ramp_curve: [50, 100, 100, 100, 100],
      probability_of_success: 70,
      model_periods: 5,
    },
    scenarioKnobs: ["price_change_pct", "volume_change_pct", "mix_improvement_pct"],
    sortOrder: 2,
  },
  {
    name: "Working Capital Improvement",
    description: "Model cash flow impact from DSO, DIO, or DPO improvements through process or policy changes.",
    category: "working_capital",
    iconName: "Wallet",
    requiredDrivers: [
      "baseline_revenue",
      "baseline_cogs",
      "effective_tax_rate",
    ],
    optionalDrivers: [
      "baseline_receivables",
      "baseline_inventory",
      "baseline_payables",
      "dso_improvement_days",
      "dio_improvement_days",
      "dpo_improvement_days",
      "working_capital_delta",
      "implementation_cost",
      "probability_of_success",
    ],
    defaultDrivers: {
      dso_improvement_days: 5,
      dio_improvement_days: 0,
      dpo_improvement_days: 0,
      effective_tax_rate: 25,
      probability_of_success: 80,
      model_periods: 5,
    },
    scenarioKnobs: ["dso_improvement_days", "dio_improvement_days", "dpo_improvement_days"],
    sortOrder: 3,
  },
  {
    name: "Headcount Productivity",
    description: "Model savings from headcount reductions, automation, or labor productivity improvements.",
    category: "cost",
    iconName: "Users",
    requiredDrivers: [
      "baseline_revenue",
      "effective_tax_rate",
    ],
    optionalDrivers: [
      "headcount_reduction",
      "avg_fully_loaded_cost",
      "productivity_improvement_pct",
      "baseline_opex",
      "upfront_capex",
      "implementation_cost",
      "cost_ramp_curve",
      "probability_of_success",
    ],
    defaultDrivers: {
      headcount_reduction: 0,
      avg_fully_loaded_cost: 85000,
      productivity_improvement_pct: 10,
      effective_tax_rate: 25,
      cost_ramp_curve: [50, 100, 100, 100, 100],
      probability_of_success: 70,
      model_periods: 5,
    },
    scenarioKnobs: ["headcount_reduction", "productivity_improvement_pct", "avg_fully_loaded_cost"],
    sortOrder: 4,
  },
  {
    name: "Vendor Consolidation",
    description: "Model savings from vendor rationalization, contract renegotiation, or procurement optimization.",
    category: "cost",
    iconName: "Building",
    requiredDrivers: [
      "baseline_cogs",
      "vendor_savings_annual",
      "effective_tax_rate",
    ],
    optionalDrivers: [
      "baseline_revenue",
      "variable_cost_reduction_pct",
      "implementation_cost",
      "cost_ramp_curve",
      "probability_of_success",
    ],
    defaultDrivers: {
      vendor_savings_annual: 0,
      variable_cost_reduction_pct: 3,
      effective_tax_rate: 25,
      cost_ramp_curve: [25, 75, 100, 100, 100],
      probability_of_success: 80,
      model_periods: 5,
    },
    scenarioKnobs: ["vendor_savings_annual", "variable_cost_reduction_pct"],
    sortOrder: 5,
  },
];

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log("Starting seed...");

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
    await prisma.initiativeUserRole.deleteMany();
    await prisma.initiative.deleteMany();
    await prisma.driverDefinition.deleteMany();
    await prisma.initiativeTemplate.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.organization.deleteMany();
  }

  // 1. Create system-level driver definitions
  console.log("Creating driver definitions...");
  for (const driver of driverDefinitions) {
    await prisma.driverDefinition.create({
      data: {
        ...driver,
        orgId: null, // System-level (global)
        dataType: driver.dataType,
        validation: driver.validation,
        defaultValue: driver.defaultValue,
      },
    });
  }
  console.log(`Created ${driverDefinitions.length} driver definitions`);

  // 2. Create initiative templates
  console.log("Creating initiative templates...");
  for (const template of templates) {
    await prisma.initiativeTemplate.create({
      data: {
        ...template,
        orgId: null, // System-level template
        defaultDrivers: template.defaultDrivers,
      },
    });
  }
  console.log(`Created ${templates.length} initiative templates`);

  // 3. Create a demo organization
  console.log("Creating demo organization...");
  const org = await prisma.organization.create({
    data: {
      name: "Demo Company",
      slug: "demo",
      settings: {
        tufiDefinition: "Capex + One-Time Costs + Working Capital Delta",
        defaultTaxRate: 25,
        fiscalYearStart: 1, // January
        currencyCode: "USD",
      },
    },
  });

  // 4. Create demo users
  console.log("Creating demo users...");
  const hashedPassword = await bcrypt.hash("demo1234", 10);

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@demo.com",
      name: "Demo Admin",
      passwordHash: hashedPassword,
      orgId: org.id,
      orgRole: OrgRole.ADMIN,
    },
  });

  const financeUser = await prisma.user.create({
    data: {
      email: "finance@demo.com",
      name: "Finance Reviewer",
      passwordHash: hashedPassword,
      orgId: org.id,
      orgRole: OrgRole.FINANCE,
    },
  });

  const editorUser = await prisma.user.create({
    data: {
      email: "editor@demo.com",
      name: "Initiative Owner",
      passwordHash: hashedPassword,
      orgId: org.id,
      orgRole: OrgRole.EDITOR,
    },
  });

  const contributorUser = await prisma.user.create({
    data: {
      email: "contributor@demo.com",
      name: "SME Contributor",
      passwordHash: hashedPassword,
      orgId: org.id,
      orgRole: OrgRole.CONTRIBUTOR,
    },
  });

  console.log("Created demo users:");
  console.log("  - admin@demo.com (Admin)");
  console.log("  - finance@demo.com (Finance Reviewer)");
  console.log("  - editor@demo.com (Initiative Owner)");
  console.log("  - contributor@demo.com (Contributor)");
  console.log("  Password for all: demo1234");

  // 5. Create a sample initiative
  console.log("Creating sample initiative...");
  const freightTemplate = await prisma.initiativeTemplate.findFirst({
    where: { name: "Freight Optimization" },
  });

  if (freightTemplate) {
    const initiative = await prisma.initiative.create({
      data: {
        orgId: org.id,
        title: "2025 Freight Cost Reduction Program",
        description: "Consolidate carriers and renegotiate rates to achieve 10% freight savings",
        templateId: freightTemplate.id,
        ownerId: editorUser.id,
        status: "DRAFT",
        tags: [
          { type: "bu", value: "Operations" },
          { type: "site", value: "All US" },
        ],
      },
    });

    // Create initial version
    const version = await prisma.initiativeVersion.create({
      data: {
        initiativeId: initiative.id,
        versionLabel: "v0.1",
        state: "DRAFT",
        createdById: editorUser.id,
        notes: "Initial draft with preliminary estimates",
      },
    });

    // Add some driver values
    await prisma.driverValue.createMany({
      data: [
        { versionId: version.id, driverKey: "baseline_revenue", value: 100000000, source: "MANUAL" },
        { versionId: version.id, driverKey: "freight_baseline", value: 8000000, source: "MANUAL" },
        { versionId: version.id, driverKey: "freight_savings_pct", value: 10, source: "MANUAL" },
        { versionId: version.id, driverKey: "effective_tax_rate", value: 25, source: "MANUAL" },
        { versionId: version.id, driverKey: "implementation_cost", value: 150000, source: "MANUAL" },
        { versionId: version.id, driverKey: "probability_of_success", value: 80, source: "MANUAL" },
        { versionId: version.id, driverKey: "model_periods", value: 5, source: "MANUAL" },
        { versionId: version.id, driverKey: "cost_ramp_curve", value: [50, 100, 100, 100, 100], source: "MANUAL" },
      ],
    });

    // Create baseline scenario
    await prisma.scenario.create({
      data: {
        versionId: version.id,
        name: "Base Case",
        isBaseline: true,
        overrides: {},
      },
    });

    console.log("Created sample initiative: 2025 Freight Cost Reduction Program");
  }

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
