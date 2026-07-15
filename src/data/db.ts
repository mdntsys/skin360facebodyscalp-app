import type {
  Appointment,
  AppointmentStatus,
  AppSettings,
  AvailabilityOverride,
  AvailabilityRule,
  Client,
  ClientNote,
  ClientPackage,
  ClientTag,
  ClinicLocation,
  Expense,
  ExpenseCategory,
  IntakeForm,
  LocationId,
  Member,
  MemberStatus,
  MembershipPlan,
  Payment,
  PaymentMethod,
  Product,
  Room,
  Service,
  ServiceCategory,
  ServicePackage,
  StaffMember,
  TimeBlock,
} from "./types";

// Raw Supabase row shapes (snake_case) and mappers into the app's camelCase
// domain types. Numeric columns pass through Number() because PostgREST can
// serialize numerics as strings.

// Postgres `time` columns serialize as "HH:MM:SS" — trim to "HH:MM".
function toHHMM(t: string): string {
  return t.slice(0, 5);
}

export interface LocationRow {
  id: string;
  name: string;
  short_name: string;
  address: string;
  city: string;
  phone: string;
  hours: { days: string; open: string; close: string }[];
  booking_mode: string;
}

export function mapLocation(r: LocationRow): ClinicLocation {
  return {
    id: r.id as LocationId,
    name: r.name,
    shortName: r.short_name,
    address: r.address,
    city: r.city,
    phone: r.phone,
    hours: r.hours ?? [],
    bookingMode: r.booking_mode as ClinicLocation["bookingMode"],
  };
}

export interface ServiceRow {
  id: string;
  name: string;
  category: string;
  price: number | string;
  duration_min: number;
  buffer_min: number | null;
  description: string;
  active: boolean;
}

export function mapService(r: ServiceRow): Service {
  return {
    id: r.id,
    name: r.name,
    category: r.category as ServiceCategory,
    price: Number(r.price),
    durationMin: r.duration_min,
    bufferMin: Number(r.buffer_min ?? 0),
    description: r.description,
  };
}

export interface StaffRow {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  locations: string[];
  email: string;
  phone: string;
  bookable: boolean;
  employment_type: string | null;
  service_ids: string[] | null;
}

export function mapStaff(r: StaffRow): StaffMember {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    initials: r.initials,
    color: r.color,
    locations: (r.locations ?? []) as LocationId[],
    email: r.email,
    phone: r.phone,
    bookable: r.bookable,
    employmentType: (r.employment_type ??
      "employee") as StaffMember["employmentType"],
    serviceIds: r.service_ids ?? [],
  };
}

export interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  tags: string[];
  home_location: string;
  joined_at: string;
  birthday: string | null;
  skin_notes: string | null;
}

// lastVisitISO / totalSpent / visitCount are derived from appointments and
// payments inside the DataProvider — mapClient returns neutral defaults.
export function mapClient(r: ClientRow): Client {
  return {
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    tags: (r.tags ?? []) as ClientTag[],
    homeLocation: r.home_location as LocationId,
    joinedISO: r.joined_at,
    lastVisitISO: null,
    totalSpent: 0,
    visitCount: 0,
    birthday: r.birthday ?? undefined,
    skinNotes: r.skin_notes ?? undefined,
  };
}

export interface AppointmentRow {
  id: string;
  client_id: string;
  service_id: string;
  staff_id: string;
  location_id: string;
  start_at: string;
  duration_min: number;
  price: number | string;
  status: string;
  note: string | null;
  room_id: string | null;
}

export function mapAppointment(r: AppointmentRow): Appointment {
  return {
    id: r.id,
    clientId: r.client_id,
    serviceId: r.service_id,
    staffId: r.staff_id,
    locationId: r.location_id as LocationId,
    startISO: r.start_at,
    durationMin: r.duration_min,
    price: Number(r.price),
    status: r.status as AppointmentStatus,
    note: r.note ?? undefined,
    roomId: r.room_id ?? undefined,
  };
}

export interface RoomRow {
  id: string;
  location_id: string;
  name: string;
  capacity: number;
  categories: string[];
  sort: number;
}

export function mapRoom(r: RoomRow): Room {
  return {
    id: r.id,
    locationId: r.location_id as LocationId,
    name: r.name,
    capacity: r.capacity,
    categories: (r.categories ?? []) as ServiceCategory[],
    sort: r.sort,
  };
}

