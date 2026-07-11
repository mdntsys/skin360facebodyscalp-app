import { formatISO, subDays } from "date-fns";
import type { ClientPackage, Expense, Payment } from "./types";

const d = (daysAgo: number) =>
  formatISO(subDays(new Date(), daysAgo), { representation: "date" });

export const clientPackages: ClientPackage[] = [
  { id: "cp-01", clientId: "cl-07", packageId: "pkg-series-10", purchasedISO: d(120), sessionsUsed: 6 },
  { id: "cp-02", clientId: "cl-03", packageId: "pkg-lymphatic-6", purchasedISO: d(75), sessionsUsed: 4 },
  { id: "cp-03", clientId: "cl-08", packageId: "pkg-postop-8", purchasedISO: d(45), sessionsUsed: 5 },
  { id: "cp-04", clientId: "cl-12", packageId: "pkg-derma-trio", purchasedISO: d(6), sessionsUsed: 0 },
  { id: "cp-05", clientId: "cl-13", packageId: "pkg-postop-8", purchasedISO: d(150), sessionsUsed: 8 },
  { id: "cp-06", clientId: "cl-01", packageId: "pkg-series-10", purchasedISO: d(300), sessionsUsed: 10 },
];

export const expenses: Expense[] = [
  { id: "exp-01", category: "Rent", dateISO: d(10), amount: 3800, vendor: "Riverside Plaza Properties", description: "July rent — Toluca Lake suite", recurring: true, locationId: "toluca" },
  { id: "exp-02", category: "Rent", dateISO: d(10), amount: 2950, vendor: "Town Center Realty", description: "July rent — Valencia suite", recurring: true, locationId: "valencia" },
  { id: "exp-03", category: "Inventory", dateISO: d(3), amount: 842.6, vendor: "Image Skincare", description: "Retail restock — serums & moisturizers", recurring: false, locationId: "toluca", receiptName: "image-inv-8841.pdf" },
  { id: "exp-04", category: "Utilities", dateISO: d(8), amount: 218.44, vendor: "LADWP", description: "Electric — Toluca Lake", recurring: true, locationId: "toluca" },
  { id: "exp-05", category: "Utilities", dateISO: d(8), amount: 164.12, vendor: "SCV Water & Power", description: "Electric — Valencia", recurring: true, locationId: "valencia" },
  { id: "exp-06", category: "Supplies", dateISO: d(5), amount: 312.75, vendor: "Universal Companies", description: "Treatment room linens, gloves, spatulas", recurring: false, locationId: "both", receiptName: "universal-77213.pdf" },
  { id: "exp-07", category: "Payroll", dateISO: d(11), amount: 4680, vendor: "Gusto", description: "Bi-weekly payroll — Marisol & Jenny", recurring: true, locationId: "both" },
  { id: "exp-08", category: "Marketing", dateISO: d(6), amount: 450, vendor: "Meta Ads", description: "Instagram campaign — summer glow series", recurring: false, locationId: "both" },
  { id: "exp-09", category: "Inventory", dateISO: d(14), amount: 655, vendor: "Procell", description: "Microchannel tips + growth factor ampoules", recurring: false, locationId: "toluca", receiptName: "procell-2291.pdf" },
  { id: "exp-10", category: "Other", dateISO: d(13), amount: 89, vendor: "GlossGenius", description: "Booking software (final months before switch)", recurring: true, locationId: "both" },
  { id: "exp-11", category: "Supplies", dateISO: d(17), amount: 148.9, vendor: "Amazon Business", description: "Towel warmer + amenity tray", recurring: false, locationId: "valencia" },
  { id: "exp-12", category: "Utilities", dateISO: d(19), amount: 129.99, vendor: "Spectrum Business", description: "Internet — Toluca Lake", recurring: true, locationId: "toluca" },
  { id: "exp-13", category: "Marketing", dateISO: d(21), amount: 275, vendor: "Vistaprint", description: "New service menu cards + gift certificates", recurring: false, locationId: "both" },
  { id: "exp-14", category: "Inventory", dateISO: d(24), amount: 528.3, vendor: "Circadia", description: "Backbar restock — cleansers, enzymes", recurring: false, locationId: "both", receiptName: "circadia-5520.pdf" },
  { id: "exp-15", category: "Payroll", dateISO: d(25), amount: 4680, vendor: "Gusto", description: "Bi-weekly payroll — Marisol & Jenny", recurring: true, locationId: "both" },
  { id: "exp-16", category: "Supplies", dateISO: d(27), amount: 96.4, vendor: "Costco Business", description: "Water, tea service, robes laundering supplies", recurring: false, locationId: "toluca" },
  { id: "exp-17", category: "Other", dateISO: d(29), amount: 210, vendor: "State Board of Cosmetology", description: "Establishment license renewal — Valencia", recurring: false, locationId: "valencia" },
  { id: "exp-18", category: "Marketing", dateISO: d(31), amount: 380, vendor: "Bloom Local SEO", description: "Google Business optimization — monthly", recurring: true, locationId: "both" },
  { id: "exp-19", category: "Inventory", dateISO: d(34), amount: 447.2, vendor: "Oway", description: "Scalp care line restock", recurring: false, locationId: "toluca", receiptName: "oway-1108.pdf" },
  { id: "exp-20", category: "Utilities", dateISO: d(38), amount: 205.87, vendor: "LADWP", description: "Electric — Toluca Lake", recurring: true, locationId: "toluca" },
  { id: "exp-21", category: "Rent", dateISO: d(40), amount: 3800, vendor: "Riverside Plaza Properties", description: "June rent — Toluca Lake suite", recurring: true, locationId: "toluca" },
  { id: "exp-22", category: "Rent", dateISO: d(40), amount: 2950, vendor: "Town Center Realty", description: "June rent — Valencia suite", recurring: true, locationId: "valencia" },
  { id: "exp-23", category: "Supplies", dateISO: d(43), amount: 264.15, vendor: "Universal Companies", description: "Esthetic wipes, headbands, disposables", recurring: false, locationId: "both" },
  { id: "exp-24", category: "Payroll", dateISO: d(39), amount: 4680, vendor: "Gusto", description: "Bi-weekly payroll — Marisol & Jenny", recurring: true, locationId: "both" },
  { id: "exp-25", category: "Other", dateISO: d(47), amount: 175, vendor: "Simple Insurance Co", description: "Liability insurance — monthly premium", recurring: true, locationId: "both" },
];

