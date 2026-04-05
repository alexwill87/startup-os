"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#64748b";

const PHASES = [
  {
    id: "foundation",
    title: "1. Foundation",
    description: "Infrastructure and access — the basics before anything else.",
    items: [
      {
        id: "supabase",
        label: "Database connected",
        detail: "Supabase project is live and responding.",
        link: null,
        check: async () => {
          const { error } = await supabase.from("cockpit_members").select("id").limit(1);
          return !error;
        },
      },
      {
        id: "members",
        label: "Team members added",
        detail: "At least 2 members in cockpit_members.",
        link: "/equipe/members",
        check: async () => {
          const { count } = await supabase.from("cockpit_members").select("*", { count: "exact", head: true });
          return count >= 2;
        },
      },
      {
        id: "admin",
        label: "Admin assigned",
        detail: "At least 1 member has admin role.",
        link: "/equipe/members",
        check: async () => {
          const { count } = await supabase.from("cockpit_members").select("*", { count: "exact", head: true }).eq("role", "admin");
          return count >= 1;
        },
      },
      {
        id: "all_connected",
        label: "All members have logged in",
        detail: "Every member has a user_id (has logged in at least once).",
        link: "/equipe/members",
        check: async () => {
          const { data } = await supabase.from("cockpit_members").select("user_id").in("status", ["active", "invited"]);
          return data && data.length > 0 && data.every((m) => m.user_id !== null);
        },
      },
    ],
  },
  {
    id: "why",
    title: "2. Pourquoi — Define the Why",
    description: "Mission, vision, and the problem you're solving. This guides everything.",
    items: [
      {
        id: "mission",
        label: "Mission statement defined",
        detail: "At least one vision note with topic 'product' exists.",
        link: "/pourquoi/mission",
        check: async () => {
          const { count } = await supabase.from("cockpit_vision").select("*", { count: "exact", head: true }).eq("topic", "product");
          return count >= 1;
        },
      },
      {
        id: "market",
        label: "Market defined",
        detail: "At least one market note exists.",
        link: "/pourquoi/vision-strategy",
        check: async () => {
          const { count } = await supabase.from("cockpit_vision").select("*", { count: "exact", head: true }).eq("topic", "market");
          return count >= 1;
        },
      },
      {
        id: "first_decision",
        label: "First decision made",
        detail: "At least one decision has been discussed and resolved.",
        link: "/pourquoi/decisions",
        check: async () => {
          const { count } = await supabase.from("cockpit_decisions").select("*", { count: "exact", head: true }).eq("status", "decided");
          return count >= 1;
        },
      },
    ],
  },
  {
    id: "team",
    title: "3. Équipe — Organize the Team",
    description: "Roles, responsibilities, and how you work together.",
    items: [
      {
        id: "roles",
        label: "Builder roles assigned",
        detail: "Each member has a builder letter (A, B, C...).",
        link: "/equipe/members",
        check: async () => {
          const { data } = await supabase.from("cockpit_members").select("builder").in("status", ["active"]);
          return data && data.length > 0 && data.every((m) => m.builder);
        },
      },
    ],
  },
  {
    id: "project",
    title: "4. Projet — Set Up the Work",
    description: "Tasks, sprints, documentation — the engine of the project.",
    items: [
      {
        id: "tasks",
        label: "Tasks created",
        detail: "At least 5 tasks exist in the board.",
        link: "/projet/board",
        check: async () => {
          const { count } = await supabase.from("cockpit_tasks").select("*", { count: "exact", head: true });
          return count >= 5;
        },
      },
      {
        id: "docs",
        label: "Documentation imported",
        detail: "At least 1 document exists.",
        link: "/projet/docs",
        check: async () => {
          const { count } = await supabase.from("cockpit_docs").select("*", { count: "exact", head: true });
          return count >= 1;
        },
      },
    ],
  },
  {
    id: "resources",
    title: "5. Ressources — Gather Your Tools",
    description: "Links, tools, APIs, documentation — everything the team needs.",
    items: [
      {
        id: "resources",
        label: "Resources added",
        detail: "At least 3 resources (links, tools, docs) exist.",
        link: "/ressources/links",
        check: async () => {
          const { count } = await supabase.from("cockpit_resources").select("*", { count: "exact", head: true });
          return count >= 3;
        },
      },
    ],
  },
  {
    id: "analytics",
    title: "6. Analytics — Track Progress",
    description: "KPIs, metrics, and how you measure success.",
    items: [
      {
        id: "kpis",
        label: "First KPI entry logged",
        detail: "At least one KPI snapshot recorded.",
        link: "/analytics/kpis",
        check: async () => {
          const { count } = await supabase.from("cockpit_kpis").select("*", { count: "exact", head: true });
          return count >= 1;
        },
      },
    ],
  },
  {
    id: "launch",
    title: "7. Launch Ready",
    description: "Final checks before you show this to anyone.",
    items: [
      {
        id: "retro",
        label: "First retro completed",
        detail: "At least one retrospective item exists.",
        link: "/projet/retro",
        check: async () => {
          const { count } = await supabase.from("cockpit_retro").select("*", { count: "exact", head: true });
          return count >= 1;
        },
      },
      {
        id: "personas",
        label: "Target users defined",
        detail: "At least one persona or market note exists in Clients.",
        link: "/clients/personas",
        check: async () => {
          const { count } = await supabase.from("cockpit_vision").select("*", { count: "exact", head: true }).in("topic", ["market", "growth"]);
          return count >= 1;
        },
      },
    ],
  },
];