export interface AvailabilityRuleRow {
  id: string;
  staff_id: string;
  location_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

export function mapAvailabilityRule(r: AvailabilityRuleRow): AvailabilityRule {
  return {
    id: r.id,
    staffId: r.staff_id,
    locationId: r.location_id as LocationId,
    weekday: r.weekday,
    startTime: toHHMM(r.start_time),
    endTime: toHHMM(r.end_time),
  };
}

export interface AvailabilityOverrideRow {
  id: string;
  staff_id: string;
  date: string;
  available: boolean;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
}

export function mapAvailabilityOverride(
  r: AvailabilityOverrideRow
): AvailabilityOverride {
  return {
    id: r.id,
    staffId: r.staff_id,
    dateISO: r.date,
    available: r.available,
    startTime: r.start_time ? toHHMM(r.start_time) : undefined,
    endTime: r.end_time ? toHHMM(r.end_time) : undefined,
    note: r.note ?? undefined,
  };
}

export interface TimeBlockRow {
  id: string;
  location_id: string;
  staff_id: string | null;
  room_id: string | null;
  start_at: string;
  end_at: string;
  reason: string;
}

export function mapTimeBlock(r: TimeBlockRow): TimeBlock {
  return {
    id: r.id,
    locationId: r.location_id as LocationId,
    staffId: r.staff_id ?? undefined,
    roomId: r.room_id ?? undefined,
    startISO: r.start_at,
    endISO: r.end_at,
    reason: r.reason,
  };
}

export interface AppSettingsRow {
  id: number;
  online_booking_enabled: boolean;
  min_notice_hours: number;
}

export function mapAppSettings(r: AppSettingsRow): AppSettings {
  return {
    onlineBookingEnabled: r.online_booking_enabled,
    minNoticeHours: Number(r.min_notice_hours),
  };
}

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  sku: string;
  in_stock: number;
  low_stock_threshold: number;
  cost: number | string;
  retail_price: number | string;
  vendor: string;
}

export function mapProduct(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    sku: r.sku,
    inStock: r.in_stock,
    lowStockThreshold: r.low_stock_threshold,
    cost: Number(r.cost),
    retailPrice: Number(r.retail_price),
    vendor: r.vendor,
  };
}

export interface MembershipPlanRow {
  id: string;
  name: string;
  monthly_price: number | string;
  billing_cycle: string;
  perks: string[];
}

// activeMembers is derived from members inside the DataProvider.
export function mapMembershipPlan(r: MembershipPlanRow): MembershipPlan {
  return {
    id: r.id,
    name: r.name,
    monthlyPrice: Number(r.monthly_price),
    billingCycle: r.billing_cycle as MembershipPlan["billingCycle"],
    perks: r.perks ?? [],
    activeMembers: 0,
  };
}

export interface MemberRow {
  id: string;
  client_id: string;
  plan_id: string;
  status: string;
  started_at: string;
  renews_at: string;
}

export function mapMember(r: MemberRow): Member {
  return {
    id: r.id,
    clientId: r.client_id,
    planId: r.plan_id,
    status: r.status as MemberStatus,
    startedISO: r.started_at,
    renewsISO: r.renews_at,
  };
}

export interface ServicePackageRow {
  id: string;
  name: string;
  service_ids: string[];
  sessions: number;
  discount_pct: number | string;
  full_price: number | string;
  price: number | string;
  description: string;
}

export function mapServicePackage(r: ServicePackageRow): ServicePackage {
  return {
    id: r.id,
    name: r.name,
    serviceIds: r.service_ids ?? [],
    sessions: r.sessions,
    discountPct: Number(r.discount_pct),
    fullPrice: Number(r.full_price),
    price: Number(r.price),
    description: r.description,
  };
}

export interface ClientPackageRow {
  id: string;
  client_id: string;
  package_id: string;
  purchased_at: string;
  sessions_used: number;
}

export function mapClientPackage(r: ClientPackageRow): ClientPackage {
  return {
    id: r.id,
    clientId: r.client_id,
    packageId: r.package_id,
    purchasedISO: r.purchased_at,
    sessionsUsed: r.sessions_used,
  };
}

export interface ExpenseRow {
  id: string;
  category: string;
  date: string;
  amount: number | string;
  vendor: string | null;
  description: string | null;
  recurring: boolean;
  location_id: string;
  receipt_name: string | null;
}

export function mapExpense(r: ExpenseRow): Expense {
  return {
    id: r.id,
    category: r.category as ExpenseCategory,
    dateISO: r.date,
    amount: Number(r.amount),
    vendor: r.vendor ?? undefined,
    description: r.description ?? undefined,
    recurring: r.recurring,
    locationId: r.location_id as Expense["locationId"],
    receiptName: r.receipt_name ?? undefined,
  };
}

export interface PaymentRow {
  id: string;
  client_id: string | null;
  date: string;
  description: string;
  method: string;
  subtotal: number | string;
  tip: number | string;
  tax: number | string;
  total: number | string;
  location_id: string;
  kind: string;
}

export function mapPayment(r: PaymentRow): Payment {
  return {
    id: r.id,
    clientId: r.client_id ?? "",
    dateISO: r.date,
    description: r.description,
    method: r.method as PaymentMethod,
    subtotal: Number(r.subtotal),
    tip: Number(r.tip),
    tax: Number(r.tax),
    total: Number(r.total),
    locationId: r.location_id as LocationId,
    kind: r.kind as Payment["kind"],
  };
}

export interface IntakeFormRow {
  id: string;
  client_id: string;
  name: string;
  uploaded_at: string;
  file_type: string;
  size_kb: number;
}

export function mapIntakeForm(r: IntakeFormRow): IntakeForm {
  return {
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    uploadedISO: r.uploaded_at,
    fileType: r.file_type as IntakeForm["fileType"],
    sizeKB: r.size_kb,
  };
}

export interface ClientNoteRow {
  id: string;
  client_id: string;
  author_staff_id: string;
  date: string;
  text: string;
}

export function mapClientNote(r: ClientNoteRow): ClientNote {
  return {
    id: r.id,
    clientId: r.client_id,
    authorStaffId: r.author_staff_id,
    dateISO: r.date,
    text: r.text,
  };
}
