"use client";

/**
 * V1 Members page — Cockpit Design System v3.0
 *
 * Behavior preserved from V2 (app/(app)/equipe/members/page.js):
 *  - List active and revoked members
 *  - Invite new member (admin only) — magic link via Supabase auth
 *  - Update role / revoke / reactivate / resend login link (admin only)
 *  - Sprint stats per member with progress bar
 *  - Realtime sync with debounced UPDATE
 *  - Activity log on invite / revoke
 *
 * Builder color is preserved as a personal accent in the avatar only,
 * everything else uses the neutral grey palette.
 */

import { useState, useEffect } from "react";
import { supabase, SPRINTS } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/AuthProvider";
import Link from "next/link";
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
} from "@/app/components/ui";

const ROLE_OPTIONS = [
  { id: "admin", label: "Admin" },
  { id: "cofounder", label: "Co-founder" },
  { id: "mentor", label: "Mentor" },
  { id: "observer", label: "Observer" },
  { id: "contributor", label: "Contributor" },
  { id: "ambassador", label: "Ambassador" },
  { id: "prospect", label: "Prospect" },
  { id: "fan", label: "Fan" },
];

function roleVariant(role) {
  if (role === "admin") return "danger";
  if (role === "cofounder") return "info";
  if (role === "mentor") return "success";
  if (role === "observer") return "neutral";
  return "neutral";
}

