"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#3b82f6";
const VOTE_ICONS = { agree: "+", disagree: "-", neutral: "~" };
const VOTE_COLORS = { agree: "#10b981", disagree: "#ef4444", neutral: "#64748b" };

const SECTIONS = [
  { key: "mission", label: "Mission Statement", placeholder: "What does your startup do and for whom?" },
  { key: "vision", label: "Vision Statement", placeholder: "Where is your startup going in the long term?" },
  { key: "problem", label: "Problem Solved", placeholder: "What pain point do you address?" },
  { key: "northstar", label: "North Star Metric", placeholder: "The one metric that matters most..." },
];

export default function VisionPage() {
  const { user, member, canEdit } = useAuth();
  const members = useMembers();
  const [entries, setEntries] = useState({});
  const [comments, setComments] = useState({});
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [commentForm, setCommentForm] = useState({});
  const [expandedKey, setExpandedKey] = useState(null);
  const [loading, setLoading] = useState(true);

  const activeMembers = members.filter((m) => m.status === "active" && m.role !== "observer");
  const threshold = Math.max(2, Math.ceil(activeMembers.length * 0.66));

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("vision_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_vision" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_comments" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchAll() {
    try {
      const { data: visionData } = await supabase.from("cockpit_vision").select("*").eq("topic", "product").order("created_at", { ascending: false });
      const mapped = {};
      SECTIONS.forEach((s) => {
        mapped[s.key] = (visionData || []).find((d) => d.title && d.title.toLowerCase().includes(s.key)) || null;
      });
      setEntries(mapped);
      // Comments may fail if migration 015 not yet applied
      try {
        const { data: cmts } = await supabase.from("cockpit_comments").select("*").eq("entity_type", "vision").order("created_at");
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

  function getComments(entryId) { return comments[entryId] || []; }

  function getVoteCounts(entryId) {
    const cmts = getComments(entryId);
    return {
      agree: new Set(cmts.filter((c) => c.vote === "agree").map((c) => c.author_id)).size,
      disagree: new Set(cmts.filter((c) => c.vote === "disagree").map((c) => c.author_id)).size,
      neutral: new Set(cmts.filter((c) => c.vote === "neutral").map((c) => c.author_id)).size,
    };
  }

  function isLocked(entryId) { return entryId && getVoteCounts(entryId).agree >= threshold; }

  async function saveEntry(sectionKey) {
    const section = SECTIONS.find((s) => s.key === sectionKey);
    if (!section || !editValue.trim()) return;
    const existing = entries[sectionKey];
    if (existing) {
      await supabase.from("cockpit_vision").update({ body: editValue.trim() }).eq("id", existing.id);
      // Reset comments (content changed)
      await supabase.from("cockpit_comments").delete().eq("entity_type", "vision").eq("entity_id", existing.id);
    } else {
      await supabase.from("cockpit_vision").insert({
        topic: "product", title: section.label, body: editValue.trim(),
        builder: member?.builder || null, created_by: user?.id, pinned: true,
      });
    }
    await logActivity("updated", "vision", { title: section.label });
    setEditing(null); setEditValue("");
  }

  async function addComment(entryId) {
    const cf = commentForm[entryId];
    if (!cf?.body?.trim()) return;
    await supabase.from("cockpit_comments").insert({
      entity_type: "vision", entity_id: entryId,
      body: cf.body.trim(), vote: cf.vote || "neutral", author_id: user?.id,
    });
    await logActivity("commented", "vision", { title: entries[Object.keys(entries).find((k) => entries[k]?.id === entryId)]?.title });
    setCommentForm({ ...commentForm, [entryId]: { body: "", vote: "neutral" } });
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <PageHeader title="Vision" subtitle="Define why your startup exists and where it's going. Each statement needs validation." color={COLOR} />

      {loading ? (
        <p className="text-sm text-[#475569] text-center py-8">Loading...</p>
      ) : (
        <div className="space-y-6">
          {SECTIONS.map((section) => {
            const entry = entries[section.key];
            const isEditing = editing === section.key;
            const entryId = entry?.id;
            const cmts = entryId ? getComments(entryId) : [];
            const votes = entryId ? getVoteCounts(entryId) : { agree: 0, disagree: 0, neutral: 0 };
            const locked = entryId && votes.agree >= threshold;
            const isExpanded = expandedKey === section.key;
            const authorMember = entry ? members.find((m) => m.builder === entry.builder) : null;

            return (
              <div key={section.key} className="rounded-xl border p-6 transition-all"
                style={{ borderColor: locked ? "#10b981" + "66" : "#1e293b", backgroundColor: locked ? "#10b981" + "08" : "#0d1117" }}>

                {/* Section label */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR }} />
                  <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider">{section.label}</h3>
                  {locked && <span className="text-[10px] font-extrabold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full uppercase">Locked</span>}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)}
                      className="w-full bg-transparent text-lg font-bold text-white outline-none resize-none border-b border-[#334155] pb-2"
                      rows={3} autoFocus placeholder={section.placeholder} />
                    <div className="flex gap-2">
                      <button onClick={() => saveEntry(section.key)} className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-blue-500">Save</button>
                      <button onClick={() => { setEditing(null); setEditValue(""); }} className="px-4 py-1.5 text-xs rounded-lg text-[#64748b] bg-[#1e293b]">Cancel</button>
                      {entry && <p className="text-[10px] text-amber-400 ml-auto self-center">Saving will reset all votes</p>}
                    </div>
                  </div>
                ) : entry ? (
                  <>
                    <p className="text-lg font-bold text-white leading-relaxed">{entry.body}</p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      {authorMember && <span className="text-[10px] text-[#475569] font-mono">by {authorMember.name || authorMember.email}</span>}
                      {["agree", "disagree", "neutral"].map((v) => (
                        <span key={v} className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: VOTE_COLORS[v], backgroundColor: VOTE_COLORS[v] + "15" }}>
                          {VOTE_ICONS[v]} {votes[v]}
                        </span>
                      ))}
                      {!locked && <span className="text-[10px] text-[#475569] font-mono">{votes.agree}/{threshold} to lock</span>}
                      <div className="flex gap-1 ml-auto">
                        <button onClick={() => setExpandedKey(isExpanded ? null : section.key)}
                          className="text-[10px] font-bold px-2 py-1 rounded text-[#64748b] hover:text-white hover:bg-[#1e293b] transition">
                          {cmts.length > 0 ? `Comments (${cmts.length})` : "Comment"}
                        </button>
                        {canEdit && !locked && <button onClick={() => { setEditing(section.key); setEditValue(entry.body || ""); }}
                          className="text-[10px] px-2 py-1 rounded text-[#475569] hover:text-white hover:bg-[#1e293b] transition">Edit</button>}
                      </div>
                    </div>

                    {/* Comments */}
                    {isExpanded && entryId && (
                      <div className="mt-4 pt-4 border-t border-[#1e293b] space-y-3">
                        {cmts.length > 0 && (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {cmts.map((c) => {
                              const am = members.find((m) => m.user_id === c.author_id);
                              return (
                                <div key={c.id} className="flex gap-2">
                                  <span className="text-xs font-bold w-4 text-center shrink-0" style={{ color: VOTE_COLORS[c.vote] }}>{VOTE_ICONS[c.vote]}</span>
                                  <div className="flex-1">
                                    <p className="text-xs text-[#e2e8f0]">{c.body}</p>
                                    <p className="text-[10px] text-[#475569] font-mono mt-0.5">{am?.name || "Unknown"} — {new Date(c.created_at).toLocaleDateString("fr-FR")}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {!locked && (
                          <div className="flex gap-2">
                            <select value={commentForm[entryId]?.vote || "neutral"}
                              onChange={(e) => setCommentForm({ ...commentForm, [entryId]: { ...commentForm[entryId], vote: e.target.value } })}
                              className="w-20 py-1.5 px-2 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-xs text-white outline-none">
                              <option value="agree">Agree</option><option value="disagree">Disagree</option><option value="neutral">Neutral</option>
                            </select>
                            <input type="text" placeholder="Your comment..." value={commentForm[entryId]?.body || ""}
                              onChange={(e) => setCommentForm({ ...commentForm, [entryId]: { ...commentForm[entryId], body: e.target.value } })}
                              onKeyDown={(e) => e.key === "Enter" && addComment(entryId)}
                              className="flex-1 py-1.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none focus:border-blue-500" />
                            <button onClick={() => addComment(entryId)} className="px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-blue-500">Send</button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-[#475569] mb-3">{section.placeholder}</p>
                    {canEdit && (
                      <button onClick={() => { setEditing(section.key); setEditValue(""); }}
                        className="text-sm font-semibold px-5 py-2.5 rounded-lg border border-dashed border-[#334155] text-[#64748b] hover:border-blue-500/50 hover:text-blue-400 transition">
                        + Define {section.label}
                      </button>
                    )}
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
