"use client";

import * as React from "react";
import { parseISO } from "date-fns";

import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  mapAppointment,
  mapAppSettings,
  mapAvailabilityOverride,
  mapAvailabilityRule,
  mapClient,
  mapClientNote,
  mapClientPackage,
  mapExpense,
  mapFormRequest,
  mapFormSubmission,
  mapFormTemplate,
  mapIntakeForm,
  mapLocation,
  mapMember,
  mapMembershipPlan,
  mapPayment,
  mapProduct,
  mapRoom,
  mapService,
  mapServicePackage,
  mapStaff,
  mapTimeBlock,
  type AppointmentRow,
  type AppSettingsRow,
  type AvailabilityOverrideRow,
  type AvailabilityRuleRow,
  type ClientNoteRow,
  type ClientPackageRow,
  type ClientRow,
  type ExpenseRow,
  type FormRequestRow,
  type FormSubmissionRow,
  type FormTemplateRow,
  type IntakeFormRow,
  type LocationRow,
  type MemberRow,
  type MembershipPlanRow,
  type PaymentRow,
  type ProductRow,
  type RoomRow,
  type ServicePackageRow,
  type ServiceRow,
  type StaffRow,
  type TimeBlockRow,
} from "./db";
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
  EmploymentType,
  Expense,
  ExpenseCategory,
  FormRequest,
  FormSubmission,
  FormTemplate,
  IntakeForm,
  LocationId,
  Member,
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

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  /** "admin" = Carolina/Nic (everything); "staff" = a girl checking her schedule. */
  access: "admin" | "staff";
  /** Which staff column a staff login belongs to (null for admins). */
  staffId: string | null;
}

export interface NewAppointmentInput {
  clientId: string;
  serviceId: string;
  staffId: string;
  locationId: LocationId;
  startISO: string;
  durationMin: number;
  price: number;
  note?: string;
  roomId?: string | null;
}

export interface RoomInput {
  locationId: LocationId;
  name: string;
  capacity: number;
  categories: ServiceCategory[];
  sort?: number;
}

export interface NewAvailabilityRule {
  locationId: LocationId;
  weekday: number;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}

export interface NewOverrideInput {
  staffId: string;
  dateISO: string; // "yyyy-MM-dd"
  available: boolean;
  startTime?: string;
  endTime?: string;
  note?: string;
}

export interface NewTimeBlockInput {
  locationId: LocationId;
  staffId?: string;
  roomId?: string;
  startISO: string;
  endISO: string;
  reason: string;
}

export interface NewClientInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  tags?: ClientTag[];
  homeLocation: LocationId;
  birthday?: string | null;
  skinNotes?: string | null;
}

export interface ProductInput {
  name: string;
  category: string;
  sku: string;
  inStock: number;
  lowStockThreshold: number;
  cost: number;
  retailPrice: number;
  vendor: string;
}

export interface NewPlanInput {
  name: string;
  monthlyPrice: number;
  billingCycle: "Monthly" | "Quarterly";
  perks: string[];
}

export interface NewPackageInput {
  name: string;
  serviceIds: string[];
  sessions: number;
  discountPct: number;
  fullPrice: number;
  price: number;
  description: string;
}

export interface NewExpenseInput {
  category: ExpenseCategory;
  dateISO: string;
  amount: number;
  vendor?: string;
  description?: string;
  recurring: boolean;
  locationId: LocationId | "both";
  receiptName?: string;
}

export interface NewFormSubmissionInput {
  templateId: string;
  clientId: string;
  data: Record<string, unknown>;
  signatureDataUrl: string | null;
}

export interface CheckoutInput {
  clientId: string;
  staffId: string;
  serviceId: string;
  locationId: LocationId;
  subtotal: number;
  tip: number;
  method: PaymentMethod;
  /** The business day the money belongs to (defaults to now). */
  dateISO?: string;
  /** Existing appointment being closed out; omit for a walk-in quick sale. */
  appointmentId?: string;
  /** Redeem one session from this package (pair with subtotal 0). */
  clientPackageId?: string;
  description?: string;
}

export interface SellPackageInput {
  clientId: string;
  /** The one treatment the series is for. */
  serviceId: string;
  /** The ServicePackage template supplying sessions + discount. */
  packageId: string;
  locationId: LocationId;
  method: PaymentMethod;
}

interface Collections {
  locations: ClinicLocation[];
  services: Service[];
  allStaff: StaffMember[];
  clients: Client[];
  appointments: Appointment[];
  products: Product[];
  membershipPlans: MembershipPlan[];
  members: Member[];
  servicePackages: ServicePackage[];
  clientPackages: ClientPackage[];
  expenses: Expense[];
  payments: Payment[];
  intakeForms: IntakeForm[];
  formTemplates: FormTemplate[];
  formSubmissions: FormSubmission[];
  formRequests: FormRequest[];
  clientNotes: ClientNote[];
  rooms: Room[];
  availabilityRules: AvailabilityRule[];
  availabilityOverrides: AvailabilityOverride[];
  timeBlocks: TimeBlock[];
  appSettings: AppSettings;
}

