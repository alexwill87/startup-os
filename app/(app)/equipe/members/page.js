"use client";

import { useState, useEffect } from "react";
import { supabase, SPRINTS } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#8b5cf6";

export default function MembersPage() {
  const { user, isAdmin } = useAuth();
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", name: "", role: "member", builder: "", color: "#3b82f6" });
  const [inviteStatus, setInviteStatus] = useState(null);

  useEffect(() => {
    fetchAll();
    const sub = supabase
      .channel("members_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_members" }, fetchAll)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchAll() {
    const [{ data: m }, { data: t }] = await Promise.all([
      supabase.from("cockpit_members").select("*").order("created_at", { ascending: true }),
      supabase.from("cockpit_tasks").select("id, builder, status, sprint"),
    ]);
    setMembers(m || []);
    setTasks(t || []);
  }

  async function inviteMember(e) {
    e.preventDefault();
    setInviteStatus(null);

    // Check if email already exists
    const exists = members.find((m) => m.email === inviteForm.email);
    if (exists) {
      setInviteStatus({ type: "error", msg: "This email is already a member." });
      return;
    }

    // Add to members table
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

    // Send Supabase magic link invite
    const { error: inviteError } = await supabase.auth.signInWithOtp({
      email: inviteForm.email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    if (inviteError) {
      setInviteStatus({ type: "warning", msg: `Member added but invite email failed: ${inviteError.message}. They can still sign in manually.` });
    } else {
      setInviteStatus({ type: "success", msg: `Invitation sent to ${inviteForm.email}!` });
    }

    setInviteForm({ email: "", name: "", role: "member", builder: "", color: "#3b82f6" });
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
    if (error) {
      alert(`Failed: ${error.message}`);
    } else {
      alert(`Login link sent to ${email}`);
    }
  }

  async function reactivateMember(id) {
    await supabase.from("cockpit_members").update({ status: "active" }).eq("id", id);
  }

  // Sprint stats
  const todayStr = new Date().toISOString().split("T")[0];
  const currentSprint = [...SPRINTS].reverse().find((s) => s.date <= todayStr) || SPRINTS[0];

  const activeMembers = members.filter((m) => m.status !== "revoked");
  const revokedMembers = members.filter((m) => m.status === "revoked");

  return (
    <div className="space-y-8">
      <PageHeader title="Team Members" subtitle={`${activeMembers.length} members`} color={COLOR}>
        {isAdmin && (
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono hover:opacity-90 transition-opacity"
          >
            + Invite Member
          </button>
        )}
      </PageHeader>

      {/* Invite form */}
      {showInvite && isAdmin && (
        <Card>
          <h3 className="text-sm font-bold text-white mb-4">Invite a new team member</h3>
          <form onSubmit={inviteMember} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="email"
                placeholder="email@example.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                required
                className="py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm font-mono outline-none focus:border-[#3b82f6]"
              />
              <input
                type="text"
                placeholder="Name (optional)"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                className="py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm font-mono outline-none focus:border-[#3b82f6]"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm font-mono outline-none"
              >
                <option value="cofounder">Co-founder</option>
                <option value="mentor">Mentor</option>
                <option value="contributor">Contributor</option>
                <option value="ambassador">Ambassador</option>
                <option value="prospect">Prospect</option>
                <option value="fan">Fan</option>
              </select>
              <input
                type="text"
                placeholder="Builder letter (A, B...)"
                value={inviteForm.builder}
                onChange={(e) => setInviteForm({ ...inviteForm, builder: e.target.value.toUpperCase().slice(0, 1) })}
                className="py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm font-mono outline-none"
              />
              <input
                type="color"
                value={inviteForm.color}
                onChange={(e) => setInviteForm({ ...inviteForm, color: e.target.value })}
                className="h-[42px] w-full rounded-lg border border-[#1e293b] bg-[#0a0f1a] cursor-pointer"
              />
            </div>
            <div className="flex gap-3 items-center">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono"
              >
                Send Invitation
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="px-4 py-2 rounded-lg border border-[#1e293b] text-[#64748b] text-sm font-mono hover:text-white"
              >
                Cancel
              </button>
            </div>
            {inviteStatus && (
              <div
                className={`rounded-lg py-2 px-3 text-xs font-mono ${
                  inviteStatus.type === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : inviteStatus.type === "warning"
                    ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {inviteStatus.msg}
              </div>
            )}
          </form>
        </Card>
      )}

      {/* Active members */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeMembers.map((m) => {
          const sprintTasks = tasks.filter((t) => t.builder === m.builder && t.sprint === currentSprint.id);
          const done = sprintTasks.filter((t) => t.status === "done").length;
          const total = sprintTasks.length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <Card key={m.id} className="relative">
              {/* Status dot */}
              <div className="absolute top-4 right-4">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    m.status === "active" ? "bg-emerald-400" : "bg-yellow-400"
                  }`}
                  title={m.status}
                />
              </div>

              {/* Avatar + Info */}
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: m.color + "22", color: m.color }}
                >
                  {m.name?.[0] || m.email[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white">{m.name || m.email.split("@")[0]}</h3>
                  <p className="text-[11px] text-[#475569] font-mono truncate">{m.email}</p>
                  <div className="flex gap-2 mt-1.5">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      m.role === "admin" ? "bg-purple-500/10 text-purple-400" :
                      m.role === "viewer" ? "bg-slate-500/10 text-slate-400" :
                      "bg-blue-500/10 text-blue-400"
                    }`}>
                      {m.role}
                    </span>
                    {m.builder && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                        style={{ background: m.color + "15", color: m.color }}>
                        Builder {m.builder}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Sprint stats */}
              {m.builder && total > 0 && (
                <div className="mb-3">
                  <div className="flex justify-between text-[11px] text-[#64748b] font-mono mb-1">
                    <span>{currentSprint.name.split(" — ")[0]}</span>
                    <span>{done}/{total} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: m.color }}
                    />
                  </div>
                </div>
              )}

              {/* Last seen */}
              <div className="text-[10px] text-[#475569] font-mono">
                {m.last_seen_at
                  ? `Last seen ${new Date(m.last_seen_at).toLocaleDateString("fr-FR")}`
                  : m.status === "invited" ? "Invitation pending" : "Never connected"}
              </div>

              {/* Admin actions */}
              {isAdmin && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[#1e293b]">
                  {/* Send login link to anyone */}
                  <button
                    onClick={() => resendInvite(m.email)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-mono transition-colors"
                  >
                    Send login link
                  </button>
                  {m.email !== user?.email && (
                    <>
                      <select
                        value={m.role}
                        onChange={(e) => updateRole(m.id, e.target.value)}
                        className="py-1 px-2 rounded border border-[#1e293b] bg-[#0a0f1a] text-[#94a3b8] text-[10px] font-mono outline-none"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => revokeMember(m.id)}
                        className="text-[10px] text-red-400 hover:text-red-300 font-mono"
                      >
                        Revoke
                      </button>
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Revoked members */}
      {revokedMembers.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-[#64748b] mb-3 uppercase tracking-widest">Revoked</h3>
          <div className="space-y-2">
            {revokedMembers.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 px-4 rounded-lg bg-[#0d1117] border border-[#1e293b]">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#475569]">{m.name || m.email}</span>
                  <span className="text-[10px] text-red-400/50 font-mono">revoked</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => reactivateMember(m.id)}
                    className="text-[10px] text-[#3b82f6] hover:text-[#93c5fd] font-mono"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
