"use client";

import { useState, useEffect } from "react";
import { supabase, BUILDERS, SPRINTS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#8b5cf6";

export default function MembersPage() {
  const { user } = useAuth();
  const [taskStats, setTaskStats] = useState({});
  const [loading, setLoading] = useState(true);

  const currentSprint = SPRINTS?.[0] || null;

  useEffect(() => {
    fetchTaskStats();
  }, []);

  async function fetchTaskStats() {
    try {
      const { data, error } = await supabase
        .from("cockpit_tasks")
        .select("assigned_to, status")
        .eq("sprint", currentSprint?.id || 1);

      if (error) throw error;

      const stats = {};
      Object.keys(BUILDERS).forEach((email) => {
        const builderTasks = (data || []).filter((t) => t.assigned_to === email);
        const done = builderTasks.filter((t) => t.status === "done").length;
        stats[email] = { done, total: builderTasks.length };
      });
      setTaskStats(stats);
    } catch (err) {
      console.error("Error fetching task stats:", err);
    } finally {
      setLoading(false);
    }
  }

  const builders = Object.entries(BUILDERS);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Team Members"
        subtitle="Our builders and their contributions"
        color={COLOR}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {builders.map(([email, builder]) => {
          const stats = taskStats[email] || { done: 0, total: 0 };
          const initial = builder.name.charAt(0).toUpperCase();
          const progressPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

          return (
            <Card key={email}>
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Avatar */}
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg"
                  style={{ backgroundColor: builder.color }}
                >
                  {initial}
                </div>

                {/* Name & Role */}
                <div>
                  <h3 className="text-xl font-bold text-white">{builder.name}</h3>
                  <span
                    className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: builder.color + "33", border: `1px solid ${builder.color}` }}
                  >
                    Builder {builder.role}
                  </span>
                </div>

                {/* Details */}
                <div className="w-full space-y-2 text-sm text-gray-400">
                  <div className="flex justify-between">
                    <span>Email</span>
                    <span className="text-gray-300 text-xs">{email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Branch</span>
                    <span className="text-gray-300 font-mono text-xs bg-gray-800 px-2 py-0.5 rounded">
                      {builder.branch}
                    </span>
                  </div>
                </div>

                {/* Task Stats */}
                <div className="w-full pt-3 border-t border-gray-700">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Sprint Tasks</span>
                    <span className="text-white font-semibold">
                      {loading ? "..." : `${stats.done}/${stats.total}`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${progressPct}%`,
                        backgroundColor: builder.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{progressPct}% completed</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
