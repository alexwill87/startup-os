"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Badge, Footer,
} from "@/app/components/ui";

export default function V1MyActivityPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchActivity();
    const sub = supabase
      .channel("v1_my_activity_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "cockpit_activity" }, () => fetchActivity())
      .subscribe();
    return () => supabase.removeChannel(sub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function fetchActivity() {
    if (!user?.id) return;
    const { data } = await supabase
      .from("cockpit_activity")
      .select("*")
      .eq("actor_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setActivities(data || []);
    setLoading(false);
  }

  const todayCount = activities.filter((a) => new Date(a.created_at).toDateString() === new Date().toDateString()).length;
  const weekCount = activities.filter((a) => {
    const w = new Date();
    w.setDate(w.getDate() - 7);
    return new Date(a.created_at) > w;
  }).length;

  return (
    <PageLayout>
      <Topbar breadcrumb={["Me", "Activity"]} />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="My Activity" description="History of your contributions to the cockpit." />

        <KpiRow>
          <KpiCard label="Total" value={String(activities.length)} trend="my actions" variant="accent" />
          <KpiCard label="Today" value={String(todayCount)} trend="actions" variant="success" />
          <KpiCard label="This week" value={String(weekCount)} trend="actions" variant="warn" />
        </KpiRow>

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>
        ) : activities.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No activity yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {activities.map((a) => (
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
                  {a.metadata?.title && <span style={{ marginLeft: "6px" }}>· {a.metadata.title}</span>}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-3)" }}>
                  {new Date(a.created_at).toLocaleString()}
                </span>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
