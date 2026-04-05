"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const EMOJIS = {
  created: "🆕", updated: "✏️", completed: "✅", commented: "💬",
  invited: "👋", resolved: "🎯", deleted: "🗑️",
};

const ENTITY_COLORS = {
  task: "#f59e0b", decision: "#3b82f6", member: "#8b5cf6",
  resource: "#10b981", vision: "#3b82f6", retro: "#f59e0b",
  kpi: "#06b6d4", doc: "#f59e0b", comment: "#3b82f6",
};

export default function ActivityPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchActivity();
    const sub = supabase
      .channel("activity_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cockpit_activity" }, () => fetchActivity())
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchActivity() {
    const { data } = await supabase
      .from("cockpit_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setActivities(data || []);
    setLoading(false);
  }

  const entityTypes = [...new Set(activities.map((a) => a.entity_type))];
  const filtered = filter === "all" ? activities : activities.filter((a) => a.entity_type === filter);

  // Group by date
  const grouped = {};
  filtered.forEach((a) => {
    const day = new Date(a.created_at).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(a);
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Activity" subtitle="Everything that happens in this project" color="#94a3b8" />

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
            filter === "all" ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b] hover:text-white"
          }`}
        >
          All ({activities.length})
        </button>
        {entityTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              filter === type ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b] hover:text-white"
            }`}
          >
            {type} ({activities.filter((a) => a.entity_type === type).length})
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <p className="text-[#475569] text-sm font-mono">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-[#475569] text-sm text-center py-8">
            No activity yet. Actions will appear here as your team works.
          </p>
        </Card>
      ) : (
        Object.entries(grouped).map(([day, items]) => (
          <div key={day}>
            <h3 className="text-xs font-bold text-[#475569] mb-3 uppercase tracking-widest">{day}</h3>
            <div className="space-y-1">
              {items.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 py-2.5 px-4 rounded-lg hover:bg-[#0d1117] transition-colors"
                >
                  <span className="text-sm mt-0.5">{EMOJIS[a.action] || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">
                      <span className="font-semibold">{a.actor_name}</span>
                      <span className="text-[#64748b]"> {a.action} </span>
                      <span
                        className="text-[11px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: (ENTITY_COLORS[a.entity_type] || "#64748b") + "15", color: ENTITY_COLORS[a.entity_type] || "#64748b" }}
                      >
                        {a.entity_type}
                      </span>
                      {a.entity_title && (
                        <span className="text-[#94a3b8]"> {a.entity_title}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#475569] font-mono whitespace-nowrap">
                    {new Date(a.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
