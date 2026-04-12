import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://radar-cockpit.vercel.app";

const ENTITY_ROUTES = {
  task: "/focus/tasks",
  project: "/focus/projects",
  sprint: "/focus/sprints",
  vision: "/focus/vision",
  feature: "/product/features",
  cockpit_feature: "/cockpit-feat",
  idea: "/product/ideas",
  feedback: "/product/feedback",
  member: "/team/members",
  resource: "/me/resources",
  kpi: "/business/kpis",
  decision: "/focus/projects",
  file: "/me/resources",
  doc: "/settings/guide",
};

export async function POST(request) {
  try {
    const { actor, action, entityType, title } = await request.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tokenRow } = await supabase.from("cockpit_config").select("value").eq("key", "telegram_bot_token").single();
    if (!tokenRow?.value) return Response.json({ ok: true, sent: 0 });
    const token = tokenRow.value;

    const { data: members } = await supabase
      .from("cockpit_members")
      .select("name, telegram_chat_id, notif_enabled, notif_quiet_start, notif_quiet_end")
      .not("telegram_chat_id", "is", null)
      .eq("status", "active");

    if (!members || members.length === 0) return Response.json({ ok: true, sent: 0 });

    // Server-side time — reliable
    const now = new Date();
    const parisHour = parseInt(now.toLocaleString("en-US", { timeZone: "Europe/Paris", hour: "numeric", hour12: false }));

    const emoji = {
      created: "🆕", updated: "✏️", completed: "✅", commented: "💬",
      invited: "👋", resolved: "🎯", deleted: "🗑️", voted: "🗳️",
      locked: "🔒", activated: "🚀", archived: "📦",
    }[action] || "📌";

    const route = ENTITY_ROUTES[entityType] || "/";
    const url = `${SITE_URL}${route}`;
    const message = `${emoji} *${actor}* ${action} ${entityType}${title ? `: ${title}` : ""}\n\n🔗 ${url}`;

    let sent = 0;
    for (const m of members) {
      if (!m.notif_enabled) continue;

      const qStart = m.notif_quiet_start ?? 22;
      const qEnd = m.notif_quiet_end ?? 9;
      if (isInQuietHours(parisHour, qStart, qEnd)) continue;

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: m.telegram_chat_id, text: message, parse_mode: "Markdown", disable_web_page_preview: true }),
      });
      sent++;
    }

    return Response.json({ ok: true, sent });
  } catch (e) {
    return Response.json({ ok: false, error: e.message });
  }
}

function isInQuietHours(currentHour, quietStart, quietEnd) {
  const h = ((currentHour % 24) + 24) % 24;
  if (quietStart <= quietEnd) return h >= quietStart && h < quietEnd;
  return h >= quietStart || h < quietEnd;
}
