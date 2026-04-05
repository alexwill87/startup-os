"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const PHASES = [
  {
    id: 1,
    name: "Foundation",
    color: "#64748b",
    checks: [
      {
        id: "db_connected",
        label: "Database connected",
        fixLink: "/setup/config",
      },
      {
        id: "members_added",
        label: "Members added (2+)",
        fixLink: "/equipe/membres",
      },
      {
        id: "admin_assigned",
        label: "Admin assigned",
        fixLink: "/equipe/membres",
      },
      {
        id: "all_logged_in",
        label: "All members have logged in",
        fixLink: "/equipe/membres",
      },
    ],
  },
  {
    id: 2,
    name: "Pourquoi",
    color: "#64748b",
    checks: [
      {
        id: "mission_defined",
        label: "Mission defined",
        fixLink: "/pourquoi/vision",
      },
      {
        id: "market_defined",
        label: "Market defined",
        fixLink: "/pourquoi/vision",
      },
      {
        id: "first_decision",
        label: "First decision resolved",
        fixLink: "/pourquoi/decisions",
      },
    ],
  },
  {
    id: 3,
    name: "Equipe",
    color: "#64748b",
    checks: [
      {
        id: "roles_assigned",
        label: "Builder roles assigned",
        fixLink: "/equipe/roles",
      },
    ],
  },
  {
    id: 4,
    name: "Projet",
    color: "#64748b",
    checks: [
      {
        id: "tasks_created",
        label: "Tasks created (5+)",
        fixLink: "/projet/kanban",
      },
      {
        id: "docs_imported",
        label: "Docs imported (1+)",
        fixLink: "/projet/docs",
      },
    ],
  },
  {
    id: 5,
    name: "Ressources",
    color: "#64748b",
    checks: [
      {
        id: "resources_added",
        label: "Resources added (3+)",
        fixLink: "/ressources",
      },
    ],
  },
  {
    id: 6,
    name: "Analytics",
    color: "#64748b",
    checks: [
      {
        id: "first_kpi",
        label: "First KPI logged",
        fixLink: "/analytics/kpis",
      },
    ],
  },
  {
    id: 7,
    name: "Launch",
    color: "#64748b",
    checks: [
      {
        id: "retro_done",
        label: "Retrospective done",
        fixLink: "/analytics/retro",
      },
      {
        id: "personas_defined",
        label: "Personas defined",
        fixLink: "/clients/personas",
      },
    ],
  },
];

