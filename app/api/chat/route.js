import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ACTIONS_SCHEMA = `
You can execute actions by including a JSON block in your response. Wrap it in <actions>...</actions> tags.

Available actions:
1. update_profile — Update the current user's profile fields
   {"type": "update_profile", "fields": {"bio": "...", "phone": "...", "linkedin": "...", "skills": ["React","Node"], "languages": ["French","English"], "timezone": "Europe/Paris", "availability": "Mon-Fri 9h-18h"}}

2. create_task — Create a task on the board
   {"type": "create_task", "title": "...", "description": "...", "priority": "medium", "sprint": 1}

3. create_goal — Create a goal/objective for a pillar
   {"type": "create_goal", "title": "...", "pillar": "why|team|resources|project|market|finances|analytics"}

4. create_decision — Open a decision for team discussion
   {"type": "create_decision", "title": "...", "context": "..."}

5. update_vision — Set a vision statement (mission, vision, problem, or northstar)
   {"type": "update_vision", "section": "Mission Statement|Vision Statement|Problem Solved|North Star Metric", "body": "..."}

6. log_note — Add a strategy note
   {"type": "log_note", "topic": "product|market|tech|pitch|monetization|growth", "title": "...", "body": "..."}

RULES FOR ACTIONS:
- Only use actions when the user explicitly asks you to create, update, or fill something
- Always confirm what you're about to do BEFORE executing (ask first, then execute on confirmation)
- After executing, describe what was done
- You can execute multiple actions at once: <actions>[{...}, {...}]</actions>
- If the user pastes data and says "fill my profile with this", extract the relevant fields and use update_profile
`;

export async function POST(request) {
  try {
    const { message, history, userId, page } = await request.json();
    if (!message?.trim()) return Response.json({ reply: "Please type a message.", actions: [] });

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
        .from("cockpit_api_keys").select("key_encrypted").eq("provider", p).eq("is_active", true).limit(1).maybeSingle();
      if (keyRow?.key_encrypted) { apiKey = atob(keyRow.key_encrypted); actualProvider = p; break; }
    }
    if (!apiKey) return Response.json({ reply: "No API key configured. Go to Config > API Keys.", actions: [] });

    // Gather context
    const [
      { data: tasks }, { data: decisions }, { data: members },
      { data: objectives }, { data: kpis }, { data: activity },
      { data: checklist }, { data: vision },
    ] = await Promise.all([
      supabase.from("cockpit_tasks").select("title, status, builder, sprint").order("created_at", { ascending: false }).limit(20),
      supabase.from("cockpit_decisions").select("title, status, decision").order("created_at", { ascending: false }).limit(10),
      supabase.from("cockpit_members").select("*").eq("status", "active"),
      supabase.from("cockpit_objectives").select("title, pillar, status, proposed_by").order("sort_order"),
      supabase.from("cockpit_kpis").select("*").order("date", { ascending: false }).limit(1),
      supabase.from("cockpit_activity").select("action, entity_type, entity_title, actor_name").order("created_at", { ascending: false }).limit(10),
      supabase.from("cockpit_checklist").select("pillar, title, status").order("sort_order"),
      supabase.from("cockpit_vision").select("title, body, topic").eq("topic", "product"),
    ]);

    const currentMember = (members || []).find((m) => m.email === userId) || {};
    const t = tasks || [];
    const cl = checklist || [];

    const systemPrompt = `You are the Project OS Assistant — an AI agent embedded in a startup cockpit.
You can READ project data and WRITE to the database via actions.

CURRENT USER: ${currentMember.name || userId} (${currentMember.role || "unknown"}, email: ${userId})
USER PROFILE: name=${currentMember.name || "?"}, bio=${currentMember.bio || "empty"}, skills=${JSON.stringify(currentMember.skills || [])}, phone=${currentMember.phone || "empty"}, linkedin=${currentMember.linkedin || "empty"}, timezone=${currentMember.timezone || "empty"}, languages=${JSON.stringify(currentMember.languages || [])}
CURRENT PAGE: ${page || "unknown"}

PROJECT:
- Team: ${(members || []).map((m) => `${m.name} (${m.role}${m.builder ? ", Builder " + m.builder : ""})`).join(", ")}
- Tasks (${t.length}): ${t.filter((x) => x.status === "done").length} done, ${t.filter((x) => x.status === "in_progress").length} in progress, ${t.filter((x) => x.status === "todo").length} todo, ${t.filter((x) => x.status === "blocked").length} blocked
- Top tasks: ${t.slice(0, 8).map((x) => `[${x.status}] ${x.title}`).join("; ")}
- Goals: ${(objectives || []).map((o) => `[${o.status}/${o.pillar}] ${o.title}`).join("; ") || "None"}
- Checklist: ${cl.filter((c) => c.status === "done" || c.status === "validated").length}/${cl.length} done
- Vision: ${(vision || []).map((v) => `${v.title}: ${(v.body || "").slice(0, 80)}`).join("; ") || "Not defined"}
- KPIs: ${kpis?.[0] ? `Users: ${kpis[0].users_registered}, Active: ${kpis[0].users_active_7d}, MRR: ${kpis[0].mrr_eur}€` : "None"}
- Recent: ${(activity || []).slice(0, 5).map((a) => `${a.actor_name} ${a.action} ${a.entity_type}`).join(", ")}

${ACTIONS_SCHEMA}

STYLE: Answer in the same language as the question. Be concise. Use emojis sparingly.`;

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
        body: JSON.stringify({ model: model.includes("/") ? model : "anthropic/claude-3-haiku", max_tokens: 800, messages }),
      });
      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || data.error?.message || "Error.";
    } else if (actualProvider === "mistral") {
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: model || "mistral-small-latest", max_tokens: 800, messages }),
      });
      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || "Error.";
    } else {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: model || "claude-haiku-4-5-20251001", max_tokens: 800, system: systemPrompt, messages: messages.filter((m) => m.role !== "system") }),
      });
      const data = await res.json();
      reply = data.content?.[0]?.text || data.error?.message || "Error.";
    }

    // Parse and execute actions
    const executedActions = [];
    const actionsMatch = reply.match(/<actions>([\s\S]*?)<\/actions>/);
    if (actionsMatch) {
      try {
        const actions = JSON.parse(actionsMatch[1]);
        const actionsArr = Array.isArray(actions) ? actions : [actions];

        for (const action of actionsArr) {
          try {
            const result = await executeAction(supabase, action, currentMember, userId);
            executedActions.push({ ...action, status: "done", result });
          } catch (err) {
            executedActions.push({ ...action, status: "error", error: err.message });
          }
        }
      } catch (parseErr) {
        executedActions.push({ type: "parse_error", error: parseErr.message });
      }
      // Clean actions tags from reply
      reply = reply.replace(/<actions>[\s\S]*?<\/actions>/g, "").trim();
    }

    return Response.json({ reply, actions: executedActions });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ reply: "Sorry, an error occurred.", actions: [] });
  }
}

