"use client";

/**
 * Vision page — 4 sections with comments linked to the SECTION KEY (not entry UUID).
 * Comments are always visible and survive entry edits/deletes/recreations.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, useMembers } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import {
  PageLayout,
  Topbar,
  PageTitle,
  KpiRow,
  KpiCard,
  Button,
  Badge,
  Footer,
  FormGroup,
  FormLabel,
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/app/components/ui";

const SECTIONS = [
  { key: "mission", label: "Mission Statement", placeholder: "What does the project do and for whom?" },
  { key: "vision", label: "Vision Statement", placeholder: "Where is the project going in the long term?" },
  { key: "problem", label: "Problem Solved", placeholder: "What pain point does the project address?" },
  { key: "northstar", label: "North Star Metric", placeholder: "The one metric that matters most..." },
];

const VOTE_LABELS = { agree: "Agree", disagree: "Disagree", neutral: "Neutral" };
const VOTE_VARIANTS = { agree: "success", disagree: "danger", neutral: "neutral" };

export default function V1VisionPage() {
  const { user, member, canEdit } = useAuth();
  const members = useMembers();
  const [entries, setEntries] = useState({});
  const [comments, setComments] = useState({});
  const [votes, setVotes] = useState({});
  const [editing, setEditing] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [commentForm, setCommentForm] = useState({});
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentValue, setEditCommentValue] = useState("");
  const [loading, setLoading] = useState(true);

  const activeMembers = members.filter((m) => m.status === "active" && m.role !== "observer");
  const threshold = Math.max(2, Math.ceil(activeMembers.length * 0.66));

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("v1_vision_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_vision" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_comments" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAll() {
    try {
      const { data: visionData } = await supabase
        .from("cockpit_vision")
        .select("*")
        .eq("topic", "product")
        .order("created_at", { ascending: false });
      const mapped = {};
      SECTIONS.forEach((s) => {
        const keyNorm = s.key.toLowerCase().replace(/\s+/g, "");
        mapped[s.key] =
          (visionData || []).find((d) => {
            if (!d.title) return false;
            const titleNorm = d.title.toLowerCase().replace(/\s+/g, "");
            return titleNorm.includes(keyNorm) || keyNorm.includes(titleNorm.slice(0, 6));
          }) || null;
      });
      setEntries(mapped);

      // Fetch votes (entity_type='vision_vote') and comments (entity_type='vision') separately
      try {
        const [{ data: voteData }, { data: cmtData }] = await Promise.all([
          supabase.from("cockpit_comments").select("*").eq("entity_type", "vision_vote").order("created_at"),
          supabase.from("cockpit_comments").select("*").eq("entity_type", "vision").order("created_at"),
        ]);
        // Votes: grouped by entity_key, one per user (latest wins)
        const vGrouped = {};
        (voteData || []).forEach((v) => {
          const key = v.entity_key;
          if (!key) return;
          if (!vGrouped[key]) vGrouped[key] = {};
          vGrouped[key][v.author_id] = v;
        });
        setVotes(vGrouped);
        // Comments: grouped by entity_key
        const cGrouped = {};
        (cmtData || []).forEach((c) => {
          const key = c.entity_key || c.entity_id;
          if (!key) return;
          if (!cGrouped[key]) cGrouped[key] = [];
          cGrouped[key].push(c);
        });
        setComments(cGrouped);
      } catch {
        setVotes({});
        setComments({});
      }
    } catch (err) {
      console.error("Vision fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  function getComments(sectionKey, entryId) {
    const byKey = comments[sectionKey] || [];
    const byId = entryId ? (comments[entryId] || []) : [];
    const all = [...byKey, ...byId];
    const seen = new Set();
    return all.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }

  function getVoteCounts(sectionKey) {
    const sectionVotes = votes[sectionKey] || {};
    const counts = { agree: 0, disagree: 0, neutral: 0 };
    Object.values(sectionVotes).forEach((v) => {
      if (counts[v.vote] !== undefined) counts[v.vote]++;
    });
    return counts;
  }

  function getUserVote(sectionKey) {
    const sectionVotes = votes[sectionKey] || {};
    return sectionVotes[user?.id]?.vote || null;
  }

  async function saveEntry(sectionKey) {
    const section = SECTIONS.find((s) => s.key === sectionKey);
    if (!section || !editValue.trim()) return;
    const existing = entries[sectionKey];
    if (existing) {
      await supabase.from("cockpit_vision").update({ body: editValue.trim() }).eq("id", existing.id);
    } else {
      await supabase.from("cockpit_vision").insert({
        topic: "product",
        title: section.label,
        body: editValue.trim(),
        builder: member?.builder || null,
        created_by: user?.id,
        pinned: true,
      });
    }
    await logActivity("updated", "vision", { title: section.label });
    setEditing(null);
    setEditValue("");
  }

  async function deleteEntry(entry, sectionLabel) {
    if (!confirm(`Delete "${sectionLabel}" ? Comments will be preserved.`)) return;
    // Only delete the vision entry, NOT the comments
    await supabase.from("cockpit_vision").delete().eq("id", entry.id);
    await logActivity("deleted", "vision", { title: sectionLabel });
  }

  async function addComment(sectionKey) {
    const cf = commentForm[sectionKey];
    const body = cf?.body?.trim();
    if (!body) return;
    await supabase.from("cockpit_comments").insert({
      entity_type: "vision",
      entity_key: sectionKey,
      body,
      vote: null,
      author_id: user?.id,
    });
    const section = SECTIONS.find((s) => s.key === sectionKey);
    await logActivity("commented", "vision", { title: section?.label });
    setCommentForm({ ...commentForm, [sectionKey]: { body: "" } });
  }

  async function quickVote(sectionKey, vote) {
    if (!user?.id) return;
    // Optimistic update
    setVotes((prev) => ({
      ...prev,
      [sectionKey]: { ...prev[sectionKey], [user.id]: { vote, author_id: user.id } },
    }));
    // Upsert: delete old vote then insert new
    await supabase.from("cockpit_comments")
      .delete()
      .eq("entity_type", "vision_vote")
      .eq("entity_key", sectionKey)
      .eq("author_id", user.id);
    await supabase.from("cockpit_comments").insert({
      entity_type: "vision_vote",
      entity_key: sectionKey,
      body: null,
      vote,
      author_id: user.id,
    });
    const section = SECTIONS.find((s) => s.key === sectionKey);
    await logActivity("voted", "vision", { title: section?.label });
  }

  async function updateComment(commentId, newBody) {
    if (!newBody.trim()) return;
    await supabase.from("cockpit_comments").update({ body: newBody.trim() }).eq("id", commentId);
    setEditingComment(null);
    setEditCommentValue("");
  }

  async function deleteComment(commentId) {
    await supabase.from("cockpit_comments").delete().eq("id", commentId);
  }

  // ---- KPIs ----
  const definedCount = SECTIONS.filter((s) => entries[s.key]).length;
  const lockedCount = SECTIONS.filter((s) => {
    const e = entries[s.key];
    if (!e) return false;
    return getVoteCounts(s.key).agree >= threshold;
  }).length;
  const totalComments = SECTIONS.reduce((acc, s) => {
    const e = entries[s.key];
    return acc + getComments(s.key, e?.id).length;
  }, 0);

  return (
    <PageLayout>
      <Topbar
        breadcrumb={["Focus", "Vision"]}
        actions={
          <>
            <Button variant="ghost" onClick={fetchAll}>Refresh</Button>
          </>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
        <PageTitle
          title="Vision"
          description="Define why this project exists and where it's going. Each statement needs team validation."
        />

        <KpiRow>
          <KpiCard label="Defined" value={`${definedCount}/4`} trend="sections" variant={definedCount === 4 ? "success" : "accent"} />
          <KpiCard label="Locked" value={`${lockedCount}/4`} trend="validated" variant={lockedCount === 4 ? "success" : "warn"} />
          <KpiCard label="Comments" value={String(totalComments)} trend="all sections" variant="default" />
          <KpiCard label="Vote threshold" value={`${threshold}`} trend="agrees to lock" variant="muted" />
        </KpiRow>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", fontSize: "13px", padding: "2rem 0" }}>Loading...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {SECTIONS.map((section) => {
              const entry = entries[section.key];
              const isEditing = editing === section.key;
              const entryId = entry?.id;
              const cmts = getComments(section.key, entryId);
              const voteCounts = getVoteCounts(section.key);
              const myVote = getUserVote(section.key);
              const locked = voteCounts.agree >= threshold;
              const authorMember = entry ? members.find((m) => m.builder === entry.builder) : null;

              return (
                <section
                  key={section.key}
                  style={{
                    borderRadius: "var(--radius-lg)",
                    border: `1px solid ${locked ? "var(--success)" : "var(--border)"}`,
                    background: locked ? "var(--success-bg)" : "var(--bg-2)",
                    padding: "1.25rem 1.5rem",
                  }}
                >
                  {/* Section label */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "0.75rem" }}>
                    <h3
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--text-3)",
                        textTransform: "uppercase",
                        letterSpacing: "0.6px",
                        margin: 0,
                      }}
                    >
                      {section.label}
                    </h3>
                    {locked && <Badge variant="success">Locked</Badge>}
                  </div>

                  {/* Content: edit mode or display */}
                  {isEditing ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <FormGroup>
                        <FormLabel>Statement</FormLabel>
                        <FormTextarea
                          rows={3}
                          autoFocus
                          placeholder={section.placeholder}
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                        />
                      </FormGroup>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <Button variant="primary" onClick={() => saveEntry(section.key)}>Save</Button>
                        <Button variant="ghost" onClick={() => { setEditing(null); setEditValue(""); }}>Cancel</Button>
                      </div>
                    </div>
                  ) : entry ? (
                    <>
                      <p
                        style={{
                          fontSize: "16px",
                          fontWeight: 600,
                          color: "var(--text)",
                          lineHeight: 1.55,
                          whiteSpace: "pre-wrap",
                          margin: 0,
                        }}
                      >
                        {entry.body}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                        {authorMember && (
                          <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
                            by {authorMember.name || authorMember.email}
                          </span>
                        )}
                        {["agree", "disagree", "neutral"].map((v) => {
                          const isMyVote = myVote === v;
                          return (
                            <button
                              key={v}
                              onClick={() => !locked && quickVote(section.key, v)}
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "3px 10px",
                                borderRadius: "var(--radius)",
                                border: isMyVote ? "2px solid var(--text)" : "2px solid transparent",
                                background: `var(--${VOTE_VARIANTS[v]}-bg, var(--bg-3))`,
                                color: `var(--${VOTE_VARIANTS[v]})`,
                                cursor: locked ? "default" : "pointer",
                                opacity: locked ? 0.6 : 1,
                                transition: "all 0.12s",
                              }}
                            >
                              {VOTE_LABELS[v]} {voteCounts[v]}
                            </button>
                          );
                        })}
                        {!locked && (
                          <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
                            {voteCounts.agree}/{threshold} to lock
                          </span>
                        )}
                        <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
                          {canEdit && !locked && (
                            <Button variant="ghost" onClick={() => { setEditing(section.key); setEditValue(entry.body || ""); }}>
                              Edit
                            </Button>
                          )}
                          {canEdit && !locked && (
                            <Button variant="danger" onClick={() => deleteEntry(entry, section.label)}>
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                      <p style={{ fontSize: "13px", color: "var(--text-3)", marginBottom: "12px" }}>
                        {section.placeholder}
                      </p>
                      {canEdit && (
                        <Button variant="secondary" onClick={() => { setEditing(section.key); setEditValue(""); }}>
                          Define {section.label}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Comments accordion — collapsed by default */}
                  <details
                    style={{
                      marginTop: "1rem",
                      borderTop: "1px solid var(--border)",
                      paddingTop: "0.5rem",
                    }}
                  >
                    <summary
                      style={{
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--text-3)",
                        padding: "6px 0",
                        listStyle: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        userSelect: "none",
                      }}
                    >
                      <span style={{
                        display: "inline-block",
                        width: 0, height: 0,
                        borderLeft: "5px solid var(--text-3)",
                        borderTop: "4px solid transparent",
                        borderBottom: "4px solid transparent",
                        transition: "transform 0.15s",
                      }}
                        className="accordion-arrow"
                      />
                      Comments ({cmts.length})
                    </summary>

                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", paddingTop: "8px" }}>
                      {cmts.length > 0 && (
                        <div style={{
                          display: "flex", flexDirection: "column", gap: "10px",
                          maxHeight: "280px", overflowY: "auto",
                          paddingRight: "4px",
                        }}>
                          {[...cmts].reverse().map((c) => {
                            const am = members.find((m) => m.user_id === c.author_id);
                            const isOwn = user && c.author_id === user.id;
                            const isEditingThis = editingComment === c.id;
                            return (
                              <div key={c.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {isEditingThis ? (
                                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                      <FormInput
                                        type="text"
                                        value={editCommentValue}
                                        onChange={(e) => setEditCommentValue(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && updateComment(c.id, editCommentValue)}
                                        autoFocus
                                        style={{ flex: 1 }}
                                      />
                                      <Button variant="primary" onClick={() => updateComment(c.id, editCommentValue)}>Save</Button>
                                      <Button variant="ghost" onClick={() => { setEditingComment(null); setEditCommentValue(""); }}>Cancel</Button>
                                    </div>
                                  ) : (
                                    <>
                                      {c.body && <p style={{ fontSize: "13px", color: "var(--text-2)", margin: 0 }}>{c.body}</p>}
                                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: c.body ? "3px" : 0 }}>
                                        <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
                                          {am?.name || "Unknown"} — {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" })} {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                        {isOwn && (
                                          <>
                                            {c.body && (
                                              <button
                                                onClick={() => { setEditingComment(c.id); setEditCommentValue(c.body); }}
                                                style={{ fontSize: "11px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                              >
                                                Edit
                                              </button>
                                            )}
                                            <button
                                              onClick={() => deleteComment(c.id)}
                                              style={{ fontSize: "11px", color: "var(--danger)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                                            >
                                              Delete
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!locked && (
                        <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", paddingTop: "4px" }}>
                          <FormGroup className="flex-1">
                            <FormLabel>Comment (Ctrl+Enter to send)</FormLabel>
                            <FormTextarea
                              rows={2}
                              placeholder="Add a comment..."
                              value={commentForm[section.key]?.body || ""}
                              onChange={(e) =>
                                setCommentForm({
                                  ...commentForm,
                                  [section.key]: { ...commentForm[section.key], body: e.target.value },
                                })
                              }
                              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addComment(section.key); }}
                            />
                          </FormGroup>
                          <Button variant="accent" onClick={() => addComment(section.key)}>
                            Send
                          </Button>
                        </div>
                      )}
                    </div>
                  </details>

                  {/* CSS for accordion arrow rotation */}
                  <style>{`
                    details[open] .accordion-arrow {
                      transform: rotate(90deg);
                    }
                  `}</style>
                </section>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
