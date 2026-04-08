import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data } = await supabase.from("cockpit_vision").select("body").eq("topic", "other").eq("title", "config:logo_url").maybeSingle();

    if (data?.body) {
      // Fetch the actual image and serve it
      const res = await fetch(data.body);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "image/png";
        const buffer = await res.arrayBuffer();
        return new Response(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=300",
          },
        });
      }
    }

    // Fallback: serve a simple SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#3b82f6"/><text x="16" y="22" text-anchor="middle" fill="white" font-size="18" font-family="sans-serif" font-weight="bold">R</text></svg>`;
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=60" } });
  } catch {
    return new Response("", { status: 404 });
  }
}
