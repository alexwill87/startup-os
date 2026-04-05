"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#ec4899";

const SOURCES = ["user interview", "survey", "social", "support"];
const SENTIMENTS = ["positive", "neutral", "negative"];

const sentimentColors = {
  positive: "#22c55e",
  neutral: "#eab308",
  negative: "#ef4444",
};

export default function FeedbackPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    source: "user interview",
    body: "",
    sentiment: "neutral",
  });

  const fetchFeedback = async () => {
    const { data } = await supabase
      .from("cockpit_vision")
      .select("*")
      .eq("topic", "growth")
      .order("created_at", { ascending: false });
    setEntries(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const meta = JSON.stringify({ source: form.source, sentiment: form.sentiment });
    await supabase.from("cockpit_vision").insert({
      topic: "growth",
      title: `[${form.sentiment.toUpperCase()}] ${form.source}`,
      body: JSON.stringify({ source: form.source, sentiment: form.sentiment, text: form.body }),
      builder: user?.email || "unknown",
      pinned: false,
    });
    setForm({ source: "user interview", body: "", sentiment: "neutral" });
    setShowForm(false);
    fetchFeedback();
  };

  const parseBody = (body) => {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Feedback"
        subtitle="Log and track user feedback from all channels"
        color={COLOR}
      />

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: COLOR }}
        >
          {showForm ? "Cancel" : "+ Add Feedback"}
        </button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-white">New Feedback</h3>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Feedback</label>
              <textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="What did the user say?"
                rows={4}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Sentiment</label>
              <div className="flex gap-3">
                {SENTIMENTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, sentiment: s })}
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      form.sentiment === s
                        ? "text-white"
                        : "text-zinc-400 border-zinc-700"
                    }`}
                    style={
                      form.sentiment === s
                        ? { backgroundColor: sentimentColors[s], borderColor: sentimentColors[s] }
                        : {}
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: COLOR }}
            >
              Save Feedback
            </button>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : entries.length === 0 ? (
        <Card>
          <p className="text-zinc-400 text-center py-8">
            No feedback logged yet. Start collecting user insights.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const data = parseBody(entry.body);
            const sentiment = data?.sentiment || "neutral";
            const source = data?.source || "unknown";
            const text = data?.text || entry.body;
            return (
              <Card key={entry.id}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: sentimentColors[sentiment] }}
                      />
                      <span className="text-sm font-medium text-zinc-300 capitalize">
                        {source}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: sentimentColors[sentiment] + "20",
                          color: sentimentColors[sentiment],
                        }}
                      >
                        {sentiment}
                      </span>
                    </div>
                    <span className="text-zinc-600 text-xs">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-zinc-400 text-sm">{text}</p>
                  <p className="text-zinc-600 text-xs">by {entry.builder}</p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
