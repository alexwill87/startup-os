import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  try {
    const { message, history, userId, page } = await request.json();
    if (!message?.trim()) return Response.json({ reply: "Please type a message." });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load config
    const { data: configRows } = await supabase.from("cockpit_config").select("key, value");
    const cfg = {};
    (configRows || []).forEach((r) => (cfg[r.key] = r.value));

    const provider = cfg.bot_provider || "openrouter";
    const model = cfg.bot_model || "anthropic/claude-3-haiku";

    // Get API key with fallback
    let apiKey = null;
    let actualProvider = provider;

    for (const p of [provider, "openrouter", "anthropic", "mistral"]) {
      const { data: keyRow } = await supabase
        .from("cockpit_api_keys")
        .select("key_encrypted")
        .eq("provider", p)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (keyRow?.key_encrypted) {
        apiKey = atob(keyRow.key_encrypted);
        actualProvider = p;
        break;
      }
    }

    if (!apiKey) {
      return Response.json({ reply: "No API key configured. Go to Config > API Keys to add one." });
    }

    // Gather project context
    const [
      { data: tasks },
      { data: decisions },
      { data: members },
      { data: objectives },
      { data: kpis },
      { data: activity },
      { data: checklist },
      { data: vision },
    ] = await Promise.all([
      supabase.from("cockpit_tasks").select("title, status, builder, sprint").order("created_at", { ascending: false }).limit(20),
      supabase.from("cockpit_decisions").select("title, status, decision").order("created_at", { ascending: false }).limit(10),
      supabase.from("cockpit_members").select("name, role, builder, status, email, bio, skills").eq("status", "active"),
      supabase.from("cockpit_objectives").select("title, pillar, status, proposed_by").order("sort_order"),
      supabase.from("cockpit_kpis").select("*").order("date", { ascending: false }).limit(1),
      supabase.from("cockpit_activity").select("action, entity_type, entity_title, actor_name").order("created_at", { ascending: false }).limit(10),
      supabase.from("cockpit_checklist").select("pillar, title, status").order("sort_order"),
      supabase.from("cockpit_vision").select("title, body, topic").eq("topic", "product"),
    ]);

    // Find current user
    const currentMember = (members || []).find((m) => m.email === userId) || {};

    const t = tasks || [];
    const cl = checklist || [];
    const clDone = cl.filter((c) => c.status === "done" || c.status === "validated").length;

    const systemPrompt = `You are the Project OS Assistant — an AI helper embedded in a startup cockpit dashboard.
You help team members understand the project, fill in information, and take actions.

CURRENT USER: ${currentMember.name || userId} (${currentMember.role || "unknown"})
CURRENT PAGE: ${page || "unknown"}

PROJECT DATA:
- Team: ${(members || []).map((m) => `${m.name} (${m.role}${m.builder ? ", Builder " + m.builder : ""})`).join(", ")}
- Tasks (${t.length}): ${t.filter((x) => x.status === "done").length} done, ${t.filter((x) => x.status === "in_progress").length} in progress, ${t.filter((x) => x.status === "todo").length} todo, ${t.filter((x) => x.status === "blocked").length} blocked
- Goals: ${(objectives || []).map((o) => `[${o.status}] ${o.pillar}: ${o.title}`).join("; ") || "None yet"}
- Checklist: ${clDone}/${cl.length} items done
- Vision: ${(vision || []).map((v) => `${v.title}: ${(v.body || "").slice(0, 100)}`).join("; ") || "Not defined yet"}
- KPIs: ${kpis?.[0] ? `Users: ${kpis[0].users_registered}, Active: ${kpis[0].users_active_7d}, MRR: ${kpis[0].mrr_eur}€` : "None yet"}
- Recent: ${(activity || []).slice(0, 5).map((a) => `${a.actor_name} ${a.action} ${a.entity_type} "${a.entity_title || ""}"`).join(", ")}

CAPABILITIES:
You can help users with:
1. Answering questions about the project status, team, goals, tasks
2. Suggesting what to work on next
3. Explaining how the cockpit works
4. Helping draft content (vision statements, goal descriptions, task titles)
5. Giving advice on startup management

RULES:
- Answer in the same language as the question
- Be concise but helpful (max 500 chars unless asked for more)
- Use emojis sparingly
- Reference real data from the project when relevant
- If asked to create/modify data, explain which page to go to (you cannot write to the database directly yet)`;

    // Build conversation messages
    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-10).map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message },
    ];

    let reply;

    if (actualProvider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model.includes("/") ? model : "anthropic/claude-3-haiku",
          max_tokens: 600,
          messages,
        }),
      });
      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || data.error?.message || "Error.";
    } else if (actualProvider === "mistral") {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: model || "mistral-small-latest", max_tokens: 600, messages }),
      });
      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || "Error.";
    } else {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: model || "claude-haiku-4-5-20251001",
          max_tokens: 600,
          system: systemPrompt,
          messages: messages.filter((m) => m.role !== "system"),
        }),
      });
      const data = await res.json();
      reply = data.content?.[0]?.text || data.error?.message || "Error.";
    }

    return Response.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ reply: "Sorry, an error occurred. Please try again." });
  }
}