async function executeAction(supabase, action, member, userId) {
  const actorName = member.name || userId;

  switch (action.type) {
    case "update_profile": {
      const allowed = ["bio", "phone", "linkedin", "telegram_chat_id", "skills", "languages", "timezone", "availability", "urls", "name"];
      const fields = {};
      for (const [k, v] of Object.entries(action.fields || {})) {
        if (allowed.includes(k)) fields[k] = v;
      }
      if (Object.keys(fields).length === 0) return "No valid fields";
      await supabase.from("cockpit_members").update(fields).eq("email", userId);
      await logAction(supabase, "updated", "member", actorName, userId, `Profile: ${Object.keys(fields).join(", ")}`);
      return `Updated: ${Object.keys(fields).join(", ")}`;
    }

    case "create_task": {
      const { error } = await supabase.from("cockpit_tasks").insert({
        title: action.title, description: action.description || null,
        sprint: action.sprint || 1, builder: member.builder || "A",
        status: "todo", priority: action.priority || "medium",
      });
      if (error) throw error;
      await logAction(supabase, "created", "task", actorName, userId, action.title);
      return `Task created: ${action.title}`;
    }

    case "create_goal": {
      const { error } = await supabase.from("cockpit_objectives").insert({
        title: action.title, pillar: action.pillar || "project",
        status: "proposed", proposed_by: actorName,
      });
      if (error) throw error;
      await logAction(supabase, "created", "objective", actorName, userId, action.title);
      return `Goal created: ${action.title}`;
    }

    case "create_decision": {
      const { error } = await supabase.from("cockpit_decisions").insert({
        title: action.title, context: action.context || null,
        status: "open", created_by: member.user_id,
      });
      if (error) throw error;
      await logAction(supabase, "created", "decision", actorName, userId, action.title);
      return `Decision opened: ${action.title}`;
    }

    case "update_vision": {
      const { data: existing } = await supabase.from("cockpit_vision")
        .select("id").eq("topic", "product").ilike("title", `%${action.section?.split(" ")[0]}%`).maybeSingle();
      if (existing) {
        await supabase.from("cockpit_vision").update({ body: action.body }).eq("id", existing.id);
      } else {
        await supabase.from("cockpit_vision").insert({
          topic: "product", title: action.section, body: action.body,
          builder: member.builder, created_by: member.user_id, pinned: true,
        });
      }
      await logAction(supabase, "updated", "vision", actorName, userId, action.section);
      return `Vision updated: ${action.section}`;
    }

    case "log_note": {
      const { error } = await supabase.from("cockpit_vision").insert({
        topic: action.topic || "product", title: action.title, body: action.body,
        builder: member.builder, created_by: member.user_id,
      });
      if (error) throw error;
      await logAction(supabase, "created", "vision", actorName, userId, action.title);
      return `Note added: ${action.title}`;
    }

    default:
      return `Unknown action: ${action.type}`;
  }
}

async function logAction(supabase, action, entityType, actorName, actorEmail, title) {
  await supabase.from("cockpit_activity").insert({
    action, entity_type: entityType, entity_title: title,
    actor_name: `${actorName} (via AI)`, actor_email: actorEmail,
    metadata: { source: "chatbot" },
  });
}
