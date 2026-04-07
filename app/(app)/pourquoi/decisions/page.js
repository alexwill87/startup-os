"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#3b82f6";

export default function DecisionsPage() {
  const { user, builder } = useAuth();
  const [decisions, setDecisions] = useState([]);
  const [comments, setComments] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", context: "" });
  const [commentForm, setCommentForm] = useState({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("decisions_page_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_decisions" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_comments" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchAll() {
    try {
      const { data: decs } = await supabase
        .from("cockpit_decisions")
        .select("*")
        .order("created_at", { ascending: false });
      setDecisions(decs || []);

      const { data: cmts } = await supabase
        .from("cockpit_comments")
        .select("*")
        .order("created_at", { ascending: true });
      const grouped = {};
      (cmts || []).forEach((c) => {
        if (!grouped[c.decision_id]) grouped[c.decision_id] = [];
        grouped[c.decision_id].push(c);
      });
      setComments(grouped);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function addDecision(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await supabase.from("cockpit_decisions").insert({
      title: form.title.trim(),
      context: form.context.trim(),
      status: "open",
      created_by: user?.id,
    });
    logActivity("created", "decision", { title: form.title });
    setForm({ title: "", context: "" });
    setShowForm(false);
  }

  async function addComment(decisionId) {
    const cf = commentForm[decisionId];
    if (!cf?.body?.trim()) return;
    await supabase.from("cockpit_comments").insert({
      decision_id: decisionId,
      body: cf.body.trim(),
      vote: cf.vote || "neutral",
      author_id: user?.id,
    });
    logActivity("commented", "decision", { title: decisionId });
    setCommentForm({ ...commentForm, [decisionId]: { body: "", vote: "neutral" } });
  }

  async function resolveDecision(id) {
    const decision = prompt("Final decision:");
    if (!decision) return;
    await supabase
      .from("cockpit_decisions")
      .update({ status: "decided", decision })
      .eq("id", id);
    logActivity("resolved", "decision", { title: id });
  }

  async function reopenDecision(id) {
    await supabase
      .from("cockpit_decisions")
      .update({ status: "open", decision: null })
      .eq("id", id);
  }

  const filtered =
    statusFilter === "all"
      ? decisions
      : decisions.filter((d) => d.status === statusFilter);

  const openCount = decisions.filter((d) => d.status === "open").length;
  const decidedCount = decisions.filter((d) => d.status === "decided").length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Decisions"
        subtitle="Propose, debate, and resolve key project decisions"
        color={COLOR}
      >
        <button
          className="px-4 py-2 text-xs font-semibold rounded-lg text-white transition hover:opacity-90"
          style={{ backgroundColor: COLOR }}
          onClick={() => setShowForm(!showForm)}
        >
          + New Decision
        </button>
      </PageHeader>

      {/* Stats bar */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#0d1117] border border-[#1e293b] rounded-lg">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          <span className="text-xs text-[#94a3b8]">
            <span className="font-bold text-white">{openCount}</span> open
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-[#0d1117] border border-[#1e293b] rounded-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs text-[#94a3b8]">
            <span className="font-bold text-white">{decidedCount}</span> decided
          </span>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "All" },
          { key: "open", label: "Open" },
          { key: "decided", label: "Decided" },
        ].map((f) => (
          <button
            key={f.key}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              statusFilter === f.key
                ? "text-white bg-blue-500/20 border border-blue-500/40"
                : "text-[#64748b] bg-[#0d1117] border border-[#1e293b] hover:border-[#334155]"
            }`}
            onClick={() => setStatusFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* New decision form */}
      {showForm && (
        <Card>
          <form onSubmit={addDecision} className="space-y-3">
            <input
              type="text"
              className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-blue-500/50"
              placeholder="Decision title / question"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <textarea
              className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] placeholder-[#475569] resize-none focus:outline-none focus:border-blue-500/50"
              placeholder="Context -- why is this decision needed?"
              value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
              rows={3}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold rounded-lg text-white transition hover:opacity-90"
                style={{ backgroundColor: COLOR }}
              >
                Post Decision
              </button>
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold rounded-lg text-[#64748b] bg-[#1e293b] hover:bg-[#334155] transition"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Decisions list */}
      {loading ? (
        <p className="text-sm text-[#475569] text-center py-8">Loading decisions...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-[#475569] text-center py-8">
            No decisions yet. Start a discussion topic for the team.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((d) => {
            const dcmts = comments[d.id] || [];
            const votes = { agree: 0, disagree: 0, neutral: 0 };
            dcmts.forEach((c) => {
              if (c.vote) votes[c.vote]++;
            });
            const cf = commentForm[d.id] || { body: "", vote: "neutral" };
            const isOpen = d.status === "open";

            return (
              <Card key={d.id}>
                {/* Decision header */}
                <div className="flex items-start gap-3 mb-3">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                      isOpen
                        ? "text-amber-400 bg-amber-400/10"
                        : "text-emerald-400 bg-emerald-400/10"
                    }`}
                  >
                    {d.status}
                  </span>
                  <h3 className="text-sm font-bold text-white flex-1">{d.title}</h3>
                  <span className="text-[10px] text-[#475569] font-mono shrink-0">
                    {new Date(d.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>

                {/* Context */}
                {d.context && (
                  <div className="mb-3 px-3 py-2 bg-[#0a0f1a] rounded-lg border border-[#1e293b]">
                    <p className="text-xs text-[#94a3b8] leading-relaxed">{d.context}</p>
                  </div>
                )}

                {/* Final decision banner */}
                {d.decision && (
                  <div className="mb-3 px-3 py-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                    <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Decision</p>
                    <p className="text-xs text-emerald-300 leading-relaxed">{d.decision}</p>
                  </div>
                )}

                {/* Vote summary */}
                <div className="flex gap-4 mb-3">
                  <span className="text-xs font-mono">
                    <span className="text-emerald-400 font-bold">{votes.agree}</span>
                    <span className="text-[#475569] ml-1">agree</span>
                  </span>
                  <span className="text-xs font-mono">
                    <span className="text-red-400 font-bold">{votes.disagree}</span>
                    <span className="text-[#475569] ml-1">disagree</span>
                  </span>
                  <span className="text-xs font-mono">
                    <span className="text-[#94a3b8] font-bold">{votes.neutral}</span>
                    <span className="text-[#475569] ml-1">neutral</span>
                  </span>
                </div>

                {/* Comments thread */}
                {dcmts.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {dcmts.map((c) => {
                      const voteIcon =
                        c.vote === "agree" ? "+" : c.vote === "disagree" ? "-" : "~";
                      const voteColor =
                        c.vote === "agree"
                          ? "text-emerald-400"
                          : c.vote === "disagree"
                          ? "text-red-400"
                          : "text-[#64748b]";

                      return (
                        <div
                          key={c.id}
                          className="flex gap-2 items-start px-3 py-2 bg-[#0a0f1a] rounded-lg"
                        >
                          <span className={`font-bold text-xs w-4 text-center shrink-0 ${voteColor}`}>
                            {voteIcon}
                          </span>
                          <p className="text-xs text-[#e2e8f0] leading-relaxed flex-1">{c.body}</p>
                          <span className="text-[9px] text-[#475569] font-mono shrink-0">
                            {new Date(c.created_at).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add comment / resolve */}
                {isOpen && (
                  <div className="flex gap-2 pt-3 border-t border-[#1e293b]">
                    <input
                      type="text"
                      className="flex-1 bg-[#0a0f1a] border border-[#1e293b] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0] placeholder-[#475569] focus:outline-none focus:border-blue-500/50"
                      placeholder="Your take..."
                      value={cf.body}
                      onChange={(e) =>
                        setCommentForm({
                          ...commentForm,
                          [d.id]: { ...cf, body: e.target.value },
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          addComment(d.id);
                        }
                      }}
                    />
                    <select
                      className="bg-[#0a0f1a] border border-[#1e293b] rounded-lg px-2 py-1.5 text-xs text-[#e2e8f0] focus:outline-none focus:border-blue-500/50"
                      value={cf.vote}
                      onChange={(e) =>
                        setCommentForm({
                          ...commentForm,
                          [d.id]: { ...cf, vote: e.target.value },
                        })
                      }
                    >
                      <option value="agree">Agree</option>
                      <option value="disagree">Disagree</option>
                      <option value="neutral">Neutral</option>
                    </select>
                    <button
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg text-[#e2e8f0] bg-[#1e293b] hover:bg-[#334155] transition"
                      onClick={() => addComment(d.id)}
                    >
                      Send
                    </button>
                    <button
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 transition"
                      onClick={() => resolveDecision(d.id)}
                    >
                      Resolve
                    </button>
                  </div>
                )}

                {/* Reopen for decided */}
                {!isOpen && (
                  <div className="pt-3 border-t border-[#1e293b]">
                    <button
                      className="text-[10px] font-semibold px-2 py-1 rounded text-[#64748b] hover:text-white hover:bg-[#1e293b] transition"
                      onClick={() => reopenDecision(d.id)}
                    >
                      Reopen
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
