"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Badge, Footer,
} from "@/app/components/ui";

export default function V1MemoryPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchActivity();
    const sub = supabase
      .channel("v1_memory_rt")
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

  const entityTypes = [...new Set(activities.map((a) => a.entity_type))].filter(Boolean);
  const filtered = filter === "all" ? activities : activities.filter((a) => a.entity_type === filter);

  // Group by date
  const grouped = {};
  filtered.forEach((a) => {
    const day = new Date(a.created_at).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(a);
  });

  const todayCount = activities.filter((a) => {
    const today = new Date().toDateString();
    return new Date(a.created_at).toDateString() === today;
  }).length;
  const weekCount = activities.filter((a) => {
    const w = new Date();
    w.setDate(w.getDate() - 7);
    return new Date(a.created_at) > w;
  }).length;

  return (
    <PageLayout>
      <Topbar breadcrumb={["Focus", "Memory"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle
          title="Memory"
          description="Collective and individual memory of the project. Live feed of every action."
        />

        <KpiRow>
          <KpiCard label="Total" value={String(activities.length)} trend="last 100 events" variant="accent" />
          <KpiCard label="Today" value={String(todayCount)} trend="actions" variant="success" />
          <KpiCard label="This week" value={String(weekCount)} trend="actions" variant="warn" />
          <KpiCard label="Entity types" value={String(entityTypes.length)} trend="categories" variant="muted" />
        </KpiRow>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "1rem" }}>
          {["all", ...entityTypes].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                padding: "5px 11px",
                borderRadius: "var(--radius)",
                border: "1px solid var(--border)",
                background: filter === t ? "var(--bg-3)" : "transparent",
                color: filter === t ? "var(--text)" : "var(--text-3)",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No activity yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {Object.entries(grouped).map(([day, events]) => (
              <section key={day}>
                <h3
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--text-3)",
                    textTransform: "uppercase",
                    letterSpacing: "0.6px",
                    marginBottom: "10px",
                  }}
                >
                  {day} · {events.length} {events.length === 1 ? "event" : "events"}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {events.map((a) => (
                    <article
                      key={a.id}
                      style={{
                        background: "var(--bg-2)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <Badge variant="neutral">{a.entity_type}</Badge>
                      <span style={{ fontSize: "12.5px", color: "var(--text-2)", flex: 1 }}>
                        <strong style={{ color: "var(--text)", fontWeight: 500 }}>{a.action}</strong>
                        {a.metadata?.title && (
                          <span style={{ marginLeft: "6px" }}>· {a.metadata.title}</span>
                        )}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
                        {new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
