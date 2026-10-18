"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useWedding } from "./WeddingProvider";

const tabs = [
  ["/", "Dashboard"],
  ["/guests", "Guests"],
  ["/events", "Events"],
  ["/family", "Family"],
];

function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

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
    <main className="mx-auto mt-24 max-w-sm p-6">
      <h1 className="mb-2 text-2xl font-semibold">Wedding Planner</h1>
      {sent ? (
        <p className="text-gray-600">Check your email for a sign-in link.</p>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-gray-600">Enter your email and we will send you a sign-in link.</p>
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" className="w-full rounded border p-2"
          />
          <button className="w-full rounded bg-rose-600 p-2 text-white">Send link</button>
          {err && <p className="text-sm text-red-600">{err}</p>}
        </form>
      )}
    </main>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const { session, loading, me, canEdit, error } = useWedding();
  const path = usePathname();

  if (loading) return <p className="p-6 text-gray-500">Loading…</p>;
  if (!session) return <Login />;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <nav className="flex gap-1">
          {tabs.map(([href, label]) => (
            <Link
              key={href} href={href}
              className={`rounded px-3 py-1.5 text-sm ${path === href ? "bg-rose-600 text-white" : "hover:bg-gray-100"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{session.user.email} · {me ? (canEdit ? "editor" : "viewer") : "…"}</span>
          <button onClick={() => supabase().auth.signOut()} className="underline">Sign out</button>
        </div>
      </header>
      {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {me && !canEdit && (
        <p className="mb-3 rounded bg-amber-50 p-2 text-sm text-amber-800">
          You have view-only access. Ask an editor to upgrade you on the Family page.
        </p>
      )}
      {children}
    </div>
  );
}
