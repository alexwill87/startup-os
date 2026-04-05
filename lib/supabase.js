import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Whitelist des 3 builders — seuls eux peuvent accéder au cockpit
export const ALLOWED_EMAILS = [
  "abdulmalikajibade@gmail.com",
  "alexwillemetz@gmail.com",
  "pokamblg@gmail.com",
];

export const BUILDERS = {
  "abdulmalikajibade@gmail.com": { name: "Abdulmalik", role: "A", color: "#3b82f6", branch: "abdulmalik" },
  "alexwillemetz@gmail.com": { name: "Alex", role: "B", color: "#10b981", branch: "alex" },
  "pokamblg@gmail.com": { name: "Loice", role: "C", color: "#f59e0b", branch: "loice" },
};

export const SPRINTS = [
  { id: 1, name: "Sprint 1 — Fondations", date: "2026-04-05" },
  { id: 2, name: "Sprint 2 — Features Radar", date: "2026-04-12" },
  { id: 3, name: "Sprint 3 — Revenue & Retention", date: "2026-04-19" },
  { id: 4, name: "Sprint 4 — Demo Day & Extension", date: "2026-04-26" },
];