// Rolling 90-day payment history. Used for client Payments tabs, the
// dashboard revenue trend, and the sample reports.
export const payments: Payment[] = [
  { id: "pay-01", clientId: "cl-07", dateISO: d(1), description: "Classic Facial (Series 6/10)", method: "Card", subtotal: 0, tip: 30, tax: 0, total: 30, locationId: "toluca", kind: "service" },
  { id: "pay-02", clientId: "cl-18", dateISO: d(2), description: "Procell Microchannel Therapy", method: "Card", subtotal: 350, tip: 60, tax: 0, total: 410, locationId: "toluca", kind: "service" },
  { id: "pay-03", clientId: "cl-03", dateISO: d(2), description: "Brazilian Lymphatic Drainage", method: "Card", subtotal: 195, tip: 35, tax: 0, total: 230, locationId: "valencia", kind: "service" },
  { id: "pay-04", clientId: "cl-08", dateISO: d(3), description: "Post Cosmetic Surgery — Body", method: "Card", subtotal: 245, tip: 40, tax: 0, total: 285, locationId: "valencia", kind: "service" },
  { id: "pay-05", clientId: "cl-01", dateISO: d(4), description: "Cleopatra 24K Gold Facial + retail", method: "Card", subtotal: 335, tip: 45, tax: 8.08, total: 388.08, locationId: "toluca", kind: "service" },
  { id: "pay-06", clientId: "cl-06", dateISO: d(5), description: "Signature Customized Facial", method: "Card", subtotal: 295, tip: 50, tax: 0, total: 345, locationId: "toluca", kind: "service" },
  { id: "pay-07", clientId: "cl-05", dateISO: d(6), description: "Classic Facial (Glow Society)", method: "Membership Credit", subtotal: 0, tip: 25, tax: 0, total: 25, locationId: "valencia", kind: "membership" },
  { id: "pay-08", clientId: "cl-12", dateISO: d(6), description: "Derma Glow Trio package", method: "Card", subtotal: 742.5, tip: 0, tax: 0, total: 742.5, locationId: "toluca", kind: "package" },
  { id: "pay-09", clientId: "cl-13", dateISO: d(7), description: "Brazilian Lymphatic Drainage w/ Cavitation", method: "Card", subtotal: 295, tip: 45, tax: 0, total: 340, locationId: "valencia", kind: "service" },
  { id: "pay-10", clientId: "cl-11", dateISO: d(8), description: "Glow Society — monthly billing", method: "Card", subtotal: 129, tip: 0, tax: 0, total: 129, locationId: "valencia", kind: "membership" },
  { id: "pay-11", clientId: "cl-02", dateISO: d(9), description: "Classic Facial + SPF 40 Tinted", method: "Card", subtotal: 193, tip: 25, tax: 4.56, total: 222.56, locationId: "toluca", kind: "service" },
  { id: "pay-12", clientId: "cl-17", dateISO: d(10), description: "Brazilian Lymphatic Drainage", method: "Cash", subtotal: 195, tip: 30, tax: 0, total: 225, locationId: "valencia", kind: "service" },
  { id: "pay-13", clientId: "cl-14", dateISO: d(11), description: "Japanese Signature Scalp Treatment", method: "Card", subtotal: 160, tip: 30, tax: 0, total: 190, locationId: "toluca", kind: "service" },
  { id: "pay-14", clientId: "cl-04", dateISO: d(13), description: "Skin Zero Gravity Face Treatment", method: "Card", subtotal: 450, tip: 75, tax: 0, total: 525, locationId: "toluca", kind: "service" },
  { id: "pay-15", clientId: "cl-16", dateISO: d(15), description: "Classic Facial + Milk Cleanser", method: "Card", subtotal: 181, tip: 25, tax: 3.42, total: 209.42, locationId: "toluca", kind: "service" },
  { id: "pay-16", clientId: "cl-09", dateISO: d(21), description: "Scalp Ritual Club — monthly billing", method: "Card", subtotal: 135, tip: 0, tax: 0, total: 135, locationId: "toluca", kind: "membership" },
  { id: "pay-17", clientId: "cl-01", dateISO: d(23), description: "Radiance Elite — monthly billing", method: "Card", subtotal: 249, tip: 0, tax: 0, total: 249, locationId: "toluca", kind: "membership" },
  { id: "pay-18", clientId: "cl-10", dateISO: d(34), description: "Gel Manicure", method: "Cash", subtotal: 40, tip: 10, tax: 0, total: 50, locationId: "toluca", kind: "service" },
  { id: "pay-19", clientId: "cl-15", dateISO: d(29), description: "Classic Facial", method: "Card", subtotal: 145, tip: 20, tax: 0, total: 165, locationId: "valencia", kind: "service" },
  { id: "pay-20", clientId: "cl-18", dateISO: d(30), description: "Signature Facial + Gold Recovery Mask", method: "Card", subtotal: 380, tip: 55, tax: 8.08, total: 443.08, locationId: "toluca", kind: "service" },
  { id: "pay-21", clientId: "cl-07", dateISO: d(32), description: "Retail — Vitamin C Serum ×2", method: "Card", subtotal: 136, tip: 0, tax: 12.92, total: 148.92, locationId: "toluca", kind: "retail" },
  { id: "pay-22", clientId: "cl-08", dateISO: d(45), description: "Post-Op Recovery — 8 Sessions package", method: "Card", subtotal: 1724.8, tip: 0, tax: 0, total: 1724.8, locationId: "valencia", kind: "package" },
  { id: "pay-23", clientId: "cl-04", dateISO: d(48), description: "Luxury Scalp Experience", method: "Gift Card", subtotal: 275, tip: 40, tax: 0, total: 315, locationId: "toluca", kind: "service" },
  { id: "pay-24", clientId: "cl-01", dateISO: d(52), description: "Signature Customized Facial", method: "Card", subtotal: 295, tip: 50, tax: 0, total: 345, locationId: "toluca", kind: "service" },
  { id: "pay-25", clientId: "cl-14", dateISO: d(55), description: "Retail — Scalp Detox Scrub + Silk Serum", method: "Card", subtotal: 98, tip: 0, tax: 9.31, total: 107.31, locationId: "toluca", kind: "retail" },
];
