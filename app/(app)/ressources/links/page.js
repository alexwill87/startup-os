"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#10b981";

const CATEGORIES = [
  "all", "drive", "design", "reference", "competitor",
  "tool", "api_doc", "tutorial", "inspiration", "admin", "other",
];

const CATEGORY_LABELS = {
  all: "All",
  drive: "Drive",
  design: "Design",
  reference: "Reference",
  competitor: "Competitor",
  tool: "Tool",
  api_doc: "API Doc",
  tutorial: "Tutorial",
  inspiration: "Inspiration",
  admin: "Admin",
  other: "Other",
};

export default function LinksPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", category: "reference", description: "", tags: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchResources();
  }, []);

  async function fetchResources() {
    try {
      const { data, error } = await supabase
        .from("cockpit_resources")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error("Error fetching resources:", err);
    } finally {
      setLoading(false);
    }
  }

  async function addResource() {
    if (!form.title || !form.url) return;
    setSaving(true);
    try {
      const tags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const { error } = await supabase.from("cockpit_resources").insert({
        title: form.title,
        url: form.url,
        category: form.category,
        description: form.description || null,
        tags,
        pinned: false,
        added_by: user?.email || "unknown",
      });
      if (error) throw error;
      setForm({ title: "", url: "", category: "reference", description: "", tags: "" });
      setShowForm(false);
      await fetchResources();
    } catch (err) {
      console.error("Error adding resource:", err);
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(id, currentPinned) {
    try {
      const { error } = await supabase
        .from("cockpit_resources")
        .update({ pinned: !currentPinned })
        .eq("id", id);
      if (error) throw error;
      await fetchResources();
    } catch (err) {
      console.error("Error toggling pin:", err);
    }
  }

  const filtered = filter === "all" ? resources : resources.filter((r) => r.category === filter);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Links & Docs"
        subtitle="All project resources in one place"
        color={COLOR}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                filter === cat
                  ? "text-white"
                  : "text-gray-400 bg-gray-800 hover:bg-gray-700"
              }`}
              style={filter === cat ? { backgroundColor: COLOR } : {}}
            >
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: COLOR }}
        >
          {showForm ? "Cancel" : "+ Add Resource"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">New Resource</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Title *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <input
                type="url"
                placeholder="URL *"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {CATEGORIES.filter((c) => c !== "all").map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Tags (comma-separated)"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-emerald-500"
              rows={2}
            />
            <button
              onClick={addResource}
              disabled={saving || !form.title || !form.url}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: COLOR }}
            >
              {saving ? "Adding..." : "Add Resource"}
            </button>
          </div>
        </Card>
      )}

      {/* Resources List */}
      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading resources...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No resources found.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((res) => (
            <Card key={res.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {res.pinned && (
                      <span className="text-yellow-400 text-xs">&#x1f4cc;</span>
                    )}
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white font-semibold hover:underline truncate"
                      style={{ color: COLOR }}
                    >
                      {res.title}
                    </a>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-700 text-gray-300">
                      {CATEGORY_LABELS[res.category] || res.category}
                    </span>
                  </div>
                  {res.description && (
                    <p className="text-sm text-gray-400 mb-1">{res.description}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 truncate max-w-xs">{res.url}</span>
                    {res.tags?.map((tag, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => togglePin(res.id, res.pinned)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    res.pinned
                      ? "text-yellow-400 bg-yellow-400/10"
                      : "text-gray-500 hover:text-gray-300 bg-gray-800"
                  }`}
                  title={res.pinned ? "Unpin" : "Pin"}
                >
                  {res.pinned ? "Unpin" : "Pin"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