export default function V1MembersPage() {
  const { user, isAdmin } = useAuth();
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    name: "",
    role: "cofounder",
    builder: "",
    color: "#3b82f6",
  });
  const [inviteStatus, setInviteStatus] = useState(null);

  useEffect(() => {
    fetchAll();
    let debounceTimer = null;
    const debouncedFetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchAll, 1000);
    };
    const sub = supabase
      .channel("v1_members_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cockpit_members" }, fetchAll)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "cockpit_members" }, fetchAll)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cockpit_members" }, debouncedFetch)
      .subscribe();
    return () => {
      supabase.removeChannel(sub);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  async function fetchAll() {
    const [{ data: m }, { data: t }] = await Promise.all([
      supabase.from("cockpit_members").select("*").order("created_at", { ascending: true }),
      supabase.from("cockpit_tasks").select("id, builder, status, sprint"),
    ]);
    setMembers(m || []);
    setTasks(t || []);
    setLoading(false);
  }

  async function inviteMember(e) {
    e.preventDefault();
    setInviteStatus(null);

    const exists = members.find((m) => m.email === inviteForm.email);
    if (exists) {
      setInviteStatus({ type: "error", msg: "This email is already a member." });
      return;
    }

    const { error } = await supabase.from("cockpit_members").insert({
      email: inviteForm.email,
      name: inviteForm.name || inviteForm.email.split("@")[0],
      role: inviteForm.role,
      builder: inviteForm.builder || null,
      color: inviteForm.color,
      status: "invited",
      invited_by: user?.id,
    });

    if (error) {
      setInviteStatus({ type: "error", msg: error.message });
      return;
    }

    logActivity("invited", "member", { title: inviteForm.email });

    const { error: inviteError } = await supabase.auth.signInWithOtp({
      email: inviteForm.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    if (inviteError) {
      setInviteStatus({
        type: "warning",
        msg: `Member added but invite email failed: ${inviteError.message}. They can still sign in manually.`,
      });
    } else {
      setInviteStatus({ type: "success", msg: `Invitation sent to ${inviteForm.email}!` });
    }

    setInviteForm({ email: "", name: "", role: "cofounder", builder: "", color: "#3b82f6" });
  }

  async function updateRole(id, newRole) {
    await supabase.from("cockpit_members").update({ role: newRole }).eq("id", id);
  }

  async function revokeMember(id) {
    await supabase.from("cockpit_members").update({ status: "revoked" }).eq("id", id);
    logActivity("updated", "member", { title: "revoked" });
  }

  async function resendInvite(email) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) alert(`Failed: ${error.message}`);
    else alert(`Login link sent to ${email}`);
  }

  async function reactivateMember(id) {
    await supabase.from("cockpit_members").update({ status: "active" }).eq("id", id);
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const currentSprint = [...SPRINTS].reverse().find((s) => s.date <= todayStr) || SPRINTS[0];

  const activeMembers = members.filter((m) => m.status !== "revoked");
  const revokedMembers = members.filter((m) => m.status === "revoked");
  const adminCount = activeMembers.filter((m) => m.role === "admin").length;
  const cofounderCount = activeMembers.filter((m) => m.role === "cofounder").length;
  const invitedCount = activeMembers.filter((m) => m.status === "invited").length;

  return (
    <PageLayout>
      <Topbar
        breadcrumb={["Team", "Members"]}
        actions={
          <>
            <Button variant="ghost" onClick={fetchAll}>Refresh</Button>
            {isAdmin && (
              <Button variant="primary" onClick={() => setShowInvite(!showInvite)}>
                {showInvite ? "Close form" : "Invite Member"}
              </Button>
            )}
          </>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle
          title="Members"
          description="Team members, roles, and sprint contribution. Admins can invite, revoke, reactivate."
        />

        <KpiRow>
          <KpiCard label="Active" value={String(activeMembers.length)} trend="members" variant="success" />
          <KpiCard label="Admins" value={String(adminCount)} trend="full control" variant="accent" />
          <KpiCard label="Co-founders" value={String(cofounderCount)} trend="core team" variant="default" />
          <KpiCard label="Invited" value={String(invitedCount)} trend="not yet active" variant="warn" />
        </KpiRow>

        {/* Invite form */}
        {showInvite && isAdmin && (
          <section
            style={{
              padding: "1.25rem 1.5rem",
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              marginBottom: "1rem",
            }}
          >
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>
              Invite a new team member
            </h3>
            <form onSubmit={inviteMember} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <FormGroup>
                  <FormLabel>Email *</FormLabel>
                  <FormInput
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="email@example.com"
                    required
                  />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Name (optional)</FormLabel>
                  <FormInput
                    type="text"
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    placeholder="Full name"
                  />
                </FormGroup>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <FormGroup>
                  <FormLabel>Role</FormLabel>
                  <FormSelect
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  >
                    {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </FormSelect>
                </FormGroup>
                <FormGroup>
                  <FormLabel>Builder letter</FormLabel>
                  <FormInput
                    type="text"
                    value={inviteForm.builder}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, builder: e.target.value.toUpperCase().slice(0, 1) })
                    }
                    placeholder="A, B, C..."
                  />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Avatar color</FormLabel>
                  <input
                    type="color"
                    value={inviteForm.color}
                    onChange={(e) => setInviteForm({ ...inviteForm, color: e.target.value })}
                    style={{
                      height: "38px",
                      width: "100%",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border-strong)",
                      background: "var(--bg-2)",
                      cursor: "pointer",
                    }}
                  />
                </FormGroup>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <Button variant="primary" type="submit">Send Invitation</Button>
                <Button variant="ghost" type="button" onClick={() => setShowInvite(false)}>Cancel</Button>
              </div>
              {inviteStatus && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "var(--radius)",
                    fontSize: "12.5px",
                    background:
                      inviteStatus.type === "success"
                        ? "var(--success-bg)"
                        : inviteStatus.type === "warning"
                        ? "var(--warn-bg)"
                        : "var(--danger-bg)",
                    color:
                      inviteStatus.type === "success"
                        ? "var(--success-text)"
                        : inviteStatus.type === "warning"
                        ? "var(--warn-text)"
                        : "var(--danger-text)",
                    border: `1px solid ${
                      inviteStatus.type === "success"
                        ? "var(--success)"
                        : inviteStatus.type === "warning"
                        ? "var(--warn)"
                        : "var(--danger)"
                    }`,
                  }}
                >
                  {inviteStatus.msg}
                </div>
              )}
            </form>
          </section>
        )}

        {/* Active members grid */}
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>
        ) : activeMembers.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No active members.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "12px" }}>
            {activeMembers.map((m) => {
              const sprintTasks = tasks.filter((t) => t.builder === m.builder && t.sprint === currentSprint?.id);
              const done = sprintTasks.filter((t) => t.status === "done").length;
              const total = sprintTasks.length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <article
                  key={m.id}
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "1rem 1.25rem",
                    position: "relative",
                  }}
                >
                  {/* Status indicator */}
                  <div style={{ position: "absolute", top: "12px", right: "12px" }}>
                    <Badge variant={m.status === "active" ? "success" : "warn"}>
                      {m.status === "active" ? "Active" : m.status === "invited" ? "Invited" : m.status}
                    </Badge>
                  </div>

                  {/* Avatar + info */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        fontWeight: 700,
                        flexShrink: 0,
                        background: (m.color || "#737373") + "22",
                        color: m.color || "var(--text-2)",
                        border: `1px solid ${m.color || "var(--border-strong)"}`,
                      }}
                    >
                      {(m.name?.[0] || m.email[0]).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1, paddingRight: "60px" }}>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: 0 }}>
                        {m.name || m.email.split("@")[0]}
                      </h3>
                      <p style={{ fontSize: "11px", color: "var(--text-3)", margin: "2px 0 6px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {m.email}
                      </p>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <Badge variant={roleVariant(m.role)}>{m.role}</Badge>
                        {m.builder && <Badge variant="neutral">Builder {m.builder}</Badge>}
                      </div>
                    </div>
                  </div>

                  {/* Sprint stats */}
                  {m.builder && total > 0 && currentSprint && (
                    <div style={{ marginBottom: "12px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: "var(--text-3)",
                          marginBottom: "4px",
                        }}
                      >
                        <span>{currentSprint.name?.split(" — ")[0] || "Current sprint"}</span>
                        <span>
                          {done}/{total} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: "4px", background: "var(--bg-3)", borderRadius: "2px", overflow: "hidden" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            background: m.color || "var(--accent)",
                            transition: "width 0.3s",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Last seen + profile link */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                    <span style={{ color: "var(--text-3)" }}>
                      {m.last_seen_at
                        ? `Last seen ${new Date(m.last_seen_at).toLocaleDateString()}`
                        : m.status === "invited"
                        ? "Invitation pending"
                        : "Never connected"}
                    </span>
                    <Link
                      href={`/team/members`}
                      style={{ color: "var(--accent-text)", textDecoration: "none" }}
                    >
                      View profile →
                    </Link>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        flexWrap: "wrap",
                        marginTop: "12px",
                        paddingTop: "12px",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <Button variant="ghost" onClick={() => resendInvite(m.email)}>
                        Send login link
                      </Button>
                      {m.email !== user?.email && (
                        <>
                          <FormSelect value={m.role} onChange={(e) => updateRole(m.id, e.target.value)}>
                            {ROLE_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                          </FormSelect>
                          <Button variant="danger" onClick={() => revokeMember(m.id)}>
                            Revoke
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* Revoked members */}
        {revokedMembers.length > 0 && (
          <div style={{ marginTop: "2rem" }}>
            <h3
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--text-3)",
                textTransform: "uppercase",
                letterSpacing: "0.6px",
                marginBottom: "12px",
              }}
            >
              Revoked
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {revokedMembers.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", color: "var(--text-3)" }}>{m.name || m.email}</span>
                    <Badge variant="danger">Revoked</Badge>
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" onClick={() => reactivateMember(m.id)}>
                      Reactivate
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
