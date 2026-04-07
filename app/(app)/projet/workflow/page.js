"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#f59e0b";
const ROLES = ["observer", "mentor", "cofounder", "admin"];
const DEFAULT_STEPS = [
  { id: "prep", name: "Preparation", description: "Gather context, define scope, identify stakeholders", min_role: "cofounder", can_be_agent: false },
  { id: "ref_int", name: "Internal Reference", description: "Check existing features, goals, and docs for overlap", min_role: "cofounder", can_be_agent: true },
  { id: "ref_ext", name: "External Research", description: "Benchmark competitors, find best practices", min_role: "mentor", can_be_agent: true },
  { id: "comm", name: "Communication", description: "Announce the feature to the team, share context", min_role: "cofounder", can_be_agent: false },
  { id: "debate", name: "Team Debate", description: "Discuss approach, collect opinions, resolve disagreements", min_role: "cofounder", can_be_agent: false },
  { id: "define", name: "Definition & Specs", description: "Write technical specs, define acceptance criteria", min_role: "cofounder", can_be_agent: true },
  { id: "config", name: "Configuration", description: "Set up environment, database, API keys", min_role: "cofounder", can_be_agent: true },
  { id: "build", name: "Build / Deploy", description: "Implement the feature, intermediate deployments", min_role: "cofounder", can_be_agent: true },
  { id: "test", name: "Test & QA", description: "Manual and automated testing, edge cases", min_role: "cofounder", can_be_agent: false },
  { id: "review", name: "Review & Control", description: "Code review, stakeholder validation", min_role: "mentor", can_be_agent: false },
  { id: "confirm", name: "Confirmation & Launch", description: "Final approval, production deploy, announce", min_role: "cofounder", can_be_agent: false },
];

