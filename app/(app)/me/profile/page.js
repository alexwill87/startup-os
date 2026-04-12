"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
  FormGroup, FormLabel, FormInput, FormTextarea,
} from "@/app/components/ui";

export default function ProfilePage() {
  const { user, member } = useAuth();
  const [form, setForm] = useState({ name: "", bio: "", skills: "", languages: "", availability: "", telegram_chat_id: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!member?.id) return;
    fetchProfile();
  }, [member?.id]);

  async function fetchProfile() {
    const { data } = await supabase.from("cockpit_members").select("*").eq("id", member.id).single();
    if (data) {
      setForm({
        name: data.name || "",
        bio: data.bio || "",
        skills: data.skills || "",
        languages: data.languages || "",
        availability: data.availability || "",
        telegram_chat_id: data.telegram_chat_id || "",
      });
    }
    setLoading(false);
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from("cockpit_members").update({
      name: form.name, bio: form.bio, skills: form.skills,
      languages: form.languages, availability: form.availability,
      telegram_chat_id: form.telegram_chat_id,
    }).eq("id", member.id);
    setSaving(false);
    if (error) setMsg({ type: "error", text: error.message });
    else setMsg({ type: "success", text: "Profile saved." });
  }

  return (
    <PageLayout>
      <Topbar breadcrumb={["Me", "Profile"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="My Profile" description="Your personal information visible to the team." />

        <KpiRow>
          <KpiCard label="Role" value={member?.role || "—"} variant="accent" />
          <KpiCard label="Status" value={member?.status || "—"} variant={member?.status === "active" ? "success" : "warn"} />
          <KpiCard label="Email" value={user?.email?.split("@")[0] || "—"} variant="default" />
        </KpiRow>

        {loading ? <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p> : (
          <form onSubmit={saveProfile} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <section style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: "0 0 12px" }}>Identity</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <FormGroup><FormLabel>Name</FormLabel><FormInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormGroup>
                  <FormGroup><FormLabel>Email</FormLabel><FormInput value={user?.email || ""} disabled /></FormGroup>
                </div>
                <FormGroup><FormLabel>Bio</FormLabel><FormTextarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="A few words about yourself..." /></FormGroup>
              </div>
            </section>

            <section style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1.25rem 1.5rem" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: "0 0 12px" }}>Details</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <FormGroup><FormLabel>Skills</FormLabel><FormInput value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, Python, Marketing..." /></FormGroup>
                  <FormGroup><FormLabel>Languages</FormLabel><FormInput value={form.languages} onChange={(e) => setForm({ ...form, languages: e.target.value })} placeholder="English, French..." /></FormGroup>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <FormGroup><FormLabel>Availability</FormLabel><FormInput value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} placeholder="Full-time, evenings..." /></FormGroup>
                  <FormGroup><FormLabel>Telegram Chat ID</FormLabel><FormInput value={form.telegram_chat_id} onChange={(e) => setForm({ ...form, telegram_chat_id: e.target.value })} placeholder="123456789" /></FormGroup>
                </div>
              </div>
            </section>

            {msg && (
              <div style={{ padding: "10px 14px", borderRadius: "var(--radius)", fontSize: "12.5px",
                background: msg.type === "success" ? "var(--success-bg)" : "var(--danger-bg)",
                color: msg.type === "success" ? "var(--success-text)" : "var(--danger-text)",
                border: `1px solid ${msg.type === "success" ? "var(--success)" : "var(--danger)"}`,
              }}>{msg.text}</div>
            )}

            <Button variant="primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
          </form>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
