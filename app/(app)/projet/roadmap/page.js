"use client";
import { useState, useEffect } from "react";
import { supabase, BUILDERS, SPRINTS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#f59e0b";
const STATUS_DOTS = {
  todo: "bg-zinc-500",
  in_progress: "bg-blue-500",
  done: "bg-green-500",
  blocked: "bg-red-500",
};

export default function RoadmapPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const cs = [...SPRINTS].reverse().find((s) => s.date <= todayStr) || SPRINTS[0];
    return cs.id;
  });

  useEffect(() => {
    fetchAllTasks();
  }, []);

  async function fetchAllTasks() {
    const { data } = await supabase
      .from("cockpit_tasks")
      .select("*")
      .order("created_at", { ascending: true });
    setTasks(data || []);
    setLoading(false);
  }

  function toggle(sprintId) {
    setExpanded(expanded === sprintId ? null : sprintId);
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const currentSprint = [...SPRINTS].reverse().find((s) => s.date <= todayStr) || SPRINTS[0];

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Roadmap" color={COLOR} />
        <p className="text-zinc-400 mt-4">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Roadmap" color={COLOR} />

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
        {Object.entries(STATUS_DOTS).map(([status, cls]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${cls}`} />
            {status.replace("_", " ")}
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative space-y-4">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-zinc-700 hidden md:block" />

        {SPRINTS.map((sprint) => {
          const sprintTasks = tasks.filter((t) => t.sprint === sprint.id);
          const done = sprintTasks.filter((t) => t.status === "done").length;
          const pct = sprintTasks.length > 0 ? Math.round((done / sprintTasks.length) * 100) : 0;
          const isOpen = expanded === sprint.id;
          const isCurrent = sprint.id === currentSprint.id;

          return (
            <div key={sprint.id} className="relative md:pl-10">
              {/* Timeline dot */}
              <div
                className="absolute left-2.5 top-4 w-3 h-3 rounded-full border-2 hidden md:block"
                style={{
                  borderColor: COLOR,
                  backgroundColor: isCurrent ? COLOR : "transparent",
                }}
              />

              {/* Sprint header */}
              <button
                onClick={() => toggle(sprint.id)}
                className="w-full text-left"
              >
                <Card>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{isOpen ? "▾" : "▸"}</span>
                      <div>
                        <h3 className="text-white font-bold">
                          {sprint.name}
                          {isCurrent && (
                            <span
                              className="ml-2 text-xs px-2 py-0.5 rounded text-black"
                              style={{ backgroundColor: COLOR }}
                            >
                              En cours
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-zinc-400">
                          {sprint.date} — {sprintTasks.length} tâches — {pct}% complété
                        </p>
                      </div>
                    </div>
                    <div className="w-24 bg-zinc-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: COLOR }}
                      />
                    </div>
                  </div>
                </Card>
              </button>

              {/* Expanded: tasks grouped by builder */}
              {isOpen && (
                <div className="mt-2 ml-4 space-y-3">
                  {BUILDERS.map((builder) => {
                    const bt = sprintTasks.filter((t) => t.builder === builder.id);
                    if (bt.length === 0) return null;
                    return (
                      <div key={builder.id}>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-1.5 flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black"
                            style={{ backgroundColor: COLOR }}
                          >
                            {builder.id}
                          </span>
                          {builder.name}
                        </h4>
                        <div className="space-y-1 ml-8">
                          {bt.map((task) => (
                            <div key={task.id} className="flex items-center gap-2 text-sm">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOTS[task.status] || "bg-zinc-500"}`} />
                              <span className="text-zinc-300">{task.title}</span>
                              {task.task_ref && <span className="text-xs text-zinc-500">({task.task_ref})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {sprintTasks.length === 0 && (
                    <p className="text-sm text-zinc-500 ml-4">Aucune tâche pour ce sprint.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
