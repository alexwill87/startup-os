"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#10b981";
const CATEGORIES = [
  { id: "all", label: "All", color: "#10b981" },
  { id: "reference", label: "Reference", color: "#3b82f6" },
  { id: "tool", label: "Tool", color: "#8b5cf6" },
  { id: "api_doc", label: "API Doc", color: "#f59e0b" },
  { id: "tutorial", label: "Tutorial", color: "#06b6d4" },
  { id: "drive", label: "Drive", color: "#10b981" },
  { id: "design", label: "Design", color: "#ec4899" },
  { id: "competitor", label: "Competitor", color: "#ef4444" },
  { id: "inspiration", label: "Inspiration", color: "#f97316" },
  { id: "admin", label: "Admin / Budget", color: "#64748b" },
  { id: "other", label: "Other", color: "#475569" },
];
const SORT_OPTIONS = [
  { id: "recent", label: "Recent" },
  { id: "alpha", label: "A-Z" },
  { id: "pinned", label: "Pinned first" },
];

export default function LinksPage() {
  const { user, canEdit } = useAuth();
  const [resources, setResources] = useState([]);
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("pinned");
  const [view, setView] = useState("list");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", category: "reference", description: "", tags: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
    const sub = supabase.channel("links_rt").on("postgres_changes", { event: "*", schema: "public", table: "cockpit_resources" }, fetchResources).subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchResources() {
    const { data } = await supabase.from("cockpit_resources").select("*").order("created_at", { ascending: false });
    setResources(data || []);
    setLoading(false);
  }

  async function addResource(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) return;
    const tags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
    await supabase.from("cockpit_resources").insert({ title: form.title.trim(), url: form.url.trim(), category: form.category, description: form.description || null, tags, pinned: false, shared_by: user?.id });
    await logActivity("created", "resource", { title: form.title.trim() });
    setForm({ title: "", url: "", category: "reference", description: "", tags: "" });
    setShowForm(false);
  }

  async function togglePin(id, pinned) { await supabase.from("cockpit_resources").update({ pinned: !pinned }).eq("id", id); }
  async function deleteResource(id) { await supabase.from("cockpit_resources").delete().eq("id", id); }

  // Filter + sort + search
  let displayed = resources;
  if (filter !== "all") displayed = displayed.filter((r) => r.category === filter);
  if (search) displayed = displayed.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()) || (r.description || "").toLowerCase().includes(search.toLowerCase()));

  displayed = [...displayed].sort((a, b) => {
    if (sortBy === "pinned") return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at);
    if (sortBy === "alpha") return a.title.localeCompare(b.title);
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Category counts
  const counts = {};
  resources.forEach((r) => { counts[r.category] = (counts[r.category] || 0) + 1; });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <PageHeader title="Links" subtitle={`${resources.length} resources — tools, docs, references, bookmarks`} color={COLOR}>
        <div className="flex gap-2">
          {[{ id: "list", l: "List" }, { id: "grid", l: "Grid" }].map((v) => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border transition ${view === v.id ? "border-green-500 text-green-400 bg-green-500/10" : "border-[#1e293b] text-[#475569]"}`}>
              {v.l}
            </button>
          ))}
          {canEdit && <button onClick={() => setShowForm(!showForm)} className="px-3 py-1.5 text-[10px] font-bold rounded-lg text-white bg-green-500">+ Add</button>}
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => {
          const count = cat.id === "all" ? resources.length : (counts[cat.id] || 0);
          if (cat.id !== "all" && count === 0) return null;
          return (
            <button key={cat.id} onClick={() => setFilter(cat.id)}
              className="text-[10px] font-bold px-2 py-1 rounded-lg border transition-all"
              style={{ borderColor: filter === cat.id ? cat.color : "#1e293b", color: filter === cat.id ? cat.color : "#475569", backgroundColor: filter === cat.id ? cat.color + "10" : "transparent" }}>
              {cat.label} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search + Sort */}
      <div className="flex gap-3">
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none focus:border-green-500" />
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-[#475569] text-[10px] outline-none">
          {SORT_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <form onSubmit={addResource} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none" required />
              <input type="url" placeholder="URL *" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none">
                {CATEGORIES.filter((c) => c.id !== "all").map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <input type="text" placeholder="Tags (comma-separated)" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none" />
              <input type="text" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none" />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 text-xs font-bold rounded-lg text-white bg-green-500">Add</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs rounded-lg text-[#64748b] bg-[#1e293b]">Cancel</button>
            </div>
          </form>
        </Card>
      )}

      {/* Content */}
      {loading ? <p className="text-sm text-[#475569] text-center py-8">Loading...</p>
        : displayed.length === 0 ? <Card><p className="text-sm text-[#475569] text-center py-6">No resources found.</p></Card>
        : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayed.map((r) => {
              const cat = CATEGORIES.find((c) => c.id === r.category);
              return (
                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer">
                  <Card className="hover:border-[#334155] cursor-pointer transition-all h-full group">
                    <div className="flex items-start gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ backgroundColor: (cat?.color || "#475569") + "15", color: cat?.color }}>
                        {r.title.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white group-hover:text-green-400 transition truncate">{r.title}</p>
                        <p className="text-[10px] text-[#475569] font-mono truncate">{r.url?.replace("https://", "").slice(0, 30)}</p>
                      </div>
                      {r.pinned && <span className="text-amber-400 text-[10px]">pin</span>}
                    </div>
                    {r.description && <p className="text-[10px] text-[#64748b] mt-2 line-clamp-2">{r.description}</p>}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ color: cat?.color, backgroundColor: (cat?.color || "#475569") + "15" }}>{cat?.label}</span>
                      {(r.tags || []).map((t, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e293b] text-[#475569]">{t}</span>)}
                    </div>
                  </Card>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((r) => {
              const cat = CATEGORIES.find((c) => c.id === r.category);
              return (
                <Card key={r.id}>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat?.color || "#475569" }} />
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-white hover:text-green-400 transition truncate flex-1">
                      {r.pinned && <span className="text-amber-400 mr-1">*</span>}
                      {r.title}
                    </a>
                    <span className="text-[9px] px-1.5 py-0.5 rounded shrink-0" style={{ color: cat?.color, backgroundColor: (cat?.color || "#475569") + "15" }}>{cat?.label}</span>
                    {(r.tags || []).slice(0, 2).map((t, i) => <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[#1e293b] text-[#475569] shrink-0">{t}</span>)}
                    <span className="text-[9px] text-[#334155] font-mono shrink-0">{r.url?.replace("https://", "").slice(0, 25)}</span>
                    {canEdit && (
                      <div className="flex gap-1 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); togglePin(r.id, r.pinned); }} className="text-[9px] px-1 py-0.5 rounded text-[#475569] hover:text-amber-400">{r.pinned ? "Unpin" : "Pin"}</button>
                        <button onClick={(e) => { e.stopPropagation(); deleteResource(r.id); }} className="text-[9px] px-1 py-0.5 rounded text-red-400/30 hover:text-red-400">X</button>
                      </div>
                    )}
                  </div>
                  {r.description && <p className="text-[10px] text-[#64748b] mt-1 ml-5">{r.description}</p>}
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}
