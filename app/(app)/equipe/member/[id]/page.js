"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import Link from "next/link";

const ROLE_COLORS = { admin: "#ef4444", cofounder: "#3b82f6", mentor: "#10b981", observer: "#64748b" };

export default function MemberProfilePage() {
  const { id } = useParams();
  const { member: me, isAdmin, isCofounder } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProfile(); }, [id]);

  async function fetchProfile() {
    try {
      const { data } = await supabase.from("cockpit_members").select("*").eq("id", id).single();
      setProfile(data);

      if (data?.name || data?.email) {
        const nameOrEmail = data.name || data.email;
        const { data: acts } = await supabase.from("cockpit_activity").select("*")
          .or(`actor_name.ilike.%${nameOrEmail}%,actor_email.eq.${data.email}`)
          .order("created_at", { ascending: false }).limit(20);
        setActivity(acts || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function sendLoginLink() {
    if (!profile?.email) return;
    const { error } = await supabase.auth.signInWithOtp({ email: profile.email });
    if (!error) alert(`Login link sent to ${profile.email}`);
    else alert(`Error: ${error.message}`);
  }

  if (loading) return <div className="p-6"><p className="text-sm text-[#475569] text-center py-12">Loading...</p></div>;
  if (!profile) return <div className="p-6"><p className="text-sm text-red-400 text-center py-12">Member not found</p></div>;

  const roleColor = ROLE_COLORS[profile.role] || "#64748b";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-extrabold text-white shrink-0"
            style={{ backgroundColor: profile.color || "#3b82f6" }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              (profile.name || profile.email || "?").charAt(0)
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold text-white">{profile.name || profile.email}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ color: roleColor, backgroundColor: roleColor + "15" }}>
                {profile.role}
              </span>
              {profile.builder && <span className="text-xs font-mono text-[#475569]">Builder {profile.builder}</span>}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${profile.status === "active" ? "bg-green-400/10 text-green-400" : "bg-amber-400/10 text-amber-400"}`}>
                {profile.status}
              </span>
            </div>
            <p className="text-xs text-[#475569] font-mono mt-1">{profile.email}</p>
          </div>
          {/* Admin actions */}
          {(isAdmin || isCofounder) && profile.id !== me?.id && (
            <button onClick={sendLoginLink} className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-blue-400 bg-blue-500/10 border border-blue-500/20 shrink-0">
              Send Login
            </button>
          )}
        </div>
        {profile.bio && <p className="text-sm text-[#94a3b8] mt-4 leading-relaxed">{profile.bio}</p>}
        {!profile.bio && <p className="text-sm text-[#334155] italic mt-4">No bio yet</p>}
      </Card>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Contact</h3>
          <div className="space-y-2">
            <InfoRow label="Phone" value={profile.phone} />
            <InfoRow label="LinkedIn" value={profile.linkedin} link />
            <InfoRow label="Telegram" value={profile.telegram_chat_id} />
          </div>
        </Card>

        <Card>
          <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Availability</h3>
          <div className="space-y-2">
            <InfoRow label="Timezone" value={profile.timezone} />
            <InfoRow label="Hours" value={profile.availability} />
            {(profile.languages || []).length > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#475569] w-20 shrink-0">Languages</span>
                <div className="flex gap-1 flex-wrap">{profile.languages.map((l, i) => <span key={i} className="px-2 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] text-[10px]">{l}</span>)}</div>
              </div>
            ) : <InfoRow label="Languages" value={null} />}
          </div>
        </Card>
      </div>

      {/* Skills */}
      <Card>
        <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Skills</h3>
        {(profile.skills || []).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s, i) => <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold" style={{ color: roleColor, backgroundColor: roleColor + "15" }}>{s}</span>)}
          </div>
        ) : <p className="text-xs text-[#334155] italic">No skills defined</p>}
      </Card>

      {/* URLs */}
      {(profile.urls || []).length > 0 && (
        <Card>
          <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Links</h3>
          <div className="space-y-2">
            {profile.urls.map((u, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-[#475569] w-20">{u.label}</span>
                <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate">{u.url}</a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Recent Activity</h3>
        {activity.length === 0 ? (
          <p className="text-xs text-[#334155] italic">No activity yet</p>
        ) : (
          <div className="space-y-2">
            {activity.slice(0, 15).map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs">
                <span className="text-[#475569] font-mono w-16 shrink-0">{new Date(a.created_at).toLocaleDateString("fr-FR")}</span>
                <span className="text-[#64748b]">{a.action}</span>
                <span className="text-[#94a3b8] font-mono">{a.entity_type}</span>
                <span className="text-white truncate flex-1">{a.entity_title || ""}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Link href="/equipe" className="inline-block text-xs text-[#475569] hover:text-white transition">Back to Team</Link>
    </div>
  );
}

function InfoRow({ label, value, link }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#475569] w-20 shrink-0">{label}</span>
      {!value ? <span className="text-xs text-[#334155] italic">Not defined</span>
        : link ? <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate">{value}</a>
        : <span className="text-xs text-[#e2e8f0] font-mono">{value}</span>}
    </div>
  );
}
