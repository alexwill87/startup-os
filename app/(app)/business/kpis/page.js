"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Badge, Footer,
  FormGroup, FormLabel, FormInput, FormTextarea,
} from "@/app/components/ui";

const TARGETS = {
  waitlist_signups: { min: 30, stretch: 100, label: "Waitlist Signups" },
  users_registered: { min: 15, stretch: 40, label: "Registered Users" },
  users_active_7d: { min: 10, stretch: 25, label: "Active Users (7d)" },
  cvs_generated: { min: 50, stretch: 200, label: "Outputs Generated" },
  alerts_sent: { min: 100, stretch: 500, label: "Alerts Sent" },
  users_pro: { min: 1, stretch: 5, label: "Pro Users" },
  mrr_eur: { min: 14, stretch: 70, label: "MRR (EUR)" },
  platforms_live: { min: 6, stretch: 9, label: "Platforms Live" },
};

const emptyForm = {
  date: new Date().toISOString().split("T")[0],
  waitlist_signups: "",
  users_registered: "",
  users_active_7d: "",
  cvs_generated: "",
  alerts_sent: "",
  users_pro: "",
  mrr_eur: "",
  platforms_live: "",
  notes: "",
};

export default function V1KpisPage() {
  const { canEdit } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchKPIs();
    const ch = supabase
      .channel("v1_kpis_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_kpis" }, fetchKPIs)
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, []);

  async function fetchKPIs() {
    const { data } = await supabase.from("cockpit_kpis").select("*").order("date", { ascending: false });
    setHistory(data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = {};
    Object.keys(emptyForm).forEach((key) => {
      if (form[key] !== "" && form[key] !== undefined) {
        if (["date", "notes"].includes(key)) payload[key] = form[key];
        else payload[key] = parseFloat(form[key]);
      }
    });
    await supabase.from("cockpit_kpis").insert(payload);
    setForm(emptyForm);
    setShowForm(false);
  }

  const latest = history.length > 0 ? history[0] : null;
  const targetsHit = latest
    ? Object.entries(TARGETS).filter(([key, t]) => (latest[key] || 0) >= t.min).length
    : 0;
  const stretchHit = latest
    ? Object.entries(TARGETS).filter(([key, t]) => (latest[key] || 0) >= t.stretch).length
    : 0;

  return (
    <PageLayout>
      <Topbar
        breadcrumb={["Business", "KPIs"]}
        actions={
          <>
            <Button variant="ghost" onClick={fetchKPIs}>Refresh</Button>
            {canEdit && <Button variant="primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "Log entry"}</Button>}
          </>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="KPIs" description="Key metrics with min/stretch targets and history." />

        <KpiRow>
          <KpiCard label="Targets hit" value={`${targetsHit}/${Object.keys(TARGETS).length}`} trend="min reached" variant={targetsHit === Object.keys(TARGETS).length ? "success" : "warn"} />
          <KpiCard label="Stretch" value={`${stretchHit}/${Object.keys(TARGETS).length}`} trend="stretch reached" variant="accent" />
          <KpiCard label="Entries" value={String(history.length)} trend="total snapshots" variant="muted" />
          <KpiCard label="Last update" value={latest?.date || "—"} trend="" variant="default" />
        </KpiRow>

        {showForm && canEdit && (
          <section style={{ padding: "1.25rem 1.5rem", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>Log a new KPI snapshot</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <FormGroup>
                <FormLabel>Date</FormLabel>
                <FormInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </FormGroup>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
                {Object.entries(TARGETS).map(([key, t]) => (
                  <FormGroup key={key}>
                    <FormLabel>{t.label}</FormLabel>
                    <FormInput type="number" step="any" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} placeholder={`min ${t.min}`} />
                  </FormGroup>
                ))}
              </div>
              <FormGroup>
                <FormLabel>Notes</FormLabel>
                <FormTextarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </FormGroup>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="primary" type="submit">Save</Button>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </section>
        )}

        {/* Latest snapshot */}
        {latest && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px", marginBottom: "1.5rem" }}>
            {Object.entries(TARGETS).map(([key, t]) => {
              const value = latest[key] || 0;
              const pct = t.min > 0 ? Math.min((value / t.min) * 100, 100) : 0;
              const hitMin = value >= t.min;
              const hitStretch = value >= t.stretch;
              return (
                <article
                  key={key}
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "1rem 1.25rem",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                    {t.label}
                  </div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text)", marginTop: "6px" }}>{value}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "4px" }}>
                    Min {t.min} · Stretch {t.stretch}
                  </div>
                  <div style={{ height: "4px", background: "var(--bg-3)", borderRadius: "2px", overflow: "hidden", marginTop: "8px" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: hitStretch ? "var(--success)" : hitMin ? "var(--accent)" : "var(--warn)",
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                  {hitStretch ? (
                    <Badge variant="success">Stretch hit</Badge>
                  ) : hitMin ? (
                    <Badge variant="info">Min hit</Badge>
                  ) : (
                    <Badge variant="warn">Below min</Badge>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {/* History */}
        <h2 style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: "10px" }}>
          History ({history.length})
        </h2>
        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)" }}>Loading...</p>
        ) : history.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)" }}>No KPI entries yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {history.slice(0, 10).map((h) => (
              <article
                key={h.id}
                style={{
                  background: "var(--bg-2)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>{h.date}</span>
                <span style={{ fontSize: "12px", color: "var(--text-3)" }}>
                  Signups: {h.waitlist_signups || 0} · Users: {h.users_registered || 0} · MRR: {h.mrr_eur || 0}€
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
