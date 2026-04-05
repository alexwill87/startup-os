import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const body = await request.json();
    const message = body.message;

    if (!message?.text || !message?.chat?.id) {
      return Response.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text;
    const userName = message.from?.first_name || "User";

    // Get bot token from config
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle /start
    if (text === "/start") {
      const { data: tokenRow } = await supabase.from("cockpit_config").select("value").eq("key", "telegram_bot_token").single();
      if (tokenRow?.value) {
        await sendTelegramWithToken(tokenRow.value, chatId, `👋 Hello ${userName}! I'm the Project OS bot.\n\nAsk me anything about your project — tasks, decisions, KPIs, team status.\n\nExamples:\n• "What tasks are blocked?"\n• "How many tasks are done?"\n• "What decisions are open?"\n• "Project status"\n\nYour chat ID: \`${chatId}\``);
      }
      return Response.json({ ok: true });
    }

    const { data: tokenRow } = await supabase
      .from("cockpit_config")
      .select("value")
      .eq("key", "telegram_bot_token")
      .single();

    if (!tokenRow?.value) {
      return Response.json({ ok: true });
    }

    // Get Claude API key from vault
    const { data: apiKeyRow } = await supabase
      .from("cockpit_api_keys")
      .select("key_encrypted")
      .eq("provider", "anthropic")
      .eq("is_active", true)
      .eq("scope", "project")
      .limit(1)
      .single();

    if (!apiKeyRow?.key_encrypted) {
      await sendTelegramWithToken(tokenRow.value, chatId, "⚠️ No Anthropic API key configured. Go to Config > API Keys to add one.");
      return Response.json({ ok: true });
    }

    const claudeKey = atob(apiKeyRow.key_encrypted);

    // Gather project context from Supabase
    const [
      { data: tasks },
      { data: decisions },
      { data: members },
      { data: kpis },
      { data: recentActivity },
    ] = await Promise.all([
      supabase.from("cockpit_tasks").select("title, status, builder, sprint, task_ref").order("created_at", { ascending: false }).limit(20),
      supabase.from("cockpit_decisions").select("title, status, decision").order("created_at", { ascending: false }).limit(10),
      supabase.from("cockpit_members").select("name, role, builder, status").eq("status", "active"),
      supabase.from("cockpit_kpis").select("*").order("date", { ascending: false }).limit(1),
      supabase.from("cockpit_activity").select("action, entity_type, entity_title, actor_name, created_at").order("created_at", { ascending: false }).limit(10),
    ]);

    const context = `You are the Project OS bot for a team project. Answer questions based on this data:

TEAM MEMBERS:
${(members || []).map((m) => `- ${m.name} (Builder ${m.builder}, ${m.role})`).join("\n")}

TASKS (${(tasks || []).length} total):
${(tasks || []).map((t) => `- [${t.status}] ${t.task_ref || ""} ${t.title} (Builder ${t.builder})`).join("\n")}

Task stats: ${(tasks || []).filter((t) => t.status === "done").length} done, ${(tasks || []).filter((t) => t.status === "in_progress").length} in progress, ${(tasks || []).filter((t) => t.status === "todo").length} todo, ${(tasks || []).filter((t) => t.status === "blocked").length} blocked

DECISIONS:
${(decisions || []).map((d) => `- [${d.status}] ${d.title}${d.decision ? " → " + d.decision : ""}`).join("\n")}

LATEST KPIs:
${kpis && kpis[0] ? JSON.stringify(kpis[0]) : "No KPIs logged yet"}

RECENT ACTIVITY:
${(recentActivity || []).map((a) => `- ${a.actor_name} ${a.action} ${a.entity_type}: ${a.entity_title || ""}`).join("\n")}

Keep responses short (under 300 chars for Telegram). Use emojis. Be helpful and direct.`;

    // Call Claude Haiku
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [{ role: "user", content: text }],
        system: context,
      }),
    });

    const claudeData = await claudeRes.json();
    const reply = claudeData.content?.[0]?.text || "Sorry, I couldn't process that. Try again.";

    await sendTelegramWithToken(tokenRow.value, chatId, reply);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return Response.json({ ok: true });
  }
}

async function sendTelegram(chatId, text) {
  // This version needs the token from config — used for /start only
  // For /start we just respond inline, no need for token
}

async function sendTelegramWithToken(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
}
