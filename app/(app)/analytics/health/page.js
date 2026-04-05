"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#06b6d4";

const PILLARS = [
  { key: "pourquoi", label: "Pourquoi", desc: "Vision & decisions defined" },
  { key: "equipe", label: "Equipe", desc: "All 3 builders active" },
  { key: "ressources", label: "Ressources", desc: "Resources documented" },
  { key: "projet", label: "Projet", desc: "Task completion rate" },
  { key: "clients", label: "Clients", desc: "Personas & feedback" },
  { key: "finances", label: "Finances", desc: "Budget data tracked" },
  { key: "analytics", label: "Analytics", desc: "KPI entries logged" },
];

export default function HealthPage() {
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const evaluate = async () => {
      const s = {};

      // Pourquoi: vision entries + decisions
      const { count: visionCount } = await supabase
        .from("cockpit_vision")
        .select("*", { count: "exact", head: true });
      const { count: decisionCount } = await supabase
        .from("cockpit_decisions")
        .select("*", { count: "exact", head: true });
      const pourquoiScore = Math.min(
        ((visionCount > 0 ? 50 : 0) + (decisionCount > 0 ? 50 : 0)),
        100
      );
      s.pourquoi = pourquoiScore;

      // Equipe: check builders (always true since BUILDERS is hardcoded, but check tasks assigned to different builders)
      const { data: builders } = await supabase
        .from("cockpit_tasks")
        .select("assigned_to");
      const uniqueBuilders = new Set((builders || []).map((b) => b.assigned_to).filter(Boolean));
      s.equipe = Math.min(Math.round((uniqueBuilders.size / 3) * 100), 100);

      // Ressources
      const { count: resCount } = await supabase
        .from("cockpit_resources")
        .select("*", { count: "exact", head: true });
      s.ressources = resCount > 0 ? Math.min(resCount * 20, 100) : 0;

      // Projet: task completion rate
      const { data: allTasks } = await supabase
        .from("cockpit_tasks")
        .select("status");
      const total = allTasks?.length || 0;
      const done = allTasks?.filter((t) => t.status === "done").length || 0;
      s.projet = total > 0 ? Math.round((done / total) * 100) : 0;

      // Clients: personas (market vision) + feedback (growth vision)
      const { count: personaCount } = await supabase
        .from("cockpit_vision")
        .select("*", { count: "exact", head: true })
        .eq("topic", "market");
      const { count: feedbackCount } = await supabase
        .from("cockpit_vision")
        .select("*", { count: "exact", head: true })
        .eq("topic", "growth");
      s.clients = Math.min(
        ((personaCount > 0 ? 50 : 0) + (feedbackCount > 0 ? 50 : 0)),
        100
      );

      // Finances: admin resources (budget)
      const { count: budgetCount } = await supabase
        .from("cockpit_resources")
        .select("*", { count: "exact", head: true })
        .eq("category", "admin");
      s.finances = budgetCount > 0 ? 100 : 0;

      // Analytics: KPI entries
      const { count: kpiCount } = await supabase
        .from("cockpit_kpis")
        .select("*", { count: "exact", head: true });
      s.analytics = kpiCount > 0 ? Math.min(kpiCount * 25, 100) : 0;

      setScores(s);
      setLoading(false);
    };

    evaluate();
  }, []);

  const overall =
    PILLARS.length > 0
      ? Math.round(
          PILLARS.reduce((sum, p) => sum + (scores[p.key] || 0), 0) / PILLARS.length
        )
      : 0;

  const getColor = (pct) => {
    if (pct >= 75) return "#22c55e";
    if (pct >= 50) return "#eab308";
    if (pct >= 25) return "#f97316";
    return "#ef4444";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Health"
        subtitle="Overall health score across all pillars"
        color={COLOR}
      />

      {loading ? (
        <p className="text-zinc-500 text-sm">Evaluating project health...</p>
      ) : (
        <>
          {/* Overall score */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-400 text-sm">Overall Health Score</p>
                <p className="text-4xl font-bold" style={{ color: getColor(overall) }}>
                  {overall}%
                </p>
              </div>
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center border-4"
                style={{ borderColor: getColor(overall) }}
              >
                <span
                  className="text-2xl font-bold"
                  style={{ color: getColor(overall) }}
                >
                  {overall}
                </span>
              </div>
            </div>
          </Card>

          {/* Pillar breakdown */}
          <div className="space-y-3">
            {PILLARS.map((pillar) => {
              const pct = scores[pillar.key] || 0;
              const color = getColor(pct);
              return (
                <Card key={pillar.key}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-white text-sm font-semibold">{pillar.label}</h3>
                        <p className="text-zinc-500 text-xs">{pillar.desc}</p>
                      </div>
                      <span className="text-lg font-bold font-mono" style={{ color }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
