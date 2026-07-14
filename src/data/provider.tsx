"use client";

import * as React from "react";
import { parseISO } from "date-fns";

import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import {
  mapAppointment,
  mapClient,
  mapClientNote,
  mapClientPackage,
  mapExpense,
  mapIntakeForm,
  mapLocation,
  mapMember,
  mapMembershipPlan,
  mapPayment,
  mapProduct,
  mapService,
  mapServicePackage,
  mapStaff,
  type AppointmentRow,
  type ClientNoteRow,
  type ClientPackageRow,
  type ClientRow,
  type ExpenseRow,
  type IntakeFormRow,
  type LocationRow,
  type MemberRow,
  type MembershipPlanRow,
  type PaymentRow,
  type ProductRow,
  type ServicePackageRow,
  type ServiceRow,
  type StaffRow,
} from "./db";
import type {
  Appointment,
  AppointmentStatus,
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
  MembershipPlan,
  Payment,
  Product,
  Service,
  ServicePackage,
  StaffMember,
} from "./types";

export interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
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
}

export interface NewClientInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  tags?: ClientTag[];
  homeLocation: LocationId;
  birthday?: string;
  skinNotes?: string;
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
  clientNotes: ClientNote[];
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
  clientName: (c: Client | string | undefined) => string;
  refresh: () => Promise<void>;
  createAppointment: (input: NewAppointmentInput) => Promise<Appointment>;
  updateAppointmentStatus: (
    id: string,
    status: AppointmentStatus
  ) => Promise<void>;
  createClient: (input: NewClientInput) => Promise<Client>;
  updateClient: (id: string, input: Partial<NewClientInput>) => Promise<void>;
  addClientNote: (clientId: string, text: string) => Promise<ClientNote>;
  createProduct: (input: ProductInput) => Promise<Product>;
  updateProduct: (id: string, input: ProductInput) => Promise<void>;
  createMembershipPlan: (input: NewPlanInput) => Promise<MembershipPlan>;
  createServicePackage: (input: NewPackageInput) => Promise<ServicePackage>;
  addExpense: (input: NewExpenseInput) => Promise<Expense>;
}

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
  clientNotes: [],
};

const DataContext = React.createContext<DataContextValue | null>(null);

function byStart(a: Appointment, b: Appointment) {
  return new Date(a.startISO).getTime() - new Date(b.startISO).getTime();
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
      const [loc, svc, stf, cli, appt, prod, plan, mem, pkg, cpkg, exp, pay, forms, notes] =
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
          supabase.from("client_notes").select("*").order("date", { ascending: false }),
        ]);

      const failed = [loc, svc, stf, cli, appt, prod, plan, mem, pkg, cpkg, exp, pay, forms, notes].find(
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
        clientNotes: ((notes.data ?? []) as ClientNoteRow[]).map(mapClientNote),
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

  const createAppointment = React.useCallback(
    async (input: NewAppointmentInput) => {
      const { data: row, error } = await supabase
        .from("appointments")
        .insert({
          client_id: input.clientId,
          service_id: input.serviceId,
          staff_id: input.staffId,
          location_id: input.locationId,
          start_at: input.startISO,
          duration_min: input.durationMin,
          price: input.price,
          note: input.note ?? null,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      const created = mapAppointment(row as AppointmentRow);
      setData((prev) => ({
        ...prev,
        appointments: [...prev.appointments, created].sort(byStart),
      }));
      return created;
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
          email: input.email ?? "",
          phone: input.phone ?? "",
          tags: input.tags ?? [],
          home_location: input.homeLocation,
          birthday: input.birthday ?? null,
          skin_notes: input.skinNotes ?? null,
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
      if (input.email !== undefined) patch.email = input.email;
      if (input.phone !== undefined) patch.phone = input.phone;
      if (input.tags !== undefined) patch.tags = input.tags;
      if (input.homeLocation !== undefined) patch.home_location = input.homeLocation;
      if (input.birthday !== undefined) patch.birthday = input.birthday;
      if (input.skinNotes !== undefined) patch.skin_notes = input.skinNotes;
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
      clientName,
      refresh,
      createAppointment,
      updateAppointmentStatus,
      createClient,
      updateClient,
      addClientNote,
      createProduct,
      updateProduct,
      createMembershipPlan,
      createServicePackage,
      addExpense,
    };
  }, [
    data,
    status,
    errorMessage,
    profile,
    refresh,
    createAppointment,
    updateAppointmentStatus,
    createClient,
    updateClient,
    addClientNote,
    createProduct,
    updateProduct,
    createMembershipPlan,
    createServicePackage,
    addExpense,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = React.useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
