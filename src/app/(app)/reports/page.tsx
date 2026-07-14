"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Clock,
  Crown,
  DollarSign,
  Landmark,
  Package,
  Percent,
  Receipt,
  ReceiptText,
  ShoppingBag,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useData } from "@/data";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const reportLinks: {
  slug: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    slug: "sales",
    title: "Sales",
    description: "Breakdown of gross and net transaction history",
    icon: DollarSign,
  },
  {
    slug: "appointments",
    title: "Appointments",
    description: "Appointment history",
    icon: CalendarDays,
  },
  {
    slug: "retail-sales",
    title: "Retail Sales",
    description: "Retail sales history",
    icon: ShoppingBag,
  },
  {
    slug: "sales-tax",
    title: "Sales Tax",
    description: "Sales tax history",
    icon: Landmark,
  },
  {
    slug: "inventory",
    title: "Inventory",
    description: "Inventory sales",
    icon: Package,
  },
  {
    slug: "transaction-detail",
    title: "Transaction Detail",
    description: "All line items for each transaction",
    icon: ReceiptText,
  },
  {
    slug: "most-valuable-clients",
    title: "Most Valuable Clients",
    description: "Top 10 clients",
    icon: Crown,
  },
  {
    slug: "expenses",
    title: "Expenses",
    description: "Breakdown of business expenses",
    icon: Receipt,
  },
  {
    slug: "commission-earnings",
    title: "Commission Earnings",
    description: "Earnings to support commission calculations",
    icon: Percent,
  },
  {
    slug: "timesheets",
    title: "Timesheets",
    description: "All employee timesheets",
    icon: Clock,
  },
];

const customMetrics = [
  "Revenue",
  "Appointments",
  "Retail",
  "Tips",
  "Tax",
  "Expenses",
] as const;

type CustomMetric = (typeof customMetrics)[number];

export default function ReportsPage() {
  const { locations } = useData();
  const [builderOpen, setBuilderOpen] = React.useState(false);
  const [metrics, setMetrics] = React.useState<Record<CustomMetric, boolean>>({
    Revenue: true,
    Appointments: true,
    Retail: false,
    Tips: false,
    Tax: false,
    Expenses: false,
  });
  const [range, setRange] = React.useState("last-30");
  const [location, setLocation] = React.useState("all");

  const handleGenerate = () => {
    toast.success(
      "Custom report queued — this will be available in the full release"
    );
    setBuilderOpen(false);
  };

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Choose a report to explore your business"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {reportLinks.map((report) => (
          <Link key={report.slug} href={`/reports/${report.slug}`} className="group">
            <Card className="h-full border-line bg-white shadow-xs transition-colors hover:border-gold-300">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold-50">
                  <report.icon
                    className="size-5 text-gold-600"
                    strokeWidth={1.75}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-lg font-medium text-ink">
                    {report.title}
                  </h3>
                  <p className="truncate text-sm font-light text-muted-warm">
                    {report.description}
                  </p>
                </div>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-warm transition-all group-hover:translate-x-0.5 group-hover:text-gold-600"
                  strokeWidth={1.75}
                />
              </CardContent>
            </Card>
          </Link>
        ))}

        <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
          <DialogTrigger asChild>
            <button type="button" className="group text-left">
              <Card className="h-full border-line bg-white shadow-xs transition-colors hover:border-gold-300">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gold-50">
                    <SlidersHorizontal
                      className="size-5 text-gold-600"
                      strokeWidth={1.75}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading text-lg font-medium text-ink">
                      Custom Report
                    </h3>
                    <p className="truncate text-sm font-light text-muted-warm">
                      Build your own report from any metrics
                    </p>
                  </div>
                  <ChevronRight
                    className="size-4 shrink-0 text-muted-warm transition-all group-hover:translate-x-0.5 group-hover:text-gold-600"
                    strokeWidth={1.75}
                  />
                </CardContent>
              </Card>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl font-medium">
                Custom Report
              </DialogTitle>
              <DialogDescription className="font-light">
                Pick the metrics, period and location you would like to see in
                one report.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              <div>
                <p className="mb-3 text-xs font-normal tracking-[0.14em] text-muted-warm uppercase">
                  Metrics
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {customMetrics.map((metric) => (
                    <Label
                      key={metric}
                      className="flex items-center gap-2.5 text-sm font-light text-ink-soft"
                    >
                      <Checkbox
                        checked={metrics[metric]}
                        onCheckedChange={(checked) =>
                          setMetrics((prev) => ({
                            ...prev,
                            [metric]: checked === true,
                          }))
                        }
                      />
                      {metric}
                    </Label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal tracking-[0.14em] text-muted-warm uppercase">
                    Date range
                  </Label>
                  <Select value={range} onValueChange={setRange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this-week">This week</SelectItem>
                      <SelectItem value="this-month">This month</SelectItem>
                      <SelectItem value="last-30">Last 30 days</SelectItem>
                      <SelectItem value="last-90">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-normal tracking-[0.14em] text-muted-warm uppercase">
                    Location
                  </Label>
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All locations</SelectItem>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={handleGenerate}>Generate Report</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
