"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";

import type { Expense, ExpenseCategory } from "@/data";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { addExpense, EXPENSE_CATEGORIES } from "../_store";

export default function NewExpensePage() {
  const router = useRouter();
  const fileRef = React.useRef<HTMLInputElement>(null);

  const [category, setCategory] = React.useState<ExpenseCategory | "">("");
  const [date, setDate] = React.useState(format(new Date(), "yyyy-MM-dd"));
  const [amount, setAmount] = React.useState("");
  const [vendor, setVendor] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [recurring, setRecurring] = React.useState(false);

  const parsedAmount = Number.parseFloat(amount);
  const valid =
    category !== "" && date !== "" && !Number.isNaN(parsedAmount) && parsedAmount > 0;

  function clearFile() {
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const expense: Expense = {
      id: `exp-local-${Date.now()}`,
      category,
      dateISO: date,
      amount: Math.round(parsedAmount * 100) / 100,
      vendor: vendor.trim() || undefined,
      description: description.trim() || undefined,
      recurring,
      locationId: "both",
      receiptName: fileName ?? undefined,
    };
    addExpense(expense);
    toast.success("Expense saved");
    router.push("/expenses/all");
  }

  return (
    <>
      <Link
        href="/expenses"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-light text-muted-warm transition-colors hover:text-gold-700"
      >
        <ArrowLeft className="size-4" strokeWidth={1.75} />
        Expenses
      </Link>

      <PageHeader
        title="Add New Expense"
        subtitle="Log a purchase, bill, or recurring cost"
      />

      <Card className="mx-auto max-w-2xl border-line bg-white shadow-xs">
        <CardHeader>
          <CardTitle className="font-heading text-xl font-medium">
            Expense Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="category"
                  className="text-xs tracking-wide uppercase text-muted-warm"
                >
                  Category *
                </Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as ExpenseCategory)}
                >
                  <SelectTrigger
                    id="category"
                    className="h-10! w-full rounded-full border-line bg-ivory/50 px-4 text-sm focus-visible:border-gold-300"
                  >
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="date"
                  className="text-xs tracking-wide uppercase text-muted-warm"
                >
                  Date of Expense *
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 rounded-full border-line bg-ivory/50 px-4 focus-visible:border-gold-300"
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="amount"
                  className="text-xs tracking-wide uppercase text-muted-warm"
                >
                  Amount *
                </Label>
                <div className="relative">
                  <span className="absolute top-1/2 left-4 -translate-y-1/2 text-sm text-muted-warm">
                    $
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    className="h-10 rounded-full border-line bg-ivory/50 pl-8 focus-visible:border-gold-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="vendor"
                  className="text-xs tracking-wide uppercase text-muted-warm"
                >
                  Vendor
                </Label>
                <Input
                  id="vendor"
                  placeholder="e.g. Universal Companies"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className="h-10 rounded-full border-line bg-ivory/50 px-4 focus-visible:border-gold-300"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-xs tracking-wide uppercase text-muted-warm"
              >
                Description
              </Label>
              <Textarea
                id="description"
                rows={3}
                placeholder="What was this expense for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl border-line bg-ivory/50 focus-visible:border-gold-300"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs tracking-wide uppercase text-muted-warm">
                Receipt File
              </Label>
              {fileName ? (
                <div className="flex items-center gap-3 rounded-2xl border border-line bg-ivory/50 px-4 py-3">
                  <FileText
                    className="size-4 shrink-0 text-gold-600"
                    strokeWidth={1.75}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {fileName}
                  </span>
                  <button
                    type="button"
                    onClick={clearFile}
                    aria-label="Remove receipt"
                    className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-warm transition-colors hover:bg-cream hover:text-ink"
                  >
                    <X className="size-4" strokeWidth={1.75} />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="receipt"
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-gold-300/70 bg-ivory/50 px-4 py-8 text-center transition-colors hover:border-gold-400 hover:bg-gold-50/40"
                >
                  <span className="flex size-10 items-center justify-center rounded-full bg-gold-50">
                    <Upload
                      className="size-[18px] text-gold-600"
                      strokeWidth={1.75}
                    />
                  </span>
                  <span className="text-sm text-ink-soft">
                    Tap to attach a receipt
                  </span>
                  <span className="text-xs font-light text-muted-warm">
                    PDF, JPG, or PNG
                  </span>
                </label>
              )}
              <input
                ref={fileRef}
                id="receipt"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) =>
                  setFileName(e.target.files?.[0]?.name ?? null)
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-ivory/50 px-4 py-3.5">
              <div>
                <p className="text-sm text-ink">Make Expense Recurring</p>
                <p className="text-xs font-light text-muted-warm">
                  Repeats monthly
                </p>
              </div>
              <Switch
                checked={recurring}
                onCheckedChange={setRecurring}
                aria-label="Make expense recurring"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={!valid}>
                Save Expense
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
