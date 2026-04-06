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
  const { user, member } = useAuth();
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newUrl, setNewUrl] = useState({ label: "", url: "" });
  const [newSkill, setNewSkill] = useState("");
  const [newLang, setNewLang] = useState("");

  useEffect(() => {
    if (member?.id) {
      fetchProfile();
    }
  }, [member]);

  async function fetchProfile() {
    const { data } = await supabase
      .from("cockpit_members")
      .select("*")
      .eq("id", member.id)
      .single();
    if (data) setProfile(data);
  }

  async function saveField(field, value) {
    setSaving(true);
    setSaved(false);
    await supabase
      .from("cockpit_members")
      .update({ [field]: value })
      .eq("id", member.id);
    setProfile((p) => ({ ...p, [field]: value }));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addUrl() {
    if (!newUrl.label || !newUrl.url) return;
    const urls = [...(profile.urls || []), newUrl];
    await saveField("urls", urls);
    setNewUrl({ label: "", url: "" });
  }

  async function removeUrl(index) {
    const urls = (profile.urls || []).filter((_, i) => i !== index);
    await saveField("urls", urls);
  }

  async function addSkill() {
    if (!newSkill.trim()) return;
    const skills = [...(profile.skills || []), newSkill.trim()];
    await saveField("skills", skills);
    setNewSkill("");
  }

  async function removeSkill(index) {
    const skills = (profile.skills || []).filter((_, i) => i !== index);
    await saveField("skills", skills);
  }

  async function addLanguage() {
    if (!newLang) return;
    const languages = [...(profile.languages || []), newLang];
    await saveField("languages", languages);
    setNewLang("");
  }

  async function removeLanguage(index) {
    const languages = (profile.languages || []).filter((_, i) => i !== index);
    await saveField("languages", languages);
  }

  if (!profile) {
    return <div className="text-[#475569] text-sm font-mono p-8">Loading profile...</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="My Profile" subtitle="Edit your information — visible to your team" color={COLOR}>
        {saved && <span className="text-emerald-400 text-xs font-mono">Saved</span>}
        {saving && <span className="text-[#475569] text-xs font-mono">Saving...</span>}
      </PageHeader>

      {/* Identity */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">Identity</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" value={profile.name || ""} onChange={(v) => saveField("name", v)} />
          <Field label="Email" value={profile.email} readonly />
          <Field label="Role" value={profile.role} readonly />
          <Field label="Builder" value={profile.builder || ""} readonly />
          <Field label="Bio" value={profile.bio || ""} onChange={(v) => saveField("bio", v)} multiline />
        </div>
      </Card>

      {/* Contact */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Phone" value={profile.phone || ""} onChange={(v) => saveField("phone", v)} placeholder="+33 6 12 34 56 78" />
          <Field label="LinkedIn" value={profile.linkedin || ""} onChange={(v) => saveField("linkedin", v)} placeholder="https://linkedin.com/in/..." />
          <Field label="Telegram Chat ID" value={profile.telegram_chat_id || ""} onChange={(v) => saveField("telegram_chat_id", v)} placeholder="Your Telegram chat ID (from @RadarPMBot /start)" />
        </div>
      </Card>

      {/* URLs */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">Links & URLs</h3>
        {(profile.urls || []).length > 0 && (
          <div className="space-y-2 mb-4">
            {(profile.urls || []).map((u, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-[#0a0f1a] border border-[#1e293b]">
                <span className="text-xs font-bold text-[#94a3b8] min-w-[80px]">{u.label}</span>
                <a href={u.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline truncate flex-1">
                  {u.url}
                </a>
                <button onClick={() => removeUrl(i)} className="text-[10px] text-red-400 hover:text-red-300">remove</button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Label (e.g. GitHub, Portfolio)"
            value={newUrl.label}
            onChange={(e) => setNewUrl({ ...newUrl, label: e.target.value })}
            className="flex-1 py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs font-mono outline-none focus:border-[#3b82f6]"
          />
          <input
            type="url"
            placeholder="https://..."
            value={newUrl.url}
            onChange={(e) => setNewUrl({ ...newUrl, url: e.target.value })}
            className="flex-1 py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs font-mono outline-none focus:border-[#3b82f6]"
          />
          <button onClick={addUrl} className="px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-mono hover:bg-blue-500/20 transition-colors">
            Add
          </button>
        </div>
      </Card>

      {/* Skills */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">Skills</h3>
        {(profile.skills || []).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {(profile.skills || []).map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1e293b] text-xs text-[#94a3b8]">
                {s}
                <button onClick={() => removeSkill(i)} className="text-[#475569] hover:text-red-400">&times;</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add a skill (e.g. React, Python, Design)"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSkill()}
            className="flex-1 py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs font-mono outline-none focus:border-[#3b82f6]"
          />
          <button onClick={addSkill} className="px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-mono hover:bg-blue-500/20 transition-colors">
            Add
          </button>
        </div>
      </Card>

      {/* Availability */}
      <Card>
        <h3 className="text-sm font-bold text-white mb-4">Availability & Preferences</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Timezone</label>
            <select
              value={profile.timezone || ""}
              onChange={(e) => saveField("timezone", e.target.value)}
              className="w-full py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs font-mono outline-none focus:border-[#3b82f6]"
            >
              <option value="">Select timezone</option>
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <Field label="Working hours" value={profile.availability || ""} onChange={(v) => saveField("availability", v)} placeholder="e.g. Mon-Fri 9h-18h, Sundays for hackathon" />
        </div>

        {/* Languages */}
        <div className="mt-4">
          <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Languages</label>
          {(profile.languages || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {(profile.languages || []).map((l, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1e293b] text-xs text-[#94a3b8]">
                  {l}
                  <button onClick={() => removeLanguage(i)} className="text-[#475569] hover:text-red-400">&times;</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <select
              value={newLang}
              onChange={(e) => setNewLang(e.target.value)}
              className="flex-1 py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs font-mono outline-none"
            >
              <option value="">Select language</option>
              {LANGUAGE_OPTIONS.filter((l) => !(profile.languages || []).includes(l)).map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <button onClick={addLanguage} className="px-3 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-mono hover:bg-blue-500/20 transition-colors">
              Add
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Reusable inline-editable field
function Field({ label, value, onChange, readonly, multiline, placeholder }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  function save() {
    if (onChange && draft !== value) onChange(draft);
    setEditing(false);
  }

  const inputClass = "w-full py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs font-mono outline-none focus:border-[#3b82f6]";

  return (
    <div>
      <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">{label}</label>
      {readonly ? (
        <div className="py-2.5 px-3 rounded-lg bg-[#0a0f1a] border border-[#1e293b] text-xs text-[#64748b] font-mono">
          {value || "—"}
        </div>
      ) : editing ? (
        <div className="flex gap-2">
          {multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              autoFocus
              onBlur={save}
              className={inputClass + " flex-1"}
              placeholder={placeholder}
            />
          ) : (
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => e.key === "Enter" && save()}
              autoFocus
              className={inputClass + " flex-1"}
              placeholder={placeholder}
            />
          )}
        </div>
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="py-2.5 px-3 rounded-lg bg-[#0a0f1a] border border-[#1e293b] text-xs font-mono cursor-pointer hover:border-[#334155] transition-colors min-h-[38px]"
          style={{ color: value ? "#e2e8f0" : "#475569" }}
        >
          {value || placeholder || "Click to edit..."}
        </div>
      )}
    </div>
  );
}
