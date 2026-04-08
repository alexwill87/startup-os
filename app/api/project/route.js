import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase.from("cockpit_vision").select("body, title").eq("topic", "other")
      .in("title", ["config:project_name", "config:description", "config:logo_url", "config:landing_features"]);

    const result = { name: "Startup OS", description: "", logo: null, features: [] };
    (data || []).forEach((r) => {
      if (r.title === "config:project_name" && r.body) result.name = r.body;
      if (r.title === "config:description" && r.body) result.description = r.body;
      if (r.title === "config:logo_url" && r.body) result.logo = r.body;
      if (r.title === "config:landing_features" && r.body) { try { result.features = JSON.parse(r.body); } catch {} }
    });

    return Response.json(result);
  } catch {
    return Response.json({ name: "Startup OS", description: "", logo: null });
  }
}
