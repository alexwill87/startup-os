"use client";
import { useState, useEffect } from "react";
import { supabase, BUILDERS } from "@/lib/supabase";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#64748b";

const CHECKS = [
  {
    id: "supabase",
    label: "Supabase connected",
    check: async () => {
      const { error } = await supabase.from("cockpit_vision").select("id").limit(1);
      return !error;
    },
  },
  {
    id: "auth",
    label: "Auth configured (3 users exist)",
    check: async () => {
      return BUILDERS && BUILDERS.length >= 3;
    },
  },
  {
    id: "vision",
    label: "Vision defined",
    check: async () => {
      const { count } = await supabase
        .from("cockpit_vision")
        .select("*", { count: "exact", head: true });
      return count > 0;
    },
  },
  {
    id: "team",
    label: "Team defined (BUILDERS config exists)",
    check: async () => {
      return !!BUILDERS;
    },
  },
  {
    id: "tasks",
    label: "Tasks created",
    check: async () => {
      const { count } = await supabase
        .from("cockpit_tasks")
        .select("*", { count: "exact", head: true });
      return count > 0;
    },
  },
  {
    id: "resources",
    label: "Resources added",
    check: async () => {
      const { count } = await supabase
        .from("cockpit_resources")
        .select("*", { count: "exact", head: true });
      return count > 0;
    },
  },
  {
    id: "kpis",
    label: "KPIs logged",
    check: async () => {
      const { count } = await supabase
        .from("cockpit_kpis")
        .select("*", { count: "exact", head: true });
      return count > 0;
    },
  },
  {
    id: "docs",
    label: "Docs imported",
    check: async () => {
      const { count } = await supabase
        .from("cockpit_docs")
        .select("*", { count: "exact", head: true });
      return count > 0;
    },
  },
  {
    id: "decisions",
    label: "Decisions made",
    check: async () => {
      const { count } = await supabase
        .from("cockpit_decisions")
        .select("*", { count: "exact", head: true });
      return count > 0;
    },
  },
  {
    id: "retro",
    label: "Retro done",
    check: async () => {
      const { count } = await supabase
        .from("cockpit_retro")
        .select("*", { count: "exact", head: true });
      return count > 0;
    },
  },
];

export default function SetupPage() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runChecks = async () => {
      const res = {};
      for (const check of CHECKS) {
        try {
          res[check.id] = await check.check();
        } catch {
          res[check.id] = false;
        }
      }
      setResults(res);
      setLoading(false);
    };
    runChecks();
  }, []);

  const passed = Object.values(results).filter(Boolean).length;
  const total = CHECKS.length;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Setup Checklist"
        subtitle="Project configuration status"
        color={COLOR}
      />

      {/* Overall completion */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-400 text-sm">Setup Completion</p>
            <p className="text-3xl font-bold text-white">
              {passed}/{total}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-4xl font-bold"
              style={{ color: pct === 100 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444" }}
            >
              {pct}%
            </p>
          </div>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-3 mt-4">
          <div
            className="h-3 rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: pct === 100 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444",
            }}
          />
        </div>
      </Card>

      {/* Checklist */}
      {loading ? (
        <p className="text-zinc-500 text-sm">Running checks...</p>
      ) : (
        <div className="space-y-2">
          {CHECKS.map((check) => {
            const ok = results[check.id];
            return (
              <Card key={check.id}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      backgroundColor: ok ? "#22c55e20" : "#ef444420",
                      color: ok ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {ok ? "\u2713" : "\u2717"}
                  </div>
                  <p className={`text-sm ${ok ? "text-zinc-300" : "text-zinc-500"}`}>
                    {check.label}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
