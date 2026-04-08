"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import Card from "@/app/components/Card";
import Link from "next/link";

const PILLARS = [
  { id: "why", label: "Why", color: "#3b82f6", desc: "Define the mission, the problem we solve, and why now." },
  { id: "team", label: "Team", color: "#8b5cf6", desc: "Build the right team with clear roles and accountability." },
  { id: "resources", label: "Resources", color: "#10b981", desc: "Gather tools, documents, and assets to move fast." },
  { id: "project", label: "Project", color: "#f59e0b", desc: "Ship features, track progress, and stay on schedule." },
  { id: "market", label: "Market", color: "#ec4899", desc: "Understand users, competitors, and market positioning." },
  { id: "finances", label: "Finances", color: "#ef4444", desc: "Control costs, plan revenue, and reach sustainability." },
  { id: "analytics", label: "Analytics", color: "#06b6d4", desc: "Measure what matters and make data-driven decisions." },
];

const MAX_PER_PILLAR = 3;
const VOTE_ICONS = { agree: "+", disagree: "-", neutral: "~" };
const VOTE_COLORS = { agree: "#10b981", disagree: "#ef4444", neutral: "#64748b" };

export default function GoalsPage() {
  const { user, member, canEdit } = useAuth();
  const members = useMembers();
  const [objectives, setObjectives] = useState([]);
  const [comments, setComments] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [addingPillar, setAddingPillar] = useState(null);
  const [newText, setNewText] = useState("");
  const [editingAssign, setEditingAssign] = useState(null);
  const [commentForm, setCommentForm] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);

  const activeMembers = members.filter((m) => m.status === "active" && m.role !== "observer");
  const threshold = Math.max(2, Math.ceil(activeMembers.length * 0.66));

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("goals_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_objectives" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_comments" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchAll() {
    try {
      const { data: objs } = await supabase.from("cockpit_objectives").select("*").order("sort_order").order("created_at");
      setObjectives(objs || []);
      // Comments may fail if migration 015 not yet applied
      try {
        const { data: cmts } = await supabase.from("cockpit_comments").select("*").eq("entity_type", "goal").order("created_at");
        const grouped = {};
        (cmts || []).forEach((c) => {
          if (!grouped[c.entity_id]) grouped[c.entity_id] = [];
          grouped[c.entity_id].push(c);
        });
        setComments(grouped);
      } catch { setComments({}); }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  function getComments(objId) { return comments[objId] || []; }

  function getAssign(obj) {
    try { return JSON.parse(obj.description || "{}"); } catch { return {}; }
  }

  async function saveAssign(obj, assign) {
    await supabase.from("cockpit_objectives").update({ description: JSON.stringify(assign) }).eq("id", obj.id);
    fetchAll();
  }

  function getVoteCounts(objId) {
    const cmts = getComments(objId);
    return {
      agree: new Set(cmts.filter((c) => c.vote === "agree").map((c) => c.author_id)).size,
      disagree: new Set(cmts.filter((c) => c.vote === "disagree").map((c) => c.author_id)).size,
      neutral: new Set(cmts.filter((c) => c.vote === "neutral").map((c) => c.author_id)).size,
    };
  }

  function isLocked(objId) { return getVoteCounts(objId).agree >= threshold; }

  async function addObjective(pillarId) {
    if (!newText.trim()) return;
    const pillarObjs = objectives.filter((o) => o.pillar === pillarId);
    if (pillarObjs.length >= MAX_PER_PILLAR) return;
    const { data: created } = await supabase.from("cockpit_objectives").insert({
      title: newText.trim(), pillar: pillarId, status: "proposed",
      proposed_by: member?.name || member?.email, sort_order: pillarObjs.length,
    }).select("id").single();
    // Auto-vote agree on own goal
    if (created?.id) {
      try {
        await supabase.from("cockpit_comments").insert({
          entity_type: "goal", entity_id: created.id,
          body: "I propose this goal.", vote: "agree", author_id: user?.id,
        });
      } catch { /* migration 015 not applied yet */ }
    }
    await logActivity("created", "goal", { title: newText.trim() });
    setNewText(""); setAddingPillar(null);
    fetchAll();
  }

  async function saveEdit(obj) {
    if (!editText.trim() || editText.trim() === obj.title) { setEditingId(null); return; }
    await supabase.from("cockpit_objectives").update({
      title: editText.trim(), status: "proposed", proposed_by: member?.name || member?.email,
    }).eq("id", obj.id);
    // Reset all comments (content changed)
    await supabase.from("cockpit_comments").delete().eq("entity_type", "goal").eq("entity_id", obj.id);
    await logActivity("updated", "goal", { title: editText.trim() });
    setEditingId(null); setEditText("");
  }

  async function addComment(objId) {
    const cf = commentForm[objId];
    if (!cf?.body?.trim()) return;
    await supabase.from("cockpit_comments").insert({
      entity_type: "goal", entity_id: objId,
      body: cf.body.trim(), vote: cf.vote || "neutral", author_id: user?.id,
    });
    // Check if now locked
    const votes = getVoteCounts(objId);
    if ((votes.agree + (cf.vote === "agree" ? 1 : 0)) >= threshold) {
      await supabase.from("cockpit_objectives").update({ status: "approved" }).eq("id", objId);
    }
    await logActivity("commented", "goal", { title: objectives.find((o) => o.id === objId)?.title });
    setCommentForm({ ...commentForm, [objId]: { body: "", vote: "neutral" } });
  }

  async function deleteObjective(obj) {
    if (!confirm(`Delete this goal?`)) return;
    await supabase.from("cockpit_comments").delete().eq("entity_type", "goal").eq("entity_id", obj.id);
    await supabase.from("cockpit_objectives").delete().eq("id", obj.id);
  }

  const totalLocked = objectives.filter((o) => isLocked(o.id)).length;
  const pillarsWithGoal = new Set(objectives.map((o) => o.pillar)).size;

  if (loading) return <div className="p-6 max-w-4xl mx-auto"><p className="text-sm text-[#475569] text-center py-12">Loading goals...</p></div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Goals</h1>
        <p className="text-sm text-[#94a3b8] mt-1">Define up to 3 goals per pillar. Each needs {threshold} agree votes to lock.</p>
        <div className="flex gap-6 mt-4">
          <div><span className="text-3xl font-extrabold text-green-400">{totalLocked}</span><span className="text-sm text-[#475569] ml-2">locked</span></div>
          <div><span className="text-3xl font-extrabold text-[#64748b]">{objectives.length}</span><span className="text-sm text-[#475569] ml-2">total</span></div>
          <div><span className="text-3xl font-extrabold text-blue-400">{pillarsWithGoal}</span><span className="text-sm text-[#475569] ml-2">/ 7 pillars</span></div>
        </div>
        <div className="h-[2px] mt-4 rounded-full bg-gradient-to-r from-green-500/30 via-blue-500/20 to-transparent" />
      </div>

      {PILLARS.map((pillar) => {
        const pillarObjs = objectives.filter((o) => o.pillar === pillar.id);
        const canAdd = pillarObjs.length < MAX_PER_PILLAR;
        const isAdding = addingPillar === pillar.id;

        return (
          <div key={pillar.id}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pillar.color }} />
              <h2 className="text-lg font-extrabold text-white">{pillar.label}</h2>
              <span className="text-xs font-mono text-[#475569]">{pillarObjs.length}/{MAX_PER_PILLAR}</span>
            </div>
            <p className="text-sm text-[#64748b] mb-4 ml-6">{pillar.desc}</p>

            <div className="space-y-3 ml-6">
              {pillarObjs.map((obj) => {
                const cmts = getComments(obj.id);
                const votes = getVoteCounts(obj.id);
                const locked = votes.agree >= threshold;
                const isEditing = editingId === obj.id;
                const isExpanded = expandedId === obj.id;

                return (
                  <div key={obj.id} className="rounded-xl border p-5 transition-all"
                    style={{ borderColor: locked ? "#10b981" + "66" : "#1e293b", backgroundColor: locked ? "#10b981" + "08" : "#0d1117" }}>

                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-transparent text-lg font-bold text-white outline-none resize-none border-b border-[#334155] pb-2"
                          rows={2} maxLength={200} autoFocus placeholder="Max 2 sentences..." />
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(obj)} className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-blue-500">Save</button>
                          <button onClick={() => { setEditingId(null); setEditText(""); }} className="px-4 py-1.5 text-xs rounded-lg text-[#64748b] bg-[#1e293b]">Cancel</button>
                          <p className="text-[10px] text-amber-400 ml-auto self-center">Saving will reset all votes</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-lg font-bold text-white leading-relaxed">{obj.title}</p>
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          {(() => { const m = members.find((x) => x.name === obj.proposed_by || x.email === obj.proposed_by); return m ? (
                            <Link href={`/equipe/member/${m.id}`} className="text-[10px] text-blue-400 font-mono hover:underline">by {obj.proposed_by}</Link>
                          ) : <span className="text-[10px] text-[#475569] font-mono">by {obj.proposed_by || "Unknown"}</span>; })()}
                          {/* Vote summary */}
                          {["agree", "disagree", "neutral"].map((v) => (
                            <span key={v} className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: VOTE_COLORS[v], backgroundColor: VOTE_COLORS[v] + "15" }}>
                              {VOTE_ICONS[v]} {votes[v]}
                            </span>
                          ))}
                          {locked ? (
                            <span className="text-[10px] font-extrabold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full uppercase">Locked</span>
                          ) : (
                            <span className="text-[10px] text-[#475569] font-mono">{votes.agree}/{threshold} to lock</span>
                          )}
                          <div className="flex gap-1 ml-auto">
                            <button onClick={() => setExpandedId(isExpanded ? null : obj.id)}
                              className="text-[10px] font-bold px-2 py-1 rounded text-[#64748b] hover:text-white hover:bg-[#1e293b] transition">
                              {cmts.length > 0 ? `Comments (${cmts.length})` : "Comment"}
                            </button>
                            {canEdit && <button onClick={() => { setEditingId(obj.id); setEditText(obj.title); }}
                              className="text-[10px] px-2 py-1 rounded text-[#475569] hover:text-white hover:bg-[#1e293b] transition">Edit</button>}
                            {canEdit && !locked && <button onClick={() => deleteObjective(obj)}
                              className="text-[10px] px-2 py-1 rounded text-red-400/40 hover:text-red-400 transition">Del</button>}
                          </div>
                        </div>

                        {/* Assignments: responsible, controller, agents */}
                        {(() => {
                          const assign = getAssign(obj);
                          const isAssigning = editingAssign === obj.id;
                          return (
                            <div className="mt-3 flex items-center gap-3 flex-wrap">
                              {assign.responsible && (
                                <span className="text-[10px]"><span className="text-[#475569]">Lead:</span> <span className="text-blue-400 font-semibold">{assign.responsible}</span></span>
                              )}
                              {assign.controller && (
                                <span className="text-[10px]"><span className="text-[#475569]">Control:</span> <span className="text-green-400 font-semibold">{assign.controller}</span></span>
                              )}
                              {(assign.agents || []).map((a) => (
                                <span key={a} className="text-[10px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded font-mono">{a}</span>
                              ))}
                              {!assign.responsible && !isAssigning && canEdit && (
                                <button onClick={() => setEditingAssign(obj.id)} className="text-[10px] text-[#334155] hover:text-[#64748b]">+ Assign</button>
                              )}
                              {assign.responsible && canEdit && !isAssigning && (
                                <button onClick={() => setEditingAssign(obj.id)} className="text-[10px] text-[#334155] hover:text-[#64748b] ml-auto">Edit</button>
                              )}
                              {isAssigning && (
                                <div className="w-full mt-2 p-3 rounded-lg bg-[#0a0f1a] border border-[#1e293b] space-y-2">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <label className="text-[9px] text-[#475569] uppercase">Lead (responsible)</label>
                                      <select defaultValue={assign.responsible || ""} id={`resp-${obj.id}`}
                                        className="w-full py-1.5 px-2 rounded border border-[#1e293b] bg-transparent text-xs text-white outline-none">
                                        <option value="">—</option>
                                        {activeMembers.map((m) => <option key={m.id} value={m.name || m.email}>{m.name || m.email}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-[#475569] uppercase">Controller</label>
                                      <select defaultValue={assign.controller || ""} id={`ctrl-${obj.id}`}
                                        className="w-full py-1.5 px-2 rounded border border-[#1e293b] bg-transparent text-xs text-white outline-none">
                                        <option value="">—</option>
                                        {activeMembers.map((m) => <option key={m.id} value={m.name || m.email}>{m.name || m.email}</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[9px] text-[#475569] uppercase">Agent</label>
                                      <select defaultValue={(assign.agents || [])[0] || ""} id={`agent-${obj.id}`}
                                        className="w-full py-1.5 px-2 rounded border border-[#1e293b] bg-transparent text-xs text-white outline-none">
                                        <option value="">None</option>
                                        <option value="Bot Telegram">Bot Telegram</option>
                                        <option value="Claude Code">Claude Code</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => {
                                      const r = document.getElementById(`resp-${obj.id}`).value;
                                      const c = document.getElementById(`ctrl-${obj.id}`).value;
                                      const a = document.getElementById(`agent-${obj.id}`).value;
                                      if (r && r === c) { alert("Lead and Controller must be different people"); return; }
                                      saveAssign(obj, { responsible: r, controller: c, agents: a ? [a] : [] });
                                      setEditingAssign(null);
                                    }} className="text-[10px] font-bold px-3 py-1 rounded text-green-400 bg-green-400/10">Save</button>
                                    <button onClick={() => setEditingAssign(null)} className="text-[10px] px-3 py-1 rounded text-[#475569]">Cancel</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Comment thread */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-[#1e293b] space-y-3">
                            {cmts.length > 0 && (
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {cmts.map((c) => {
                                  const authorMember = members.find((m) => m.user_id === c.author_id);
                                  return (
                                    <div key={c.id} className="flex gap-2">
                                      <span className="text-xs font-bold w-4 text-center shrink-0" style={{ color: VOTE_COLORS[c.vote] }}>{VOTE_ICONS[c.vote]}</span>
                                      <div className="flex-1">
                                        <p className="text-xs text-[#e2e8f0]">{c.body}</p>
                                        <p className="text-[10px] text-[#475569] font-mono mt-0.5">{authorMember?.name || "Unknown"} — {new Date(c.created_at).toLocaleDateString("fr-FR")}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {!locked && (
                              <div className="flex gap-2">
                                <select value={commentForm[obj.id]?.vote || "neutral"}
                                  onChange={(e) => setCommentForm({ ...commentForm, [obj.id]: { ...commentForm[obj.id], vote: e.target.value } })}
                                  className="w-20 py-1.5 px-2 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-xs text-white outline-none">
                                  <option value="agree">Agree</option>
                                  <option value="disagree">Disagree</option>
                                  <option value="neutral">Neutral</option>
                                </select>
                                <input type="text" placeholder="Your comment..."
                                  value={commentForm[obj.id]?.body || ""}
                                  onChange={(e) => setCommentForm({ ...commentForm, [obj.id]: { ...commentForm[obj.id], body: e.target.value } })}
                                  onKeyDown={(e) => e.key === "Enter" && addComment(obj.id)}
                                  className="flex-1 py-1.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none focus:border-blue-500" />
                                <button onClick={() => addComment(obj.id)} className="px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-blue-500">Send</button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              {canAdd && canEdit && (isAdding ? (
                <div className="rounded-xl border border-dashed border-[#334155] p-5">
                  <textarea value={newText} onChange={(e) => setNewText(e.target.value)}
                    className="w-full bg-transparent text-lg font-bold text-white outline-none resize-none placeholder-[#334155]"
                    rows={2} maxLength={200} autoFocus placeholder="Write your goal (max 2 sentences)..."
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addObjective(pillar.id); } }} />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => addObjective(pillar.id)} className="px-4 py-1.5 text-xs font-bold rounded-lg text-white" style={{ backgroundColor: pillar.color }}>Add Goal</button>
                    <button onClick={() => { setAddingPillar(null); setNewText(""); }} className="px-4 py-1.5 text-xs rounded-lg text-[#64748b] bg-[#1e293b]">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingPillar(pillar.id)}
                  className="w-full py-3 rounded-xl border border-dashed border-[#1e293b] text-sm text-[#334155] hover:border-[#475569] hover:text-[#64748b] transition-all">
                  + Add goal ({pillarObjs.length}/{MAX_PER_PILLAR})
                </button>
              ))}
            </div>
            <div className="h-px bg-[#1e293b] mt-6" />
          </div>
        );
      })}
    </div>
  );
}
