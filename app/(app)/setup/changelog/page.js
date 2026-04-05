"use client";

import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const CHANGELOG = [
  {
    date: "April 5, 2026",
    title: "Project OS v1 launched",
    items: [
      "7 pillars: Pourquoi, Equipe, Ressources, Projet, Clients, Finances, Analytics",
      "25+ pages, 34 routes",
      "Sidebar navigation with collapsible pillars",
      "Auth: magic link invitations, dynamic member management",
      "Supabase: 8 tables, RLS, Realtime on all",
      "Tailwind CSS v4 migration",
      "Setup checklist with 7 phases",
      "SVG favicon",
      "Deployed on Vercel",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Changelog"
        subtitle="History of what was built"
      />

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute left-6 top-0 bottom-0 w-0.5"
          style={{ backgroundColor: "#e2e8f0" }}
        />

        <div className="space-y-8">
          {CHANGELOG.map((entry, idx) => (
            <div key={idx} className="relative pl-16">
              {/* Timeline dot */}
              <div
                className="absolute left-4 top-2 w-5 h-5 rounded-full border-2 border-white"
                style={{
                  backgroundColor: "#64748b",
                  boxShadow: "0 0 0 3px #f1f5f9",
                }}
              />

              <Card>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p
                      className="text-xs font-medium uppercase tracking-wide"
                      style={{ color: "#64748b" }}
                    >
                      {entry.date}
                    </p>
                    <h2 className="text-lg font-bold text-gray-800">
                      {entry.title}
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {entry.items.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span
                          className="w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 mt-0.5"
                          style={{
                            backgroundColor: "#dcfce7",
                            color: "#16a34a",
                          }}
                        >
                          {"\u2713"}
                        </span>
                        <span className="text-sm text-gray-600">{item}</span>
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
