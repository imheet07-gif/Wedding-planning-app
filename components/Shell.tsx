"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BedDouble, CalendarHeart, ClipboardList, Heart, LayoutDashboard, ListChecks, MoreHorizontal, Phone, Printer, Settings as SettingsIcon,
  Send, Store, UsersRound, Wallet, X, LogOut, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "./WeddingProvider";
import { PageSkeleton } from "./ui";
import { TextSizeSync } from "./TextSize";

type Item = { href: string; label: string; hint: string; icon: LucideIcon };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Plan",
    items: [
      { href: "/", label: "Dashboard", hint: "Where everything stands", icon: LayoutDashboard },
      { href: "/guests", label: "Guests", hint: "Everyone invited, and who is coming", icon: UsersRound },
      { href: "/events", label: "Events", hint: "Dates, venues and RSVPs", icon: CalendarHeart },
      { href: "/invites", label: "Invites", hint: "Send invitations on WhatsApp", icon: Send },
      { href: "/calls", label: "Follow up", hint: "Call guests who have not answered yet", icon: Phone },
      { href: "/lists", label: "Lists", hint: "Print or share lists", icon: Printer },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/vendors", label: "Vendors", hint: "Everyone you are booking", icon: Store },
      { href: "/budget", label: "Budget", hint: "Planned, committed and paid", icon: Wallet },
    ],
  },
  {
    title: "Logistics",
    items: [
      { href: "/stay", label: "Stay", hint: "Who sleeps where", icon: BedDouble },
      { href: "/tasks", label: "Tasks", hint: "What still needs doing", icon: ListChecks },
    ],
  },
  {
    title: "Family & account",
    items: [
      { href: "/family", label: "Family", hint: "Who can see and edit", icon: Heart },
      { href: "/settings", label: "Settings", hint: "Text size, phone numbers and your account", icon: SettingsIcon },
    ],
  },
];

const ALL = GROUPS.flatMap((g) => g.items);
const BOTTOM = ["/", "/guests", "/invites", "/budget"];
const EXTRA: Record<string, { label: string; hint: string }> = {
  "/import": { label: "Import guests", hint: "Add many guests from a spreadsheet" },
};

function Brand({ light = false }: { light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 font-display text-lg ${light ? "text-white" : "text-rose-800"}`}>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${light ? "bg-white/15" : "bg-rose-600 text-white"}`}>
        <Heart size={16} fill="currentColor" />
      </span>
      Wedding Planner
    </span>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function google() {
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setErr(error.message);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <main className="grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <section className="hero flex flex-col justify-between gap-6 p-6 text-white lg:p-14">
        <Brand light />
        <div className="py-2 lg:py-12">
          <h1 className="font-display text-3xl leading-tight lg:text-5xl">Every guest, vendor and detail in one place.</h1>
          <p className="mt-4 max-w-md text-rose-100">Plan the haldi, mehendi, sangeet, mameru and wedding day together with the family.</p>
        </div>
        <p className="hidden text-sm text-rose-200 lg:block">Private to the family. New sign-ins are approved by an editor.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up space-y-4">
          <h2 className="font-display text-2xl">Welcome</h2>
          <button onClick={google} className="w-full rounded-lg border bg-white p-3 font-medium shadow-sm hover:bg-gray-50">
            Sign in with Google
          </button>
          <div className="flex items-center gap-3 text-xs text-gray-400"><span className="h-px flex-1 bg-gray-200" />or<span className="h-px flex-1 bg-gray-200" /></div>
          {sent ? (
            <p className="rounded-lg bg-green-50 p-3 text-green-800">Check your email for a sign-in link.</p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" className="w-full rounded-lg border p-3"
              />
              <button className="w-full rounded-lg bg-rose-600 p-3 font-medium text-white">Email me a sign-in link</button>
            </form>
          )}
          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>
      </section>
    </main>
  );
}

