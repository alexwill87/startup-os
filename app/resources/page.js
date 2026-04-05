"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

const CATEGORIES = [
  { id: "drive", label: "Google Drive", color: "#4285F4", icon: "G" },
  { id: "api_doc", label: "API Docs", color: "#10b981", icon: "A" },
  { id: "reference", label: "References", color: "#8b5cf6", icon: "R" },
  { id: "competitor", label: "Competitors", color: "#ef4444", icon: "C" },
  { id: "tool", label: "Tools", color: "#f59e0b", icon: "T" },
  { id: "design", label: "Design", color: "#ec4899", icon: "D" },
  { id: "tutorial", label: "Tutorials", color: "#06b6d4", icon: "L" },
  { id: "inspiration", label: "Inspiration", color: "#f97316", icon: "I" },
  { id: "admin", label: "Admin", color: "#64748b", icon: "X" },
  { id: "other", label: "Other", color: "#475569", icon: "O" },
];

const CAT_MAP = {};
CATEGORIES.forEach((c) => (CAT_MAP[c.id] = c));

export default function Resources() {
  const { user, builder } = useAuth();
  const [resources, setResources] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", category: "reference", description: "", tags: "", pinned: false });

  useEffect(() => {
    fetchResources();
    const sub = supabase
      .channel("resources_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_resources" }, fetchResources)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchResources() {
    const { data } = await supabase.from("cockpit_resources").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false });
    setResources(data || []);
  }

  async function addResource(e) {
    e.preventDefault();
    const tags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    await supabase.from("cockpit_resources").insert({
      title: form.title,
      url: form.url || null,
      category: form.category,
      description: form.description || null,
      tags: tags.length > 0 ? tags : null,
      pinned: form.pinned,
      shared_by: user?.id,
    });
    setForm({ title: "", url: "", category: "reference", description: "", tags: "", pinned: false });
    setShowForm(false);
  }

  async function togglePin(id, current) {
    await supabase.from("cockpit_resources").update({ pinned: !current }).eq("id", id);
  }

  async function deleteResource(id) {
    await supabase.from("cockpit_resources").delete().eq("id", id);
  }

  const filtered = filter === "all" ? resources : resources.filter((r) => r.category === filter);
  const pinned = filtered.filter((r) => r.pinned);
  const rest = filtered.filter((r) => !r.pinned);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Resources</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          + Add Resource
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        <button
          className={`btn ${filter === "all" ? "btn-primary" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({resources.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = resources.filter((r) => r.category === cat.id).length;
          if (count === 0) return null;
          return (
            <button
              key={cat.id}
              className={`btn ${filter === cat.id ? "btn-primary" : ""}`}
              onClick={() => setFilter(cat.id)}
              style={filter === cat.id ? {} : { borderColor: cat.color + "44" }}
            >
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <form onSubmit={addResource} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr", gap: 10 }}>
              <input type="text" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <input type="url" placeholder="URL (https://...)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
              <input type="text" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <input type="text" placeholder="Tags: claude, cv, stripe..." value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button type="submit" className="btn btn-primary">Add</button>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
              <label style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
                Pin to top
              </label>
            </div>
          </form>
        </div>
      )}

      {/* Pinned */}
      {pinned.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontFamily: "var(--font-geist-mono)" }}>PINNED</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pinned.map((r) => <ResourceCard key={r.id} r={r} onPin={togglePin} onDelete={deleteResource} />)}
          </div>
        </div>
      )}

      {/* Rest */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rest.map((r) => <ResourceCard key={r.id} r={r} onPin={togglePin} onDelete={deleteResource} />)}
      </div>

      {filtered.length === 0 && (
        <p style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: 40 }}>
          No resources yet. Add links, docs, references for the team.
        </p>
      )}
    </div>
  );
}

function ResourceCard({ r, onPin, onDelete }) {
  const cat = CAT_MAP[r.category] || CAT_MAP.other;
  return (
    <div className="card" style={{ padding: 14, display: "flex", gap: 12, alignItems: "start" }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
        background: cat.color + "22", color: cat.color, fontWeight: 800, fontSize: 14, flexShrink: 0,
      }}>
        {cat.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</span>
          {r.pinned && <span style={{ fontSize: 10, color: "#fcd34d" }}>PINNED</span>}
          <span className="badge" style={{ background: cat.color + "22", color: cat.color, marginLeft: "auto" }}>
            {cat.label}
          </span>
        </div>
        {r.url && (
          <a href={r.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: "#3b82f6", display: "block", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.url}
          </a>
        )}
        {r.description && <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>{r.description}</p>}
        {r.tags && r.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {r.tags.map((t) => (
              <span key={t} style={{ fontSize: 10, color: "#64748b", background: "#1e293b", padding: "2px 6px", borderRadius: 4 }}>
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <button className="btn" style={{ fontSize: 10, padding: "2px 6px" }} onClick={() => onPin(r.id, r.pinned)}>
          {r.pinned ? "Unpin" : "Pin"}
        </button>
        <button className="btn" style={{ fontSize: 10, padding: "2px 6px", color: "#ef4444" }} onClick={() => onDelete(r.id)}>
          Del
        </button>
      </div>
    </div>
  );
}
