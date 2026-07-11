"use client";

import * as React from "react";
import { toast } from "sonner";

import type { Product } from "@/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ProductFormValues {
  name: string;
  category: string;
  sku: string;
  inStock: number;
  lowStockThreshold: number;
  cost: number;
  retailPrice: number;
  vendor: string;
}

const fieldClass =
  "h-10 rounded-full border-line bg-ivory/50 px-4 text-sm focus-visible:border-gold-300";
const labelClass = "text-xs tracking-wide uppercase text-muted-warm";

function MoneyInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-muted-warm">
        $
      </span>
      <Input
        id={id}
        type="number"
        min={0}
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldClass} pl-8`}
      />
    </div>
  );
}

export function ProductFormDialog({
  open,
  onOpenChange,
  categories,
  product,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
  /** null = add mode; a product = edit mode (prefilled) */
  product: Product | null;
  onSubmit: (values: ProductFormValues) => void;
}) {
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [inStock, setInStock] = React.useState("0");
  const [threshold, setThreshold] = React.useState("4");
  const [cost, setCost] = React.useState("");
  const [retail, setRetail] = React.useState("");
  const [vendor, setVendor] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName(product?.name ?? "");
    setCategory(product?.category ?? "");
    setSku(product?.sku ?? "");
    setInStock(String(product?.inStock ?? 0));
    setThreshold(String(product?.lowStockThreshold ?? 4));
    setCost(product ? String(product.cost) : "");
    setRetail(product ? String(product.retailPrice) : "");
    setVendor(product?.vendor ?? "");
  }, [open, product]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a product name.");
      return;
    }
    onSubmit({
      name: name.trim(),
      category: category || "Uncategorized",
      sku: sku.trim() || "—",
      inStock: Math.max(0, Math.round(Number(inStock) || 0)),
      lowStockThreshold: Math.max(0, Math.round(Number(threshold) || 0)),
      cost: Math.max(0, Number(cost) || 0),
      retailPrice: Math.max(0, Number(retail) || 0),
      vendor: vendor.trim() || "—",
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl bg-white p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-medium text-ink">
            {product ? "Edit Product" : "Add Product"}
          </DialogTitle>
          <DialogDescription className="text-sm font-light text-muted-warm">
            {product
              ? "Update the details for this retail product."
              : "Add a new retail product to your inventory."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-name" className={labelClass}>
              Name *
            </Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vitamin C Brightening Serum 30ml"
              className={fieldClass}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-category" className={labelClass}>
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger
                  id="product-category"
                  className={`w-full ${fieldClass} data-[size=default]:h-10`}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-sku" className={labelClass}>
                SKU
              </Label>
              <Input
                id="product-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="S360-XXX-00"
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-stock" className={labelClass}>
                In-stock Qty
              </Label>
              <Input
                id="product-stock"
                type="number"
                min={0}
                value={inStock}
                onChange={(e) => setInStock(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-threshold" className={labelClass}>
                Low-stock Threshold
              </Label>
              <Input
                id="product-threshold"
                type="number"
                min={0}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-cost" className={labelClass}>
                Cost
              </Label>
              <MoneyInput id="product-cost" value={cost} onChange={setCost} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-retail" className={labelClass}>
                Retail Price
              </Label>
              <MoneyInput
                id="product-retail"
                value={retail}
                onChange={setRetail}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-vendor" className={labelClass}>
              Vendor
            </Label>
            <Input
              id="product-vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Image Skincare"
              className={fieldClass}
            />
          </div>

          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit">
              {product ? "Save Changes" : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
