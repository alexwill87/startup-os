"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#8b5cf6";
const DISCOVERY_STATUSES = [
  { id: "idea", label: "Idea", color: "#64748b" },
  { id: "draft", label: "Draft", color: "#f59e0b" },
  { id: "ready", label: "Ready to Propose", color: "#10b981" },
];

export default function FindPage() {
  const { user, member } = useAuth();
  const members = useMembers();
  const [discoveries, setDiscoveries] = useState([]);
  const [goals, setGoals] = useState([]);
  const [vision, setVision] = useState([]);
  const [existingFeatures, setExistingFeatures] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadJson, setUploadJson] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    fetchAll();
    const sub = supabase.channel("find_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_vision" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchAll() {
    try {
      const [{ data: disc1 }, { data: disc2 }, { data: objs }, { data: vis }, { data: feats }] = await Promise.all([
        supabase.from("cockpit_vision").select("*").eq("topic", "discovery").order("created_at", { ascending: false }),
        supabase.from("cockpit_vision").select("*").eq("topic", "other").ilike("title", "[DISCOVERY]%").order("created_at", { ascending: false }),
        supabase.from("cockpit_objectives").select("*").order("sort_order"),
        supabase.from("cockpit_vision").select("title, body").eq("topic", "product"),
        supabase.from("cockpit_vision").select("title").eq("topic", "roadmap"),
      ]);
      const allDisc = [...(disc1 || []), ...(disc2 || [])].map((d) => ({ ...d, title: d.title.replace("[DISCOVERY] ", "") }));
      const parsed = allDisc.map((r) => {
        let m = {};
        try { m = JSON.parse(r.body || "{}"); } catch { m = { description: r.body }; }
        return { ...r, phase: m.phase || "idea", description: m.description || "", prompt: m.prompt || "",
          kpi_expected: m.kpi_expected || "", goal_id: m.goal_id || "", why: m.why || "" };
      });
      setDiscoveries(parsed);
      setGoals(objs || []);
      setVision(vis || []);
      setExistingFeatures(feats || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  // --- AI Generate Features ---
  async function aiGenerate() {
    setGenerating(true);
    try {
      const goalsCtx = goals.map((g) => `[${g.pillar}/${g.status}] ${g.title}`).join("\n");
      const visionCtx = vision.map((v) => `${v.title}: ${(v.body || "").slice(0, 100)}`).join("\n");
      const existingCtx = existingFeatures.map((f) => f.title).join(", ");
      const discCtx = discoveries.map((d) => d.title).join(", ");

      const prompt = `You are a product strategist for Radar, a startup that monitors job platforms and sends AI-powered alerts with tailored CVs.

PROJECT CONTEXT:
Goals:
${goalsCtx || "None defined yet"}

Vision:
${visionCtx || "Not defined yet"}

Existing features (DO NOT duplicate): ${existingCtx || "None"}
Already discovered (DO NOT duplicate): ${discCtx || "None"}

TASK: Propose 5 NEW feature ideas that would help Radar achieve its goals. For each feature, provide:
- title: short feature name
- description: 1-2 sentences on what it does
- why: why this feature matters for the project
- kpi_expected: measurable impact (e.g. "Increase signups by 20%")
- prompt: technical instruction for an AI agent to build it (50-100 words)

Return ONLY a JSON array. No markdown, no explanation. Example:
[{"title":"...","description":"...","why":"...","kpi_expected":"...","prompt":"..."}]`;

      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, history: [], userId: member?.email, page: "/projet/find" }),
      });
      const data = await res.json();
      let reply = (data.reply || "").trim();
      // Extract JSON from reply
      const jsonMatch = reply.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const items = JSON.parse(jsonMatch[0]);
        if (Array.isArray(items)) {
          let created = 0;
          for (const item of items) {
            const body = JSON.stringify({ phase: "idea", description: item.description || "", prompt: item.prompt || "",
              kpi_expected: item.kpi_expected || "", why: item.why || "", goal_id: "" });
            const { error } = await supabase.from("cockpit_vision").insert({ topic: "discovery", title: item.title, body, builder: member?.builder, created_by: member?.user_id });
            if (error) {
              // Fallback: use 'other' topic if 'discovery' not yet in constraint
              await supabase.from("cockpit_vision").insert({ topic: "other", title: `[DISCOVERY] ${item.title}`, body, builder: member?.builder, created_by: member?.user_id });
            }
            created++;
          }
          await logActivity("created", "discovery", { title: `AI generated ${created} feature ideas` });
          fetchAll();
        }
      }
    } catch (err) { console.error("AI generate error:", err); }
    finally { setGenerating(false); }
  }

  // --- Download Mega Prompt ---
  function downloadMegaPrompt() {
    const goalsCtx = goals.map((g) => `- [${g.pillar}/${g.status}] ${g.title}`).join("\n");
    const visionCtx = vision.map((v) => `### ${v.title}\n${(v.body || "").slice(0, 200)}`).join("\n\n");
    const existingCtx = existingFeatures.map((f) => `- ${f.title}`).join("\n");
    const membersCtx = members.filter((m) => m.status === "active").map((m) => `- ${m.name} (${m.role})`).join("\n");

    const md = `# Feature Discovery — Mega Prompt for Radar Cockpit

## Instructions
You are a product strategist. Analyze the project below and propose **10-20 feature ideas**.

For EACH feature, return a JSON object with these exact fields:
- \`title\`: short feature name (max 60 chars)
- \`description\`: 1-2 sentences explaining what it does
- \`why\`: why this matters for the project
- \`kpi_expected\`: measurable impact (e.g. "Reduce churn by 15%")
- \`prompt\`: technical instruction for a dev agent to build it (50-150 words, mention Next.js + Supabase + Tailwind)

Return ONLY a JSON array. No markdown wrapping. The result will be uploaded directly.

## Project: Radar
Radar monitors job platforms and sends AI-powered alerts with tailored CVs and pitch letters.

## Vision
${visionCtx || "Not defined yet — propose features that help define it"}

## Goals
${goalsCtx || "No goals yet — propose features that establish foundations"}

## Existing Features (DO NOT duplicate)
${existingCtx || "None yet"}

## Team
${membersCtx}

## Tech Stack
Next.js 16, Supabase (PostgreSQL + Auth + Realtime + Storage), Tailwind CSS v4, Vercel, Telegram Bot

## What we need
- Features that move the product forward
- Features that help the team collaborate better
- Features that attract users and generate revenue
- Both product features (for Radar users) and cockpit features (for the team)
- Be creative, specific, and actionable
`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `radar-mega-prompt-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // --- Upload JSON Result ---
  async function handleUpload() {
    if (!uploadJson.trim()) return;
    try {
      const items = JSON.parse(uploadJson.trim());
      if (!Array.isArray(items)) return alert("Expected a JSON array");
      let count = 0;
      for (const item of items) {
        if (!item.title) continue;
        const body = JSON.stringify({ phase: "idea", description: item.description || "", prompt: item.prompt || "",
          kpi_expected: item.kpi_expected || "", why: item.why || "", goal_id: "" });
        const { error } = await supabase.from("cockpit_vision").insert({ topic: "discovery", title: item.title, body, builder: member?.builder, created_by: member?.user_id });
        if (error) {
          await supabase.from("cockpit_vision").insert({ topic: "other", title: `[DISCOVERY] ${item.title}`, body, builder: member?.builder, created_by: member?.user_id });
        }
        count++;
      }
      await logActivity("created", "discovery", { title: `Uploaded ${count} feature ideas` });
      setUploadJson("");
      setShowUpload(false);
      fetchAll();
    } catch (err) { alert("Invalid JSON: " + err.message); }
  }

  // --- Actions on discoveries ---
  async function updatePhase(item, newPhase) {
    const meta = { phase: newPhase, description: item.description, prompt: item.prompt, kpi_expected: item.kpi_expected, why: item.why, goal_id: item.goal_id };
    await supabase.from("cockpit_vision").update({ body: JSON.stringify(meta) }).eq("id", item.id);
  }

  async function promoteToFeature(item) {
    // Move from discovery to roadmap (Features page)
    const body = JSON.stringify({ phase: "proposed", description: item.description, prompt: item.prompt,
      votes: [], ready: false, goal_id: item.goal_id, assigned_to: "", checklist: [],
      kpi_expected: item.kpi_expected, tags: [] });
    await supabase.from("cockpit_vision").insert({ topic: "roadmap", title: item.title, body, builder: member?.builder, created_by: member?.user_id });
    // Remove from discovery
    await supabase.from("cockpit_vision").delete().eq("id", item.id);
    await logActivity("created", "feature", { title: `Promoted: ${item.title}` });
    fetchAll();
  }

  async function deleteDiscovery(item) {
    await supabase.from("cockpit_vision").delete().eq("id", item.id);
  }

  async function updateField(item, field, value) {
    const meta = { phase: item.phase, description: item.description, prompt: item.prompt, kpi_expected: item.kpi_expected, why: item.why, goal_id: item.goal_id, [field]: value };
    await supabase.from("cockpit_vision").update({ body: JSON.stringify(meta), title: field === "title" ? value : item.title }).eq("id", item.id);
  }

  const ideas = discoveries.filter((d) => d.phase === "idea");
  const drafts = discoveries.filter((d) => d.phase === "draft");
  const ready = discoveries.filter((d) => d.phase === "ready");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <PageHeader title="Find Features" subtitle="Discover, brainstorm, and prepare features before proposing them to the team" color={COLOR}>
        <div className="flex gap-2">
          <button onClick={aiGenerate} disabled={generating}
            className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-purple-400 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition disabled:opacity-50">
            {generating ? "Generating..." : "AI Find"}
          </button>
          <button onClick={downloadMegaPrompt}
            className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition">
            Download Prompt
          </button>
          <button onClick={() => setShowUpload(!showUpload)}
            className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-green-400 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 transition">
            Upload Result
          </button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="flex gap-4 text-center">
        {[{ l: "Ideas", c: ideas.length, col: "#64748b" }, { l: "Drafts", c: drafts.length, col: "#f59e0b" }, { l: "Ready", c: ready.length, col: "#10b981" }].map((s) => (
          <div key={s.l} className="flex items-center gap-1.5">
            <span className="text-lg font-extrabold" style={{ color: s.col }}>{s.c}</span>
            <span className="text-[10px] text-[#475569] uppercase font-bold">{s.l}</span>
          </div>
        ))}
        <span className="text-[10px] text-[#475569] ml-auto self-center">{discoveries.length} total discoveries</span>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <Card>
          <p className="text-xs text-[#64748b] mb-2">Paste the JSON array from the external LLM result:</p>
          <textarea value={uploadJson} onChange={(e) => setUploadJson(e.target.value)} rows={6} placeholder='[{"title":"...","description":"...","why":"...","kpi_expected":"...","prompt":"..."}]'
            className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-green-300 text-xs font-mono outline-none resize-none" />
          <div className="flex gap-2 mt-2">
            <button onClick={handleUpload} className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-green-500">Import</button>
            <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-xs rounded-lg text-[#64748b] bg-[#1e293b]">Cancel</button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-[#475569] text-center py-8">Loading...</p>
      ) : discoveries.length === 0 ? (
        <Card>
          <div className="text-center py-8 space-y-3">
            <p className="text-sm text-[#475569]">No feature ideas yet.</p>
            <p className="text-xs text-[#334155]">Click "AI Find" to auto-generate ideas, or "Download Prompt" to use an external LLM.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Ready to Propose */}
          {ready.length > 0 && (
            <Section label="Ready to Propose" color="#10b981" count={ready.length}>
              {ready.map((d) => <DiscoveryCard key={d.id} item={d} goals={goals} expanded={expandedId === d.id} onExpand={setExpandedId}
                onPhase={updatePhase} onPromote={promoteToFeature} onDelete={deleteDiscovery} onUpdate={updateField} />)}
            </Section>
          )}

          {/* Drafts */}
          {drafts.length > 0 && (
            <Section label="Drafts" color="#f59e0b" count={drafts.length}>
              {drafts.map((d) => <DiscoveryCard key={d.id} item={d} goals={goals} expanded={expandedId === d.id} onExpand={setExpandedId}
                onPhase={updatePhase} onPromote={promoteToFeature} onDelete={deleteDiscovery} onUpdate={updateField} />)}
            </Section>
          )}

          {/* Ideas */}
          {ideas.length > 0 && (
            <Section label="Ideas" color="#64748b" count={ideas.length}>
              {ideas.map((d) => <DiscoveryCard key={d.id} item={d} goals={goals} expanded={expandedId === d.id} onExpand={setExpandedId}
                onPhase={updatePhase} onPromote={promoteToFeature} onDelete={deleteDiscovery} onUpdate={updateField} />)}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ label, color, count, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{label}</h2>
        <span className="text-[9px] text-[#475569]">({count})</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DiscoveryCard({ item, goals, expanded, onExpand, onPhase, onPromote, onDelete, onUpdate }) {
  const status = DISCOVERY_STATUSES.find((s) => s.id === item.phase) || DISCOVERY_STATUSES[0];
  const linkedGoal = goals.find((g) => g.id === item.goal_id);
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");

  function startEdit(field, val) { setEditing(field); setEditVal(val || ""); }
  function saveEdit(field) { onUpdate(item, field, editVal); setEditing(null); }

  return (
    <Card className="border-l-2" style={{ borderLeftColor: status.color }}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-sm font-bold text-white">{item.title}</h3>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: status.color, backgroundColor: status.color + "15" }}>{status.label}</span>
            {linkedGoal && <span className="text-[9px] text-blue-400 bg-blue-400/10 px-1 py-0.5 rounded font-mono">{linkedGoal.title.slice(0, 30)}</span>}
          </div>
          {item.description && <p className="text-[11px] text-[#94a3b8] mt-1">{item.description}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          {item.phase === "ready" && (
            <button onClick={() => onPromote(item)} className="text-[9px] font-bold px-2 py-1 rounded text-green-400 bg-green-400/10 hover:bg-green-400/20 transition">
              Propose
            </button>
          )}
          <button onClick={() => onExpand(expanded ? null : item.id)} className="text-[9px] font-bold px-1.5 py-1 rounded text-[#475569] hover:text-white hover:bg-[#1e293b]">
            {expanded ? "-" : "+"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#1e293b] space-y-3">
          {/* Why */}
          <EditableField label="Why" value={item.why} field="why" editing={editing} editVal={editVal}
            onStart={startEdit} onSave={saveEdit} onChange={setEditVal} />

          {/* KPI */}
          <EditableField label="Expected KPI" value={item.kpi_expected} field="kpi_expected" editing={editing} editVal={editVal}
            onStart={startEdit} onSave={saveEdit} onChange={setEditVal} />

          {/* Description */}
          <EditableField label="Description" value={item.description} field="description" editing={editing} editVal={editVal}
            onStart={startEdit} onSave={saveEdit} onChange={setEditVal} multiline />

          {/* Prompt */}
          {item.prompt && (
            <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold text-amber-400 uppercase">Prompt</p>
                <button onClick={() => startEdit("prompt", item.prompt)} className="text-[9px] text-amber-400/60 hover:text-amber-400">Edit</button>
              </div>
              {editing === "prompt" ? (
                <div className="mt-1">
                  <textarea value={editVal} onChange={(e) => setEditVal(e.target.value)} rows={4}
                    className="w-full py-1 px-2 rounded border border-amber-500/30 bg-transparent text-amber-200/80 text-[11px] font-mono outline-none resize-none" />
                  <div className="flex gap-1 mt-1">
                    <button onClick={() => saveEdit("prompt")} className="text-[9px] font-bold px-2 py-0.5 rounded text-amber-400 bg-amber-400/10">Save</button>
                    <button onClick={() => setEditing(null)} className="text-[9px] px-2 py-0.5 rounded text-[#475569]">Cancel</button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-amber-200/80 font-mono whitespace-pre-wrap mt-1">{item.prompt}</p>
              )}
            </div>
          )}

          {/* Phase actions */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#1e293b]">
            {DISCOVERY_STATUSES.filter((s) => s.id !== item.phase).map((s) => (
              <button key={s.id} onClick={() => onPhase(item, s.id)} className="text-[9px] font-bold px-2 py-0.5 rounded" style={{ color: s.color, backgroundColor: s.color + "15" }}>
                {s.label}
              </button>
            ))}
            {item.phase === "ready" && (
              <button onClick={() => onPromote(item)} className="text-[9px] font-bold px-2 py-0.5 rounded text-green-400 bg-green-400/15 border border-green-400/30">
                Propose to Team
              </button>
            )}
            <button onClick={() => onDelete(item)} className="text-[9px] text-red-400/40 hover:text-red-400 ml-auto">Delete</button>
          </div>
        </div>
      )}
    </Card>
  );
}

function EditableField({ label, value, field, editing, editVal, onStart, onSave, onChange, multiline }) {
  if (editing === field) {
    return (
      <div>
        <p className="text-[9px] font-bold text-[#475569] uppercase mb-1">{label}</p>
        {multiline ? (
          <textarea value={editVal} onChange={(e) => onChange(e.target.value)} rows={3}
            className="w-full py-1 px-2 rounded border border-[#334155] bg-transparent text-white text-xs outline-none resize-none" />
        ) : (
          <input type="text" value={editVal} onChange={(e) => onChange(e.target.value)}
            className="w-full py-1 px-2 rounded border border-[#334155] bg-transparent text-white text-xs outline-none" />
        )}
        <div className="flex gap-1 mt-1">
          <button onClick={() => onSave(field)} className="text-[9px] font-bold px-2 py-0.5 rounded text-blue-400 bg-blue-400/10">Save</button>
          <button onClick={() => onStart(null, "")} className="text-[9px] px-2 py-0.5 rounded text-[#475569]">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <p className="text-[9px] font-bold text-[#475569] uppercase">{label}</p>
        <p className={`text-xs mt-0.5 ${value ? "text-[#e2e8f0]" : "text-[#334155] italic"}`}>{value || "Not defined"}</p>
      </div>
      <button onClick={() => onStart(field, value)} className="text-[9px] text-[#475569] hover:text-white shrink-0">Edit</button>
    </div>
  );
}
