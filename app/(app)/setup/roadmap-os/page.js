"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#64748b";

const PHASES = [
  { id: "done", label: "Done", color: "#10b981" },
  { id: "current", label: "In Progress", color: "#3b82f6" },
  { id: "next", label: "Next", color: "#f59e0b" },
  { id: "proposed", label: "Proposed", color: "#8b5cf6" },
];

export default function RoadmapOSPage() {
  const { member, canEdit } = useAuth();
  const [items, setItems] = useState([]);
  const [comments, setComments] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", phase: "proposed", prompt: "" });
  const [commentText, setCommentText] = useState({});
  const [expandedItem, setExpandedItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItems();
    const sub = supabase
      .channel("roadmap_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_vision" }, fetchItems)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_comments" }, fetchItems)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchItems() {
    try {
      const { data } = await supabase
        .from("cockpit_vision")
        .select("*")
        .eq("topic", "roadmap")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: true });

      const roadmapItems = (data || []).map((d) => {
        let meta = {};
        try { meta = JSON.parse(d.body || "{}"); } catch { meta = { description: d.body }; }
        return { ...d, phase: meta.phase || "proposed", description: meta.description || "", prompt: meta.prompt || "", votes: meta.votes || [], ready: meta.ready || false };
      });
      setItems(roadmapItems);

      // Fetch comments for all roadmap items
      const ids = roadmapItems.map((r) => r.id);
      if (ids.length > 0) {
        const { data: decisionData } = await supabase
          .from("cockpit_decisions")
          .select("*, cockpit_comments(*)")
          .in("context", ids.map((id) => `roadmap:${id}`));

        const commentsMap = {};
        (decisionData || []).forEach((d) => {
          const itemId = d.context?.replace("roadmap:", "");
          commentsMap[itemId] = { decision: d, comments: d.cockpit_comments || [] };
        });
        setComments(commentsMap);
      }
    } catch (err) {
      console.error("Fetch roadmap error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function addItem(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const body = JSON.stringify({
      phase: form.phase,
      description: form.description.trim(),
      prompt: form.prompt.trim(),
      votes: [],
      ready: false,
    });
    await supabase.from("cockpit_vision").insert({
      topic: "roadmap",
      title: form.title.trim(),
      body,
      builder: member?.builder,
      created_by: member?.user_id,
    });
    await logActivity("created", "roadmap", { title: form.title.trim() });
    setForm({ title: "", description: "", phase: "proposed", prompt: "" });
    setShowForm(false);
  }

  async function updatePhase(item, newPhase) {
    const meta = { phase: newPhase, description: item.description, prompt: item.prompt, votes: item.votes, ready: item.ready };
    await supabase.from("cockpit_vision").update({ body: JSON.stringify(meta) }).eq("id", item.id);
    await logActivity("updated", "roadmap", { title: `${item.title} → ${newPhase}` });
  }

  async function voteItem(item) {
    const voterName = member?.name || member?.email;
    if (item.votes.includes(voterName)) return;
    const newVotes = [...item.votes, voterName];
    const ready = newVotes.length >= 2;
    const meta = { phase: item.phase, description: item.description, prompt: item.prompt, votes: newVotes, ready };
    await supabase.from("cockpit_vision").update({ body: JSON.stringify(meta) }).eq("id", item.id);
    await logActivity("updated", "roadmap", { title: `Voted on: ${item.title}` });
  }

  async function startDebate(item) {
    // Create a decision linked to this roadmap item
    await supabase.from("cockpit_decisions").insert({
      title: `[Roadmap] ${item.title}`,
      context: `roadmap:${item.id}`,
      status: "open",
      created_by: member?.user_id,
    });
    await logActivity("created", "decision", { title: `Debate: ${item.title}` });
    setExpandedItem(item.id);
  }

  async function addComment(itemId, decisionId) {
    const text = commentText[itemId];
    if (!text?.trim()) return;
    await supabase.from("cockpit_comments").insert({
      decision_id: decisionId,
      body: text.trim(),
      vote: "neutral",
      author_id: member?.user_id,
    });
    setCommentText({ ...commentText, [itemId]: "" });
    await logActivity("commented", "roadmap", { title: items.find((i) => i.id === itemId)?.title });
  }

  async function deleteItem(item) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    await supabase.from("cockpit_vision").delete().eq("id", item.id);
  }

  const grouped = {};
  PHASES.forEach((p) => { grouped[p.id] = []; });
  items.forEach((item) => {
    if (grouped[item.phase]) grouped[item.phase].push(item);
    else grouped.proposed.push(item);
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Product Roadmap" subtitle="Features built, planned, and proposed — debate and validate before building" color={COLOR}>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-500 hover:bg-blue-600 transition"
        >
          + Propose Feature
        </button>
      </PageHeader>

      {/* Add form */}
      {showForm && (
        <Card>
          <form onSubmit={addItem} className="space-y-3">
            <input
              type="text"
              placeholder="Feature name"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none focus:border-blue-500"
              required
            />
            <textarea
              placeholder="Description — what does this feature do?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none focus:border-blue-500 resize-none"
            />
            <textarea
              placeholder="Prompt — the AI prompt to build this feature (optional)"
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              rows={3}
              className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-amber-300 text-xs font-mono outline-none focus:border-amber-500 resize-none"
            />
            <div className="flex gap-3 items-center">
              <select
                value={form.phase}
                onChange={(e) => setForm({ ...form, phase: e.target.value })}
                className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none"
              >
                {PHASES.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <button type="submit" className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-blue-500">
                Add
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs rounded-lg text-[#64748b] bg-[#1e293b]">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-[#475569] text-center py-8">Loading roadmap...</p>
      ) : (
        <div className="space-y-8">
          {PHASES.map((phase) => {
            const phaseItems = grouped[phase.id];
            if (phaseItems.length === 0 && phase.id !== "proposed") return null;
            return (
              <div key={phase.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: phase.color }} />
                  <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: phase.color }}>
                    {phase.label}
                  </h2>
                  <span className="text-[10px] text-[#475569] font-mono">({phaseItems.length})</span>
                </div>

                {phaseItems.length === 0 ? (
                  <Card>
                    <p className="text-xs text-[#475569] text-center py-4">No features proposed yet. Be the first!</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {phaseItems.map((item) => {
                      const debate = comments[item.id];
                      const isExpanded = expandedItem === item.id;
                      const voterName = member?.name || member?.email;
                      const hasVoted = item.votes.includes(voterName);

                      return (
                        <Card key={item.id} className="border-l-2" style={{ borderLeftColor: phase.color }}>
                          {/* Header */}
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-sm font-bold text-white">{item.title}</h3>
                                {item.ready && (
                                  <span className="text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">READY</span>
                                )}
                                {item.votes.length > 0 && !item.ready && (
                                  <span className="text-[10px] font-mono text-[#475569]">{item.votes.length}/2 votes</span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs text-[#94a3b8] mt-1">{item.description}</p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-1 shrink-0">
                              {!hasVoted && (
                                <button
                                  onClick={() => voteItem(item)}
                                  className="text-[10px] font-bold px-2 py-1 rounded text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 transition"
                                >
                                  Vote
                                </button>
                              )}
                              <button
                                onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                                className="text-[10px] font-bold px-2 py-1 rounded text-[#64748b] hover:text-white hover:bg-[#1e293b] transition"
                              >
                                {isExpanded ? "Close" : "Debate"}
                              </button>
                            </div>
                          </div>

                          {/* Prompt */}
                          {item.prompt && (
                            <div className="mt-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                              <p className="text-[10px] font-bold text-amber-400 uppercase mb-1">Prompt</p>
                              <p className="text-xs text-amber-200/80 font-mono whitespace-pre-wrap">{item.prompt}</p>
                              {item.ready ? (
                                <p className="text-[10px] text-green-400 mt-2 font-bold">Validated — ready to execute</p>
                              ) : (
                                <p className="text-[10px] text-[#475569] mt-2">Awaiting {2 - item.votes.length} more vote(s) to validate</p>
                              )}
                            </div>
                          )}

                          {/* Voters */}
                          {item.votes.length > 0 && (
                            <div className="mt-2 flex items-center gap-1">
                              <span className="text-[10px] text-[#475569]">Voted:</span>
                              {item.votes.map((v) => (
                                <span key={v} className="text-[10px] font-mono text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">{v}</span>
                              ))}
                            </div>
                          )}

                          {/* Phase change + delete (admin/cofounder) */}
                          {canEdit && (
                            <div className="mt-3 pt-3 border-t border-[#1e293b] flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] text-[#475569]">Move to:</span>
                              {PHASES.filter((p) => p.id !== item.phase).map((p) => (
                                <button
                                  key={p.id}
                                  onClick={() => updatePhase(item, p.id)}
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded transition-all hover:opacity-80"
                                  style={{ color: p.color, backgroundColor: p.color + "15" }}
                                >
                                  {p.label}
                                </button>
                              ))}
                              <button
                                onClick={() => deleteItem(item)}
                                className="text-[10px] text-red-400/50 hover:text-red-400 ml-auto transition"
                              >
                                Delete
                              </button>
                            </div>
                          )}

                          {/* Debate section */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-[#1e293b] space-y-3">
                              {!debate ? (
                                <div className="text-center py-3">
                                  <p className="text-xs text-[#475569] mb-2">No debate started yet</p>
                                  <button
                                    onClick={() => startDebate(item)}
                                    className="text-xs font-bold px-4 py-2 rounded-lg text-white bg-purple-500 hover:bg-purple-600 transition"
                                  >
                                    Start Debate
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {debate.comments.length === 0 ? (
                                    <p className="text-xs text-[#475569] text-center py-2">No comments yet. Share your thoughts!</p>
                                  ) : (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                      {debate.comments.map((c) => (
                                        <div key={c.id} className="flex gap-2">
                                          <div className="w-1 rounded-full bg-purple-500/30 shrink-0" />
                                          <div>
                                            <p className="text-xs text-white">{c.body}</p>
                                            <p className="text-[10px] text-[#475569] font-mono mt-0.5">
                                              {new Date(c.created_at).toLocaleDateString("fr-FR")}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      placeholder="Your thoughts on this feature..."
                                      value={commentText[item.id] || ""}
                                      onChange={(e) => setCommentText({ ...commentText, [item.id]: e.target.value })}
                                      className="flex-1 py-1.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none focus:border-purple-500"
                                      onKeyDown={(e) => e.key === "Enter" && addComment(item.id, debate.decision.id)}
                                    />
                                    <button
                                      onClick={() => addComment(item.id, debate.decision.id)}
                                      className="px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-purple-500"
                                    >
                                      Post
                                    </button>
                                  </div>
                                </>
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
          })}
        </div>
      )}
    </div>
  );
}
