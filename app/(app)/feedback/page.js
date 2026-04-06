"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#94a3b8";
const TYPES = [
  { id: "improvement", label: "Improvement", color: "#3b82f6" },
  { id: "bug", label: "Bug", color: "#ef4444" },
  { id: "feature", label: "Feature Request", color: "#10b981" },
  { id: "question", label: "Question", color: "#f59e0b" },
];
const STATUSES = [
  { id: "new", label: "New", color: "#64748b" },
  { id: "reviewed", label: "Reviewed", color: "#3b82f6" },
  { id: "planned", label: "Planned", color: "#f59e0b" },
  { id: "deployed", label: "Deployed", color: "#10b981" },
  { id: "rejected", label: "Rejected", color: "#ef4444" },
];

const inputClass = "w-full py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm font-mono outline-none focus:border-[#3b82f6] transition-colors";

export default function FeedbackPage() {
  const { user, member, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ type: "improvement", title: "", body: "" });

  useEffect(() => {
    fetchFeedback();
    const sub = supabase
      .channel("feedback_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_feedback" }, fetchFeedback)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchFeedback() {
    const { data } = await supabase.from("cockpit_feedback").select("*").order("votes", { ascending: false }).order("created_at", { ascending: false });
    setItems(data || []);
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await supabase.from("cockpit_feedback").insert({
      type: form.type,
      title: form.title,
      body: form.body || null,
      author_id: user?.id,
      author_name: member?.name || "Unknown",
    });
    logActivity("created", "feedback", { title: form.title });
    setForm({ type: "improvement", title: "", body: "" });
    setShowForm(false);
  }

  async function vote(id) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    // Check if already voted
    const { data: existing } = await supabase
      .from("cockpit_votes")
      .select("id")
      .eq("entity_type", "feedback")
      .eq("entity_id", id)
      .eq("voter_id", authUser.id)
      .maybeSingle();

    if (existing) {
      // Remove vote (toggle)
      await supabase.from("cockpit_votes").delete().eq("id", existing.id);
      await supabase.from("cockpit_feedback").update({ votes: Math.max(0, (items.find((i) => i.id === id)?.votes || 1) - 1) }).eq("id", id);
    } else {
      // Add vote
      await supabase.from("cockpit_votes").insert({
        entity_type: "feedback",
        entity_id: id,
        direction: "up",
        voter_id: authUser.id,
        voter_name: member?.name || "Unknown",
      });
      await supabase.from("cockpit_feedback").update({ votes: (items.find((i) => i.id === id)?.votes || 0) + 1 }).eq("id", id);
    }
  }

  async function updateStatus(id, status) {
    await supabase.from("cockpit_feedback").update({
      status,
      reviewed_by: member?.name || "Admin",
    }).eq("id", id);
  }

  async function addReviewNote(id, note) {
    await supabase.from("cockpit_feedback").update({ review_note: note }).eq("id", id);
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);
  const typeCounts = {};
  items.forEach((i) => { typeCounts[i.type] = (typeCounts[i.type] || 0) + 1; });

  return (
    <div className="space-y-8">
      <PageHeader title="Feedback" subtitle="Suggest improvements, report bugs, request features" color={COLOR}>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono">
          + New Feedback
        </button>
      </PageHeader>

      {/* Submit form */}
      {showForm && (
        <Card>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Title</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What would you like to see?" required className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputClass}>
                  {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Details (optional)</label>
              <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Describe in detail..." rows={3} className={inputClass} />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono">Submit</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-[#1e293b] text-[#64748b] text-sm font-mono hover:text-white">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-mono ${filter === "all" ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b] hover:text-white"}`}>
          All ({items.length})
        </button>
        {TYPES.map((t) => (
          <button key={t.id} onClick={() => setFilter(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-mono ${filter === t.id ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b] hover:text-white"}`}>
            {t.label} ({typeCounts[t.id] || 0})
          </button>
        ))}
      </div>

      {/* Feedback list */}
      {filtered.length === 0 ? (
        <Card><p className="text-[#475569] text-sm text-center py-8">No feedback yet. Be the first to suggest something!</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const typeObj = TYPES.find((t) => t.id === item.type) || TYPES[0];
            const statusObj = STATUSES.find((s) => s.id === item.status) || STATUSES[0];
            return (
              <Card key={item.id}>
                <div className="flex items-start gap-4">
                  {/* Vote button */}
                  <button onClick={() => vote(item.id)} className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-1">
                    <span className="text-[#475569] hover:text-[#93c5fd] transition-colors text-sm">▲</span>
                    <span className="text-sm font-bold text-white">{item.votes || 0}</span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-white">{item.title}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: typeObj.color + "15", color: typeObj.color }}>
                        {typeObj.label}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: statusObj.color + "15", color: statusObj.color }}>
                        {statusObj.label}
                      </span>
                    </div>
                    {item.body && <p className="text-xs text-[#94a3b8] mb-2">{item.body}</p>}
                    <div className="flex items-center gap-3 text-[10px] text-[#475569] font-mono">
                      <span>by {item.author_name}</span>
                      <span>{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      {item.reviewed_by && <span>reviewed by {item.reviewed_by}</span>}
                    </div>
                    {item.review_note && (
                      <div className="mt-2 p-2 rounded-lg bg-[#0a0f1a] border border-[#1e293b] text-xs text-[#94a3b8]">
                        Admin: {item.review_note}
                      </div>
                    )}
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      <select value={item.status} onChange={(e) => updateStatus(item.id, e.target.value)}
                        className="py-1 px-2 rounded border border-[#1e293b] bg-[#0a0f1a] text-[10px] font-mono outline-none text-[#94a3b8]">
                        {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                      <input type="text" placeholder="Admin note..."
                        defaultValue={item.review_note || ""}
                        onBlur={(e) => addReviewNote(item.id, e.target.value)}
                        className="py-1 px-2 rounded border border-[#1e293b] bg-[#0a0f1a] text-[10px] font-mono outline-none text-[#64748b] w-28" />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
