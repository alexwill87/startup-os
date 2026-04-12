/**
 * buildAgentContext — single source of truth for the agent's system prompt.
 *
 * ALL surfaces (chat UI, Telegram, future widgets) call this function.
 * No prompt duplication. If you edit the Soul here, every surface changes instantly.
 *
 * Invariant: no route builds its own prompt. Duplication = bug to fix immediately.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Server-side Supabase client (service role for reading all data)
function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Simple in-memory cache for agent docs (60s TTL)
let docsCache = null;
let docsCacheTime = 0;
const CACHE_TTL = 60_000;

async function getAgentDocs(sb) {
  if (docsCache && Date.now() - docsCacheTime < CACHE_TTL) return docsCache;
  const { data } = await sb
    .from("cockpit_agent_docs")
    .select("kind, body")
    .eq("is_active", true);
  const docs = {};
  (data || []).forEach((d) => (docs[d.kind] = d.body));
  docsCache = docs;
  docsCacheTime = Date.now();
  return docs;
}

/**
 * Build the full agent context for any surface.
 *
 * @param {Object} params
 * @param {string} params.userEmail - email of the current user
 * @param {string} params.surface - 'chat' | 'telegram'
 * @param {string} params.userMessage - the user's latest message
 * @param {string} params.sessionId - current session UUID
 * @returns {Object} { systemPrompt, toolsSchema, sessionId, modelConfig }
 */
export async function buildAgentContext({ userEmail, surface, userMessage, sessionId }) {
  const sb = getSupabase();

  // 1. Load active agent documents (cached 60s)
  const docs = await getAgentDocs(sb);
  const identity = docs.identity || {};
  const soul = docs.soul || {};
  const rules = docs.rules || [];
  const tools = docs.tools || [];

  // 2. Load user preferences
  const { data: prefs } = await sb
    .from("cockpit_agent_user_prefs")
    .select("*")
    .eq("user_email", userEmail)
    .maybeSingle();

  // 3. Load live context (projects, tasks, members, sprints)
  const [{ data: projects }, { data: members }, { data: activeSprint }] = await Promise.all([
    sb.from("cockpit_projects").select("name, status, priority").order("created_at"),
    sb.from("cockpit_members").select("name, email, role, status").eq("status", "active"),
    sb.from("cockpit_sprints").select("name, end_date, status").eq("status", "active").limit(1),
  ]);

  // 4. Load last 10 turns of current session (conversation history)
  let sessionHistory = [];
  if (sessionId) {
    const { data: turns } = await sb
      .from("cockpit_agent_turns")
      .select("user_message, assistant_message")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(10);
    sessionHistory = (turns || []).reverse();
  }

  // 5. Compose system prompt
  const hardRules = (Array.isArray(rules) ? rules : []).filter((r) => r.severity === "hard");
  const softRules = (Array.isArray(rules) ? rules : []).filter((r) => r.severity === "soft");
  const enabledTools = (Array.isArray(tools) ? tools : []).filter((t) => t.enabled);
  const userTools = prefs?.disabled_tools
    ? enabledTools.filter((t) => !prefs.disabled_tools.includes(t.id))
    : enabledTools;

  const systemPrompt = [
    // Identity
    `You are ${identity.name || "Steve"}, the ${identity.title || "Startup Assistant"}.`,
    identity.default_language ? `Default language: ${identity.default_language}.` : "",
    identity.tone_label ? `Tone: ${identity.tone_label}.` : "",
    "",

    // Soul
    soul.mission ? `MISSION: ${soul.mission}` : "",
    soul.personality ? `PERSONALITY: ${soul.personality}` : "",
    soul.values?.length ? `VALUES: ${soul.values.join(", ")}` : "",
    "",

    // Do / Don't
    soul.do_list?.length ? `DO:\n${soul.do_list.map((d) => `- ${d}`).join("\n")}` : "",
    soul.dont_list?.length ? `DON'T:\n${soul.dont_list.map((d) => `- ${d}`).join("\n")}` : "",
    "",

    // Rules (hard first, then soft)
    hardRules.length ? `HARD RULES (never violate):\n${hardRules.map((r) => `- ${r.rule} (${r.reason})`).join("\n")}` : "",
    softRules.length ? `SOFT RULES (follow when possible):\n${softRules.map((r) => `- ${r.rule} (${r.reason})`).join("\n")}` : "",
    "",

    // Tools
    userTools.length
      ? `AVAILABLE TOOLS:\n${userTools.map((t) => `- ${t.id}: ${t.description}${t.requires_confirmation ? " [REQUIRES CONFIRMATION]" : ""}`).join("\n")}`
      : "",
    "",

    // User preferences
    prefs?.preferred_name ? `The user prefers to be called "${prefs.preferred_name}".` : "",
    prefs?.preferred_language ? `The user prefers ${prefs.preferred_language}.` : "",
    "",

    // Live context
    "LIVE PROJECT CONTEXT:",
    members?.length ? `Team (${members.length} active): ${members.map((m) => `${m.name} (${m.role})`).join(", ")}` : "No team members.",
    projects?.length ? `Projects (${projects.length}): ${projects.map((p) => `${p.name} [${p.status}]`).join(", ")}` : "No projects.",
    activeSprint?.[0] ? `Active sprint: "${activeSprint[0].name}" ending ${activeSprint[0].end_date}` : "No active sprint.",
    "",

    // Surface constraints
    `SURFACE: ${surface}`,
    surface === "telegram" ? "Keep responses short. Telegram has no rich formatting." : "",
    "",

    // Session history
    sessionHistory.length > 0
      ? `RECENT CONVERSATION:\n${sessionHistory.map((t) => `User: ${t.user_message}\nAssistant: ${t.assistant_message}`).join("\n---\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  // 6. Build tools schema for the LLM
  const toolsSchema = userTools.map((t) => ({
    type: "function",
    function: {
      name: t.id,
      description: t.description,
      parameters: t.schema || { type: "object", properties: {} },
    },
  }));

  // 7. Get default model config
  const { data: modelConfig } = await sb
    .from("cockpit_agent_models")
    .select("*")
    .eq("role", "chat")
    .eq("is_default", true)
    .maybeSingle();

  return {
    systemPrompt,
    toolsSchema,
    sessionId,
    modelConfig: modelConfig || {
      provider: "openrouter",
      model_id: "anthropic/claude-3-haiku",
      input_cost_per_1m_usd: 0.25,
      output_cost_per_1m_usd: 1.25,
    },
  };
}
