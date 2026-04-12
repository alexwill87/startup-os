import { supabase } from "./supabase";

const SITE_URL = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_SITE_URL || "https://radar-cockpit.vercel.app");

/**
 * Log an activity and notify via server-side API (handles quiet hours)
 */
export async function logActivity(action, entityType, opts = {}) {
  const { data: { user } } = await supabase.auth.getUser();

  let actorName = "Someone";
  let actorEmail = user?.email || "unknown";
  if (user?.email) {
    const { data: member } = await supabase
      .from("cockpit_members")
      .select("name")
      .eq("email", user.email)
      .single();
    if (member) actorName = member.name;
  }

  await supabase.from("cockpit_activity").insert({
    action,
    entity_type: entityType,
    entity_id: opts.id || null,
    entity_title: opts.title || null,
    actor_email: actorEmail,
    actor_name: actorName,
    metadata: opts.metadata || {},
  });

  // Send Telegram via server-side API (handles quiet hours properly)
  try {
    await fetch(`${SITE_URL}/api/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor: actorName, action, entityType, title: opts.title }),
    });
  } catch (e) {
    console.log("Telegram notification skipped:", e.message);
  }
}
