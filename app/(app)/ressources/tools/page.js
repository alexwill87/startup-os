"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#10b981";

const TOOL_ICONS = {
  tool: "🔧",
  api_doc: "📡",
};

export default function ToolsPage() {
  const { user } = useAuth();
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", category: "tool", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTools();
  }, []);

  async function fetchTools() {
    try {
      const { data, error } = await supabase
        .from("cockpit_resources")
        .select("*")
        .in("category", ["tool", "api_doc"])
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTools(data || []);
    } catch (err) {
      console.error("Error fetching tools:", err);
    } finally {
      setLoading(false);
    }
  }

  async function addTool() {
    if (!form.title || !form.url) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("cockpit_resources").insert({
        title: form.title,
        url: form.url,
        category: form.category,
        description: form.description || null,
        tags: [],
        pinned: false,
        added_by: user?.email || "unknown",
      });
      if (error) throw error;
      setForm({ title: "", url: "", category: "tool", description: "" });
      setShowForm(false);
      await fetchTools();
    } catch (err) {
      console.error("Error adding tool:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Tools & APIs"
        subtitle="Development tools and API documentation"
        color={COLOR}
      />

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: COLOR }}
        >
          {showForm ? "Cancel" : "+ Add Tool"}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">New Tool / API</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Name *"
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
                <option value="tool">Tool</option>
                <option value="api_doc">API Doc</option>
              </select>
            </div>
            <textarea
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-emerald-500"
              rows={2}
            />
            <button
              onClick={addTool}
              disabled={saving || !form.title || !form.url}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: COLOR }}
            >
              {saving ? "Adding..." : "Add Tool"}
            </button>
          </div>
        </Card>
      )}

      {/* Tools Grid */}
      {loading ? (
        <p className="text-gray-400 text-center py-12">Loading tools...</p>
      ) : tools.length === 0 ? (
        <p className="text-gray-400 text-center py-12">No tools added yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => (
            <Card key={tool.id}>
              <div className="flex flex-col h-full space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: COLOR + "22" }}
                  >
                    {TOOL_ICONS[tool.category] || "🔧"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold truncate">{tool.title}</h3>
                    <span className="text-xs text-gray-500 uppercase">
                      {tool.category === "api_doc" ? "API Doc" : "Tool"}
                    </span>
                  </div>
                  {tool.pinned && (
                    <span className="text-yellow-400 text-xs">&#x1f4cc;</span>
                  )}
                </div>

                {tool.description && (
                  <p className="text-sm text-gray-400 flex-1">{tool.description}</p>
                )}

                <a
                  href={tool.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:underline"
                  style={{ color: COLOR }}
                >
                  Open &rarr;
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
