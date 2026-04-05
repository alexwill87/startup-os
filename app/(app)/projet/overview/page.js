"use client";
import { useState, useEffect } from "react";
import { supabase, BUILDERS, SPRINTS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#f59e0b";

export default function OverviewPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split("T")[0];
  const currentSprint =
    [...SPRINTS].reverse().find((s) => s.date <= todayStr) || SPRINTS[0];
  const nextSprint = SPRINTS.find((s) => s.date > todayStr);
  const daysUntilNext = nextSprint
    ? Math.ceil((new Date(nextSprint.date) - new Date(todayStr)) / 86400000)
    : 0;

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    const { data } = await supabase
      .from("cockpit_tasks")
      .select("*")
      .eq("sprint", currentSprint.id);
    setTasks(data || []);
    setLoading(false);
  }

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  function builderStats(builder) {
    const bt = tasks.filter((t) => t.builder === builder);
    const bd = bt.filter((t) => t.status === "done").length;
    return { total: bt.length, done: bd, pct: bt.length > 0 ? Math.round((bd / bt.length) * 100) : 0 };
  }

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Project Overview" color={COLOR} />
        <p className="text-zinc-400 mt-4">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Project Overview" color={COLOR} />

      {/* Current Sprint Banner */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">{currentSprint.name}</h2>
          <span className="text-sm text-zinc-400">
            {nextSprint ? `${daysUntilNext}j avant le prochain sprint` : "Dernier sprint"}
          </span>
        </div>
        <div className="w-full bg-zinc-700 rounded-full h-4 overflow-hidden">
          <div
            className="h-4 rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, backgroundColor: COLOR }}
          />
        </div>
        <p className="text-sm text-zinc-400 mt-1">{progress}% complété</p>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Progression", value: `${progress}%` },
          { label: "Tâches", value: `${done}/${total}` },
          { label: "Bloquées", value: blocked },
          { label: "Jours restants", value: daysUntilNext },
        ].map((s) => (
          <Card key={s.label} className="text-center py-6">
            <p className="text-xs text-[#64748b] uppercase tracking-widest mb-2">{s.label}</p>
            <p className="text-3xl font-extrabold" style={{ color: COLOR }}>
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Builder Progress */}
      <div>
        <h3 className="text-sm font-bold text-[#94a3b8] uppercase tracking-widest mb-4">Progression par builder</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BUILDERS.map((b) => {
            const st = builderStats(b.id);
            return (
              <Card key={b.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-black"
                    style={{ backgroundColor: COLOR }}
                  >
                    {b.id}
                  </span>
                  <span className="text-white font-medium">{b.name}</span>
                </div>
                <div className="w-full bg-zinc-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full transition-all duration-500"
                    style={{ width: `${st.pct}%`, backgroundColor: COLOR }}
                  />
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  {st.done}/{st.total} tâches — {st.pct}%
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
