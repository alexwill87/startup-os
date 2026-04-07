"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#3b82f6";

const TOPICS = [
  { id: "product", label: "Product", color: "#3b82f6" },
  { id: "market", label: "Market", color: "#10b981" },
  { id: "tech", label: "Tech", color: "#8b5cf6" },
  { id: "pitch", label: "Pitch", color: "#f59e0b" },
  { id: "monetization", label: "Monetization", color: "#ec4899" },
  { id: "growth", label: "Growth", color: "#06b6d4" },
];

const TOPIC_MAP = {};
TOPICS.forEach((t) => (TOPIC_MAP[t.id] = t));

export default function VisionStrategyPage() {
  const { user, builder } = useAuth();
  const members = useMembers();
  const [notes, setNotes] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ topic: "product", title: "", body: "", pinned: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
    const sub = supabase
      .channel("vision_strategy_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_vision" }, fetchNotes)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchNotes() {
    try {
      const { data } = await supabase
        .from("cockpit_vision")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      setNotes(data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function addNote(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    await supabase.from("cockpit_vision").insert({
      topic: form.topic,
      title: form.title.trim(),
      body: form.body.trim(),
      pinned: form.pinned,
      builder: builder?.role || null,
      created_by: user?.id,
    });
    setForm({ topic: "product", title: "", body: "", pinned: false });
    setShowForm(false);
  }

  async function togglePin(id, current) {
    await supabase.from("cockpit_vision").update({ pinned: !current }).eq("id", id);
  }

  async function deleteNote(id) {
    if (!confirm("Delete this note?")) return;
    await supabase.from("cockpit_vision").delete().eq("id", id);
  }

  const filtered = filter === "all" ? notes : notes.filter((n) => n.topic === filter);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Strategy Notes"
        subtitle="Shared thinking on product, market, tech, pitch, monetization, and growth"
        color={COLOR}
      >
        <button
          className="px-4 py-2 text-xs font-semibold rounded-lg text-white transition hover:opacity-90"
          style={{ backgroundColor: COLOR }}
          onClick={() => setShowForm(!showForm)}
        >
          + Add Note
        </button>
      </PageHeader>

      {/* Topic filter bar */}
      <div className="flex gap-2 flex-wrap">
        <button
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            filter === "all"
              ? "text-white bg-blue-500/20 border border-blue-500/40"
              : "text-[#64748b] bg-[#0d1117] border border-[#1e293b] hover:border-[#334155]"
          }`}
          onClick={() => setFilter("all")}
        >
          All ({notes.length})
        </button>
        {TOPICS.map((t) => {
          const count = notes.filter((n) => n.topic === t.id).length;
          return (
            <button
              key={t.id}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                filter === t.id
                  ? "text-white border"
                  : "text-[#64748b] bg-[#0d1117] border border-[#1e293b] hover:border-[#334155]"
              }`}
              style={
                filter === t.id
                  ? { backgroundColor: t.color + "20", borderColor: t.color + "66", color: t.color }
                  : {}
              }
              onClick={() => setFilter(t.id)}
            >
              {t.label} {count > 0 ? `(${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Add note form */}
      {showForm && (
        <Card>
          <form onSubmit={addNote} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
              <input
                type="text"
                className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-blue-500/50"
                placeholder="Title / Question / Idea"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <select
                className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] focus:outline-none focus:border-blue-500/50"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              >
                {TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#475569] resize-none focus:outline-none focus:border-blue-500/50"
              placeholder="Your thoughts, analysis, proposal..."
              rows={5}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              required
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg text-white transition hover:opacity-90"
                style={{ backgroundColor: COLOR }}
              >
                Post
              </button>
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold rounded-lg text-[#64748b] bg-[#1e293b] hover:bg-[#334155] transition"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <label className="ml-auto flex items-center gap-2 text-xs text-[#64748b] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pinned}
                  onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                  className="rounded border-[#334155]"
                />
                Pin this note
              </label>
            </div>
          </form>
        </Card>
      )}

      {/* Notes list */}
      {loading ? (
        <p className="text-sm text-[#475569] text-center py-8">Loading notes...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-[#475569] text-center py-8">
            No notes yet. Share your vision, ideas, and strategy with the team.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((n) => {
            const topic = TOPIC_MAP[n.topic] || { label: n.topic, color: "#64748b" };
            const b = members.find((m) => m.builder === n.builder);

            return (
              <Card
                key={n.id}
                className="border-l-2"
                style={{ borderLeftColor: topic.color }}
              >
                {/* Note header */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span
                    className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                    style={{ color: topic.color, backgroundColor: topic.color + "15" }}
                  >
                    {topic.label}
                  </span>
                  {b && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: b.color, backgroundColor: b.color + "15" }}
                    >
                      {b.name}
                    </span>
                  )}
                  {n.pinned && (
                    <span className="text-[10px] font-bold text-amber-400 uppercase">
                      Pinned
                    </span>
                  )}
                  <span className="ml-auto text-[10px] text-[#475569] font-mono">
                    {new Date(n.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>

                {/* Note content */}
                <h3 className="text-sm font-bold text-white mb-2">{n.title}</h3>
                <p className="text-xs text-[#cbd5e1] leading-relaxed whitespace-pre-wrap">
                  {n.body}
                </p>

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-[#1e293b]">
                  <button
                    className="text-[10px] font-semibold px-2 py-1 rounded text-[#64748b] hover:text-white hover:bg-[#1e293b] transition"
                    onClick={() => togglePin(n.id, n.pinned)}
                  >
                    {n.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button
                    className="text-[10px] font-semibold px-2 py-1 rounded text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition"
                    onClick={() => deleteNote(n.id)}
                  >
                    Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
