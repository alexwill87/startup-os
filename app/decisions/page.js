"use client";

import { useEffect, useState } from "react";
import { supabase, BUILDERS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

const BUILDER_BY_ID = {};

export default function Decisions() {
  const { user, builder } = useAuth();
  const [decisions, setDecisions] = useState([]);
  const [comments, setComments] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", context: "" });
  const [commentForm, setCommentForm] = useState({});

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("decisions_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_decisions" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_comments" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchAll() {
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
  }

  async function addDecision(e) {
    e.preventDefault();
    await supabase.from("cockpit_decisions").insert({
      ...form,
      status: "open",
      created_by: user.id,
    });
    setForm({ title: "", context: "" });
    setShowForm(false);
  }

  async function addComment(decisionId) {
    const cf = commentForm[decisionId];
    if (!cf?.body) return;
    await supabase.from("cockpit_comments").insert({
      decision_id: decisionId,
      body: cf.body,
      vote: cf.vote || "neutral",
      author_id: user.id,
    });
    setCommentForm({ ...commentForm, [decisionId]: { body: "", vote: "neutral" } });
  }

  async function resolveDecision(id, decision) {
    await supabase.from("cockpit_decisions").update({ status: "decided", decision }).eq("id", id);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Decisions</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          + New Topic
        </button>
      </div>

      {showForm && (
        <form onSubmit={addDecision} className="card" style={{ marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Decision title / question"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            style={{ marginBottom: 12 }}
          />
          <textarea
            placeholder="Context — why is this decision needed?"
            value={form.context}
            onChange={(e) => setForm({ ...form, context: e.target.value })}
            rows={3}
            style={{ marginBottom: 12 }}
          />
          <button type="submit" className="btn btn-primary">Post</button>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {decisions.map((d) => {
          const dcmts = comments[d.id] || [];
          const votes = { agree: 0, disagree: 0, neutral: 0 };
          dcmts.forEach((c) => { if (c.vote) votes[c.vote]++; });
          const cf = commentForm[d.id] || { body: "", vote: "neutral" };

          return (
            <div key={d.id} className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span className={`badge badge-${d.status}`}>{d.status}</span>
                <span style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>{d.title}</span>
                <span style={{ fontSize: 11, color: "#475569", fontFamily: "var(--font-geist-mono)" }}>
                  {new Date(d.created_at).toLocaleDateString()}
                </span>
              </div>

              {d.context && (
                <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 12, padding: "8px 12px", background: "#0a0f1a", borderRadius: 8 }}>
                  {d.context}
                </div>
              )}

              {d.decision && (
                <div style={{ fontSize: 13, color: "#6ee7b7", marginBottom: 12, padding: "8px 12px", background: "#064e3b33", borderRadius: 8, border: "1px solid #064e3b" }}>
                  Decision: {d.decision}
                </div>
              )}

              {/* Vote summary */}
              <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 12, fontFamily: "var(--font-geist-mono)" }}>
                <span style={{ color: "#6ee7b7" }}>Agree: {votes.agree}</span>
                <span style={{ color: "#fca5a5" }}>Disagree: {votes.disagree}</span>
                <span style={{ color: "#94a3b8" }}>Neutral: {votes.neutral}</span>
              </div>

              {/* Comments */}
              {dcmts.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                  {dcmts.map((c) => (
                    <div key={c.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 10px", background: "#0a0f1a", borderRadius: 6, fontSize: 12 }}>
                      <span style={{
                        color: c.vote === "agree" ? "#6ee7b7" : c.vote === "disagree" ? "#fca5a5" : "#64748b",
                        fontWeight: 700, minWidth: 16, textAlign: "center",
                      }}>
                        {c.vote === "agree" ? "+" : c.vote === "disagree" ? "-" : "~"}
                      </span>
                      <span style={{ color: "#e2e8f0" }}>{c.body}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment */}
              {d.status === "open" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Your take..."
                    value={cf.body}
                    onChange={(e) => setCommentForm({ ...commentForm, [d.id]: { ...cf, body: e.target.value } })}
                    style={{ flex: 1 }}
                  />
                  <select
                    value={cf.vote}
                    onChange={(e) => setCommentForm({ ...commentForm, [d.id]: { ...cf, vote: e.target.value } })}
                    style={{ width: 100 }}
                  >
                    <option value="agree">Agree</option>
                    <option value="disagree">Disagree</option>
                    <option value="neutral">Neutral</option>
                  </select>
                  <button className="btn" onClick={() => addComment(d.id)}>Send</button>
                  <button
                    className="btn"
                    style={{ color: "#6ee7b7" }}
                    onClick={() => {
                      const dec = prompt("Final decision:");
                      if (dec) resolveDecision(d.id, dec);
                    }}
                  >
                    Resolve
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
