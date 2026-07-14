"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  DollarSign,
  Package,
  Pencil,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { formatCurrency, useData, type Product } from "@/data";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ProductFormDialog,
  type ProductFormValues,
} from "./_components/product-form-dialog";

export default function InventoryPage() {
  return (
    <React.Suspense fallback={null}>
      <InventoryInner />
    </React.Suspense>
  );
}

function InventoryInner() {
  const searchParams = useSearchParams();
  const { products, createProduct, updateProduct } = useData();

  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [lowOnly, setLowOnly] = React.useState(
    searchParams.get("filter") === "low"
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);

  const categories = React.useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).sort(),
    [products]
  );

  const lowStockCount = products.filter(
    (p) => p.inStock <= p.lowStockThreshold
  ).length;
  const retailValue = products.reduce(
    (sum, p) => sum + p.inStock * p.retailPrice,
    0
  );

  const filtered = products.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.vendor.toLowerCase().includes(q);
    const matchesCategory = category === "all" || p.category === category;
    const matchesLow = !lowOnly || p.inStock <= p.lowStockThreshold;
    return matchesQuery && matchesCategory && matchesLow;
  });

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setDialogOpen(true);
  }

  async function handleSubmit(values: ProductFormValues) {
    if (editing) {
      await updateProduct(editing.id, values);
      toast.success(`Saved changes to “${values.name}”.`);
    } else {
      await createProduct(values);
      toast.success(`“${values.name}” added to inventory.`);
    }
  }

  const isLow = (p: Product) => p.inStock <= p.lowStockThreshold;

  const emptyMessage =
    products.length === 0
      ? "No products yet — add your first retail product to start tracking stock."
      : "No products match your filters.";

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={`${products.length} products · ${lowStockCount} low stock`}
        actions={
          <Button onClick={openAdd}>
            <Plus data-icon="inline-start" strokeWidth={1.75} />
            Add Product
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Products"
          value={products.length}
          icon={Package}
          hint={`${categories.length} categories`}
        />
        <StatCard
          label="Retail Value"
          value={formatCurrency(retailValue)}
          icon={DollarSign}
          hint="On-hand stock at retail"
          hintTone="positive"
        />
        <StatCard
          label="Low Stock"
          value={lowStockCount}
          icon={AlertTriangle}
          hint={lowStockCount ? "At or below threshold" : "All stocked"}
          hintTone={lowStockCount ? "negative" : "positive"}
        />
      </div>

      {/* Toolbar */}
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 md:max-w-sm">
          <Search
            className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-warm"
            strokeWidth={1.75}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, SKU, or vendor…"
            className="h-10 rounded-full border-line bg-white pl-11 text-sm focus-visible:border-gold-300"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="h-10 w-full rounded-full border-line bg-white px-4 text-sm data-[size=default]:h-10 md:w-48">
            <SelectValue placeholder="Category">
              {category === "all" ? "All categories" : category}
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2.5 md:ml-auto">
          <Switch
            id="low-stock-only"
            checked={lowOnly}
            onCheckedChange={setLowOnly}
          />
          <Label
            htmlFor="low-stock-only"
            className="text-xs tracking-wide uppercase text-muted-warm"
          >
            Low stock only
          </Label>
        </div>
      </div>

      {/* Desktop table */}
      <Card className="mt-4 hidden border-line bg-white shadow-xs md:block">
        <CardContent className="px-2">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-line hover:bg-transparent">
                  <TableHead className="px-4 text-xs font-normal tracking-wide text-muted-warm uppercase">
                    Product
                  </TableHead>
                  <TableHead className="px-4 text-xs font-normal tracking-wide text-muted-warm uppercase">
                    SKU
                  </TableHead>
                  <TableHead className="px-4 text-xs font-normal tracking-wide text-muted-warm uppercase">
                    In Stock
                  </TableHead>
                  <TableHead className="px-4 text-xs font-normal tracking-wide text-muted-warm uppercase">
                    Cost
                  </TableHead>
                  <TableHead className="px-4 text-xs font-normal tracking-wide text-muted-warm uppercase">
                    Retail
                  </TableHead>
                  <TableHead className="px-4 text-xs font-normal tracking-wide text-muted-warm uppercase">
                    Vendor
                  </TableHead>
                  <TableHead className="px-4">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow className="border-line hover:bg-transparent">
                    <TableCell
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm font-light text-muted-warm"
                    >
                      {emptyMessage}
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((p) => (
                  <TableRow
                    key={p.id}
                    className="border-line hover:bg-cream/50"
                  >
                    <TableCell className="px-4 py-3">
                      <p className="text-sm text-ink">{p.name}</p>
                      <p className="text-xs font-light text-muted-warm">
                        {p.category}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 font-mono text-xs text-ink-soft">
                      {p.sku}
                    </TableCell>
                    <TableCell className="px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-ink">{p.inStock}</span>
                        {isLow(p) && <StatusBadge status="low-stock" />}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 text-sm text-ink-soft">
                      {formatCurrency(p.cost)}
                    </TableCell>
                    <TableCell className="px-4 text-sm text-ink">
                      {formatCurrency(p.retailPrice)}
                    </TableCell>
                    <TableCell className="px-4 text-sm font-light text-muted-warm">
                      {p.vendor}
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil strokeWidth={1.75} />
                        <span className="sr-only">Edit {p.name}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile stacked cards */}
      <div className="mt-4 space-y-3 md:hidden">
        {filtered.length === 0 && (
          <Card className="border-line bg-white shadow-xs">
            <CardContent className="py-10 text-center text-sm font-light text-muted-warm">
              {emptyMessage}
            </CardContent>
          </Card>
        )}
        {filtered.map((p) => (
          <Card key={p.id} className="border-line bg-white shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-ink">{p.name}</p>
                  <p className="text-xs font-light text-muted-warm">
                    {p.category} · <span className="font-mono">{p.sku}</span>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openEdit(p)}
                >
                  <Pencil strokeWidth={1.75} />
                  <span className="sr-only">Edit {p.name}</span>
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="flex items-center gap-2 text-ink">
                  {p.inStock} in stock
                  {isLow(p) && <StatusBadge status="low-stock" />}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line/70 pt-3 text-xs">
                <div>
                  <p className="font-light text-muted-warm">Cost</p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {formatCurrency(p.cost)}
                  </p>
                </div>
                <div>
                  <p className="font-light text-muted-warm">Retail</p>
                  <p className="mt-0.5 text-sm text-ink">
                    {formatCurrency(p.retailPrice)}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-light text-muted-warm">Vendor</p>
                  <p className="mt-0.5 truncate text-sm text-ink-soft">
                    {p.vendor}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories}
        product={editing}
        onSubmit={handleSubmit}
      />
    </>
  );
}
