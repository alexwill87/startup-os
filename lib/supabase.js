import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


export const SPRINTS = [
  { id: 1, name: "Sprint 1 — Fondations", date: "2026-04-05" },
  { id: 2, name: "Sprint 2 — Features Radar", date: "2026-04-12" },
  { id: 3, name: "Sprint 3 — Revenue & Retention", date: "2026-04-19" },
  { id: 4, name: "Sprint 4 — Demo Day & Extension", date: "2026-04-26" },
];
