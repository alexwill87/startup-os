"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import { syncChecklist } from "@/lib/sync-checklist";
import Card from "./Card";
import PageHeader from "./PageHeader";

const STATUS_STYLES = {
  todo: { label: "To Do", color: "#64748b", bg: "bg-slate-500/10 text-slate-400" },
  in_progress: { label: "In Progress", color: "#3b82f6", bg: "bg-blue-500/10 text-blue-400" },
  done: { label: "Done", color: "#10b981", bg: "bg-emerald-500/10 text-emerald-400" },
  validated: { label: "Validated", color: "#8b5cf6", bg: "bg-purple-500/10 text-purple-400" },
  skipped: { label: "Skipped", color: "#475569", bg: "bg-slate-500/10 text-slate-500" },
};

const CAT_STYLES = {
  question: { label: "Q", color: "#3b82f6" },
  document: { label: "D", color: "#f59e0b" },
  action: { label: "A", color: "#10b981" },
};

export default function PillarDashboard({ pillar, label, color, subpages }) {
  const { user, member, isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [responses, setResponses] = useState({});
  const [owner, setOwner] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [expandedItem, setExpandedItem] = useState(null);
  const [replyText, setReplyText] = useState("");

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel(`pillar_${pillar}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_checklist" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [pillar]);

  async function fetchAll() {
    await syncChecklist();
    const [{ data: checklistData }, { data: ownerData }, { data: memberData }, { data: responseData }] = await Promise.all([
      supabase.from("cockpit_checklist").select("*").eq("pillar", pillar).order("sort_order", { ascending: true }),
      supabase.from("cockpit_config").select("value").eq("key", `pillar_owner_${pillar}`).maybeSingle(),
      supabase.from("cockpit_members").select("name, email, builder, color, role").eq("status", "active"),
      supabase.from("cockpit_responses").select("*").order("created_at", { ascending: true }),
    ]);
    setItems(checklistData || []);
    setOwner(ownerData?.value || null);
    setMembers(memberData || []);
    // Group responses by checklist_id
    const grouped = {};
    (responseData || []).forEach((r) => {
      if (!grouped[r.checklist_id]) grouped[r.checklist_id] = [];
      grouped[r.checklist_id].push(r);
    });
    setResponses(grouped);
    setLoading(false);
  }

  async function addResponse(checklistId) {
    if (!replyText.trim()) return;
    await supabase.from("cockpit_responses").insert({
      checklist_id: checklistId,
      body: replyText,
      author_id: user?.id,
      author_name: member?.name || "Unknown",
      author_role: member?.role || "member",
    });
    logActivity("commented", "checklist", { title: replyText.slice(0, 50) });
    setReplyText("");
    fetchAll();
  }

  async function voteResponse(id, direction) {
    const field = direction === "up" ? "votes_up" : "votes_down";
    const { data } = await supabase.from("cockpit_responses").select(field).eq("id", id).single();
    if (data) {
      await supabase.from("cockpit_responses").update({ [field]: (data[field] || 0) + 1 }).eq("id", id);
      fetchAll();
    }
  }

  async function acceptResponse(id) {
    await supabase.from("cockpit_responses").update({ is_accepted: true }).eq("id", id);
    fetchAll();
  }

  async function updateStatus(id, newStatus, title) {
    const updates = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === "validated") {
      updates.validated_by = user?.id;
      updates.validated_by_name = member?.name || "Unknown";
    }
    await supabase.from("cockpit_checklist").update(updates).eq("id", id);
    logActivity(newStatus === "done" ? "completed" : "updated", "checklist", { title });
  }

  async function updateNotes(id, notes) {
    await supabase.from("cockpit_checklist").update({ notes, updated_at: new Date().toISOString() }).eq("id", id);
  }

  async function updateAssigned(id, assignedTo) {
    await supabase.from("cockpit_checklist").update({ assigned_to: assignedTo, updated_at: new Date().toISOString() }).eq("id", id);
  }

  async function setOwnerConfig(ownerName) {
    const { data: existing } = await supabase.from("cockpit_config").select("key").eq("key", `pillar_owner_${pillar}`).maybeSingle();
    if (existing) {
      await supabase.from("cockpit_config").update({ value: ownerName }).eq("key", `pillar_owner_${pillar}`);
    } else {
      await supabase.from("cockpit_config").insert({ key: `pillar_owner_${pillar}`, value: ownerName });
    }
    setOwner(ownerName);
  }

  const required = items.filter((i) => i.required);
  const requiredDone = required.filter((i) => i.status === "done" || i.status === "validated").length;
  const pct = required.length > 0 ? Math.round((requiredDone / required.length) * 100) : 0;

  const filtered = filter === "all" ? items : items.filter((i) => i.category === filter);
  const lastUpdated = items.reduce((max, i) => {
    const d = new Date(i.updated_at || i.created_at);
    return d > max ? d : max;
  }, new Date(0));

  const catCounts = { question: 0, document: 0, action: 0 };
  items.forEach((i) => { if (catCounts[i.category] !== undefined) catCounts[i.category]++; });

  if (loading) {
    return <div className="text-[#475569] text-sm font-mono p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={label} color={color}>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-extrabold" style={{ color: pct === 100 ? "#10b981" : pct > 0 ? color : "#334155" }}>
            {pct}%
          </span>
          <span className="text-xs text-[#475569] font-mono">{requiredDone}/{required.length}</span>
        </div>
      </PageHeader>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="py-3 px-4">
          <div className="text-xs text-[#64748b] mb-1">Owner</div>
          <select
            value={owner || ""}
            onChange={(e) => setOwnerConfig(e.target.value)}
            className="w-full py-1 px-2 rounded border border-[#1e293b] bg-[#0a0f1a] text-white text-xs font-mono outline-none"
          >
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.email} value={m.name}>{m.name}</option>)}
          </select>
        </Card>
        <Card className="py-3 px-4">
          <div className="text-xs text-[#64748b] mb-1">Items</div>
          <div className="text-lg font-bold text-white">{items.length}</div>
        </Card>
        <Card className="py-3 px-4">
          <div className="text-xs text-[#64748b] mb-1">Done</div>
          <div className="text-lg font-bold text-emerald-400">{items.filter((i) => i.status === "done" || i.status === "validated").length}</div>
        </Card>
        <Card className="py-3 px-4">
          <div className="text-xs text-[#64748b] mb-1">Last updated</div>
          <div className="text-xs text-white font-mono">
            {lastUpdated > new Date(0) ? lastUpdated.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never"}
          </div>
        </Card>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct === 100 ? "#10b981" : color }} />
      </div>

      {/* Sub-pages */}
      {subpages && subpages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subpages.map((sp) => (
            <Link key={sp.href} href={sp.href}
              className="px-3 py-2 rounded-lg border border-[#1e293b] bg-[#0d1117] text-xs text-[#94a3b8] hover:text-white hover:border-[#334155] transition-colors font-mono">
              {sp.label}
            </Link>
          ))}
        </div>
      )}

      {/* Category filters */}
      <div className="flex gap-2">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-mono ${filter === "all" ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b] hover:text-white"}`}>
          All ({items.length})
        </button>
        {Object.entries(catCounts).filter(([, c]) => c > 0).map(([cat, count]) => (
          <button key={cat} onClick={() => setFilter(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-mono ${filter === cat ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b] hover:text-white"}`}>
            {cat === "question" ? "Questions" : cat === "document" ? "Documents" : "Actions"} ({count})
          </button>
        ))}
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const st = STATUS_STYLES[item.status] || STATUS_STYLES.todo;
          const cat = CAT_STYLES[item.category] || CAT_STYLES.document;
          const isDone = item.status === "done" || item.status === "validated";

          return (
            <Card key={item.id} className={`transition-all ${isDone ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                {/* Category badge */}
                <div className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                  style={{ background: cat.color + "15", color: cat.color }}>
                  {cat.label}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm ${isDone ? "line-through text-[#475569]" : "text-white font-medium"}`}>
                      {item.title}
                    </span>
                    {!item.required && <span className="text-[9px] text-[#334155] font-mono">optional</span>}
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-[#64748b] mb-1">{item.description}</p>
                  )}
                  {item.format && (
                    <span className="text-[10px] text-[#334155] font-mono">Format: {item.format}</span>
                  )}

                  {/* Notes */}
                  <div className="mt-2">
                    <textarea
                      placeholder="Notes, links, comments..."
                      value={item.notes || ""}
                      onChange={(e) => updateNotes(item.id, e.target.value)}
                      rows={1}
                      className="w-full py-1.5 px-2 rounded border border-[#1e293b] bg-[#0a0f1a] text-[#94a3b8] text-[11px] font-mono outline-none focus:border-[#3b82f6] resize-none"
                    />
                  </div>

                  {/* Validation info */}
                  {item.validated_by_name && (
                    <div className="text-[10px] text-purple-400 font-mono mt-1">
                      Validated by {item.validated_by_name}
                    </div>
                  )}

                  {/* Response count + toggle */}
                  <button
                    onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                    className="text-[10px] text-[#475569] hover:text-[#94a3b8] font-mono mt-2 transition-colors"
                  >
                    {(responses[item.id] || []).length > 0
                      ? `${(responses[item.id] || []).length} response${(responses[item.id] || []).length > 1 ? "s" : ""} ${expandedItem === item.id ? "▾" : "▸"}`
                      : `Add response ${expandedItem === item.id ? "▾" : "▸"}`}
                  </button>

                  {/* Response thread */}
                  {expandedItem === item.id && (
                    <div className="mt-3 space-y-2 border-t border-[#1e293b] pt-3">
                      {(responses[item.id] || []).map((r) => (
                        <div key={r.id} className={`p-2.5 rounded-lg ${r.is_accepted ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-[#0a0f1a] border border-[#1e293b]"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold text-white">{r.author_name}</span>
                            <span className="text-[9px] font-mono text-[#475569]">{r.author_role}</span>
                            {r.is_accepted && <span className="text-[9px] font-mono text-emerald-400">ACCEPTED</span>}
                            <span className="text-[9px] text-[#334155] font-mono ml-auto">
                              {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <p className="text-xs text-[#94a3b8] whitespace-pre-wrap">{r.body}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <button onClick={() => voteResponse(r.id, "up")} className="text-[10px] text-[#475569] hover:text-emerald-400 font-mono">
                              ▲ {r.votes_up || 0}
                            </button>
                            <button onClick={() => voteResponse(r.id, "down")} className="text-[10px] text-[#475569] hover:text-red-400 font-mono">
                              ▼ {r.votes_down || 0}
                            </button>
                            {!r.is_accepted && (
                              <button onClick={() => acceptResponse(r.id)} className="text-[10px] text-[#475569] hover:text-emerald-400 font-mono ml-auto">
                                Accept
                              </button>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Add response */}
                      <div className="flex gap-2">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Your answer or comment..."
                          rows={2}
                          className="flex-1 py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-[#94a3b8] text-xs font-mono outline-none focus:border-[#3b82f6] resize-none"
                          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addResponse(item.id); } }}
                        />
                        <button
                          onClick={() => addResponse(item.id)}
                          className="px-3 self-end py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-mono hover:bg-blue-500/20 transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right side: status + assigned */}
                <div className="flex flex-col gap-2 flex-shrink-0 items-end">
                  <select
                    value={item.status}
                    onChange={(e) => updateStatus(item.id, e.target.value, item.title)}
                    className={`py-1 px-2 rounded text-[10px] font-mono font-bold outline-none ${st.bg}`}
                    style={{ background: st.color + "15" }}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="validated">Validated</option>
                    <option value="skipped">Skipped</option>
                  </select>

                  <select
                    value={item.assigned_to || ""}
                    onChange={(e) => updateAssigned(item.id, e.target.value)}
                    className="py-1 px-2 rounded border border-[#1e293b] bg-[#0a0f1a] text-[#64748b] text-[10px] font-mono outline-none"
                  >
                    <option value="">Assign to...</option>
                    {members.map((m) => <option key={m.email} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