export interface DataContextValue extends Collections {
  status: "loading" | "ready" | "error";
  errorMessage: string | null;
  profile: Profile | null;
  /** Bookable staff only — use for booking pickers. `allStaff` includes admins. */
  staff: StaffMember[];
  clientById: Map<string, Client>;
  serviceById: Map<string, Service>;
  staffById: Map<string, StaffMember>;
  locationById: Map<string, ClinicLocation>;
  planById: Map<string, MembershipPlan>;
  packageById: Map<string, ServicePackage>;
  roomById: Map<string, Room>;
  clientName: (c: Client | string | undefined) => string;
  refresh: () => Promise<void>;
  createAppointment: (input: NewAppointmentInput) => Promise<Appointment>;
  /** Insert many rows; confirmation email goes out for the first visit only. */
  createAppointments: (inputs: NewAppointmentInput[]) => Promise<Appointment[]>;
  updateAppointment: (
    id: string,
    input: NewAppointmentInput
  ) => Promise<Appointment>;
  updateAppointmentStatus: (
    id: string,
    status: AppointmentStatus
  ) => Promise<{ emailed: boolean; reason?: string }>;
  createClient: (input: NewClientInput) => Promise<Client>;
  updateClient: (id: string, input: Partial<NewClientInput>) => Promise<void>;
  addClientNote: (clientId: string, text: string) => Promise<ClientNote>;
  createProduct: (input: ProductInput) => Promise<Product>;
  updateProduct: (id: string, input: ProductInput) => Promise<void>;
  createMembershipPlan: (input: NewPlanInput) => Promise<MembershipPlan>;
  createServicePackage: (input: NewPackageInput) => Promise<ServicePackage>;
  addExpense: (input: NewExpenseInput) => Promise<Expense>;
  createRoom: (input: RoomInput) => Promise<Room>;
  updateRoom: (id: string, input: RoomInput) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
  /** Replaces ALL weekly rules for the given staff member. */
  saveAvailabilityRules: (
    staffId: string,
    rules: NewAvailabilityRule[]
  ) => Promise<void>;
  addAvailabilityOverride: (
    input: NewOverrideInput
  ) => Promise<AvailabilityOverride>;
  deleteAvailabilityOverride: (id: string) => Promise<void>;
  addTimeBlock: (input: NewTimeBlockInput) => Promise<TimeBlock>;
  deleteTimeBlock: (id: string) => Promise<void>;
  updateStaff: (
    id: string,
    input: {
      serviceIds?: string[];
      bookable?: boolean;
      onlineBookable?: boolean;
      notifyByEmail?: boolean;
      employmentType?: EmploymentType;
    }
  ) => Promise<void>;
  updateService: (
    id: string,
    input: { bufferMin?: number; price?: number; durationMin?: number }
  ) => Promise<void>;
  updateAppSettings: (input: Partial<AppSettings>) => Promise<void>;
  recordCheckout: (input: CheckoutInput) => Promise<Payment>;
  sellPackage: (input: SellPackageInput) => Promise<ClientPackage>;
  submitForm: (input: NewFormSubmissionInput) => Promise<FormSubmission>;
  /**
   * Lightweight refetch of forms data only — send-ahead submissions happen
   * outside this session, so forms surfaces call this on mount to catch up.
   */
  refreshForms: () => Promise<void>;
  /**
   * Create a send-ahead form link; deliver "email" also emails it to the
   * client. Returns the link either way so the desk can text it by hand.
   */
  sendFormRequest: (
    clientId: string,
    templateId: string,
    deliver: "email" | "link"
  ) => Promise<{ request: FormRequest; link: string; emailed: boolean }>;
  /** Upload a signed-form scan/photo to storage + record it on the client. */
  uploadIntakeFile: (clientId: string, file: File) => Promise<IntakeForm>;
  /** Short-lived signed URL for a stored intake file. */
  intakeFileUrl: (filePath: string) => Promise<string>;
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  onlineBookingEnabled: false,
  minNoticeHours: 72,
  staffSeesAllSchedules: false,
};

const EMPTY: Collections = {
  locations: [],
  services: [],
  allStaff: [],
  clients: [],
  appointments: [],
  products: [],
  membershipPlans: [],
  members: [],
  servicePackages: [],
  clientPackages: [],
  expenses: [],
  payments: [],
  intakeForms: [],
  formTemplates: [],
  formSubmissions: [],
  formRequests: [],
  clientNotes: [],
  rooms: [],
  availabilityRules: [],
  availabilityOverrides: [],
  timeBlocks: [],
  appSettings: DEFAULT_APP_SETTINGS,
};

const DataContext = React.createContext<DataContextValue | null>(null);

function byStart(a: Appointment, b: Appointment) {
  return new Date(a.startISO).getTime() - new Date(b.startISO).getTime();
}

function appointmentInsertRow(input: NewAppointmentInput) {
  return {
    client_id: input.clientId,
    service_id: input.serviceId,
    staff_id: input.staffId,
    location_id: input.locationId,
    start_at: input.startISO,
    duration_min: input.durationMin,
    price: input.price,
    note: input.note ?? null,
    room_id: input.roomId ?? null,
  };
}

