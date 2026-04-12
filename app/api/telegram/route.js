import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://radar-cockpit.vercel.app";

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

    // Load config
    const { data: configRows } = await supabase.from("cockpit_config").select("key, value");
    const cfg = {};
    (configRows || []).forEach((r) => (cfg[r.key] = r.value));

    const botToken = cfg.telegram_bot_token;
    if (!botToken) return Response.json({ ok: true });

    // Handle /start
    if (text === "/start") {
      await sendTelegram(botToken, chatId, `Hello ${userName}! I'm Steve, the Startup Assistant.\n\nI can read project data, answer questions, and create tasks.\n\nCommands:\n- Ask anything: "project status", "blocked tasks?"\n- Create task: /task Fix the login bug\n- Summary: /summary\n\nYour chat ID: ${chatId}\n\nDashboard: ${SITE_URL}`);
      return Response.json({ ok: true });
    }

    // Handle /task — create in cockpit_features_os as a Task (work_kind=mission)
    if (text.startsWith("/task ")) {
      const taskTitle = text.slice(6).trim();
      if (taskTitle) {
        const { error } = await supabase.from("cockpit_features_os").insert({
          name: taskTitle,
          work_kind: "mission",
          stage: "feature",
          category: "utile",
          status: "reflexion",
          created_by: userName + " (Telegram)",
        });
        if (!error) {
          await supabase.from("cockpit_activity").insert({
            action: "created", entity_type: "task", entity_title: taskTitle,
            actor_name: userName + " (Telegram)", actor_email: "telegram",
          });
          await sendTelegram(botToken, chatId, `Task created: "${taskTitle}"\n\n${SITE_URL}/focus/tasks`);
        } else {
          await sendTelegram(botToken, chatId, `Failed to create task: ${error.message}`);
        }
      }
      return Response.json({ ok: true });
    }

    // Handle /summary
    if (text === "/summary") {
      const [{ data: projects }, { data: features }, { data: members }, { data: sprints }, { data: kpis }] = await Promise.all([
        supabase.from("cockpit_projects").select("name, status"),
        supabase.from("cockpit_features_os").select("name, work_kind, step_1_done, step_3_done, step_5_done"),
        supabase.from("cockpit_members").select("name, role, status").eq("status", "active"),
        supabase.from("cockpit_sprints").select("name, status").eq("status", "active").limit(1),
        supabase.from("cockpit_kpis").select("*").order("date", { ascending: false }).limit(1),
      ]);

      const p = projects || [];
      const f = (features || []).filter((x) => x.work_kind === "feature");
      const t = (features || []).filter((x) => x.work_kind === "mission");
      const activeSprint = sprints?.[0];

      const tasksDone = t.filter((x) => x.step_3_done).length;
      const tasksDoing = t.filter((x) => x.step_1_done && !x.step_3_done).length;
      const tasksTodo = t.filter((x) => !x.step_1_done).length;
      const featValidated = f.filter((x) => x.step_5_done).length;

      const summary = `Project Summary\n\nTeam: ${(members || []).map((m) => m.name).join(", ")}\n${activeSprint ? `Sprint: ${activeSprint.name}\n` : ""}Projects: ${p.filter((x) => x.status === "active").length} active, ${p.filter((x) => x.status === "proposed").length} voting\nFeatures: ${featValidated}/${f.length} validated\nTasks: ${tasksDone} done, ${tasksDoing} doing, ${tasksTodo} todo\n${kpis?.[0] ? `MRR: ${kpis[0].mrr_eur || 0} EUR` : ""}\n\n${SITE_URL}`;

      await sendTelegram(botToken, chatId, summary);
      return Response.json({ ok: true });
    }

    // Get provider and model
    const provider = cfg.bot_provider || "openrouter";
    const model = cfg.bot_model || "anthropic/claude-3-haiku";

    // Get API key — try v2 (new encrypted table) first, fallback to v1
    let apiKey = null;
    let actualProvider = provider;

    // Try cockpit_api_keys_v2
    for (const tryProvider of [provider, "openrouter", "anthropic", "mistral"]) {
      const { data: keyRow } = await supabase
        .from("cockpit_api_keys_v2")
        .select("key_ciphertext, key_last_4")
        .eq("provider", tryProvider)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (keyRow?.key_ciphertext && keyRow.key_ciphertext !== "pending-server-encryption") {
        // TODO: decrypt with AGENT_KEY_MASTER when crypto API is wired
        apiKey = keyRow.key_ciphertext;
        actualProvider = tryProvider;
        break;
      }
    }

    // Fallback to old cockpit_api_keys table
    if (!apiKey) {
      for (const tryProvider of [provider, "openrouter", "anthropic", "mistral"]) {
        const { data: keyRow } = await supabase
          .from("cockpit_api_keys")
          .select("key_encrypted")
          .eq("provider", tryProvider)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (keyRow?.key_encrypted) {
          apiKey = atob(keyRow.key_encrypted);
          actualProvider = tryProvider;
          break;
        }
      }
    }

    if (!apiKey) {
      await sendTelegram(botToken, chatId, "No API key found. Add one at " + SITE_URL + "/agent/keys");
      return Response.json({ ok: true });
    }

    // Gather project context
    const [{ data: projects }, { data: features }, { data: members }, { data: activity }] = await Promise.all([
      supabase.from("cockpit_projects").select("name, status, priority").order("created_at").limit(10),
      supabase.from("cockpit_features_os").select("name, work_kind, step_1_done, step_3_done, step_5_done").order("updated_at", { ascending: false }).limit(20),
      supabase.from("cockpit_members").select("name, role, status").eq("status", "active"),
      supabase.from("cockpit_activity").select("action, entity_type, entity_title, actor_name").order("created_at", { ascending: false }).limit(5),
    ]);

    const f = (features || []).filter((x) => x.work_kind === "feature");
    const t = (features || []).filter((x) => x.work_kind === "mission");

    const context = `You are Steve, the Startup Assistant. Answer based on live project data.

TEAM: ${(members || []).map((m) => `${m.name} (${m.role})`).join(", ")}

PROJECTS: ${(projects || []).map((p) => `[${p.status}] ${p.name}`).join(", ") || "None"}

FEATURES (${f.length}): ${f.filter((x) => x.step_5_done).length} validated, ${f.filter((x) => x.step_1_done && !x.step_5_done).length} in progress
TASKS (${t.length}): ${t.filter((x) => x.step_3_done).length} done, ${t.filter((x) => x.step_1_done && !x.step_3_done).length} doing, ${t.filter((x) => !x.step_1_done).length} todo

RECENT: ${(activity || []).map((a) => `${a.actor_name} ${a.action} ${a.entity_type}`).join(", ")}

DASHBOARD: ${SITE_URL}

Rules: Be concise (under 300 chars). Answer in the user's language. If asked to create a task, tell them to use /task command. Reference the dashboard URL when relevant.`;

    // Call LLM
    let reply;
    if (actualProvider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model.includes("/") ? model : "anthropic/claude-3-haiku",
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
        body: JSON.stringify({ model: model || "mistral-small-latest", max_tokens: 300, messages: [{ role: "system", content: context }, { role: "user", content: text }] }),
      });
      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || data.message || "Error processing request.";
    } else {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: model || "claude-haiku-4-5-20251001", max_tokens: 300, messages: [{ role: "user", content: text }], system: context }),
      });
      const data = await res.json();
      reply = data.content?.[0]?.text || data.error?.message || "Error processing request.";
    }

    // Log activity
    await supabase.from("cockpit_activity").insert({
      action: "responded", entity_type: "bot", entity_title: text.slice(0, 50),
      actor_name: "Steve", actor_email: "bot",
      metadata: { provider: actualProvider, model, user: userName },
    });

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
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", disable_web_page_preview: true }),
  });
}
