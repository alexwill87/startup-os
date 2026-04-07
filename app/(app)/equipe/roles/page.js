"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#8b5cf6";

const ROLE_DETAILS = {
  A: {
    title: "Backend / Infra / DB / Stripe",
    responsibilities: [
      "Backend API development",
      "Infrastructure & deployment",
      "Database design & migrations",
      "Stripe integration & payments",
      "Server configuration & security",
    ],
  },
  B: {
    title: "AI / Claude API / CV Pipeline / Matching",
    responsibilities: [
      "AI integration & prompt engineering",
      "Claude API implementation",
      "CV parsing pipeline",
      "Matching algorithm",
      "Data processing & NLP",
    ],
  },
  C: {
    title: "Frontend / React / Auth UI / Extension Chrome",
    responsibilities: [
      "Frontend development (React/Next.js)",
      "UI/UX implementation",
      "Authentication flows",
      "Chrome extension development",
      "Responsive design & accessibility",
    ],
  },
};

export default function RolesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState({});
  const [editingRole, setEditingRole] = useState(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function fetchNotes() {
    try {
      const { data, error } = await supabase
        .from("cockpit_vision")
        .select("*")
        .eq("topic", "other")
        .like("title", "skills-%");

      if (error) throw error;

      const notesMap = {};
      (data || []).forEach((item) => {
        const role = item.title.replace("skills-", "");
        notesMap[role] = { id: item.id, content: item.content };
      });
      setNotes(notesMap);
    } catch (err) {
      console.error("Error fetching notes:", err);
    }
  }

  async function saveNote(role) {
    setSaving(true);
    try {
      const existing = notes[role];
      if (existing?.id) {
        const { error } = await supabase
          .from("cockpit_vision")
          .update({ content: editText })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cockpit_vision").insert({
          topic: "other",
          title: `skills-${role}`,
          content: editText,
          created_by: user?.email || "unknown",
        });
        if (error) throw error;
      }
      await fetchNotes();
      setEditingRole(null);
      setEditText("");
    } catch (err) {
      console.error("Error saving note:", err);
    } finally {
      setSaving(false);
    }
  }

  const members = useMembers();
  const builders = members.filter((m) => m.builder);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Roles & Skills"
        subtitle="Team structure and areas of expertise"
        color={COLOR}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {builders.map((member) => {
          const roleInfo = ROLE_DETAILS[member.builder];
          const note = notes[member.builder];
          const isEditing = editingRole === member.builder;

          return (
            <Card key={member.id}>
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold"
                    style={{ backgroundColor: member.color || "#3b82f6" }}
                  >
                    {(member.name || member.email || "?").charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{member.name || member.email}</h3>
                    <p className="text-xs text-gray-400">{member.role}{member.builder ? ` (${member.builder})` : ""}</p>
                  </div>
                </div>

                {/* Role Title */}
                {roleInfo && (
                  <div
                    className="px-3 py-2 rounded-lg text-sm font-semibold"
                    style={{ backgroundColor: COLOR + "22", color: COLOR }}
                  >
                    {roleInfo.title}
                  </div>
                )}

                {/* Responsibilities */}
                {roleInfo && (
                  <ul className="space-y-2">
                    {roleInfo.responsibilities.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span style={{ color: member.color || "#3b82f6" }} className="mt-0.5">&#9679;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Custom Notes */}
                <div className="pt-3 border-t border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      Custom Notes
                    </span>
                    {!isEditing && (
                      <button
                        onClick={() => {
                          setEditingRole(member.builder);
                          setEditText(note?.content || "");
                        }}
                        className="text-xs px-2 py-1 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                      >
                        {note?.content ? "Edit" : "+ Add"}
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-sm text-white resize-none focus:outline-none focus:border-purple-500"
                        rows={3}
                        placeholder="Add skills, notes, etc."
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveNote(member.builder)}
                          disabled={saving}
                          className="px-3 py-1 text-xs rounded font-semibold text-white transition-colors"
                          style={{ backgroundColor: COLOR }}
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => { setEditingRole(null); setEditText(""); }}
                          className="px-3 py-1 text-xs rounded text-gray-400 hover:text-white bg-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">
                      {note?.content || "No custom notes yet."}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
