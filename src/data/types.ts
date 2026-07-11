export type LocationId = "toluca" | "valencia";

export interface ClinicLocation {
  id: LocationId;
  name: string;
  shortName: string;
  address: string;
  city: string;
  phone: string;
  hours: { days: string; open: string; close: string }[];
}

export type ServiceCategory =
  | "Facials"
  | "Advanced Treatments"
  | "Body"
  | "Scalp"
  | "Nails";

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  durationMin: number;
  description: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string; // calendar block accent
  locations: LocationId[];
  email: string;
  phone: string;
}

export type ClientTag =
  | "VIP"
  | "Member"
  | "New"
  | "Post-Op"
  | "Sensitive Skin"
  | "Series Client";

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tags: ClientTag[];
  homeLocation: LocationId;
  joinedISO: string;
  lastVisitISO: string | null;
  totalSpent: number;
  visitCount: number;
  birthday?: string;
  skinNotes?: string;
}

export type AppointmentStatus =
  | "confirmed"
  | "checked-in"
  | "completed"
  | "cancelled"
  | "no-show";

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  staffId: string;
  locationId: LocationId;
  startISO: string;
  durationMin: number;
  price: number;
  status: AppointmentStatus;
  note?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  inStock: number;
  lowStockThreshold: number;
  cost: number;
  retailPrice: number;
  vendor: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  billingCycle: "Monthly" | "Quarterly";
  perks: string[];
  activeMembers: number;
}

export type MemberStatus = "active" | "paused" | "past-due";

export interface Member {
  id: string;
  clientId: string;
  planId: string;
  status: MemberStatus;
  startedISO: string;
  renewsISO: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  serviceIds: string[];
  sessions: number;
  discountPct: number;
  fullPrice: number; // pre-discount value
  price: number; // sale price
  description: string;
}

export interface ClientPackage {
  id: string;
  clientId: string;
  packageId: string;
  purchasedISO: string;
  sessionsUsed: number;
}

export type ExpenseCategory =
  | "Inventory"
  | "Rent"
  | "Utilities"
  | "Supplies"
  | "Payroll"
  | "Marketing"
  | "Other";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  dateISO: string;
  amount: number;
  vendor?: string;
  description?: string;
  recurring: boolean;
  locationId: LocationId | "both";
  receiptName?: string;
}

export type PaymentMethod = "Card" | "Cash" | "Gift Card" | "Membership Credit";

export interface Payment {
  id: string;
  clientId: string;
  dateISO: string;
  description: string;
  method: PaymentMethod;
  subtotal: number;
  tip: number;
  tax: number;
  total: number;
  locationId: LocationId;
  kind: "service" | "retail" | "package" | "membership";
}

export interface IntakeForm {
  id: string;
  clientId: string;
  name: string;
  uploadedISO: string;
  fileType: "PDF" | "JPG";
  sizeKB: number;
}

export interface ClientNote {
  id: string;
  clientId: string;
  authorStaffId: string;
  dateISO: string;
  text: string;
}
