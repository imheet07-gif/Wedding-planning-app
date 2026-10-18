# Wedding Planner

Guests, events (Haldi, Mehendi, Sangeet, Mameru, Wedding Day), RSVPs and family logins.
Vendors, budget and accommodation come in later phases.

Stack: Next.js (hosted on Vercel) + Supabase (database and email-link login).

## Setup
1. Supabase: create a project, open SQL Editor, run `supabase/schema.sql`.
2. Supabase → Project Settings → API: copy the Project URL and the anon public key.
3. Locally: `cp .env.example .env.local`, fill in both values, `npm install`, `npm run dev`.
4. Vercel: import this repo, add the same two environment variables, deploy.
5. Supabase → Authentication → URL Configuration: set Site URL to your Vercel URL
   (and add `http://localhost:3000` to Redirect URLs for local use).
6. Open the site and sign in first: the first account becomes the editor.
   Others sign in later and you promote them on the Family page.
