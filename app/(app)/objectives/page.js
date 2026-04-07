"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import Card from "@/app/components/Card";

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

export default function ObjectivesPage() {
  const { member, canEdit } = useAuth();
  const members = useMembers();
  const [objectives, setObjectives] = useState([]);
  const [validations, setValidations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [addingPillar, setAddingPillar] = useState(null);
  const [newText, setNewText] = useState("");
  const [loading, setLoading] = useState(true);

  // Count active members (for validation threshold)
  const activeMembers = members.filter((m) => m.status === "active" && m.role !== "observer");
  const threshold = Math.max(2, Math.ceil(activeMembers.length * 0.66));

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("objectives_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_objectives" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_objective_validations" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchAll() {
    try {
      const [{ data: objs }, { data: vals }] = await Promise.all([
        supabase.from("cockpit_objectives").select("*").order("sort_order").order("created_at"),
        supabase.from("cockpit_objective_validations").select("*"),
      ]);
      setObjectives(objs || []);
      setValidations(vals || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  function getValidationsFor(objId) {
    return (validations || []).filter((v) => v.objective_id === objId && v.decision === "approve");
  }

  function isLocked(objId) {
    return getValidationsFor(objId).length >= threshold;
  }

  function hasValidated(objId) {
    const name = member?.name || member?.email;
    return getValidationsFor(objId).some((v) => v.validator_name === name);
  }

  async function addObjective(pillarId) {
    if (!newText.trim()) return;
    const pillarObjs = objectives.filter((o) => o.pillar === pillarId);
    if (pillarObjs.length >= MAX_PER_PILLAR) return;

    const { error } = await supabase.from("cockpit_objectives").insert({
      title: newText.trim(),
      pillar: pillarId,
      status: "proposed",
      proposed_by: member?.name || member?.email,
      sort_order: pillarObjs.length,
    });
    if (!error) {
      await logActivity("created", "objective", { title: newText.trim() });
      setNewText("");
      setAddingPillar(null);
    }
  }

  async function saveEdit(obj) {
    if (!editText.trim() || editText.trim() === obj.title) {
      setEditingId(null);
      return;
    }
    // Update text AND reset all validations (content changed)
    await supabase.from("cockpit_objectives").update({
      title: editText.trim(),
      status: "proposed",
      proposed_by: member?.name || member?.email,
    }).eq("id", obj.id);

    // Delete existing validations — content changed, must re-validate
    await supabase.from("cockpit_objective_validations").delete().eq("objective_id", obj.id);

    await logActivity("updated", "objective", { title: editText.trim() });
    setEditingId(null);
    setEditText("");
  }

  async function validate(obj) {
    const name = member?.name || member?.email;
    if (hasValidated(obj.id)) return;

    await supabase.from("cockpit_objective_validations").insert({
      objective_id: obj.id,
      validator_name: name,
      validator_role: member?.role,
      decision: "approve",
    });

    // Check if now locked
    const currentVotes = getValidationsFor(obj.id).length + 1;
    if (currentVotes >= threshold) {
      await supabase.from("cockpit_objectives").update({ status: "approved" }).eq("id", obj.id);
      await logActivity("resolved", "objective", { title: `Locked: ${obj.title}` });
    } else {
      await logActivity("updated", "objective", { title: `Voted on: ${obj.title}` });
    }
  }

  async function deleteObjective(obj) {
    if (!confirm(`Delete this objective?`)) return;
    await supabase.from("cockpit_objective_validations").delete().eq("objective_id", obj.id);
    await supabase.from("cockpit_objectives").delete().eq("id", obj.id);
    await logActivity("deleted", "objective", { title: obj.title });
  }

  // Stats
  const totalLocked = objectives.filter((o) => isLocked(o.id)).length;
  const totalObjectives = objectives.length;
  const pillarsWithObjective = new Set(objectives.map((o) => o.pillar)).size;

  if (loading) {
    return <div className="p-6 max-w-4xl mx-auto"><p className="text-sm text-[#475569] text-center py-12">Loading objectives...</p></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Objectives</h1>
        <p className="text-sm text-[#94a3b8] mt-1">
          Define up to 3 objectives per pillar. Each needs {threshold} validations to lock.
        </p>
        <div className="flex gap-6 mt-4">
          <div>
            <span className="text-3xl font-extrabold text-green-400">{totalLocked}</span>
            <span className="text-sm text-[#475569] ml-2">locked</span>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-[#64748b]">{totalObjectives}</span>
            <span className="text-sm text-[#475569] ml-2">total</span>
          </div>
          <div>
            <span className="text-3xl font-extrabold text-blue-400">{pillarsWithObjective}</span>
            <span className="text-sm text-[#475569] ml-2">/ 7 pillars</span>
          </div>
        </div>
        <div className="h-[2px] mt-4 rounded-full bg-gradient-to-r from-green-500/30 via-blue-500/20 to-transparent" />
      </div>

      {/* Pillars */}
      {PILLARS.map((pillar) => {
        const pillarObjs = objectives.filter((o) => o.pillar === pillar.id);
        const canAdd = pillarObjs.length < MAX_PER_PILLAR;
        const isAdding = addingPillar === pillar.id;

        return (
          <div key={pillar.id}>
            {/* Pillar header */}
            <div className="flex items-center gap-3 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pillar.color }} />
              <h2 className="text-lg font-extrabold text-white">{pillar.label}</h2>
              <span className="text-xs font-mono text-[#475569]">{pillarObjs.length}/{MAX_PER_PILLAR}</span>
            </div>
            <p className="text-sm text-[#64748b] mb-4 ml-6">{pillar.desc}</p>

            {/* Objectives */}
            <div className="space-y-3 ml-6">
              {pillarObjs.map((obj) => {
                const votes = getValidationsFor(obj.id);
                const locked = votes.length >= threshold;
                const voted = hasValidated(obj.id);
                const isEditing = editingId === obj.id;

                return (
                  <div
                    key={obj.id}
                    className="rounded-xl border p-5 transition-all"
                    style={{
                      borderColor: locked ? "#10b981" + "66" : "#1e293b",
                      backgroundColor: locked ? "#10b981" + "08" : "#0d1117",
                    }}
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="w-full bg-transparent text-lg font-bold text-white outline-none resize-none border-b border-[#334155] pb-2"
                          rows={2}
                          maxLength={200}
                          autoFocus
                          placeholder="Max 2 sentences..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(obj)}
                            className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-blue-500"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditText(""); }}
                            className="px-4 py-1.5 text-xs rounded-lg text-[#64748b] bg-[#1e293b]"
                          >
                            Cancel
                          </button>
                          <p className="text-[10px] text-amber-400 ml-auto self-center">Saving will reset all validations</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Objective text — large */}
                        <p className="text-lg font-bold text-white leading-relaxed">
                          {obj.title}
                        </p>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          {/* Author */}
                          <span className="text-[10px] text-[#475569] font-mono">
                            by {obj.proposed_by || "Unknown"}
                          </span>

                          {/* Validation badges */}
                          <div className="flex items-center gap-1">
                            {votes.map((v) => (
                              <span
                                key={v.id}
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-400/10 text-green-400"
                              >
                                {v.validator_name}
                              </span>
                            ))}
                            {Array.from({ length: Math.max(0, threshold - votes.length) }).map((_, i) => (
                              <span
                                key={`empty-${i}`}
                                className="w-5 h-5 rounded-full border border-dashed border-[#334155]"
                              />
                            ))}
                          </div>

                          {/* Lock status */}
                          {locked ? (
                            <span className="text-[10px] font-extrabold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                              Locked
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#475569] font-mono">
                              {votes.length}/{threshold} to lock
                            </span>
                          )}

                          {/* Actions — right aligned */}
                          <div className="flex gap-1 ml-auto">
                            {!voted && !locked && (
                              <button
                                onClick={() => validate(obj)}
                                className="text-[10px] font-bold px-3 py-1 rounded-lg text-green-400 bg-green-400/10 hover:bg-green-400/20 transition"
                              >
                                Validate
                              </button>
                            )}
                            {voted && !locked && (
                              <span className="text-[10px] text-green-400/60 px-2 py-1">Voted</span>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => { setEditingId(obj.id); setEditText(obj.title); }}
                                className="text-[10px] px-2 py-1 rounded text-[#475569] hover:text-white hover:bg-[#1e293b] transition"
                              >
                                Edit
                              </button>
                            )}
                            {canEdit && !locked && (
                              <button
                                onClick={() => deleteObjective(obj)}
                                className="text-[10px] px-2 py-1 rounded text-red-400/40 hover:text-red-400 transition"
                              >
                                Del
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* Add objective */}
              {canAdd && canEdit && (
                isAdding ? (
                  <div className="rounded-xl border border-dashed border-[#334155] p-5">
                    <textarea
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      className="w-full bg-transparent text-lg font-bold text-white outline-none resize-none placeholder-[#334155]"
                      rows={2}
                      maxLength={200}
                      autoFocus
                      placeholder="Write your objective (max 2 sentences)..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addObjective(pillar.id); }
                      }}
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => addObjective(pillar.id)}
                        className="px-4 py-1.5 text-xs font-bold rounded-lg text-white"
                        style={{ backgroundColor: pillar.color }}
                      >
                        Add Objective
                      </button>
                      <button
                        onClick={() => { setAddingPillar(null); setNewText(""); }}
                        className="px-4 py-1.5 text-xs rounded-lg text-[#64748b] bg-[#1e293b]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingPillar(pillar.id)}
                    className="w-full py-3 rounded-xl border border-dashed border-[#1e293b] text-sm text-[#334155] hover:border-[#475569] hover:text-[#64748b] transition-all"
                  >
                    + Add objective ({pillarObjs.length}/{MAX_PER_PILLAR})
                  </button>
                )
              )}
            </div>

            {/* Separator */}
            <div className="h-px bg-[#1e293b] mt-6" />
          </div>
        );
      })}
    </div>
  );
}
