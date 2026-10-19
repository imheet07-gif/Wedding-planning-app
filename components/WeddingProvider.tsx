"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type {
  BudgetCategory, Expense, Guest, Invitation, Payment, Profile, Property, Room, Stay, Task, Vendor, VendorEvent,
  WeddingEvent,
} from "@/lib/types";

type Ctx = {
  session: Session | null;
  loading: boolean;
  ready: boolean;
  me: Profile | null;
  canEdit: boolean;
  events: WeddingEvent[];
  guests: Guest[];
  invitations: Invitation[];
  profiles: Profile[];
  vendors: Vendor[];
  vendorEvents: VendorEvent[];
  payments: Payment[];
  budget: BudgetCategory[];
  expenses: Expense[];
  properties: Property[];
  rooms: Room[];
  stays: Stay[];
  tasks: Task[];
  settings: Record<string, string>;
  error: string | null;
  refresh: () => Promise<void>;
};

const WeddingContext = createContext<Ctx | null>(null);

export function useWedding() {
  const ctx = useContext(WeddingContext);
  if (!ctx) throw new Error("useWedding outside provider");
  return ctx;
}

export function WeddingProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorEvents, setVendorEvents] = useState<VendorEvent[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [budget, setBudget] = useState<BudgetCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stays, setStays] = useState<Stay[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const db = supabase();
    const [e, g, i, p, v, ve, pay, b, x, pr, rm, st, tk, se] = await Promise.all([
      db.from("events").select("*").order("sort_order"),
      db.from("guests").select("*").order("name"),
      db.from("invitations").select("*"),
      db.from("profiles").select("*").order("email"),
      db.from("vendors").select("*").order("name"),
      db.from("vendor_events").select("*"),
      db.from("payments").select("*").order("due_on"),
      db.from("budget_categories").select("*"),
      db.from("expenses").select("*").order("created_at", { ascending: false }),
      db.from("properties").select("*").order("name"),
      db.from("rooms").select("*").order("name"),
      db.from("stays").select("*"),
      db.from("tasks").select("*").order("created_at"),
      db.from("app_settings").select("*"),
    ]);
    const failed = [e, g, i, p, v, ve, pay, b, x, pr, rm, st, tk, se].find((r) => r.error);
    setError(failed?.error?.message ?? null);
    setEvents((e.data as WeddingEvent[]) ?? []);
    setGuests((g.data as Guest[]) ?? []);
    setInvitations((i.data as Invitation[]) ?? []);
    setProfiles((p.data as Profile[]) ?? []);
    setVendors((v.data as Vendor[]) ?? []);
    setVendorEvents((ve.data as VendorEvent[]) ?? []);
    setPayments((pay.data as Payment[]) ?? []);
    setBudget((b.data as BudgetCategory[]) ?? []);
    setExpenses((x.data as Expense[]) ?? []);
    setProperties((pr.data as Property[]) ?? []);
    setRooms(((rm.data as Room[]) ?? []).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })));
    setStays((st.data as Stay[]) ?? []);
    setTasks((tk.data as Task[]) ?? []);
    setReady(true);
    setSettings(Object.fromEntries(((se.data as { key: string; value: string }[]) ?? []).map((r) => [r.key, r.value])));
  }, []);

  useEffect(() => {
    const db = supabase();
    db.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    refresh();
    // Pick up other family members' edits without a manual reload.
    const timer = setInterval(refresh, 20000);
    return () => clearInterval(timer);
  }, [session, refresh]);

  const me = profiles.find((p) => p.id === session?.user.id) ?? null;

  return (
    <WeddingContext.Provider
      value={{ session, loading, ready, me, canEdit: me?.role === "editor", events, guests, invitations, profiles, vendors, vendorEvents, payments, budget, expenses, properties, rooms, stays, tasks, settings, error, refresh }}
    >
      {children}
    </WeddingContext.Provider>
  );
}