export default function WorkflowPage() {
  const { canEdit } = useAuth();
  const [steps, setSteps] = useState([]);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", description: "", min_role: "cofounder", can_be_agent: false });
  const [recordId, setRecordId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchWorkflow(); }, []);

  async function fetchWorkflow() {
    try {
      const { data } = await supabase.from("cockpit_vision").select("*").eq("topic", "workflow").limit(1).maybeSingle();
      if (data) {
        try {
          const parsed = JSON.parse(data.body);
          setSteps(parsed.steps || []);
        } catch { setSteps([]); }
        setRecordId(data.id);
      } else {
        // No workflow yet — try to create with defaults
        const body = JSON.stringify({ steps: DEFAULT_STEPS.map((s, i) => ({ ...s, order: i + 1 })) });
        const { data: created, error } = await supabase.from("cockpit_vision").insert({ topic: "workflow", title: "Feature Workflow", body }).select().single();
        if (created) {
          setSteps(DEFAULT_STEPS.map((s, i) => ({ ...s, order: i + 1 })));
          setRecordId(created.id);
        } else if (error) {
          // Fallback if 'workflow' topic not in constraint
          const { data: fb } = await supabase.from("cockpit_vision").insert({ topic: "other", title: "[WORKFLOW] Feature Workflow", body }).select().single();
          if (fb) { setSteps(DEFAULT_STEPS.map((s, i) => ({ ...s, order: i + 1 }))); setRecordId(fb.id); }
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function saveSteps(newSteps) {
    setSteps(newSteps);
    if (recordId) {
      await supabase.from("cockpit_vision").update({ body: JSON.stringify({ steps: newSteps }) }).eq("id", recordId);
    }
  }

  function moveStep(idx, dir) {
    const ns = [...steps];
    const target = idx + dir;
    if (target < 0 || target >= ns.length) return;
    [ns[idx], ns[target]] = [ns[target], ns[idx]];
    ns.forEach((s, i) => s.order = i + 1);
    saveSteps(ns);
  }

  function deleteStep(idx) {
    const ns = steps.filter((_, i) => i !== idx);
    ns.forEach((s, i) => s.order = i + 1);
    saveSteps(ns);
  }

  function saveEdit(idx) {
    const ns = [...steps];
    ns[idx] = { ...ns[idx], ...editForm };
    saveSteps(ns);
    setEditing(null);
  }

  function addStep() {
    if (!addForm.name.trim()) return;
    const id = addForm.name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const ns = [...steps, { id, ...addForm, order: steps.length + 1 }];
    saveSteps(ns);
    setAddForm({ name: "", description: "", min_role: "cofounder", can_be_agent: false });
    setShowAdd(false);
  }

  function resetToDefaults() {
    if (!confirm("Reset workflow to defaults? This will overwrite all customizations.")) return;
    saveSteps(DEFAULT_STEPS.map((s, i) => ({ ...s, order: i + 1 })));
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <PageHeader title="Feature Workflow" subtitle={`${steps.length} steps — template applied to every new feature`} color={COLOR}>
        <div className="flex gap-2">
          {canEdit && <button onClick={resetToDefaults} className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-[#475569] border border-[#1e293b] hover:text-white transition">Reset</button>}
          {canEdit && <button onClick={() => setShowAdd(!showAdd)} className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition">+ Step</button>}
        </div>
      </PageHeader>

      {loading ? <p className="text-sm text-[#475569] text-center py-8">Loading...</p> : (
        <div className="space-y-2">
          {steps.map((step, idx) => {
            const isEditing = editing === idx;
            return (
              <div key={step.id || idx} className="rounded-xl border border-[#1e293b] bg-[#0d1117] p-4 flex items-start gap-3">
                {/* Number */}
                <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-xs font-extrabold shrink-0">
                  {idx + 1}
                </div>

                {isEditing ? (
                  <div className="flex-1 space-y-2">
                    <input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full py-1.5 px-3 rounded border border-[#334155] bg-transparent text-white text-sm outline-none" />
                    <input value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full py-1.5 px-3 rounded border border-[#334155] bg-transparent text-[#94a3b8] text-xs outline-none" />
                    <div className="flex gap-2 items-center">
                      <select value={editForm.min_role} onChange={(e) => setEditForm({ ...editForm, min_role: e.target.value })}
                        className="py-1 px-2 rounded border border-[#1e293b] bg-[#0a0f1a] text-xs text-white outline-none">
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-[#64748b]">
                        <input type="checkbox" checked={editForm.can_be_agent} onChange={(e) => setEditForm({ ...editForm, can_be_agent: e.target.checked })} />
                        Agent OK
                      </label>
                      <button onClick={() => saveEdit(idx)} className="px-3 py-1 text-[10px] font-bold rounded text-green-400 bg-green-400/10">Save</button>
                      <button onClick={() => setEditing(null)} className="px-3 py-1 text-[10px] rounded text-[#475569]">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-white">{step.name}</h3>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1e293b] text-[#64748b]">{step.min_role}+</span>
                      {step.can_be_agent && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">agent OK</span>}
                    </div>
                    {step.description && <p className="text-xs text-[#64748b] mt-0.5">{step.description}</p>}
                  </div>
                )}

                {/* Actions */}
                {canEdit && !isEditing && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => moveStep(idx, -1)} disabled={idx === 0} className="text-[10px] px-1.5 py-0.5 rounded text-[#475569] hover:text-white disabled:opacity-20">^</button>
                    <button onClick={() => moveStep(idx, 1)} disabled={idx === steps.length - 1} className="text-[10px] px-1.5 py-0.5 rounded text-[#475569] hover:text-white disabled:opacity-20">v</button>
                    <button onClick={() => { setEditing(idx); setEditForm(step); }} className="text-[10px] px-1.5 py-0.5 rounded text-[#475569] hover:text-white">E</button>
                    <button onClick={() => deleteStep(idx)} className="text-[10px] px-1.5 py-0.5 rounded text-red-400/40 hover:text-red-400">X</button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add step form */}
          {showAdd && (
            <Card>
              <div className="space-y-2">
                <input value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} placeholder="Step name"
                  className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none" />
                <input value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} placeholder="Description"
                  className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-[#94a3b8] text-xs outline-none" />
                <div className="flex gap-2 items-center">
                  <select value={addForm.min_role} onChange={(e) => setAddForm({ ...addForm, min_role: e.target.value })}
                    className="py-1.5 px-2 rounded border border-[#1e293b] bg-[#0a0f1a] text-xs text-white outline-none">
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-[#64748b]">
                    <input type="checkbox" checked={addForm.can_be_agent} onChange={(e) => setAddForm({ ...addForm, can_be_agent: e.target.checked })} />
                    Agent OK
                  </label>
                  <button onClick={addStep} className="px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-amber-500">Add</button>
                  <button onClick={() => setShowAdd(false)} className="px-4 py-1.5 text-xs rounded-lg text-[#64748b] bg-[#1e293b]">Cancel</button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
