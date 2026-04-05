"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#ec4899";

export default function CompetitorsPage() {
  const { user } = useAuth();
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", description: "" });

  const fetchCompetitors = async () => {
    const { data } = await supabase
      .from("cockpit_resources")
      .select("*")
      .eq("category", "competitor")
      .order("created_at", { ascending: false });
    setCompetitors(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await supabase.from("cockpit_resources").insert({
      category: "competitor",
      title: form.name,
      url: form.url,
      description: form.description,
      builder: user?.email || "unknown",
    });
    setForm({ name: "", url: "", description: "" });
    setShowForm(false);
    fetchCompetitors();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Competitors"
        subtitle="Competitive landscape analysis"
        color={COLOR}
      />

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: COLOR }}
        >
          {showForm ? "Cancel" : "+ Add Competitor"}
        </button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-white">New Competitor</h3>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Linear"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">URL</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What they do, strengths, weaknesses..."
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
                required
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: COLOR }}
            >
              Save Competitor
            </button>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : competitors.length === 0 ? (
        <Card>
          <p className="text-zinc-400 text-center py-8">
            No competitors tracked yet. Add your first competitor above.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {competitors.map((c) => (
            <Card key={c.id}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLOR }}
                    />
                    <h3 className="text-lg font-semibold text-white">
                      {c.title}
                    </h3>
                  </div>
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-400 text-xs hover:underline"
                    >
                      Visit
                    </a>
                  )}
                </div>
                <p className="text-zinc-400 text-sm">{c.description}</p>
                <p className="text-zinc-600 text-xs">
                  Added by {c.builder} &middot;{" "}
                  {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
