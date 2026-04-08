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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load all config
    const { data: configRows } = await supabase.from("cockpit_config").select("key, value");
    const cfg = {};
    (configRows || []).forEach((r) => (cfg[r.key] = r.value));

    const botToken = cfg.telegram_bot_token;
    if (!botToken) return Response.json({ ok: true });

    // Handle /start
    if (text === "/start") {
      await sendTelegram(botToken, chatId, `👋 Hello ${userName}! I'm the Project OS bot.\n\nI can read your project data, answer questions, and create tasks.\n\nCommands:\n• Ask anything: "project status", "blocked tasks?"\n• Create task: "/task Fix the login bug"\n• Summary: "/summary"\n\nYour chat ID: \`${chatId}\``);
      return Response.json({ ok: true });
    }

    // Handle /task command — create a task
    if (text.startsWith("/task ")) {
      const taskTitle = text.slice(6).trim();
      if (taskTitle) {
        const { error } = await supabase.from("cockpit_tasks").insert({
          title: taskTitle,
          sprint: 1,
          builder: "A",
          status: "todo",
          priority: "medium",
        });
        if (!error) {
          // Log activity
          await supabase.from("cockpit_activity").insert({
            action: "created",
            entity_type: "task",
            entity_title: taskTitle,
            actor_name: userName + " (via Telegram)",
            actor_email: "telegram",
          });
          await sendTelegram(botToken, chatId, `✅ Task created: "${taskTitle}"`);
        } else {
          await sendTelegram(botToken, chatId, `❌ Failed to create task: ${error.message}`);
        }
      }
      return Response.json({ ok: true });
    }

    // Handle /summary command
    if (text === "/summary") {
      const [{ data: tasks }, { data: decisions }, { data: members }] = await Promise.all([
        supabase.from("cockpit_tasks").select("status"),
        supabase.from("cockpit_decisions").select("status"),
        supabase.from("cockpit_members").select("name, status").eq("status", "active"),
      ]);

      const t = tasks || [];
      const done = t.filter((x) => x.status === "done").length;
      const inProg = t.filter((x) => x.status === "in_progress").length;
      const blocked = t.filter((x) => x.status === "blocked").length;
      const todo = t.filter((x) => x.status === "todo").length;
      const d = decisions || [];
      const openDec = d.filter((x) => x.status === "open").length;

      const summary = `📊 *Project Summary*\n\n👥 Team: ${(members || []).map((m) => m.name).join(", ")}\n\n📋 Tasks: ${t.length} total\n✅ Done: ${done}\n🔄 In Progress: ${inProg}\n📝 Todo: ${todo}\n🔴 Blocked: ${blocked}\n\n🗳 Decisions: ${d.length} total (${openDec} open)`;

      await sendTelegram(botToken, chatId, summary);
      return Response.json({ ok: true });
    }

    // Get provider and model from config
    const provider = cfg.bot_provider || "openrouter";
    const model = cfg.bot_model || "anthropic/claude-3-haiku";

    // Get API key for the selected provider
    const { data: keyRow } = await supabase
      .from("cockpit_api_keys")
      .select("key_encrypted")
      .eq("provider", provider)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    // Fallback: try any available key
    let apiKey = null;
    let actualProvider = provider;

    if (keyRow?.key_encrypted) {
      apiKey = atob(keyRow.key_encrypted);
    } else {
      // Try other providers
      for (const fallback of ["openrouter", "anthropic", "mistral"]) {
        if (fallback === provider) continue;
        const { data: fbKey } = await supabase
          .from("cockpit_api_keys")
          .select("key_encrypted")
          .eq("provider", fallback)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (fbKey?.key_encrypted) {
          apiKey = atob(fbKey.key_encrypted);
          actualProvider = fallback;
          break;
        }
      }
    }

    if (!apiKey) {
      await sendTelegram(botToken, chatId, "⚠️ No API key found. Add one in Config > API Keys.");
      return Response.json({ ok: true });
    }

    // Gather project context
    const [
      { data: tasks },
      { data: decisions },
      { data: members },
      { data: kpis },
      { data: activity },
    ] = await Promise.all([
      supabase.from("cockpit_tasks").select("title, status, builder, sprint, task_ref").order("created_at", { ascending: false }).limit(20),
      supabase.from("cockpit_decisions").select("title, status, decision").order("created_at", { ascending: false }).limit(10),
      supabase.from("cockpit_members").select("name, role, builder, status").eq("status", "active"),
      supabase.from("cockpit_kpis").select("*").order("date", { ascending: false }).limit(1),
      supabase.from("cockpit_activity").select("action, entity_type, entity_title, actor_name").order("created_at", { ascending: false }).limit(5),
    ]);

    const t = tasks || [];
    const context = `You are the Project OS bot. You help a team manage their project. Answer based on this data:

TEAM: ${(members || []).map((m) => `${m.name} (${m.role}, Builder ${m.builder})`).join(", ")}

TASKS (${t.length}): ${t.filter((x) => x.status === "done").length} done, ${t.filter((x) => x.status === "in_progress").length} in progress, ${t.filter((x) => x.status === "todo").length} todo, ${t.filter((x) => x.status === "blocked").length} blocked
${t.slice(0, 10).map((x) => `[${x.status}] ${x.task_ref || ""} ${x.title}`).join("\n")}

DECISIONS: ${(decisions || []).map((d) => `[${d.status}] ${d.title}`).join(", ")}

KPIs: ${kpis?.[0] ? `Users: ${kpis[0].users_registered}, Active: ${kpis[0].users_active_7d}, MRR: ${kpis[0].mrr_eur}€` : "None yet"}

RECENT: ${(activity || []).map((a) => `${a.actor_name} ${a.action} ${a.entity_type}`).join(", ")}

Rules: Keep replies under 300 chars. Use emojis. Answer in the same language as the question. Be concise and helpful. If asked to create a task, tell them to use /task command.`;

    // Call LLM based on provider
    let reply;

    if (actualProvider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model.startsWith("anthropic/") || model.startsWith("meta-") || model.startsWith("google/") || model.startsWith("mistralai/") || model.startsWith("qwen/") ? model : "anthropic/claude-3-haiku",
          max_tokens: 300,
          messages: [{ role: "system", content: context }, { role: "user", content: text }],
        }),
      });
      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || data.error?.message || "Error processing request.";
    } else if (actualProvider === "mistral") {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model || "mistral-small-latest",
          max_tokens: 300,
          messages: [{ role: "system", content: context }, { role: "user", content: text }],
        }),
      });
      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || data.message || "Error processing request.";
    } else {
      // Anthropic direct
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: model || "claude-haiku-4-5-20251001",
          max_tokens: 300,
          messages: [{ role: "user", content: text }],
          system: context,
        }),
      });
      const data = await res.json();
      reply = data.content?.[0]?.text || data.error?.message || "Error processing request.";
    }

    // Log bot activity
    if (cfg.bot_can_log_activity !== "false") {
      await supabase.from("cockpit_activity").insert({
        action: "responded",
        entity_type: "bot",
        entity_title: text.slice(0, 50),
        actor_name: "Bot",
        actor_email: "bot",
        metadata: { provider: actualProvider, model, user: userName },
      });
    }

    await sendTelegram(botToken, chatId, reply);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return Response.json({ ok: true });
  }
}

async function sendTelegram(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}
