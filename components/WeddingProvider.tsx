"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Guest, Invitation, Profile, WeddingEvent } from "@/lib/types";

type Ctx = {
  session: Session | null;
  loading: boolean;
  me: Profile | null;
  canEdit: boolean;
  events: WeddingEvent[];
  guests: Guest[];
  invitations: Invitation[];
  profiles: Profile[];
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
  const [events, setEvents] = useState<WeddingEvent[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const db = supabase();
    const [e, g, i, p] = await Promise.all([
      db.from("events").select("*").order("sort_order"),
      db.from("guests").select("*").order("name"),
      db.from("invitations").select("*"),
      db.from("profiles").select("*").order("email"),
    ]);
    const failed = [e, g, i, p].find((r) => r.error);
    setError(failed?.error?.message ?? null);
    setEvents((e.data as WeddingEvent[]) ?? []);
    setGuests((g.data as Guest[]) ?? []);
    setInvitations((i.data as Invitation[]) ?? []);
    setProfiles((p.data as Profile[]) ?? []);
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
      value={{ session, loading, me, canEdit: me?.role === "editor", events, guests, invitations, profiles, error, refresh }}
    >
      {children}
    </WeddingContext.Provider>
  );
}
