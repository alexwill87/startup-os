"use client";

import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const ROADMAP = [
  {
    version: "V1",
    title: "MVP",
    status: "current",
    done: true,
    items: [
      "7 pillars with sub-pages",
      "Sidebar navigation",
      "Invitation-only auth",
      "Kanban board, Decisions, KPIs, Docs, Retro, Resources",
      "Setup checklist",
      "Real-time sync",
    ],
  },
  {
    version: "V2",
    title: "Polish",
    status: "planned",
    done: false,
    items: [
      "Wizard guided onboarding",
      "File uploads per member",
      "Notifications (email + in-app)",
      "Presentation mode",
      "Custom themes",
      "Activity feed",
      "Search across pillars",
    ],
  },
  {
    version: "V3",
    title: "Intelligence",
    status: "planned",
    done: false,
    items: [
      "AI Co-Pilot",
      "Auto-generated pitch deck",
      "Connectors (Slack, Calendar, GitHub)",
      "Export (PDF, Notion)",
      "Multi-project support",
    ],
  },
];

export default function RoadmapOSPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Roadmap"
        subtitle="What's built and what's planned for Project OS"
      />

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-6 top-0 bottom-0 w-0.5"
          style={{ backgroundColor: "#e2e8f0" }}
        />

        <div className="space-y-8">
          {ROADMAP.map((release) => (
            <div key={release.version} className="relative pl-16">
              {/* Timeline dot */}
              <div
                className="absolute left-4 top-2 w-5 h-5 rounded-full border-2 border-white"
                style={{
                  backgroundColor: release.done ? "#22c55e" : "#64748b",
                  boxShadow: "0 0 0 3px " + (release.done ? "#dcfce7" : "#f1f5f9"),
                }}
              />

              <Card>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-lg font-bold"
                      style={{ color: "#64748b" }}
                    >
                      {release.version}
                    </span>
                    <span className="text-lg font-semibold text-gray-800">
                      {release.title}
                    </span>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: release.done ? "#dcfce7" : "#f1f5f9",
                        color: release.done ? "#16a34a" : "#64748b",
                      }}
                    >
                      {release.status === "current"
                        ? "Current"
                        : "Planned"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {release.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
                          style={{
                            backgroundColor: release.done
                              ? "#dcfce7"
                              : "#f1f5f9",
                            color: release.done ? "#16a34a" : "#94a3b8",
                          }}
                        >
                          {release.done ? "\u2713" : "\u2022"}
                        </span>
                        <span
                          className={`text-sm ${release.done ? "text-gray-600" : "text-gray-500"}`}
                        >
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
