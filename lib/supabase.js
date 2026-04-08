import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Customize these sprints for your project timeline
export const SPRINTS = [
  { id: 1, name: "Sprint 1 — Foundation", date: "2026-01-06" },
  { id: 2, name: "Sprint 2 — Features", date: "2026-01-13" },
  { id: 3, name: "Sprint 3 — Growth", date: "2026-01-20" },
  { id: 4, name: "Sprint 4 — Launch", date: "2026-01-27" },
];
