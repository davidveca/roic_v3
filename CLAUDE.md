# ROIC V3 SaaS - Claude Code Context

## Project Overview

Multi-user, audit-ready initiative modeling workspace for estimating NOPAT, TUFI, and ROIC by initiative, portfolio, owner, site, function, and scenario. Built for operators to "paint by numbers" - guided inputs with validation, tooltips, and examples.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: Neon PostgreSQL with Prisma 7
- **Auth**: NextAuth.js v5 (credentials + future SSO)
- **UI**: shadcn/ui + Tailwind CSS 4
- **Email**: Resend (for input requests)
- **Hosting**: Vercel

## Key Architecture Decisions

### Multi-Tenant Data Model
- `Organization` is the tenant boundary
- Users belong to one org with role (ADMIN/FINANCE/EDITOR/CONTRIBUTOR/VIEWER)
- Initiative-level role overrides possible

### Versioning Strategy
- Initiatives have multiple versions (v0.1, v1.0, etc.)
- Versions go through states: DRAFT → IN_REVIEW → APPROVED → SUPERSEDED
- Only DRAFT versions can be edited
- Approved versions are locked with timestamp and approver

### Driver Library
- System-level drivers (orgId=null) shared across all orgs
- Org-specific driver overrides possible
- Categories: revenue, cost, working_capital, capex, tax, risk, model
- Data types: NUMBER, PERCENTAGE, CURRENCY, INTEGER, DATE, SELECT, BOOLEAN, CURVE

### Calculation Engine
Located in `src/lib/calculations/`:
- `engine.ts` - Main orchestrator computing NOPAT, TUFI, ROIC, payback, IRR, NPV
- `types.ts` - TypeScript interfaces for inputs/outputs
- Supports ramp curves for phased benefit realization
- Generates compute hash for reproducibility

### Templates
6 pre-built templates for Wahl's CPG transformation:
1. New Product Family - Launch entirely new product categories
2. Major Line Extension - Extend existing lines with new SKUs
3. Product or Brand Overhaul - Refresh/reposition existing products
4. Acquisition - M&A with revenue and cost synergies
5. SKU Rationalization - Eliminate low-performing SKUs
6. Headcount Productivity - Labor efficiency improvements

## Directory Structure

```
src/
├── app/
│   ├── (auth)/           # Login, register (public)
│   ├── (dashboard)/      # Protected dashboard routes
│   │   ├── initiatives/  # List, create, detail views
│   │   ├── portfolio/    # Portfolio rollups (TODO)
│   │   └── settings/     # Org settings (TODO)
│   ├── api/auth/         # NextAuth API routes
│   ├── actions/          # Server actions (initiatives, versions, calculations)
│   └── input/            # Public input request pages (TODO)
├── components/
│   ├── initiatives/      # Driver forms, results display
│   ├── layout/           # Sidebar navigation
│   └── ui/               # shadcn/ui components
└── lib/
    ├── auth.ts           # NextAuth configuration
    ├── auth-utils.ts     # Helper functions (getCurrentUser, requireAuth, etc.)
    ├── db.ts             # Prisma client singleton
    ├── calculations/     # ROIC calculation engine
    └── validations/      # Zod schemas
```

## Database Schema Highlights

Key tables (see `prisma/schema.prisma`):
- `Organization`, `User` (multi-tenant core)
- `Initiative`, `InitiativeVersion` (versioning)
- `DriverDefinition`, `DriverValue` (driver library)
- `Scenario`, `CalculationResult` (modeling)
- `InputRequest`, `InputRequestToken` (secure input collection)
- `Comment`, `AuditEvent` (collaboration & audit)

## Environment Variables

```env
DATABASE_URL=           # Neon pooled connection
NEXTAUTH_URL=           # App URL (https://...)
NEXTAUTH_SECRET=        # Generate: openssl rand -base64 32
RESEND_API_KEY=         # For email (optional for MVP)
```

## Common Tasks

### Add a new driver
1. Add to `prisma/seed.ts` driverDefinitions array
2. Run `npm run db:seed` (or add via admin UI when built)

### Add a new template
1. Add to `prisma/seed.ts` templates array
2. Include requiredDrivers, optionalDrivers, defaultDrivers, scenarioKnobs

### Modify calculation logic
1. Edit `src/lib/calculations/engine.ts`
2. Update types in `src/lib/calculations/types.ts` if needed

### Add new API endpoint
1. Create server action in `src/app/actions/`
2. Add Zod schema in `src/lib/validations/`
3. Use `requireAuth()` or `requireOrgRole()` for protection

## Testing Locally

```bash
# Set up database
npm run db:push          # Push schema to Neon
npm run db:seed          # Seed templates, drivers, demo users

# Development
npm run dev              # Start dev server

# Demo login
# Email: admin@demo.com
# Password: demo1234
```

## Known Issues / Tech Debt

1. Some TypeScript type casting with `as never` for Prisma JSON fields
2. NextAuth adapter types need cleanup
3. Middleware deprecation warning (Next.js 16 wants "proxy" instead)

## Future Phases (from spec)

### V1 - Enterprise Hardening
- SSO (OIDC/SAML) via NextAuth providers
- Audit log viewer UI
- Approval workflow with required reviewers
- Portfolio rollups with filtering
- Snowflake baseline prefills
- Realization tracking (actuals vs modeled)

### Non-Goals (per spec)
- Full three-statement forecasting
- Consolidation close system
- Replacing Snowflake/BI
