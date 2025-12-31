import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BookOpen, HelpCircle } from "lucide-react";

const categoryLabels: Record<string, string> = {
  revenue: "Revenue Drivers",
  cost: "Cost Drivers",
  working_capital: "Working Capital",
  capex: "Capital Expenditure",
  tax: "Tax & Depreciation",
  risk: "Risk & Probability",
  model: "Model Parameters",
};

const categoryColors: Record<string, string> = {
  revenue: "bg-green-100 text-green-800",
  cost: "bg-red-100 text-red-800",
  working_capital: "bg-blue-100 text-blue-800",
  capex: "bg-purple-100 text-purple-800",
  tax: "bg-orange-100 text-orange-800",
  risk: "bg-yellow-100 text-yellow-800",
  model: "bg-gray-100 text-gray-800",
};

const dataTypeLabels: Record<string, string> = {
  NUMBER: "Number",
  PERCENTAGE: "Percentage",
  CURRENCY: "Currency",
  INTEGER: "Integer",
  DATE: "Date",
  SELECT: "Select",
  BOOLEAN: "Yes/No",
  CURVE: "Curve",
};

export default async function DriversPage() {
  await requireAuth();

  const drivers = await prisma.driverDefinition.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  // Group drivers by category
  const groupedDrivers = drivers.reduce((acc, driver) => {
    const category = driver.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(driver);
    return acc;
  }, {} as Record<string, typeof drivers>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Driver Library
        </h1>
        <p className="text-muted-foreground mt-1">
          Standard drivers used across all initiative templates. These "paint by numbers" inputs guide users through consistent financial modeling.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(groupedDrivers).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {drivers.filter(d => d.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <TooltipProvider>
        {Object.entries(groupedDrivers).map(([category, categoryDrivers]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge className={categoryColors[category] || "bg-gray-100"}>
                  {categoryLabels[category] || category}
                </Badge>
                <span className="text-sm font-normal text-muted-foreground">
                  ({categoryDrivers.length} drivers)
                </span>
              </CardTitle>
              <CardDescription>
                {category === "revenue" && "Inputs that affect top-line revenue impact"}
                {category === "cost" && "Cost reduction and expense-related drivers"}
                {category === "working_capital" && "Cash flow and working capital impacts"}
                {category === "capex" && "Capital investment requirements"}
                {category === "tax" && "Tax rates and depreciation assumptions"}
                {category === "risk" && "Probability and risk adjustment factors"}
                {category === "model" && "General modeling parameters and timing"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Driver</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="w-[80px]">Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryDrivers.map((driver) => (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {driver.name}
                          {driver.helpText && (
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{driver.helpText}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                        <code className="text-xs text-muted-foreground">{driver.key}</code>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {driver.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {dataTypeLabels[driver.dataType] || driver.dataType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {driver.units || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </TooltipProvider>
    </div>
  );
}