function bySort(a: Room, b: Room) {
  return a.sort - b.sort;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Date-only strings ("2026-07-14") are interpreted in local time. */
function toInstant(iso: string): string {
  return iso.length === 10 ? parseISO(iso).toISOString() : iso;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createSupabaseClient(), []);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [data, setData] = React.useState<Collections>(EMPTY);

  const refresh = React.useCallback(async () => {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const [loc, svc, stf, cli, appt, prod, plan, mem, pkg, cpkg, exp, pay, forms, ftpl, fsub, freq, notes, rms, rules, ovr, blocks, settings] =
        await Promise.all([
          supabase.from("locations").select("*").order("id"),
          supabase.from("services").select("*").order("name"),
          supabase.from("staff").select("*").order("name"),
          supabase.from("clients").select("*").order("first_name"),
          supabase.from("appointments").select("*").order("start_at"),
          supabase.from("products").select("*").order("name"),
          supabase.from("membership_plans").select("*").order("name"),
          supabase.from("members").select("*"),
          supabase.from("service_packages").select("*").order("name"),
          supabase.from("client_packages").select("*"),
          supabase.from("expenses").select("*").order("date", { ascending: false }),
          supabase.from("payments").select("*").order("date", { ascending: false }),
          supabase.from("intake_forms").select("*").order("uploaded_at", { ascending: false }),
          supabase.from("form_templates").select("*").order("sort"),
          supabase.from("form_submissions").select("*").order("signed_at", { ascending: false }),
          supabase.from("form_requests").select("*").order("created_at", { ascending: false }),
          supabase.from("client_notes").select("*").order("date", { ascending: false }),
          supabase.from("rooms").select("*").order("sort"),
          supabase.from("availability_rules").select("*"),
          supabase.from("availability_overrides").select("*").order("date"),
          supabase.from("time_blocks").select("*").order("start_at"),
          supabase.from("app_settings").select("*"),
        ]);

      const failed = [loc, svc, stf, cli, appt, prod, plan, mem, pkg, cpkg, exp, pay, forms, ftpl, fsub, freq, notes, rms, rules, ovr, blocks, settings].find(
        (r) => r.error
      );
      if (failed?.error) throw new Error(failed.error.message);

      setData({
        locations: ((loc.data ?? []) as LocationRow[]).map(mapLocation),
        services: ((svc.data ?? []) as ServiceRow[]).map(mapService),
        allStaff: ((stf.data ?? []) as StaffRow[]).map(mapStaff),
        clients: ((cli.data ?? []) as ClientRow[]).map(mapClient),
        appointments: ((appt.data ?? []) as AppointmentRow[]).map(mapAppointment),
        products: ((prod.data ?? []) as ProductRow[]).map(mapProduct),
        membershipPlans: ((plan.data ?? []) as MembershipPlanRow[]).map(mapMembershipPlan),
        members: ((mem.data ?? []) as MemberRow[]).map(mapMember),
        servicePackages: ((pkg.data ?? []) as ServicePackageRow[]).map(mapServicePackage),
        clientPackages: ((cpkg.data ?? []) as ClientPackageRow[]).map(mapClientPackage),
        expenses: ((exp.data ?? []) as ExpenseRow[]).map(mapExpense),
        payments: ((pay.data ?? []) as PaymentRow[]).map(mapPayment),
        intakeForms: ((forms.data ?? []) as IntakeFormRow[]).map(mapIntakeForm),
        formTemplates: ((ftpl.data ?? []) as FormTemplateRow[]).map(mapFormTemplate),
        formSubmissions: ((fsub.data ?? []) as FormSubmissionRow[]).map(mapFormSubmission),
        formRequests: ((freq.data ?? []) as FormRequestRow[]).map(mapFormRequest),
        clientNotes: ((notes.data ?? []) as ClientNoteRow[]).map(mapClientNote),
        rooms: ((rms.data ?? []) as RoomRow[]).map(mapRoom),
        availabilityRules: ((rules.data ?? []) as AvailabilityRuleRow[]).map(mapAvailabilityRule),
        availabilityOverrides: ((ovr.data ?? []) as AvailabilityOverrideRow[]).map(mapAvailabilityOverride),
        timeBlocks: ((blocks.data ?? []) as TimeBlockRow[]).map(mapTimeBlock),
        appSettings: settings.data?.length
          ? mapAppSettings((settings.data as AppSettingsRow[])[0])
          : DEFAULT_APP_SETTINGS,
      });

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (prof) {
          setProfile({
            id: prof.id,
            firstName: prof.first_name,
            lastName: prof.last_name,
            role: prof.role,
            email: user.email ?? "",
            access: prof.access === "staff" ? "staff" : "admin",
            staffId: prof.staff_id ?? null,
          });
        }
      }

      setStatus("ready");
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Something went wrong loading your data."
      );
      setStatus("error");
    }
  }, [supabase]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const notifyBooked = React.useCallback(async (appointmentId: string) => {
    try {
      const res = await fetch("/api/appointments/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });
      if (!res.ok) {
        console.error("appointment confirmation email failed:", res.status);
      }
    } catch (err) {
      console.error("appointment confirmation email failed:", err);
    }
  }, []);

  const createAppointment = React.useCallback(
    async (input: NewAppointmentInput) => {
      const { data: row, error } = await supabase
        .from("appointments")
        .insert(appointmentInsertRow(input))
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = mapAppointment(row as AppointmentRow);
      setData((prev) => ({
        ...prev,
        appointments: [...prev.appointments, created].sort(byStart),
      }));
      // Best-effort — the appointment is on the calendar either way.
      void notifyBooked(created.id);
      return created;
    },
    [supabase, notifyBooked]
  );

  const createAppointments = React.useCallback(
    async (inputs: NewAppointmentInput[]) => {
      if (inputs.length === 0) return [];
      if (inputs.length === 1) return [await createAppointment(inputs[0])];
      const { data: rows, error } = await supabase
        .from("appointments")
        .insert(inputs.map(appointmentInsertRow))
        .select();
      if (error) throw new Error(error.message);
      const created = ((rows ?? []) as AppointmentRow[])
        .map(mapAppointment)
        .sort(byStart);
      setData((prev) => ({
        ...prev,
        appointments: [...prev.appointments, ...created].sort(byStart),
      }));
      if (created[0]) void notifyBooked(created[0].id);
      return created;
    },
    [supabase, createAppointment, notifyBooked]
  );

  const updateAppointment = React.useCallback(
    async (id: string, input: NewAppointmentInput) => {
      const { data: row, error } = await supabase
        .from("appointments")
        .update({
          client_id: input.clientId,
          service_id: input.serviceId,
          staff_id: input.staffId,
          location_id: input.locationId,
          start_at: input.startISO,
          duration_min: input.durationMin,
          price: input.price,
          note: input.note ?? null,
          room_id: input.roomId ?? null,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const updated = mapAppointment(row as AppointmentRow);
      setData((prev) => ({
        ...prev,
        appointments: prev.appointments
          .map((a) => (a.id === id ? updated : a))
          .sort(byStart),
      }));
      return updated;
    },
    [supabase]
  );

  const updateAppointmentStatus = React.useCallback(
    async (id: string, apptStatus: AppointmentStatus) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: apptStatus })
        .eq("id", id);
      if (error) throw new Error(error.message);
      setData((prev) => ({
        ...prev,
        appointments: prev.appointments.map((a) =>
          a.id === id ? { ...a, status: apptStatus } : a
        ),
      }));

      // Tell the client it's off. Best-effort — the calendar is already right,
      // and plenty of the older Valencia clients have no email on file.
      if (apptStatus !== "cancelled") return { emailed: false };
      try {
        const res = await fetch("/api/appointments/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appointmentId: id, kind: "cancelled" }),
        });
        if (!res.ok) {
          console.error("cancellation email failed:", res.status);
          return { emailed: false, reason: "send-failed" };
        }
        const json = (await res.json()) as {
          sent?: boolean;
          reason?: string;
        };
        return { emailed: Boolean(json.sent), reason: json.reason };
      } catch (err) {
        console.error("cancellation email failed:", err);
        return { emailed: false, reason: "send-failed" };
      }
    },
    [supabase]
  );

  const createClient = React.useCallback(
    async (input: NewClientInput) => {
      const { data: row, error } = await supabase
        .from("clients")
        .insert({
          first_name: input.firstName,
          last_name: input.lastName,
          email: input.email?.trim() ?? "",
          phone: input.phone?.trim() ?? "",
          tags: input.tags ?? [],
          home_location: input.homeLocation,
          birthday: input.birthday?.trim() ? input.birthday.trim() : null,
          skin_notes: input.skinNotes?.trim() ? input.skinNotes.trim() : null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = mapClient(row as ClientRow);
      setData((prev) => ({
        ...prev,
        clients: [...prev.clients, created].sort((a, b) =>
          a.firstName.localeCompare(b.firstName)
        ),
      }));
      return created;
    },
    [supabase]
  );

  const updateClient = React.useCallback(
    async (id: string, input: Partial<NewClientInput>) => {
      const patch: Record<string, unknown> = {};
      if (input.firstName !== undefined) patch.first_name = input.firstName;
      if (input.lastName !== undefined) patch.last_name = input.lastName;
      if (input.email !== undefined) patch.email = input.email.trim();
      if (input.phone !== undefined) patch.phone = input.phone.trim();
      if (input.tags !== undefined) patch.tags = input.tags;
      if (input.homeLocation !== undefined) patch.home_location = input.homeLocation;
      if (input.birthday !== undefined)
        patch.birthday = input.birthday?.trim() ? input.birthday.trim() : null;
      if (input.skinNotes !== undefined)
        patch.skin_notes = input.skinNotes?.trim() ? input.skinNotes.trim() : null;
      const { data: row, error } = await supabase
        .from("clients")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const updated = mapClient(row as ClientRow);
      setData((prev) => ({
        ...prev,
        clients: prev.clients.map((c) => (c.id === id ? updated : c)),
      }));
    },
    [supabase]
  );

  const addClientNote = React.useCallback(
    async (clientId: string, text: string) => {
      const authorStaffId =
        data.allStaff.find((s) => s.email && s.email === profile?.email)?.id ??
        data.allStaff[0]?.id;
      const { data: row, error } = await supabase
        .from("client_notes")
        .insert({ client_id: clientId, author_staff_id: authorStaffId, text })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = mapClientNote(row as ClientNoteRow);
      setData((prev) => ({
        ...prev,
        clientNotes: [created, ...prev.clientNotes],
      }));
      return created;
    },
    [supabase, data.allStaff, profile]
  );

  const createProduct = React.useCallback(
    async (input: ProductInput) => {
      const { data: row, error } = await supabase
        .from("products")
        .insert({
          name: input.name,
          category: input.category,
          sku: input.sku,
          in_stock: input.inStock,
          low_stock_threshold: input.lowStockThreshold,
          cost: input.cost,
          retail_price: input.retailPrice,
          vendor: input.vendor,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = mapProduct(row as ProductRow);
      setData((prev) => ({ ...prev, products: [created, ...prev.products] }));
      return created;
    },
    [supabase]
  );

  const updateProduct = React.useCallback(
    async (id: string, input: ProductInput) => {
      const { data: row, error } = await supabase
        .from("products")
        .update({
          name: input.name,
          category: input.category,
          sku: input.sku,
          in_stock: input.inStock,
          low_stock_threshold: input.lowStockThreshold,
          cost: input.cost,
          retail_price: input.retailPrice,
          vendor: input.vendor,
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const updated = mapProduct(row as ProductRow);
      setData((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === id ? updated : p)),
      }));
    },
    [supabase]
  );

  const createMembershipPlan = React.useCallback(
    async (input: NewPlanInput) => {
      const { data: row, error } = await supabase
        .from("membership_plans")
        .insert({
          name: input.name,
          monthly_price: input.monthlyPrice,
          billing_cycle: input.billingCycle,
          perks: input.perks,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = mapMembershipPlan(row as MembershipPlanRow);
      setData((prev) => ({
        ...prev,
        membershipPlans: [...prev.membershipPlans, created].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));
      return created;
    },
    [supabase]
  );

  const createServicePackage = React.useCallback(
    async (input: NewPackageInput) => {
      const { data: row, error } = await supabase
        .from("service_packages")
        .insert({
          name: input.name,
          service_ids: input.serviceIds,
          sessions: input.sessions,
          discount_pct: input.discountPct,
          full_price: input.fullPrice,
          price: input.price,
          description: input.description,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = mapServicePackage(row as ServicePackageRow);
      setData((prev) => ({
        ...prev,
        servicePackages: [...prev.servicePackages, created].sort((a, b) =>
          a.name.localeCompare(b.name)
        ),
      }));
      return created;
    },
    [supabase]
  );

  const addExpense = React.useCallback(
    async (input: NewExpenseInput) => {
      const { data: row, error } = await supabase
        .from("expenses")
        .insert({
          category: input.category,
          date: toInstant(input.dateISO),
          amount: input.amount,
          vendor: input.vendor ?? null,
          description: input.description ?? null,
          recurring: input.recurring,
          location_id: input.locationId,
          receipt_name: input.receiptName ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = mapExpense(row as ExpenseRow);
      setData((prev) => ({
        ...prev,
        expenses: [created, ...prev.expenses].sort(
          (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
        ),
      }));
      return created;
    },
    [supabase]
  );

  const createRoom = React.useCallback(
    async (input: RoomInput) => {
      const { data: row, error } = await supabase
        .from("rooms")
        .insert({
          location_id: input.locationId,
          name: input.name,
          capacity: input.capacity,
          categories: input.categories,
          sort: input.sort ?? 0,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = mapRoom(row as RoomRow);
      setData((prev) => ({
        ...prev,
        rooms: [...prev.rooms, created].sort(bySort),
      }));
      return created;
    },
    [supabase]
  );

  const updateRoom = React.useCallback(
    async (id: string, input: RoomInput) => {
      const { data: row, error } = await supabase
        .from("rooms")
        .update({
          location_id: input.locationId,
          name: input.name,
          capacity: input.capacity,
          categories: input.categories,
          ...(input.sort !== undefined ? { sort: input.sort } : {}),
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const updated = mapRoom(row as RoomRow);
      setData((prev) => ({
        ...prev,
        rooms: prev.rooms.map((r) => (r.id === id ? updated : r)).sort(bySort),
      }));
    },
    [supabase]
  );

  const deleteRoom = React.useCallback(
    async (id: string) => {
      const { error } = await supabase.from("rooms").delete().eq("id", id);
      if (error) throw new Error(error.message);
      setData((prev) => ({
        ...prev,
        rooms: prev.rooms.filter((r) => r.id !== id),
      }));
    },
    [supabase]
  );

  const saveAvailabilityRules = React.useCallback(
    async (staffId: string, rules: NewAvailabilityRule[]) => {
      const { error: deleteError } = await supabase
        .from("availability_rules")
        .delete()
        .eq("staff_id", staffId);
      if (deleteError) throw new Error(deleteError.message);
      let created: AvailabilityRule[] = [];
      if (rules.length > 0) {
        const { data: rows, error } = await supabase
          .from("availability_rules")
          .insert(
            rules.map((r) => ({
              staff_id: staffId,
              location_id: r.locationId,
              weekday: r.weekday,
              start_time: r.startTime,
              end_time: r.endTime,
            }))
          )
          .select();
        if (error) {
          // The delete already committed; keep local state honest about the
          // now-empty schedule instead of showing stale rules.
          setData((prev) => ({
            ...prev,
            availabilityRules: prev.availabilityRules.filter(
              (r) => r.staffId !== staffId
            ),
          }));
          throw new Error(error.message);
        }
        created = ((rows ?? []) as AvailabilityRuleRow[]).map(
          mapAvailabilityRule
        );
      }
      setData((prev) => ({
        ...prev,
        availabilityRules: [
          ...prev.availabilityRules.filter((r) => r.staffId !== staffId),
          ...created,
        ],
      }));
    },
    [supabase]
  );

  const addAvailabilityOverride = React.useCallback(
    async (input: NewOverrideInput) => {
      const { data: row, error } = await supabase
        .from("availability_overrides")
        .insert({
          staff_id: input.staffId,
          date: input.dateISO,
          available: input.available,
          start_time: input.startTime ?? null,
          end_time: input.endTime ?? null,
          note: input.note ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = mapAvailabilityOverride(row as AvailabilityOverrideRow);
      setData((prev) => ({
        ...prev,
        availabilityOverrides: [...prev.availabilityOverrides, created].sort(
          (a, b) => a.dateISO.localeCompare(b.dateISO)
        ),
      }));
      return created;
    },
    [supabase]
  );

  const deleteAvailabilityOverride = React.useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("availability_overrides")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
      setData((prev) => ({
        ...prev,
        availabilityOverrides: prev.availabilityOverrides.filter(
          (o) => o.id !== id
        ),
      }));
    },
    [supabase]
  );

  const addTimeBlock = React.useCallback(
    async (input: NewTimeBlockInput) => {
      const { data: row, error } = await supabase
        .from("time_blocks")
        .insert({
          location_id: input.locationId,
          staff_id: input.staffId ?? null,
          room_id: input.roomId ?? null,
          start_at: input.startISO,
          end_at: input.endISO,
          reason: input.reason,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = mapTimeBlock(row as TimeBlockRow);
      setData((prev) => ({
        ...prev,
        timeBlocks: [...prev.timeBlocks, created].sort(
          (a, b) =>
            new Date(a.startISO).getTime() - new Date(b.startISO).getTime()
        ),
      }));
      return created;
    },
    [supabase]
  );

  const deleteTimeBlock = React.useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("time_blocks")
        .delete()
        .eq("id", id);
      if (error) throw new Error(error.message);
      setData((prev) => ({
        ...prev,
        timeBlocks: prev.timeBlocks.filter((b) => b.id !== id),
      }));
    },
    [supabase]
  );

  const updateStaff = React.useCallback(
    async (
      id: string,
      input: {
        serviceIds?: string[];
        bookable?: boolean;
        onlineBookable?: boolean;
        notifyByEmail?: boolean;
        employmentType?: EmploymentType;
      }
    ) => {
      const patch: Record<string, unknown> = {};
      if (input.serviceIds !== undefined) patch.service_ids = input.serviceIds;
      if (input.bookable !== undefined) patch.bookable = input.bookable;
      if (input.onlineBookable !== undefined)
        patch.online_bookable = input.onlineBookable;
      if (input.notifyByEmail !== undefined)
        patch.notify_by_email = input.notifyByEmail;
      if (input.employmentType !== undefined)
        patch.employment_type = input.employmentType;
      const { data: row, error } = await supabase
        .from("staff")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const updated = mapStaff(row as StaffRow);
      setData((prev) => ({
        ...prev,
        allStaff: prev.allStaff.map((s) => (s.id === id ? updated : s)),
      }));
    },
    [supabase]
  );

  const updateService = React.useCallback(
    async (
      id: string,
      input: { bufferMin?: number; price?: number; durationMin?: number }
    ) => {
      const patch: Record<string, unknown> = {};
      if (input.bufferMin !== undefined) patch.buffer_min = input.bufferMin;
      if (input.price !== undefined) patch.price = input.price;
      if (input.durationMin !== undefined)
        patch.duration_min = input.durationMin;
      const { data: row, error } = await supabase
        .from("services")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      const updated = mapService(row as ServiceRow);
      setData((prev) => ({
        ...prev,
        services: prev.services.map((s) => (s.id === id ? updated : s)),
      }));
    },
    [supabase]
  );

  const updateAppSettings = React.useCallback(
    async (input: Partial<AppSettings>) => {
      const patch: Record<string, unknown> = { id: 1 };
      if (input.onlineBookingEnabled !== undefined)
        patch.online_booking_enabled = input.onlineBookingEnabled;
      if (input.minNoticeHours !== undefined)
        patch.min_notice_hours = input.minNoticeHours;
      if (input.staffSeesAllSchedules !== undefined)
        patch.staff_sees_all_schedules = input.staffSeesAllSchedules;
      const { error } = await supabase.from("app_settings").upsert(patch);
      if (error) throw new Error(error.message);
      setData((prev) => ({
        ...prev,
        appSettings: { ...prev.appSettings, ...input },
      }));
    },
    [supabase]
  );

  /**
   * Close out one client visit through the record_checkout RPC — a single
   * Postgres transaction that completes the appointment with the price that
   * was actually charged (and the girl who actually performed it), burns a
   * package session when one covers the visit (atomically, guarded against
   * stale clients), and records the money row that drives the daily per-girl
   * report. Walk-ins get a completed appointment created in the same
   * transaction so visit counts and revenue stay truthful, and a retry after
   * any failure can never duplicate money or sessions.
   */
  const recordCheckout = React.useCallback(
    async (input: CheckoutInput) => {
      const service = data.services.find((s) => s.id === input.serviceId);
      const { data: result, error } = await supabase.rpc("record_checkout", {
        p_client_id: input.clientId,
        p_staff_id: input.staffId,
        p_service_id: input.serviceId,
        p_location_id: input.locationId,
        p_date: input.dateISO ?? new Date().toISOString(),
        p_subtotal: round2(Math.max(0, input.subtotal)),
        p_tip: round2(Math.max(0, input.tip)),
        p_method: input.method,
        p_description: input.description ?? service?.name ?? "Service checkout",
        p_appointment_id: input.appointmentId ?? null,
        p_client_package_id: input.clientPackageId ?? null,
        p_duration_min: service?.durationMin ?? 30,
      });
      if (error) {
        if (error.message.includes("CHECKOUT_DUPLICATE")) {
          throw new Error("This visit is already checked out.");
        }
        if (error.message.includes("CHECKOUT_FORBIDDEN")) {
          throw new Error("You can only check out your own clients.");
        }
        if (error.message.includes("CHECKOUT_PACKAGE")) {
          throw new Error(
            "That package has no sessions left — it may have been used from another device."
          );
        }
        throw new Error(error.message);
      }
      const out = result as {
        appointment: AppointmentRow;
        payment: PaymentRow;
        clientPackage: ClientPackageRow | null;
      };
      const appointment = mapAppointment(out.appointment);
      const payment = mapPayment(out.payment);
      const redeemed = out.clientPackage
        ? mapClientPackage(out.clientPackage)
        : null;

      setData((prev) => ({
        ...prev,
        appointments: input.appointmentId
          ? prev.appointments.map((a) =>
              a.id === appointment.id ? appointment : a
            )
          : [...prev.appointments, appointment].sort(byStart),
        payments: [payment, ...prev.payments],
        clientPackages: redeemed
          ? prev.clientPackages.map((p) =>
              p.id === redeemed.id ? redeemed : p
            )
          : prev.clientPackages,
      }));
      return payment;
    },
    [supabase, data.services]
  );

  /**
   * Sell a series to a client via the sell_client_package RPC — one Postgres
   * transaction writing the client package plus its kind "package" payment
   * (which DOES count toward revenue — sessions are then redeemed for free at
   * checkout). 10 x the SAME treatment per Carolina, priced from that
   * treatment with the template's discount, paid up front.
   */
  const sellPackage = React.useCallback(
    async (input: SellPackageInput) => {
      const template = data.servicePackages.find(
        (p) => p.id === input.packageId
      );
      const service = data.services.find((s) => s.id === input.serviceId);
      if (!template || !service)
        throw new Error("Unknown package or treatment.");
      const fullPrice = round2(template.sessions * service.price);
      const price = round2(fullPrice * (1 - template.discountPct / 100));

      const { data: result, error } = await supabase.rpc(
        "sell_client_package",
        {
          p_client_id: input.clientId,
          p_package_id: template.id,
          p_service_id: service.id,
          p_location_id: input.locationId,
          p_method: input.method,
          p_sessions: template.sessions,
          p_price: price,
          p_description: `${template.name} — ${service.name}`,
        }
      );
      if (error) throw new Error(error.message);
      const out = result as {
        clientPackage: ClientPackageRow;
        payment: PaymentRow;
      };
      const created = mapClientPackage(out.clientPackage);
      const payment = mapPayment(out.payment);

      setData((prev) => ({
        ...prev,
        clientPackages: [...prev.clientPackages, created],
        payments: [payment, ...prev.payments],
      }));
      return created;
    },
    [supabase, data.servicePackages, data.services]
  );

  const submitForm = React.useCallback(
    async (input: NewFormSubmissionInput) => {
      const { data: row, error } = await supabase
        .from("form_submissions")
        .insert({
          template_id: input.templateId,
          client_id: input.clientId,
          data: input.data,
          signature_data_url: input.signatureDataUrl,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = mapFormSubmission(row as FormSubmissionRow);
      setData((prev) => ({
        ...prev,
        formSubmissions: [created, ...prev.formSubmissions],
      }));
      return created;
    },
    [supabase]
  );

  const uploadIntakeFile = React.useCallback(
    async (clientId: string, file: File) => {
      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");
      const safeName = file.name.replace(/[^\w.\- ]+/g, "_");
      const path = `${clientId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("client-files")
        .upload(path, file, { contentType: file.type || undefined });
      if (uploadError) throw new Error(uploadError.message);

      const { data: row, error } = await supabase
        .from("intake_forms")
        .insert({
          client_id: clientId,
          name: file.name,
          file_type: isPdf ? "PDF" : "JPG",
          size_kb: Math.max(1, Math.round(file.size / 1024)),
          file_path: path,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = mapIntakeForm(row as IntakeFormRow);
      setData((prev) => ({
        ...prev,
        intakeForms: [created, ...prev.intakeForms],
      }));
      return created;
    },
    [supabase]
  );

  const refreshForms = React.useCallback(async () => {
    const [fsub, freq, files] = await Promise.all([
      supabase.from("form_submissions").select("*").order("signed_at", { ascending: false }),
      supabase.from("form_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("intake_forms").select("*").order("uploaded_at", { ascending: false }),
    ]);
    if (fsub.error || freq.error || files.error) return; // best-effort refresh
    setData((prev) => ({
      ...prev,
      formSubmissions: ((fsub.data ?? []) as FormSubmissionRow[]).map(mapFormSubmission),
      formRequests: ((freq.data ?? []) as FormRequestRow[]).map(mapFormRequest),
      intakeForms: ((files.data ?? []) as IntakeFormRow[]).map(mapIntakeForm),
    }));
  }, [supabase]);

  const sendFormRequest = React.useCallback(
    async (
      clientId: string,
      templateId: string,
      deliver: "email" | "link"
    ) => {
      const res = await fetch("/api/forms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, templateId, deliver }),
      });
      let payload: {
        error?: string;
        request?: FormRequestRow;
        link?: string;
        emailed?: boolean;
      };
      try {
        payload = await res.json();
      } catch {
        // A signed-out session gets the login page's HTML back.
        throw new Error(
          res.status === 401 || res.redirected
            ? "Your session expired — refresh the page and sign in again."
            : "Couldn't create the form link. Please try again."
        );
      }
      // A failed email still created the link — keep local state honest.
      if (payload.request) {
        const created = mapFormRequest(payload.request);
        setData((prev) => ({
          ...prev,
          formRequests: [created, ...prev.formRequests],
        }));
        if (!res.ok) throw new Error(payload.error ?? "The email didn't send.");
        return {
          request: created,
          link: payload.link ?? "",
          emailed: payload.emailed ?? false,
        };
      }
      throw new Error(payload.error ?? "Couldn't create the form link.");
    },
    []
  );

  const intakeFileUrl = React.useCallback(
    async (filePath: string) => {
      const { data: signed, error } = await supabase.storage
        .from("client-files")
        .createSignedUrl(filePath, 60 * 60);
      if (error) throw new Error(error.message);
      return signed.signedUrl;
    },
    [supabase]
  );

  const value = React.useMemo<DataContextValue>(() => {
    const completedByClient = new Map<string, Appointment[]>();
    for (const a of data.appointments) {
      if (a.status !== "completed") continue;
      const list = completedByClient.get(a.clientId) ?? [];
      list.push(a);
      completedByClient.set(a.clientId, list);
    }
    // Non-service payments only: service revenue is already represented by
    // completed appointments, so this avoids double counting once a POS flow
    // starts recording payments.
    const extraSpendByClient = new Map<string, number>();
    for (const p of data.payments) {
      if (p.kind === "service" || !p.clientId) continue;
      extraSpendByClient.set(
        p.clientId,
        (extraSpendByClient.get(p.clientId) ?? 0) + p.total
      );
    }

    const clients = data.clients.map((c) => {
      const completed = completedByClient.get(c.id) ?? [];
      return {
        ...c,
        lastVisitISO: completed.length
          ? completed[completed.length - 1].startISO
          : null,
        visitCount: completed.length,
        totalSpent:
          completed.reduce((sum, a) => sum + a.price, 0) +
          (extraSpendByClient.get(c.id) ?? 0),
      };
    });

    const membershipPlans = data.membershipPlans.map((p) => ({
      ...p,
      activeMembers: data.members.filter(
        (m) => m.planId === p.id && m.status === "active"
      ).length,
    }));

    const clientById = new Map(clients.map((c) => [c.id, c]));
    const serviceById = new Map(data.services.map((s) => [s.id, s]));
    const staffById = new Map(data.allStaff.map((s) => [s.id, s]));
    const locationById = new Map(data.locations.map((l) => [l.id, l]));
    const planById = new Map(membershipPlans.map((p) => [p.id, p]));
    const packageById = new Map(data.servicePackages.map((p) => [p.id, p]));
    const roomById = new Map(data.rooms.map((r) => [r.id, r]));

    const clientName = (c: Client | string | undefined): string => {
      const client = typeof c === "string" ? clientById.get(c) : c;
      return client
        ? `${client.firstName} ${client.lastName}`.trim()
        : "Unknown client";
    };

    return {
      ...data,
      clients,
      membershipPlans,
      staff: data.allStaff.filter((s) => s.bookable),
      status,
      errorMessage,
      profile,
      clientById,
      serviceById,
      staffById,
      locationById,
      planById,
      packageById,
      roomById,
      clientName,
      refresh,
      createAppointment,
      createAppointments,
      updateAppointment,
      updateAppointmentStatus,
      createClient,
      updateClient,
      addClientNote,
      createProduct,
      updateProduct,
      createMembershipPlan,
      createServicePackage,
      addExpense,
      createRoom,
      updateRoom,
      deleteRoom,
      saveAvailabilityRules,
      addAvailabilityOverride,
      deleteAvailabilityOverride,
      addTimeBlock,
      deleteTimeBlock,
      updateStaff,
      updateService,
      updateAppSettings,
      recordCheckout,
      sellPackage,
      submitForm,
      refreshForms,
      sendFormRequest,
      uploadIntakeFile,
      intakeFileUrl,
    };
  }, [
    data,
    status,
    errorMessage,
    profile,
    refresh,
    createAppointment,
    createAppointments,
    updateAppointment,
    updateAppointmentStatus,
    createClient,
    updateClient,
    addClientNote,
    createProduct,
    updateProduct,
    createMembershipPlan,
    createServicePackage,
    addExpense,
    createRoom,
    updateRoom,
    deleteRoom,
    saveAvailabilityRules,
    addAvailabilityOverride,
    deleteAvailabilityOverride,
    addTimeBlock,
    deleteTimeBlock,
    updateStaff,
    updateService,
    updateAppSettings,
    recordCheckout,
    sellPackage,
    submitForm,
    refreshForms,
    sendFormRequest,
    uploadIntakeFile,
    intakeFileUrl,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
