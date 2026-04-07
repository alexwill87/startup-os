"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#f59e0b";
const STATUSES = [
  { id: "proposed", label: "Proposed", color: "#8b5cf6" },
  { id: "validated", label: "Validated", color: "#3b82f6" },
  { id: "in_progress", label: "In Progress", color: "#f59e0b" },
  { id: "deployed", label: "Deployed", color: "#10b981" },
];
const PILLAR_TAGS = ["why", "team", "resources", "project", "market", "finances", "analytics"];
const PILLAR_COLORS = { why: "#3b82f6", team: "#8b5cf6", resources: "#10b981", project: "#f59e0b", market: "#ec4899", finances: "#ef4444", analytics: "#06b6d4" };
const SORT_OPTIONS = [
  { id: "created", label: "Date created" },
  { id: "updated", label: "Last updated" },
  { id: "alpha", label: "Alphabetical" },
  { id: "votes", label: "Most votes" },
];

export default function FeaturesPage() {
  const { user, member, canEdit } = useAuth();
  const members = useMembers();
  const [features, setFeatures] = useState([]);
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", prompt: "", goal_id: "", assigned_to: "", kpi_expected: "", tags: [], _checklist: [] });
  const [filter, setFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState(null);
  const [sortBy, setSortBy] = useState("created");
  const [view, setView] = useState("list");
  const [expandedId, setExpandedId] = useState(null);
  const [suggesting, setSuggesting] = useState({});
  const [loading, setLoading] = useState(true);

  const activeMembers = members.filter((m) => m.status === "active" && m.role !== "observer");
  const threshold = Math.max(2, Math.ceil(activeMembers.length * 0.66));

  useEffect(() => {
    fetchAll();
    const sub = supabase.channel("features_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_vision" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchAll() {
    try {
      const [{ data: roadmap }, { data: objs }] = await Promise.all([
        supabase.from("cockpit_vision").select("*").eq("topic", "roadmap").order("created_at"),
        supabase.from("cockpit_objectives").select("id, title, pillar").order("sort_order"),
      ]);
      const parsed = (roadmap || []).map((r) => {
        let m = {};
        try { m = JSON.parse(r.body || "{}"); } catch { m = { description: r.body }; }
        return { ...r, phase: m.phase || "proposed", description: m.description || "", prompt: m.prompt || "",
          votes: m.votes || [], ready: m.ready || false, goal_id: m.goal_id || "", assigned_to: m.assigned_to || "",
          checklist: m.checklist || [], kpi_expected: m.kpi_expected || "", tags: m.tags || [] };
      });
      setFeatures(parsed);
      setGoals(objs || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function saveMeta(item, updates) {
    const meta = { phase: item.phase, description: item.description, prompt: item.prompt, votes: item.votes,
      ready: item.ready, goal_id: item.goal_id, assigned_to: item.assigned_to, checklist: item.checklist,
      kpi_expected: item.kpi_expected, tags: item.tags, ...updates };
    if (updates.votes) meta.ready = updates.votes.length >= threshold;
    return supabase.from("cockpit_vision").update({ body: JSON.stringify(meta) }).eq("id", item.id);
  }

  // AI Suggest
  async function aiSuggest(field) {
    if (!form.title.trim()) return;
    setSuggesting((s) => ({ ...s, [field]: true }));
    try {
      const goalsCtx = goals.map((g) => `[${g.pillar}] ${g.title}`).join("; ");
      const prompts = {
        description: `Feature "${form.title}" for Radar (job platform monitoring). Write 1-2 sentence description. Goals: ${goalsCtx}. English, no quotes.`,
        kpi_expected: `Feature "${form.title}": ${form.description || ""}. What measurable KPI should this feature impact? Give 1 specific metric with a target. Example: "Increase waitlist signups by 30%". English, one line.`,
        prompt: `Write a technical prompt for an AI agent to build "${form.title}" in Next.js+Supabase+Tailwind. Desc: ${form.description || "tbd"}. Max 150 words, be specific.`,
        checklist: `Break "${form.title}" (${form.description || ""}) into 3-6 tasks. Return JSON string array only. Example: ["Task 1","Task 2"]`,
      };
      if (!prompts[field]) return;
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompts[field], history: [], userId: member?.email, page: "/projet/features" }) });
      const data = await res.json();
      const reply = (data.reply || "").trim();
      if (field === "checklist") {
        try { const arr = JSON.parse(reply); if (Array.isArray(arr)) setForm((f) => ({ ...f, _checklist: arr })); } catch {}
      } else {
        setForm((f) => ({ ...f, [field]: reply }));
      }
    } catch {} finally { setSuggesting((s) => ({ ...s, [field]: false })); }
  }

  async function aiSuggestAll() {
    if (!form.title.trim()) return;
    await aiSuggest("description");
    await aiSuggest("kpi_expected");
    await aiSuggest("prompt");
    await aiSuggest("checklist");
  }

  async function addFeature(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const cl = (form._checklist || []).map((t) => ({ text: t, done: false }));
    const body = JSON.stringify({ phase: "proposed", description: form.description.trim(), prompt: form.prompt.trim(),
      votes: [], ready: false, goal_id: form.goal_id, assigned_to: form.assigned_to, checklist: cl,
      kpi_expected: form.kpi_expected.trim(), tags: form.tags });
    await supabase.from("cockpit_vision").insert({ topic: "roadmap", title: form.title.trim(), body, builder: member?.builder, created_by: member?.user_id });
    await logActivity("created", "feature", { title: form.title.trim() });
    setForm({ title: "", description: "", prompt: "", goal_id: "", assigned_to: "", kpi_expected: "", tags: [], _checklist: [] });
    setShowForm(false);
    fetchAll();
  }

  async function voteFeature(item) {
    const name = member?.name || member?.email;
    if (item.votes.includes(name)) return;
    const nv = [...item.votes, name];
    await saveMeta(item, { votes: nv, phase: nv.length >= threshold ? "validated" : item.phase, ready: nv.length >= threshold });
    await logActivity("updated", "feature", { title: `Voted: ${item.title}` });
  }

  async function changePhase(item, phase) { await saveMeta(item, { phase }); await logActivity("updated", "feature", { title: `${item.title} → ${phase}` }); }
  async function toggleCL(item, idx) { const cl = [...item.checklist]; cl[idx] = { ...cl[idx], done: !cl[idx].done }; await saveMeta(item, { checklist: cl }); }
  async function addCLItem(item, text) { if (!text.trim()) return; await saveMeta(item, { checklist: [...item.checklist, { text: text.trim(), done: false }] }); }
  async function deleteFeature(item) { if (!confirm(`Delete "${item.title}"?`)) return; await supabase.from("cockpit_vision").delete().eq("id", item.id); }

  // Filtering & sorting
  let displayed = features;
  if (filter !== "all") displayed = displayed.filter((f) => f.phase === filter);
  if (tagFilter) displayed = displayed.filter((f) => (f.tags || []).includes(tagFilter) || goals.find((g) => g.id === f.goal_id)?.pillar === tagFilter);

  displayed = [...displayed].sort((a, b) => {
    if (sortBy === "alpha") return a.title.localeCompare(b.title);
    if (sortBy === "votes") return (b.votes?.length || 0) - (a.votes?.length || 0);
    if (sortBy === "updated") return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Compute tag counts
  const tagCounts = {};
  features.forEach((f) => {
    (f.tags || []).forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
    const gp = goals.find((g) => g.id === f.goal_id)?.pillar;
    if (gp) tagCounts[gp] = (tagCounts[gp] || 0) + 1;
  });

  const stats = { proposed: 0, validated: 0, in_progress: 0, deployed: 0 };
  features.forEach((f) => { if (stats[f.phase] !== undefined) stats[f.phase]++; });

  const anyLoading = Object.values(suggesting).some(Boolean);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <PageHeader title="Features" subtitle={`${features.length} features — define, validate, build, deploy`} color={COLOR}>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-[#1e293b] overflow-hidden">
            {[{ id: "list", l: "List" }, { id: "kanban", l: "Kanban" }].map((v) => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={`px-3 py-1.5 text-[10px] font-bold ${view === v.id ? "bg-amber-500/20 text-amber-400" : "text-[#475569] hover:text-white"}`}>
                {v.l}
              </button>
            ))}
          </div>
          {canEdit && (
            <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-amber-500 hover:bg-amber-600 transition">
              + New
            </button>
          )}
        </div>
      </PageHeader>

      {/* Stats row */}
      <div className="flex gap-2">
        {STATUSES.map((s) => (
          <button key={s.id} onClick={() => setFilter(filter === s.id ? "all" : s.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-bold transition-all"
            style={{ borderColor: filter === s.id ? s.color : "#1e293b", color: filter === s.id ? s.color : "#475569", backgroundColor: filter === s.id ? s.color + "10" : "transparent" }}>
            <span className="text-sm">{stats[s.id]}</span> {s.label}
          </button>
        ))}
      </div>

      {/* Tags + Sort */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-[#475569]">Filter:</span>
        {PILLAR_TAGS.filter((t) => tagCounts[t]).map((t) => (
          <button key={t} onClick={() => setTagFilter(tagFilter === t ? null : t)}
            className="text-[10px] font-bold px-2 py-0.5 rounded-full transition-all"
            style={{ color: tagFilter === t ? PILLAR_COLORS[t] : "#475569", backgroundColor: tagFilter === t ? PILLAR_COLORS[t] + "15" : "transparent", border: `1px solid ${tagFilter === t ? PILLAR_COLORS[t] + "44" : "#1e293b"}` }}>
            #{t} <span className="text-[9px] opacity-60">{tagCounts[t]}</span>
          </button>
        ))}
        <div className="ml-auto">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
            className="py-1 px-2 rounded border border-[#1e293b] bg-transparent text-[10px] text-[#475569] outline-none">
            {SORT_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <form onSubmit={addFeature} className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <input type="text" placeholder="Feature title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-base font-bold outline-none focus:border-amber-500" required />
              </div>
              {form.title.trim() && (
                <button type="button" onClick={aiSuggestAll} disabled={anyLoading}
                  className="px-3 py-2 text-[10px] font-bold rounded-lg text-purple-400 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition shrink-0 disabled:opacity-50">
                  {anyLoading ? "..." : "AI fill"}
                </button>
              )}
            </div>

            <FieldWithAI label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })}
              onAI={() => aiSuggest("description")} loading={suggesting.description} rows={2} show={!!form.title.trim()} />
            <FieldWithAI label="Expected KPI / Measurable Objective" value={form.kpi_expected} onChange={(v) => setForm({ ...form, kpi_expected: v })}
              onAI={() => aiSuggest("kpi_expected")} loading={suggesting.kpi_expected} rows={1} show={!!form.title.trim()} />
            <FieldWithAI label="Prompt (AI instruction)" value={form.prompt} onChange={(v) => setForm({ ...form, prompt: v })}
              onAI={() => aiSuggest("prompt")} loading={suggesting.prompt} rows={3} mono show={!!form.title.trim()} />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[#475569] font-bold uppercase mb-1">Linked Goal</label>
                <select value={form.goal_id} onChange={(e) => setForm({ ...form, goal_id: e.target.value })}
                  className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none">
                  <option value="">None</option>
                  {goals.map((g) => <option key={g.id} value={g.id}>[{g.pillar}] {g.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-[#475569] font-bold uppercase mb-1">Assigned to</label>
                <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                  className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none">
                  <option value="">Unassigned</option>
                  {activeMembers.map((m) => <option key={m.id} value={m.name || m.email}>{m.name || m.email} ({m.role})</option>)}
                  <option value="Agent (Bot)">Agent (Bot)</option>
                  <option value="Claude Code">Claude Code</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-[#475569] font-bold uppercase mb-1">Tags</label>
              <div className="flex gap-1.5 flex-wrap">
                {PILLAR_TAGS.map((t) => (
                  <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] }))}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all"
                    style={{ borderColor: form.tags.includes(t) ? PILLAR_COLORS[t] : "#1e293b", color: form.tags.includes(t) ? PILLAR_COLORS[t] : "#475569", backgroundColor: form.tags.includes(t) ? PILLAR_COLORS[t] + "15" : "transparent" }}>
                    #{t}
                  </button>
                ))}
              </div>
            </div>

            {(form._checklist || []).length > 0 && (
              <div>
                <label className="block text-[10px] text-[#475569] font-bold uppercase mb-1">Suggested Tasks</label>
                <div className="space-y-1 p-2 rounded-lg bg-[#0a0f1a] border border-[#1e293b]">
                  {form._checklist.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#e2e8f0]">
                      <span className="text-amber-400">-</span> {t}
                      <button type="button" onClick={() => setForm((f) => ({ ...f, _checklist: f._checklist.filter((_, idx) => idx !== i) }))} className="text-red-400/40 hover:text-red-400 ml-auto text-[10px]">&times;</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-amber-500">Add Feature</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs rounded-lg text-[#64748b] bg-[#1e293b]">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <p className="text-sm text-[#475569] text-center py-8">Loading...</p>
      ) : displayed.length === 0 ? (
        <Card><p className="text-sm text-[#475569] text-center py-8">{features.length === 0 ? "No features yet. Create the first one!" : "No features match these filters."}</p></Card>
      ) : view === "kanban" ? (
        <KanbanView features={displayed} goals={goals} members={members} member={member} threshold={threshold}
          canEdit={canEdit} onVote={voteFeature} onPhase={changePhase} onExpand={setExpandedId} expandedId={expandedId}
          onToggleCL={toggleCL} onAddCL={addCLItem} onDelete={deleteFeature} />
      ) : (
        <ListView features={displayed} goals={goals} members={members} member={member} threshold={threshold}
          canEdit={canEdit} onVote={voteFeature} onPhase={changePhase} expandedId={expandedId} onExpand={setExpandedId}
          onToggleCL={toggleCL} onAddCL={addCLItem} onDelete={deleteFeature} />
      )}
    </div>
  );
}

// --- Sub-components ---

function FieldWithAI({ label, value, onChange, onAI, loading, rows, mono, show }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-[#475569] font-bold uppercase">{label}</label>
        {show && <button type="button" onClick={onAI} disabled={loading} className="text-[10px] font-bold text-purple-400 hover:text-purple-300 disabled:opacity-50">{loading ? "..." : "AI"}</button>}
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows || 2}
        className={`w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-xs outline-none resize-none ${mono ? "text-amber-300 font-mono" : "text-white"}`} />
    </div>
  );
}

function FeatureCard({ item, goals, members, member, threshold, canEdit, onVote, onPhase, expanded, onExpand, onToggleCL, onAddCL, onDelete, compact }) {
  const status = STATUSES.find((s) => s.id === item.phase) || STATUSES[0];
  const linkedGoal = goals.find((g) => g.id === item.goal_id);
  const hasVoted = item.votes.includes(member?.name || member?.email);
  const clDone = item.checklist.filter((c) => c.done).length;

  return (
    <Card className="border-l-2" style={{ borderLeftColor: status.color }}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className={`font-bold text-white ${compact ? "text-xs" : "text-sm"}`}>{item.title}</h3>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: status.color, backgroundColor: status.color + "15" }}>{status.label}</span>
            {linkedGoal && <span className="text-[9px] font-mono text-blue-400 bg-blue-400/10 px-1 py-0.5 rounded">{linkedGoal.title.slice(0, 30)}</span>}
            {item.assigned_to && <span className="text-[9px] text-[#475569] font-mono">@{item.assigned_to}</span>}
            {(item.tags || []).map((t) => <span key={t} className="text-[9px] px-1 py-0.5 rounded" style={{ color: PILLAR_COLORS[t] || "#475569", backgroundColor: (PILLAR_COLORS[t] || "#475569") + "15" }}>#{t}</span>)}
          </div>
          {!compact && item.description && <p className="text-[11px] text-[#94a3b8] mt-1 line-clamp-2">{item.description}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          {!hasVoted && item.phase === "proposed" && <button onClick={() => onVote(item)} className="text-[9px] font-bold px-1.5 py-0.5 rounded text-green-400 bg-green-400/10">Vote</button>}
          <button onClick={() => onExpand(expanded ? null : item.id)} className="text-[9px] font-bold px-1.5 py-0.5 rounded text-[#475569] hover:text-white hover:bg-[#1e293b]">{expanded ? "-" : "+"}</button>
        </div>
      </div>

      {/* Vote bar */}
      <div className="flex items-center gap-1.5 mt-1.5">
        <span className="text-[9px] text-[#475569]">{item.votes.length}/{threshold}</span>
        {item.votes.map((v) => <span key={v} className="text-[9px] font-mono text-green-400 bg-green-400/10 px-1 py-0.5 rounded">{v}</span>)}
        {item.checklist.length > 0 && <span className="text-[9px] text-[#475569] ml-auto">{clDone}/{item.checklist.length} tasks</span>}
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#1e293b] space-y-3">
          {item.kpi_expected && (
            <div className="p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
              <p className="text-[9px] font-bold text-cyan-400 uppercase mb-0.5">Expected KPI</p>
              <p className="text-xs text-cyan-200/80">{item.kpi_expected}</p>
            </div>
          )}
          {item.prompt && (
            <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <p className="text-[9px] font-bold text-amber-400 uppercase mb-0.5">Prompt</p>
              <p className="text-[11px] text-amber-200/80 font-mono whitespace-pre-wrap">{item.prompt}</p>
            </div>
          )}
          <div>
            <p className="text-[9px] font-bold text-[#475569] uppercase mb-1">Checklist {item.checklist.length > 0 ? `(${clDone}/${item.checklist.length})` : ""}</p>
            {item.checklist.map((task, idx) => (
              <div key={idx} className="flex items-center gap-2 py-0.5">
                <input type="checkbox" checked={task.done} onChange={() => onToggleCL(item, idx)} className="rounded border-[#334155]" />
                <span className={`text-xs ${task.done ? "text-[#475569] line-through" : "text-[#e2e8f0]"}`}>{task.text}</span>
              </div>
            ))}
            {canEdit && <AddCLItem onAdd={(t) => onAddCL(item, t)} />}
          </div>
          {canEdit && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-[#1e293b]">
              {STATUSES.filter((s) => s.id !== item.phase).map((s) => (
                <button key={s.id} onClick={() => onPhase(item, s.id)} className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: s.color, backgroundColor: s.color + "15" }}>{s.label}</button>
              ))}
              <button onClick={() => onDelete(item)} className="text-[9px] text-red-400/40 hover:text-red-400 ml-auto">Delete</button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function ListView({ features, goals, members, member, threshold, canEdit, onVote, onPhase, expandedId, onExpand, onToggleCL, onAddCL, onDelete }) {
  return (
    <div className="space-y-3">
      {features.map((f) => (
        <FeatureCard key={f.id} item={f} goals={goals} members={members} member={member} threshold={threshold}
          canEdit={canEdit} onVote={onVote} onPhase={onPhase} expanded={expandedId === f.id} onExpand={onExpand}
          onToggleCL={onToggleCL} onAddCL={onAddCL} onDelete={onDelete} />
      ))}
    </div>
  );
}

function KanbanView({ features, goals, members, member, threshold, canEdit, onVote, onPhase, expandedId, onExpand, onToggleCL, onAddCL, onDelete }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {STATUSES.map((status) => {
        const items = features.filter((f) => f.phase === status.id);
        return (
          <div key={status.id}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: status.color }} />
              <span className="text-xs font-bold" style={{ color: status.color }}>{status.label}</span>
              <span className="text-[9px] text-[#475569]">({items.length})</span>
            </div>
            <div className="space-y-2">
              {items.map((f) => (
                <FeatureCard key={f.id} item={f} goals={goals} members={members} member={member} threshold={threshold}
                  canEdit={canEdit} onVote={onVote} onPhase={onPhase} expanded={expandedId === f.id} onExpand={onExpand}
                  onToggleCL={onToggleCL} onAddCL={onAddCL} onDelete={onDelete} compact />
              ))}
              {items.length === 0 && <div className="rounded-lg border border-dashed border-[#1e293b] p-4 text-center text-[10px] text-[#334155]">Empty</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddCLItem({ onAdd }) {
  const [t, setT] = useState("");
  return (
    <div className="flex gap-1.5 mt-1">
      <input type="text" value={t} onChange={(e) => setT(e.target.value)} placeholder="Add task..."
        onKeyDown={(e) => { if (e.key === "Enter") { onAdd(t); setT(""); } }}
        className="flex-1 py-1 px-2 rounded border border-[#1e293b] bg-[#0a0f1a] text-white text-[11px] outline-none" />
      <button type="button" onClick={() => { onAdd(t); setT(""); }} className="px-2 py-1 text-[9px] font-bold rounded text-amber-400 bg-amber-400/10">+</button>
    </div>
  );
}