export default function ChecklistPage() {
  const { user } = useAuth();
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runChecks();
  }, []);

  async function runChecks() {
    setLoading(true);
    const r = {};

    try {
      // Phase 1: Foundation
      const { error: dbError } = await supabase
        .from("cockpit_members")
        .select("id", { count: "exact", head: true });
      r.db_connected = !dbError;

      const { count: memberCount } = await supabase
        .from("cockpit_members")
        .select("*", { count: "exact", head: true });
      r.members_added = (memberCount || 0) >= 2;

      const { data: admins } = await supabase
        .from("cockpit_members")
        .select("id")
        .eq("role", "admin");
      r.admin_assigned = (admins?.length || 0) >= 1;

      const { data: allMembers } = await supabase
        .from("cockpit_members")
        .select("last_seen_at");
      r.all_logged_in =
        allMembers?.length > 0 &&
        allMembers.every((m) => m.last_seen_at !== null);

      // Phase 2: Pourquoi
      const { data: missionData } = await supabase
        .from("cockpit_vision")
        .select("id")
        .eq("topic", "product")
        .limit(1);
      r.mission_defined = (missionData?.length || 0) > 0;

      const { data: marketData } = await supabase
        .from("cockpit_vision")
        .select("id")
        .eq("topic", "market")
        .limit(1);
      r.market_defined = (marketData?.length || 0) > 0;

      const { data: decisions } = await supabase
        .from("cockpit_decisions")
        .select("id")
        .eq("status", "resolved")
        .limit(1);
      r.first_decision = (decisions?.length || 0) > 0;

      // Phase 3: Equipe
      const { data: roles } = await supabase
        .from("cockpit_members")
        .select("builder_role")
        .not("builder_role", "is", null);
      r.roles_assigned = (roles?.length || 0) > 0;

      // Phase 4: Projet
      const { count: taskCount } = await supabase
        .from("cockpit_tasks")
        .select("*", { count: "exact", head: true });
      r.tasks_created = (taskCount || 0) >= 5;

      const { count: docCount } = await supabase
        .from("cockpit_docs")
        .select("*", { count: "exact", head: true });
      r.docs_imported = (docCount || 0) >= 1;

      // Phase 5: Ressources
      const { count: resCount } = await supabase
        .from("cockpit_resources")
        .select("*", { count: "exact", head: true });
      r.resources_added = (resCount || 0) >= 3;

      // Phase 6: Analytics
      const { data: kpis } = await supabase
        .from("cockpit_kpis")
        .select("id")
        .limit(1);
      r.first_kpi = (kpis?.length || 0) > 0;

      // Phase 7: Launch
      const { data: retros } = await supabase
        .from("cockpit_retro")
        .select("id")
        .limit(1);
      r.retro_done = (retros?.length || 0) > 0;

      const { data: personas } = await supabase
        .from("cockpit_vision")
        .select("id")
        .eq("topic", "personas")
        .limit(1);
      r.personas_defined = (personas?.length || 0) > 0;
    } catch (err) {
      console.error("Checklist check error:", err);
    }

    setResults(r);
    setLoading(false);
  }

  const totalChecks = PHASES.reduce((sum, p) => sum + p.checks.length, 0);
  const passedChecks = Object.values(results).filter(Boolean).length;
  const progressPct = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  // Find next incomplete item
  const nextItem = PHASES.flatMap((p) =>
    p.checks.map((c) => ({ ...c, phase: p.name }))
  ).find((c) => !results[c.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onboarding Checklist"
        subtitle={`${passedChecks}/${totalChecks} completed - ${progressPct}%`}
      />

      {/* Progress bar */}
      <Card>
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-medium">
            <span style={{ color: "#64748b" }}>Overall Progress</span>
            <span style={{ color: "#64748b" }}>{progressPct}%</span>
          </div>
          <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                backgroundColor: progressPct === 100 ? "#22c55e" : "#64748b",
              }}
            />
          </div>
        </div>
      </Card>

      {/* What to do next */}
      {nextItem && !loading && (
        <Card>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "#64748b" }}>
              What to do next
            </h3>
            <div className="flex items-center justify-between">
              <p className="text-gray-700">
                <span className="font-medium">Phase {nextItem.phase}:</span>{" "}
                {nextItem.label}
              </p>
              <a
                href={nextItem.fixLink}
                className="text-sm font-medium px-3 py-1 rounded"
                style={{ backgroundColor: "#64748b", color: "white" }}
              >
                Go fix
              </a>
            </div>
          </div>
        </Card>
      )}

      {progressPct === 100 && !loading && (
        <Card>
          <div className="text-center py-4">
            <p className="text-lg font-bold text-green-600">
              All checks passed! Your project is fully set up.
            </p>
          </div>
        </Card>
      )}

      {/* Phases */}
      {loading ? (
        <Card>
          <p className="text-center py-8 text-gray-400 animate-pulse">
            Running checks...
          </p>
        </Card>
      ) : (
        PHASES.map((phase) => {
          const phasePass = phase.checks.filter((c) => results[c.id]).length;
          const phaseTotal = phase.checks.length;
          const phaseDone = phasePass === phaseTotal;

          return (
            <Card key={phase.id}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold" style={{ color: "#64748b" }}>
                    Phase {phase.id}: {phase.name}
                  </h2>
                  <span
                    className="text-xs font-medium px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: phaseDone ? "#dcfce7" : "#f1f5f9",
                      color: phaseDone ? "#16a34a" : "#64748b",
                    }}
                  >
                    {phasePass}/{phaseTotal}
                  </span>
                </div>

                <div className="space-y-2">
                  {phase.checks.map((check) => {
                    const passed = results[check.id];
                    return (
                      <div
                        key={check.id}
                        className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: passed ? "#dcfce7" : "#fee2e2",
                              color: passed ? "#16a34a" : "#dc2626",
                            }}
                          >
                            {passed ? "\u2713" : "\u2717"}
                          </span>
                          <span
                            className={`text-sm ${passed ? "text-gray-500 line-through" : "text-gray-700"}`}
                          >
                            {check.label}
                          </span>
                        </div>
                        {!passed && (
                          <a
                            href={check.fixLink}
                            className="text-xs font-medium px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: "#64748b",
                              color: "white",
                            }}
                          >
                            Go fix
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