export default function SetupPage() {
  const { isAdmin } = useAuth();
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runAllChecks();
  }, []);

  async function runAllChecks() {
    setLoading(true);
    const res = {};
    for (const phase of PHASES) {
      for (const item of phase.items) {
        try {
          res[item.id] = await item.check();
        } catch {
          res[item.id] = false;
        }
      }
    }
    setResults(res);
    setLoading(false);
  }

  const allItems = PHASES.flatMap((p) => p.items);
  const passed = allItems.filter((i) => results[i.id]).length;
  const total = allItems.length;
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader title="Setup & Checklist" subtitle="Project onboarding progress" color={COLOR}>
        <button
          onClick={runAllChecks}
          className="px-3 py-1.5 rounded-lg border border-[#1e293b] text-[#94a3b8] text-xs font-mono hover:text-white hover:border-[#334155] transition-colors"
        >
          Re-check
        </button>
      </PageHeader>

      {/* Overall progress */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-[#94a3b8]">Project Setup</p>
            <p className="text-3xl font-extrabold text-white mt-1">{passed}/{total} completed</p>
          </div>
          <div
            className="text-4xl font-extrabold"
            style={{ color: pct === 100 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444" }}
          >
            {loading ? "..." : `${pct}%`}
          </div>
        </div>
        <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct === 100 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444",
            }}
          />
        </div>
      </Card>

      {/* Phases */}
      {loading ? (
        <p className="text-[#475569] text-sm font-mono">Running checks...</p>
      ) : (
        <div className="space-y-6">
          {PHASES.map((phase) => {
            const phaseItems = phase.items;
            const phasePassed = phaseItems.filter((i) => results[i.id]).length;
            const phaseComplete = phasePassed === phaseItems.length;

            return (
              <div key={phase.id}>
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{
                      background: phaseComplete ? "#10b98122" : "#1e293b",
                      color: phaseComplete ? "#10b981" : "#64748b",
                    }}
                  >
                    {phaseComplete ? "\u2713" : phasePassed}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{phase.title}</h3>
                    <p className="text-[11px] text-[#475569]">{phase.description}</p>
                  </div>
                </div>

                <div className="space-y-2 ml-9">
                  {phaseItems.map((item) => {
                    const ok = results[item.id];
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          ok
                            ? "bg-emerald-500/5 border-emerald-500/10"
                            : "bg-[#0d1117] border-[#1e293b]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="text-sm"
                            style={{ color: ok ? "#10b981" : "#ef4444" }}
                          >
                            {ok ? "\u2713" : "\u25CB"}
                          </span>
                          <div>
                            <p className={`text-sm ${ok ? "text-[#94a3b8]" : "text-white"}`}>
                              {item.label}
                            </p>
                            <p className="text-[11px] text-[#475569]">{item.detail}</p>
                          </div>
                        </div>
                        {item.link && !ok && (
                          <Link
                            href={item.link}
                            className="text-[11px] px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 font-mono transition-colors whitespace-nowrap"
                          >
                            Go fix
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* What's next */}
      {!loading && pct < 100 && (
        <Card className="border-dashed">
          <h3 className="text-sm font-bold text-[#f59e0b] mb-2">What to do next</h3>
          <ul className="space-y-1.5">
            {allItems
              .filter((i) => !results[i.id])
              .slice(0, 3)
              .map((item) => (
                <li key={item.id} className="flex items-center gap-2 text-sm text-[#94a3b8]">
                  <span className="text-[#ef4444]">{"\u25CB"}</span>
                  {item.label}
                  {item.link && (
                    <Link href={item.link} className="text-blue-400 text-xs font-mono hover:underline ml-auto">
                      Go
                    </Link>
                  )}
                </li>
              ))}
          </ul>
        </Card>
      )}

      {pct === 100 && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <div className="text-center py-4">
            <p className="text-2xl font-extrabold text-emerald-400 mb-2">Project Ready</p>
            <p className="text-sm text-[#94a3b8]">All setup steps completed. Your team is ready to build.</p>
          </div>
        </Card>
      )}
    </div>
  );
}
