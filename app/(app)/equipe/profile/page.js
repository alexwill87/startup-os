"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#8b5cf6";
const LANGUAGE_OPTIONS = ["English", "French", "Spanish", "German", "Arabic", "Portuguese", "Chinese", "Japanese", "Korean", "Russian", "Italian", "Dutch", "Hindi"];
const TIMEZONE_OPTIONS = ["UTC", "Europe/Paris", "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "Asia/Tokyo", "Asia/Shanghai", "Africa/Lagos", "Africa/Casablanca"];

export default function ProfilePage() {
  const { member } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member?.id) fetchProfile();
  }, [member]);

  async function fetchProfile() {
    const { data } = await supabase.from("cockpit_members").select("*").eq("id", member.id).single();
    if (data) { setProfile(data); setDraft(data); }
  }

  async function save() {
    setSaving(true);
    await supabase.from("cockpit_members").update({
      name: draft.name, bio: draft.bio, phone: draft.phone, linkedin: draft.linkedin,
      telegram_chat_id: draft.telegram_chat_id, skills: draft.skills, languages: draft.languages,
      timezone: draft.timezone, availability: draft.availability, urls: draft.urls,
    }).eq("id", member.id);
    setProfile(draft);
    setEditing(false);
    setSaving(false);
  }

  function cancel() { setDraft(profile); setEditing(false); }
  function updateDraft(field, value) { setDraft((d) => ({ ...d, [field]: value })); }

  if (!profile) return <div className="text-[#475569] text-sm font-mono p-8">Loading profile...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <PageHeader title="My Profile" subtitle="Your information — visible to the team" color={COLOR}>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-purple-500 hover:bg-purple-600 transition">
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-green-500 hover:bg-green-600 transition">
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={cancel} className="px-4 py-2 text-xs rounded-lg text-[#64748b] bg-[#1e293b]">Cancel</button>
          </div>
        )}
      </PageHeader>

      {/* === READ MODE === */}
      {!editing ? (
        <div className="space-y-6">
          {/* Header card */}
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-extrabold text-white" style={{ backgroundColor: profile.color || "#3b82f6" }}>
                {(profile.name || profile.email || "?").charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white">{profile.name || profile.email}</h2>
                <p className="text-sm text-[#64748b]">{profile.role}{profile.builder ? ` — Builder ${profile.builder}` : ""}</p>
                <p className="text-xs text-[#475569] font-mono">{profile.email}</p>
              </div>
            </div>
            <p className="text-sm mt-4 leading-relaxed" style={{ color: profile.bio ? "#94a3b8" : "#475569" }}>
              {profile.bio || <span className="italic">Bio not defined</span>}
            </p>
          </Card>

          {/* Contact */}
          <Card>
            <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Contact</h3>
            <div className="space-y-2">
              <InfoRow label="Phone" value={profile.phone} />
              <InfoRow label="LinkedIn" value={profile.linkedin} link />
              <InfoRow label="Telegram ID" value={profile.telegram_chat_id} />
            </div>
          </Card>

          {/* Skills */}
          <Card>
            <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Skills</h3>
            {(profile.skills || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold">{s}</span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#475569] italic">Not defined</p>
            )}
          </Card>

          {/* Availability */}
          <Card>
            <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Availability</h3>
            <div className="space-y-2">
              <InfoRow label="Timezone" value={profile.timezone} />
              <InfoRow label="Hours" value={profile.availability} />
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#475569] w-20 shrink-0">Languages</span>
                {(profile.languages || []).length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {profile.languages.map((l, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-[#1e293b] text-[#94a3b8] text-xs">{l}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-[#475569] italic">Not defined</span>
                )}
              </div>
            </div>
          </Card>

          {/* URLs */}
          <Card>
            <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">Links</h3>
            {(profile.urls || []).length > 0 ? (
              <div className="space-y-2">
                {profile.urls.map((u, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-[#475569] w-20 shrink-0">{u.label}</span>
                    <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate">{u.url}</a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#475569] italic">Not defined</p>
            )}
          </Card>
        </div>
      ) : (
        /* === EDIT MODE === */
        <div className="space-y-6">
          <Card>
            <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-4">Identity</h3>
            <div className="space-y-3">
              <EditField label="Name" value={draft.name || ""} onChange={(v) => updateDraft("name", v)} />
              <EditField label="Bio" value={draft.bio || ""} onChange={(v) => updateDraft("bio", v)} multiline placeholder="A short bio about yourself..." />
            </div>
          </Card>

          <Card>
            <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-4">Contact</h3>
            <div className="space-y-3">
              <EditField label="Phone" value={draft.phone || ""} onChange={(v) => updateDraft("phone", v)} placeholder="+33 6 12 34 56 78" />
              <EditField label="LinkedIn" value={draft.linkedin || ""} onChange={(v) => updateDraft("linkedin", v)} placeholder="https://linkedin.com/in/..." />
              <EditField label="Telegram Chat ID" value={draft.telegram_chat_id || ""} onChange={(v) => updateDraft("telegram_chat_id", v)} placeholder="From @RadarPMBot /start" />
            </div>
          </Card>

          <Card>
            <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-4">Skills</h3>
            <TagEditor tags={draft.skills || []} onChange={(v) => updateDraft("skills", v)} placeholder="Add skill..." />
          </Card>

          <Card>
            <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-4">Availability</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-[#475569] font-mono mb-1">Timezone</label>
                <select value={draft.timezone || ""} onChange={(e) => updateDraft("timezone", e.target.value)} className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none">
                  <option value="">Select</option>
                  {TIMEZONE_OPTIONS.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <EditField label="Working hours" value={draft.availability || ""} onChange={(v) => updateDraft("availability", v)} placeholder="e.g. Mon-Fri 9h-18h" />
              <div>
                <label className="block text-[11px] text-[#475569] font-mono mb-1">Languages</label>
                <TagEditor tags={draft.languages || []} onChange={(v) => updateDraft("languages", v)} options={LANGUAGE_OPTIONS} />
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="text-xs font-bold text-[#64748b] uppercase tracking-wider mb-4">Links</h3>
            <UrlEditor urls={draft.urls || []} onChange={(v) => updateDraft("urls", v)} />
          </Card>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, link }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#475569] w-20 shrink-0">{label}</span>
      {!value ? (
        <span className="text-xs text-[#475569] italic">Not defined</span>
      ) : link ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate">{value}</a>
      ) : (
        <span className="text-xs text-[#e2e8f0] font-mono">{value}</span>
      )}
    </div>
  );
}

function EditField({ label, value, onChange, multiline, placeholder }) {
  const cls = "w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none focus:border-purple-500";
  return (
    <div>
      <label className="block text-[11px] text-[#475569] font-mono mb-1">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={cls + " resize-none"} placeholder={placeholder} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={cls} placeholder={placeholder} />
      )}
    </div>
  );
}

function TagEditor({ tags, onChange, placeholder, options }) {
  const [input, setInput] = useState("");

  function add(val) {
    const v = val || input.trim();
    if (!v || tags.includes(v)) return;
    onChange([...tags, v]);
    setInput("");
  }

  function remove(i) { onChange(tags.filter((_, idx) => idx !== i)); }

  return (
    <div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((t, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1e293b] text-xs text-[#94a3b8]">
              {t}
              <button onClick={() => remove(i)} className="text-[#475569] hover:text-red-400">&times;</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        {options ? (
          <select value="" onChange={(e) => { if (e.target.value) add(e.target.value); }} className="flex-1 py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none">
            <option value="">Select...</option>
            {options.filter((o) => !tags.includes(o)).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} className="flex-1 py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none" placeholder={placeholder} />
        )}
      </div>
    </div>
  );
}

function UrlEditor({ urls, onChange }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  function add() {
    if (!label || !url) return;
    onChange([...urls, { label, url }]);
    setLabel(""); setUrl("");
  }

  function remove(i) { onChange(urls.filter((_, idx) => idx !== i)); }

  return (
    <div>
      {urls.length > 0 && (
        <div className="space-y-2 mb-3">
          {urls.map((u, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#0a0f1a] border border-[#1e293b]">
              <span className="text-xs font-bold text-[#94a3b8] w-20">{u.label}</span>
              <span className="text-xs text-blue-400 truncate flex-1">{u.url}</span>
              <button onClick={() => remove(i)} className="text-[10px] text-red-400/50 hover:text-red-400">&times;</button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input type="text" placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} className="w-28 py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none" />
        <input type="url" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1 py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none" onKeyDown={(e) => e.key === "Enter" && add()} />
        <button onClick={add} className="px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs hover:bg-blue-500/20">Add</button>
      </div>
    </div>
  );
}
