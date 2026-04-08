import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const { name, email, role, linkedin, message } = await request.json();
    if (!name?.trim() || !email?.trim()) {
      return Response.json({ error: "Name and email are required." }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if already exists
    const { data: existing } = await supabase.from("cockpit_members").select("id, status").eq("email", email.trim()).maybeSingle();
    if (existing?.status === "active") return Response.json({ error: "This email is already a member." });
    if (existing?.status === "invited") return Response.json({ error: "You've already been invited. Check your email." });

    const ROLE_COLORS = { observer: "#64748b", mentor: "#10b981", cofounder: "#3b82f6" };

    // Insert
    const { error: insertErr } = await supabase.from("cockpit_members").insert({
      email: email.trim(), name: name.trim(), role: role || "observer",
      linkedin: linkedin?.trim() || null, bio: message?.trim() || null,
      status: "invited", color: ROLE_COLORS[role] || "#64748b",
    });

    if (insertErr) return Response.json({ error: "Could not submit: " + insertErr.message });

    // Log activity
    await supabase.from("cockpit_activity").insert({
      action: "created", entity_type: "member",
      entity_title: `${name} applied as ${role}`,
      actor_name: name.trim(), actor_email: email.trim(),
      metadata: { source: "apply_form", role, message },
    });

    // Telegram notification
    try {
      const { data: tokenRow } = await supabase.from("cockpit_config").select("value").eq("key", "telegram_bot_token").maybeSingle();
      const { data: chatRow } = await supabase.from("cockpit_config").select("value").eq("key", "telegram_chat_id").maybeSingle();
      if (tokenRow?.value && chatRow?.value) {
        await fetch(`https://api.telegram.org/bot${tokenRow.value}/sendMessage`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatRow.value,
            text: `New application!\n\n${name} (${email})\nRole: ${role}${linkedin ? `\nLinkedIn: ${linkedin}` : ""}${message ? `\nMessage: ${message}` : ""}`,
          }),
        });
      }
    } catch { /* best effort */ }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: "Server error." }, { status: 500 });
  }
}
