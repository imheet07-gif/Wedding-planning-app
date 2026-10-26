import { createClient } from "@supabase/supabase-js";

export const json = (body: object, status: number) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

// Returns an error response unless the caller is a signed-in editor (checked against Supabase with their own token).
export async function requireEditor(req: Request): Promise<Response | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Please sign in again." }, 401);
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key!, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: auth } = await db.auth.getUser(token);
  if (!auth.user) return json({ error: "Please sign in again." }, 401);
  const { data: me } = await db.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
  if (me?.role !== "editor") return json({ error: "Only editors can sync guests." }, 403);
  return null;
}
