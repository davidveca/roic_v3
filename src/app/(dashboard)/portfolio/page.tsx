import { requireAuth } from "@/lib/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Construction } from "lucide-react";

export default async function PortfolioPage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Portfolio View
        </h1>
        <p className="text-muted-foreground mt-1">
          Aggregate view of all initiatives with filtering and rollups.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-yellow-600" />
            Coming Soon
          </CardTitle>
          <CardDescription>
            Portfolio rollups and analytics are being built.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This page will include:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Portfolio-level ROIC, NPV, and payback summaries</li>
            <li>Filter by owner, site, function, or scenario</li>
            <li>Compare initiatives side-by-side</li>
            <li>Export portfolio reports</li>
            <li>Realization tracking (actuals vs modeled)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
