import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://radar-cockpit.vercel.app";

export async function GET(request) {
  // Verify cron secret (optional security)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Determine which recap this is (morning or night)
  const now = new Date();
  const currentHour = now.getUTCHours() + 2; // Paris time (approximate)
  const type = request.nextUrl?.searchParams?.get("type") || (currentHour < 15 ? "morning" : "night");

  // Get bot token
  const { data: tokenRow } = await supabase.from("cockpit_config").select("value").eq("key", "telegram_bot_token").single();
  if (!tokenRow?.value) return Response.json({ error: "No bot token" });
  const token = tokenRow.value;

  // Get eligible members
  const recapField = type === "morning" ? "notif_morning_recap" : "notif_night_recap";
  const hourField = type === "morning" ? "notif_morning_hour" : "notif_night_hour";

  const { data: members } = await supabase
    .from("cockpit_members")
    .select("*")
    .not("telegram_chat_id", "is", null)
    .eq("status", "active")
    .eq(recapField, true);

  if (!members || members.length === 0) return Response.json({ sent: 0, reason: "No eligible members" });

  // Build summary data
  const since = new Date(now.getTime() - (type === "morning" ? 14 * 60 * 60 * 1000 : 10 * 60 * 60 * 1000)); // last 14h for morning, 10h for night

  const [{ data: activity }, { data: tasks }, { data: projects }, { data: features }] = await Promise.all([
    supabase.from("cockpit_activity").select("action, entity_type, entity_title, actor_name").gte("created_at", since.toISOString()).order("created_at", { ascending: false }).limit(20),
    supabase.from("cockpit_tasks").select("title, status"),
    supabase.from("cockpit_projects").select("name, status"),
    supabase.from("cockpit_features_os").select("name, step_1_done, step_2_done, step_3_done, step_4_done, step_5_done"),
  ]);

  // Stats
  const t = tasks || [];
  const todoCount = t.filter((x) => x.status === "todo").length;
  const inProgressCount = t.filter((x) => x.status === "in_progress").length;
  const doneCount = t.filter((x) => x.status === "done").length;
  const blockedCount = t.filter((x) => x.status === "blocked").length;

  const p = projects || [];
  const activeProjects = p.filter((x) => x.status === "active" || x.status === "locked").length;
  const proposedProjects = p.filter((x) => x.status === "proposed").length;

  const f = features || [];
  const totalFeatures = f.length;
  const validatedFeatures = f.filter((x) => x.step_5_done).length;

  const activityLines = (activity || []).slice(0, 10).map((a) => `  • ${a.actor_name}: ${a.action} ${a.entity_type}${a.entity_title ? ` — ${a.entity_title}` : ""}`).join("\n");

  const emoji = type === "morning" ? "☀️" : "🌙";
  const greeting = type === "morning" ? "Good morning" : "Good evening";
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  const message = `${emoji} *${greeting}! Daily Recap — ${dateStr}*

📊 *Tasks:* ${t.length} total
  ✅ Done: ${doneCount} | 🔄 In progress: ${inProgressCount}
  📝 Todo: ${todoCount} | 🔴 Blocked: ${blockedCount}

🚀 *Projects:* ${activeProjects} active, ${proposedProjects} voting
🔧 *Features:* ${validatedFeatures}/${totalFeatures} validated

${activityLines ? `📋 *Recent activity:*\n${activityLines}` : "No recent activity."}

🔗 ${SITE_URL}`;

  // Send to each eligible member
  let sent = 0;
  for (const m of members) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: m.telegram_chat_id,
          text: message,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }),
      });
      sent++;
    } catch (e) {
      console.log(`Failed to send to ${m.name}:`, e.message);
    }
  }

  return Response.json({ sent, type, members: members.length });
}
