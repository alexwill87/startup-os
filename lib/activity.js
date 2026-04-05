import { supabase } from "./supabase";

/**
 * Log an activity and optionally notify Telegram
 * @param {string} action - e.g. "created", "updated", "completed", "commented"
 * @param {string} entityType - e.g. "task", "decision", "member", "resource"
 * @param {object} opts - { id, title, metadata }
 */
export async function logActivity(action, entityType, opts = {}) {
  const { data: { user } } = await supabase.auth.getUser();

  // Get member name
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

  // Log to activity table
  await supabase.from("cockpit_activity").insert({
    action,
    entity_type: entityType,
    entity_id: opts.id || null,
    entity_title: opts.title || null,
    actor_email: actorEmail,
    actor_name: actorName,
    metadata: opts.metadata || {},
  });

  // Send Telegram notification
  try {
    await sendTelegramNotification(actorName, action, entityType, opts.title);
  } catch (e) {
    // Silent fail — Telegram is optional
    console.log("Telegram notification skipped:", e.message);
  }
}

async function sendTelegramNotification(actor, action, entityType, title) {
  // Get bot config from cockpit_config
  const { data: tokenRow } = await supabase
    .from("cockpit_config")
    .select("value")
    .eq("key", "telegram_bot_token")
    .single();

  const { data: chatRow } = await supabase
    .from("cockpit_config")
    .select("value")
    .eq("key", "telegram_chat_id")
    .single();

  if (!tokenRow?.value || !chatRow?.value) return;

  const token = tokenRow.value;
  const chatId = chatRow.value;

  const emoji = {
    created: "🆕",
    updated: "✏️",
    completed: "✅",
    commented: "💬",
    invited: "👋",
    resolved: "🎯",
    deleted: "🗑️",
  }[action] || "📌";

  const message = `${emoji} *${actor}* ${action} ${entityType}${title ? `: ${title}` : ""}`;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  });
}
