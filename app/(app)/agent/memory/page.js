"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
  FormGroup, FormLabel, FormInput, FormTextarea, FormSelect,
} from "@/app/components/ui";

export default function AgentMemoryPage() {
  const { user } = useAuth();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ content: "", scope: "user", importance: "5" });

  useEffect(() => {
    fetchMemories();
    const sub = supabase.channel("agent_memory_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_agent_memory" }, fetchMemories)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchMemories() {
    const { data } = await supabase.from("cockpit_agent_memory").select("*").order("updated_at", { ascending: false }).limit(200);
    setMemories(data || []);
    setLoading(false);
  }

  async function addMemory(e) {
    e.preventDefault();
    if (!form.content.trim()) return;
    await supabase.from("cockpit_agent_memory").insert({
      scope: form.scope, scope_key: form.scope === "user" ? user?.email : null,
      content: form.content, source: "manual", importance: parseInt(form.importance) || 5,
    });
    setForm({ content: "", scope: "user", importance: "5" });
    setShowAdd(false);
  }

  async function deleteMemory(id) {
    if (!confirm("Forget this memory?")) return;
    await supabase.from("cockpit_agent_memory").delete().eq("id", id);
  }

  const filtered = memories.filter((m) => {
    if (scope === "user" && (m.scope !== "user" || m.scope_key !== user?.email)) return false;
    if (scope === "project" && m.scope !== "project") return false;
    if (scope === "global" && m.scope !== "global") return false;
    if (search && !m.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const myCount = memories.filter((m) => m.scope === "user" && m.scope_key === user?.email).length;
  const projectCount = memories.filter((m) => m.scope === "project").length;
  const globalCount = memories.filter((m) => m.scope === "global").length;

  return (
    <PageLayout>
      <Topbar breadcrumb={["Agent", "Memory"]} actions={<Button variant="primary" onClick={() => setShowAdd(!showAdd)}>{showAdd ? "Close" : "Add Memory"}</Button>} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Agent Memory" description="Steve's semantic memory. Personal memories are private. Project and global are shared." />
        <KpiRow>
          <KpiCard label="My memories" value={String(myCount)} variant="accent" />
          <KpiCard label="Project" value={String(projectCount)} variant="default" />
          <KpiCard label="Global" value={String(globalCount)} variant="muted" />
          <KpiCard label="Total" value={String(memories.length)} variant="warn" />
        </KpiRow>

        {showAdd && (
          <section style={{ padding: "1.25rem 1.5rem", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: "1rem" }}>
            <form onSubmit={addMemory} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <FormGroup><FormLabel>Content *</FormLabel><FormTextarea rows={3} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="What should Steve remember?" required /></FormGroup>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <FormGroup><FormLabel>Scope</FormLabel><FormSelect value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}><option value="user">Personal (only me)</option><option value="project">Project (shared)</option><option value="global">Global</option></FormSelect></FormGroup>
                <FormGroup><FormLabel>Importance (1-10)</FormLabel><FormInput type="number" min="1" max="10" value={form.importance} onChange={(e) => setForm({ ...form, importance: e.target.value })} /></FormGroup>
              </div>
              <div style={{ display: "flex", gap: "8px" }}><Button variant="primary" type="submit">Save</Button><Button variant="ghost" type="button" onClick={() => setShowAdd(false)}>Cancel</Button></div>
            </form>
          </section>
        )}

        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
          {["all", "user", "project", "global"].map((s) => (
            <button key={s} onClick={() => setScope(s)} style={{ padding: "5px 11px", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: scope === s ? "var(--bg-3)" : "transparent", color: scope === s ? "var(--text)" : "var(--text-3)", fontSize: "12px", fontWeight: 500, cursor: "pointer" }}>
              {s === "all" ? "All" : s === "user" ? "My memories" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..." style={{ flex: 1, minWidth: "180px", padding: "6px 12px", background: "var(--bg-2)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius)", color: "var(--text)", fontSize: "13px", outline: "none" }} />
        </div>

        {loading ? <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p> : filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No memories yet. Steve hasn't learned anything.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map((m) => (
              <article key={m.id} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem", display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "13px", color: "var(--text)", margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{m.content}</p>
                  <div style={{ display: "flex", gap: "10px", marginTop: "8px", fontSize: "11px", color: "var(--text-3)", flexWrap: "wrap" }}>
                    <Badge variant={m.scope === "user" ? "info" : m.scope === "project" ? "warn" : "neutral"}>{m.scope}</Badge>
                    <span>Importance: {m.importance}/10</span>
                    <span>Source: {m.source || "unknown"}</span>
                    <span>{new Date(m.updated_at).toLocaleString()}</span>
                  </div>
                </div>
                {m.scope === "user" && m.scope_key === user?.email && <Button variant="danger" onClick={() => deleteMemory(m.id)}>Forget</Button>}
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