function NavLink({ item, active, onClick }: { item: Item; active: boolean; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-rose-600 text-white shadow-sm" : "text-gray-700 hover:bg-rose-50 hover:text-rose-800"}`}
    >
      <Icon size={18} className={active ? "" : "text-gray-400 group-hover:text-rose-600"} />
      {item.label}
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { session, loading, ready, me, canEdit, error } = useWedding();
  const path = usePathname();
  const [more, setMore] = useState(false);

  useEffect(() => setMore(false), [path]);
  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [more]);

  // Public page, so it can be linked from the Google sign-in consent screen.
  if (path === "/privacy") return <>{children}</>;

  if (loading) {
    return <div className="mx-auto max-w-5xl p-6"><PageSkeleton /></div>;
  }
  if (!session) return <Login />;

  if (me?.role === "pending") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6 text-center">
        <div className="mx-auto"><Brand /></div>
        <div className="card animate-fade-up space-y-3 p-6">
          <h1 className="font-display text-2xl">Waiting for approval</h1>
          <p className="text-gray-600">
            You are signed in as {session.user.email}. An editor needs to approve you before you can see the
            wedding plans. Ask them to open the Family page and approve you.
          </p>
          <button onClick={() => supabase().auth.signOut()} className="text-sm text-rose-700 underline">Sign out</button>
        </div>
      </main>
    );
  }

  const current = ALL.find((i) => i.href === path) ?? (EXTRA[path] ? { ...EXTRA[path] } : null);
  const email = session.user.email ?? "";
  const initial = email.charAt(0).toUpperCase();
  const role = me ? (canEdit ? "Editor" : "Viewer") : "";

  const bottom = ALL.filter((i) => BOTTOM.includes(i.href));
  const moreItems = ALL.filter((i) => !BOTTOM.includes(i.href));
  const moreActive = moreItems.some((i) => i.href === path) || path in EXTRA;

  return (
    <div className="min-h-dvh lg:pl-64">
      <TextSizeSync />
      <a href="#main" className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-rose-800 shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-white px-3 py-5 lg:flex print:hidden">
        <div className="mb-6 px-3"><Brand /></div>
        <nav className="flex-1 space-y-5 overflow-y-auto">
          {GROUPS.map((g) => (
            <div key={g.title} className="space-y-1">
              {g.items.length > 1 && <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{g.title}</p>}
              {g.items.map((i) => <NavLink key={i.href} item={i} active={path === i.href} />)}
            </div>
          ))}
        </nav>
        <div className="flex items-center gap-3 px-3 pt-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 font-medium text-rose-700">{initial}</span>
          <span className="min-w-0 flex-1 text-xs">
            <span className="block truncate text-gray-700">{email}</span>
            <span className="text-gray-400">{role}</span>
          </span>
          <button onClick={() => supabase().auth.signOut()} title="Sign out" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white/90 px-4 pb-3 pt-[calc(0.75rem+var(--safe-top))] backdrop-blur lg:hidden print:hidden">
        <Brand />
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-sm font-medium text-rose-700">{initial}</span>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-5xl overflow-x-hidden px-4 pb-[calc(7rem+var(--safe-bottom))] pt-5 outline-none lg:px-8 lg:pb-12 lg:pt-8">
        {current && (
          <div className="mb-5 print:hidden">
            <h1 className="font-display text-3xl text-gray-900">{current.label}</h1>
            <p className="text-sm text-gray-500">{current.hint}</p>
          </div>
        )}
        {error && <p role="alert" className="card mb-4 border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {me && !canEdit && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            You have view-only access. Ask an editor to upgrade you on the Family page.
          </p>
        )}
        {ready ? <div key={path} className="animate-fade-up">{children}</div> : <PageSkeleton />}
      </main>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-white/95 pb-[var(--safe-bottom)] backdrop-blur lg:hidden print:hidden">
        {bottom.map((i) => {
          const Icon = i.icon;
          const active = path === i.href;
          return (
            <Link key={i.href} href={i.href} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-rose-700" : "text-gray-500"}`}>
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${active ? "bg-rose-100" : ""}`}><Icon size={20} /></span>
              {i.label}
            </Link>
          );
        })}
        <button onClick={() => setMore(true)} className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${moreActive ? "text-rose-700" : "text-gray-500"}`}>
          <span className={`flex h-7 w-12 items-center justify-center rounded-full ${moreActive ? "bg-rose-100" : ""}`}><MoreHorizontal size={20} /></span>
          More
        </button>
      </nav>

      {more && (
        <div className="fixed inset-0 z-40 lg:hidden print:hidden" role="dialog" aria-modal="true" aria-label="More">
          <button aria-label="Close" className="absolute inset-0 bg-black/40" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 animate-sheet rounded-t-2xl bg-white p-4 pb-[calc(1rem+var(--safe-bottom))] shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-lg">More</span>
              <button onClick={() => setMore(false)} aria-label="Close menu" className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"><X size={18} aria-hidden /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {moreItems.map((i) => {
                const Icon = i.icon;
                return (
                  <Link key={i.href} href={i.href} className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium ${path === i.href ? "border-rose-300 bg-rose-50 text-rose-800" : "text-gray-700"}`}>
                    <Icon size={20} className="text-rose-600" />
                    {i.label}
                  </Link>
                );
              })}
              <Link href="/import" className="flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium text-gray-700">
                <ClipboardList size={20} className="text-rose-600" />
                Import
              </Link>
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
              <span className="min-w-0 truncate text-gray-500">{email} · {role}</span>
              <button onClick={() => supabase().auth.signOut()} className="shrink-0 text-rose-700 underline">Sign out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
