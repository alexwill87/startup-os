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

export default function ProductOverview() {
  const { user, member, canEdit } = useAuth();
  const members = useMembers();
  const [features, setFeatures] = useState([]);
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", prompt: "", goal_id: "", assigned_to: "" });
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const activeMembers = members.filter((m) => m.status === "active" && m.role !== "observer");
  const threshold = Math.max(2, Math.ceil(activeMembers.length * 0.66));

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("features_realtime")
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
        let meta = {};
        try { meta = JSON.parse(r.body || "{}"); } catch { meta = { description: r.body }; }
        return {
          ...r, phase: meta.phase || "proposed", description: meta.description || "",
          prompt: meta.prompt || "", votes: meta.votes || [], ready: meta.ready || false,
          goal_id: meta.goal_id || "", assigned_to: meta.assigned_to || "",
          checklist: meta.checklist || [],
        };
      });
      setFeatures(parsed);
      setGoals(objs || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  function saveMeta(item, updates) {
    const meta = {
      phase: item.phase, description: item.description, prompt: item.prompt,
      votes: item.votes, ready: item.ready, goal_id: item.goal_id,
      assigned_to: item.assigned_to, checklist: item.checklist, ...updates,
    };
    if (updates.votes) meta.ready = updates.votes.length >= threshold;
    return supabase.from("cockpit_vision").update({ body: JSON.stringify(meta) }).eq("id", item.id);
  }

  async function addFeature(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const body = JSON.stringify({
      phase: "proposed", description: form.description.trim(), prompt: form.prompt.trim(),
      votes: [], ready: false, goal_id: form.goal_id, assigned_to: form.assigned_to, checklist: [],
    });
    await supabase.from("cockpit_vision").insert({ topic: "roadmap", title: form.title.trim(), body, builder: member?.builder, created_by: member?.user_id });
    await logActivity("created", "feature", { title: form.title.trim() });
    setForm({ title: "", description: "", prompt: "", goal_id: "", assigned_to: "" });
    setShowForm(false);
  }

  async function voteFeature(item) {
    const name = member?.name || member?.email;
    if (item.votes.includes(name)) return;
    const newVotes = [...item.votes, name];
    const newPhase = newVotes.length >= threshold ? "validated" : item.phase;
    await saveMeta(item, { votes: newVotes, phase: newPhase, ready: newVotes.length >= threshold });
    await logActivity("updated", "feature", { title: `Voted: ${item.title}` });
  }

  async function changePhase(item, phase) {
    await saveMeta(item, { phase });
    await logActivity("updated", "feature", { title: `${item.title} → ${phase}` });
  }

  async function toggleChecklist(item, idx) {
    const checklist = [...item.checklist];
    checklist[idx] = { ...checklist[idx], done: !checklist[idx].done };
    await saveMeta(item, { checklist });
  }

  async function addChecklistItem(item, text) {
    if (!text.trim()) return;
    await saveMeta(item, { checklist: [...item.checklist, { text: text.trim(), done: false }] });
  }

  async function deleteFeature(item) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    await supabase.from("cockpit_vision").delete().eq("id", item.id);
  }

  const filtered = filter === "all" ? features : features.filter((f) => f.phase === filter);
  const stats = { proposed: 0, validated: 0, in_progress: 0, deployed: 0 };
  features.forEach((f) => { if (stats[f.phase] !== undefined) stats[f.phase]++; });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader title="Product Features" subtitle="Define, validate, and track features for Radar" color={COLOR}>
        {canEdit && (
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-amber-500 hover:bg-amber-600 transition">
            + New Feature
          </button>
        )}
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUSES.map((s) => (
          <button key={s.id} onClick={() => setFilter(filter === s.id ? "all" : s.id)}
            className="rounded-lg border p-3 text-center transition-all"
            style={{ borderColor: filter === s.id ? s.color : "#1e293b", backgroundColor: filter === s.id ? s.color + "10" : "#0d1117" }}>
            <p className="text-2xl font-extrabold" style={{ color: s.color }}>{stats[s.id]}</p>
            <p className="text-[10px] text-[#64748b] uppercase font-bold">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <form onSubmit={addFeature} className="space-y-3">
            <input type="text" placeholder="Feature title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none focus:border-amber-500" required />
            <textarea placeholder="Description — what does this feature do?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2}
              className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none resize-none" />
            <textarea placeholder="Prompt — the AI instruction to build this feature" value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} rows={3}
              className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-amber-300 text-xs font-mono outline-none resize-none" />
            <div className="flex gap-3">
              <select value={form.goal_id} onChange={(e) => setForm({ ...form, goal_id: e.target.value })}
                className="flex-1 py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none">
                <option value="">Link to a Goal (optional)</option>
                {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
              <input type="text" placeholder="Assigned to" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
                className="w-40 py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-amber-500">Add Feature</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs rounded-lg text-[#64748b] bg-[#1e293b]">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {/* Features */}
      {loading ? (
        <p className="text-sm text-[#475569] text-center py-8">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card><p className="text-sm text-[#475569] text-center py-8">{filter === "all" ? "No features yet. Propose the first one!" : "No features with this status."}</p></Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const status = STATUSES.find((s) => s.id === item.phase) || STATUSES[0];
            const linkedGoal = goals.find((g) => g.id === item.goal_id);
            const hasVoted = item.votes.includes(member?.name || member?.email);
            const isExpanded = expandedId === item.id;
            const checklistDone = item.checklist.filter((c) => c.done).length;

            return (
              <Card key={item.id} className="border-l-2" style={{ borderLeftColor: status.color }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-white">{item.title}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: status.color, backgroundColor: status.color + "15" }}>{status.label}</span>
                      {linkedGoal && <span className="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">Goal: {linkedGoal.title.slice(0, 40)}</span>}
                      {item.assigned_to && <span className="text-[10px] font-mono text-[#64748b]">@ {item.assigned_to}</span>}
                      {item.checklist.length > 0 && <span className="text-[10px] font-mono text-[#475569]">{checklistDone}/{item.checklist.length} tasks</span>}
                    </div>
                    {item.description && <p className="text-xs text-[#94a3b8] mt-1">{item.description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!hasVoted && item.phase === "proposed" && (
                      <button onClick={() => voteFeature(item)} className="text-[10px] font-bold px-2 py-1 rounded text-green-400 bg-green-400/10 hover:bg-green-400/20 transition">Vote</button>
                    )}
                    <button onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-[10px] font-bold px-2 py-1 rounded text-[#64748b] hover:text-white hover:bg-[#1e293b] transition">
                      {isExpanded ? "Close" : "Details"}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-[#475569]">{item.votes.length}/{threshold} votes</span>
                  {item.votes.map((v) => <span key={v} className="text-[10px] font-mono text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">{v}</span>)}
                </div>

                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[#1e293b] space-y-4">
                    {item.prompt && (
                      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <p className="text-[10px] font-bold text-amber-400 uppercase mb-1">Prompt</p>
                        <p className="text-xs text-amber-200/80 font-mono whitespace-pre-wrap">{item.prompt}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-[#64748b] uppercase mb-2">Checklist {item.checklist.length > 0 ? `(${checklistDone}/${item.checklist.length})` : ""}</p>
                      {item.checklist.map((task, idx) => (
                        <div key={idx} className="flex items-center gap-2 py-1">
                          <input type="checkbox" checked={task.done} onChange={() => toggleChecklist(item, idx)} className="rounded border-[#334155]" />
                          <span className={`text-xs ${task.done ? "text-[#475569] line-through" : "text-[#e2e8f0]"}`}>{task.text}</span>
                        </div>
                      ))}
                      {canEdit && <AddChecklistItem onAdd={(text) => addChecklistItem(item, text)} />}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#1e293b]">
                        <span className="text-[10px] text-[#475569]">Move to:</span>
                        {STATUSES.filter((s) => s.id !== item.phase).map((s) => (
                          <button key={s.id} onClick={() => changePhase(item, s.id)} className="text-[10px] font-semibold px-2 py-0.5 rounded" style={{ color: s.color, backgroundColor: s.color + "15" }}>{s.label}</button>
                        ))}
                        <button onClick={() => deleteFeature(item)} className="text-[10px] text-red-400/50 hover:text-red-400 ml-auto">Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddChecklistItem({ onAdd }) {
  const [text, setText] = useState("");
  return (
    <div className="flex gap-2 mt-2">
      <input type="text" placeholder="Add task..." value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { onAdd(text); setText(""); } }}
        className="flex-1 py-1 px-2 rounded border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none" />
      <button onClick={() => { onAdd(text); setText(""); }} className="px-2 py-1 text-[10px] font-bold rounded text-amber-400 bg-amber-400/10">Add</button>
    </div>
  );
}
