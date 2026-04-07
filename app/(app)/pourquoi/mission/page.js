"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#3b82f6";

const SECTIONS = [
  { key: "mission", label: "Mission Statement", placeholder: "What does Radar do and for whom?" },
  { key: "vision", label: "Vision Statement", placeholder: "Where is Radar going in the long term?" },
  { key: "problem", label: "Problem Solved", placeholder: "What pain point does Radar address?" },
  { key: "northstar", label: "North Star Metric", placeholder: "The one metric that matters most..." },
];

export default function MissionPage() {
  const { user, builder } = useAuth();
  const members = useMembers();
  const [entries, setEntries] = useState({});
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
    const sub = supabase
      .channel("mission_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_vision" }, fetchEntries)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchEntries() {
    try {
      const { data } = await supabase
        .from("cockpit_vision")
        .select("*")
        .eq("topic", "product")
        .order("created_at", { ascending: false });

      const mapped = {};
      SECTIONS.forEach((s) => {
        const match = (data || []).find(
          (d) => d.title && d.title.toLowerCase().includes(s.key)
        );
        mapped[s.key] = match || null;
      });
      setEntries(mapped);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveEntry(sectionKey) {
    const section = SECTIONS.find((s) => s.key === sectionKey);
    if (!section || !editValue.trim()) return;

    const existing = entries[sectionKey];
    if (existing) {
      await supabase
        .from("cockpit_vision")
        .update({ body: editValue.trim() })
        .eq("id", existing.id);
    } else {
      await supabase.from("cockpit_vision").insert({
        topic: "product",
        title: section.label,
        body: editValue.trim(),
        builder: builder?.role || null,
        created_by: user?.id,
        pinned: true,
      });
    }
    setEditing(null);
    setEditValue("");
  }

  function startEdit(sectionKey) {
    setEditing(sectionKey);
    setEditValue(entries[sectionKey]?.body || "");
  }

  function cancelEdit() {
    setEditing(null);
    setEditValue("");
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <PageHeader
        title="Vision"
        subtitle="Define why Radar exists and where it's going"
        color={COLOR}
      />

      {/* Hero quote */}
      <Card className="border-l-2" style={{ borderLeftColor: COLOR }}>
        <p className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: COLOR }}>
          The Purpose
        </p>
        <p className="text-sm text-[#94a3b8] leading-relaxed">
          Every great product starts with a clear mission. Define the core statements that guide
          every decision and feature of Radar.
        </p>
      </Card>

      {/* Section cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {SECTIONS.map((section) => {
          const entry = entries[section.key];
          const isEditing = editing === section.key;
          const authorBuilder = entry
            ? members.find((m) => m.builder === entry.builder)
            : null;

          return (
            <Card key={section.key} className="relative">
              {/* Section header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR }} />
                  <h3 className="text-sm font-bold text-white">{section.label}</h3>
                </div>
                {authorBuilder && !isEditing && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      color: authorBuilder.color || "#3b82f6",
                      backgroundColor: (authorBuilder.color || "#3b82f6") + "15",
                    }}
                  >
                    {authorBuilder.name || authorBuilder.email}
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <textarea
                    className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-lg p-3 text-sm text-[#e2e8f0] placeholder-[#475569] resize-none focus:outline-none focus:border-blue-500/50"
                    rows={4}
                    placeholder={section.placeholder}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      className="px-4 py-2 text-sm font-semibold rounded-lg text-white hover:opacity-90 transition"
                      style={{ backgroundColor: COLOR }}
                      onClick={() => saveEntry(section.key)}
                    >
                      Save
                    </button>
                    <button
                      className="px-4 py-2 text-sm font-semibold rounded-lg text-[#64748b] bg-[#1e293b] hover:bg-[#334155] transition"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : entry ? (
                <div>
                  <p className="text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-wrap">
                    {entry.body}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1e293b]">
                    <span className="text-[10px] text-[#475569] font-mono">
                      {new Date(entry.created_at).toLocaleDateString("fr-FR")}
                    </span>
                    <button
                      className="text-[10px] font-semibold px-2 py-1 rounded text-[#64748b] hover:text-white hover:bg-[#1e293b] transition"
                      onClick={() => startEdit(section.key)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-[#475569] mb-4">{section.placeholder}</p>
                  <button
                    className="text-sm font-semibold px-5 py-2.5 rounded-lg border border-dashed border-[#334155] text-[#64748b] hover:border-blue-500/50 hover:text-blue-400 transition"
                    onClick={() => startEdit(section.key)}
                  >
                    + Define {section.label}
                  </button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* All product vision entries */}
      <div>
        <h2 className="text-xs font-bold text-[#64748b] uppercase tracking-widest mb-4">
          All Product Vision Entries
        </h2>
        <AllEntries />
      </div>
    </div>
  );
}

function AllEntries() {
  const members = useMembers();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    try {
      const { data } = await supabase
        .from("cockpit_vision")
        .select("*")
        .eq("topic", "product")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      setNotes(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <p className="text-sm text-[#475569] text-center py-4">Loading...</p>;
  if (notes.length === 0) return <p className="text-sm text-[#475569] text-center py-4">No entries yet.</p>;

  return (
    <div className="space-y-3">
      {notes.map((n) => {
        const b = members.find((m) => m.builder === n.builder);
        return (
          <Card key={n.id}>
            <div className="flex items-center gap-2 mb-2">
              {n.pinned && (
                <span className="text-[10px] font-bold text-amber-400 uppercase">Pinned</span>
              )}
              {b && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ color: b.color, backgroundColor: b.color + "15" }}
                >
                  {b.name}
                </span>
              )}
              <span className="text-[10px] text-[#475569] font-mono ml-auto">
                {new Date(n.created_at).toLocaleDateString("fr-FR")}
              </span>
            </div>
            <h4 className="text-sm font-bold text-white mb-1">{n.title}</h4>
            <p className="text-xs text-[#94a3b8] leading-relaxed whitespace-pre-wrap">{n.body}</p>
          </Card>
        );
      })}
    </div>
  );
}
