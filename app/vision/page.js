"use client";

import { useEffect, useState } from "react";
import { supabase, BUILDERS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

const TOPICS = [
  { id: "product", label: "Product", color: "#3b82f6" },
  { id: "market", label: "Market", color: "#10b981" },
  { id: "tech", label: "Tech", color: "#8b5cf6" },
  { id: "pitch", label: "Pitch", color: "#f59e0b" },
  { id: "monetization", label: "Monetization", color: "#ec4899" },
  { id: "growth", label: "Growth", color: "#06b6d4" },
  { id: "other", label: "Other", color: "#64748b" },
];

const TOPIC_MAP = {};
TOPICS.forEach((t) => (TOPIC_MAP[t.id] = t));
const BUILDER_LIST = Object.values(BUILDERS);

export default function Vision() {
  const { user, builder } = useAuth();
  const [notes, setNotes] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ topic: "product", title: "", body: "", pinned: false });

  useEffect(() => {
    fetchNotes();
    const sub = supabase
      .channel("vision_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_vision" }, fetchNotes)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchNotes() {
    const { data } = await supabase.from("cockpit_vision").select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setNotes(data || []);
  }

  async function addNote(e) {
    e.preventDefault();
    await supabase.from("cockpit_vision").insert({
      ...form,
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
    await supabase.from("cockpit_vision").delete().eq("id", id);
  }

  const filtered = filter === "all" ? notes : notes.filter((n) => n.topic === filter);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Vision & Strategy</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          + Add Note
        </button>
      </div>

      {/* One-liner */}
      <div className="card" style={{ marginBottom: 20, borderLeft: "3px solid #3b82f6", padding: "16px 20px" }}>
        <div style={{ fontSize: 11, color: "#3b82f6", fontFamily: "var(--font-geist-mono)", marginBottom: 6 }}>THE VISION</div>
        <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6 }}>
          Radar monitors every job platform you care about and the moment a matching opportunity appears,
          it sends you an instant alert with a tailored CV and pitch — before most applicants even open their laptop.
        </p>
      </div>

      {/* Topic filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        <button className={`btn ${filter === "all" ? "btn-primary" : ""}`} onClick={() => setFilter("all")}>
          All ({notes.length})
        </button>
        {TOPICS.map((t) => {
          const count = notes.filter((n) => n.topic === t.id).length;
          return (
            <button
              key={t.id}
              className={`btn ${filter === t.id ? "btn-primary" : ""}`}
              onClick={() => setFilter(t.id)}
              style={filter === t.id ? {} : { borderColor: t.color + "44" }}
            >
              {t.label} {count > 0 ? `(${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={addNote} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
              <input type="text" placeholder="Title / Question / Idea" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                {TOPICS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <textarea
              placeholder="Your thoughts, analysis, proposal..."
              rows={5}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              required
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button type="submit" className="btn btn-primary">Post</button>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
              <label style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
                Pin
              </label>
            </div>
          </form>
        </div>
      )}

      {/* Notes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((n) => {
          const topic = TOPIC_MAP[n.topic] || TOPIC_MAP.other;
          const b = BUILDER_LIST.find((bl) => bl.role === n.builder);
          return (
            <div key={n.id} className="card" style={{ borderLeft: `3px solid ${topic.color}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className="badge" style={{ background: topic.color + "22", color: topic.color }}>{topic.label}</span>
                {b && <span className={`badge badge-${b.role}`}>{b.name}</span>}
                {n.pinned && <span style={{ fontSize: 10, color: "#fcd34d" }}>PINNED</span>}
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#475569", fontFamily: "var(--font-geist-mono)" }}>
                  {new Date(n.created_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{n.title}</h3>
              <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{n.body}</p>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button className="btn" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => togglePin(n.id, n.pinned)}>
                  {n.pinned ? "Unpin" : "Pin"}
                </button>
                <button className="btn" style={{ fontSize: 10, padding: "2px 6px", color: "#ef4444" }} onClick={() => deleteNote(n.id)}>
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: 40 }}>
          No notes yet. Share your vision, ideas, and strategy with the team.
        </p>
      )}
    </div>
  );
}
