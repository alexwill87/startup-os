"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#f59e0b";

const PILLAR_COLORS = {
  why: "#3b82f6", team: "#8b5cf6", resources: "#10b981", project: "#f59e0b",
  market: "#ec4899", finances: "#ef4444", analytics: "#06b6d4",
};

export default function DocsPage() {
  const [docs, setDocs] = useState([]);
  const [requiredDocs, setRequiredDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("all"); // all, required, imported

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    const [{ data: docData }, { data: checklistData }] = await Promise.all([
      supabase.from("cockpit_docs").select("*").order("chapter_order", { ascending: true }),
      supabase.from("cockpit_checklist").select("*").eq("category", "document").order("pillar", { ascending: true }),
    ]);
    setDocs(docData || []);
    setRequiredDocs(checklistData || []);
    setLoading(false);
  }

  async function updateChecklistStatus(id, newStatus, title) {
    await supabase.from("cockpit_checklist").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
    logActivity(newStatus === "done" ? "completed" : "updated", "checklist", { title });
  }

  // Group imported docs by part
  const grouped = (docs || []).reduce((acc, doc) => {
    const part = doc.part || "General";
    if (!acc[part]) acc[part] = [];
    acc[part].push(doc);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-[#475569] text-sm font-mono">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Documentation" subtitle={`${docs.length} imported docs + ${requiredDocs.length} expected documents`} color={COLOR}>
        <div className="flex gap-2">
          <button onClick={() => setView("all")} className={`px-3 py-1.5 rounded-lg text-xs font-mono ${view === "all" ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b]"}`}>All</button>
          <button onClick={() => setView("required")} className={`px-3 py-1.5 rounded-lg text-xs font-mono ${view === "required" ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b]"}`}>Required Docs</button>
          <button onClick={() => setView("imported")} className={`px-3 py-1.5 rounded-lg text-xs font-mono ${view === "imported" ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b]"}`}>Imported</button>
        </div>
      </PageHeader>

      {/* REQUIRED DOCUMENTS — from checklist */}
      {(view === "all" || view === "required") && requiredDocs.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-[#94a3b8] mb-3 uppercase tracking-widest">
            Expected Documents ({requiredDocs.filter((d) => d.status === "done" || d.status === "validated").length}/{requiredDocs.filter((d) => d.required).length} done)
          </h2>
          <div className="space-y-2">
            {requiredDocs.map((doc) => {
              const isDone = doc.status === "done" || doc.status === "validated";
              const pColor = PILLAR_COLORS[doc.pillar] || "#64748b";
              return (
                <Card key={doc.id} className={`!p-3 ${isDone ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: pColor + "15", color: pColor }}>
                      D
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isDone ? "line-through text-[#475569]" : "text-white font-medium"}`}>
                          {doc.title}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: pColor + "15", color: pColor }}>
                          {doc.pillar}
                        </span>
                        {!doc.required && <span className="text-[9px] text-[#334155] font-mono">optional</span>}
                      </div>
                      {doc.description && <p className="text-[10px] text-[#475569]">{doc.description}</p>}
                      {doc.format && <span className="text-[9px] text-[#334155] font-mono">Format: {doc.format}</span>}
                    </div>
                    <select
                      value={doc.status}
                      onChange={(e) => updateChecklistStatus(doc.id, e.target.value, doc.title)}
                      className="py-1 px-2 rounded border border-[#1e293b] bg-[#0a0f1a] text-[10px] font-mono outline-none"
                      style={{ color: isDone ? "#10b981" : doc.status === "in_progress" ? "#3b82f6" : "#64748b" }}
                    >
                      <option value="todo">Todo</option>
                      <option value="in_progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="validated">Validated</option>
                    </select>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* IMPORTED DOCS — from cockpit_docs */}
      {(view === "all" || view === "imported") && (
        <div>
          <h2 className="text-xs font-bold text-[#94a3b8] mb-3 uppercase tracking-widest">
            Imported Documentation ({docs.length} chapters)
          </h2>
          {Object.keys(grouped).length === 0 ? (
            <Card><p className="text-[#475569] text-sm text-center py-8">No documents imported yet.</p></Card>
          ) : (
            Object.entries(grouped).map(([part, partDocs]) => (
              <div key={part} className="mb-6">
                <h3 className="text-xs font-bold text-[#64748b] mb-2 pb-1 border-b border-[#1e293b]">{part}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {partDocs.map((doc) => (
                    <Link key={doc.id} href={`/projet/docs/${doc.slug}`}>
                      <Card className="!p-3 hover:border-[#334155] transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-white font-medium truncate">{doc.title}</span>
                          <span className="text-[9px] text-[#475569] font-mono flex-shrink-0 ml-2">
                            {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
