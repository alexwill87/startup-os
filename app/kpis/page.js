"use client";

import { useEffect, useState } from "react";
import { supabase, SPRINTS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

const TARGETS = {
  waitlist_signups: { min: 30, stretch: 100, label: "Waitlist Signups", icon: "+" },
  users_registered: { min: 15, stretch: 40, label: "Users Registered", icon: "U" },
  users_active_7d: { min: 10, stretch: 25, label: "Active Users (7d)", icon: "A" },
  cvs_generated: { min: 50, stretch: 200, label: "CVs Generated", icon: "C" },
  alerts_sent: { min: 100, stretch: 500, label: "Alerts Sent", icon: "N" },
  users_pro: { min: 1, stretch: 5, label: "Pro Users", icon: "$" },
  mrr_eur: { min: 14, stretch: 70, label: "MRR (EUR)", icon: "E" },
  platforms_live: { min: 6, stretch: 9, label: "Platforms Live", icon: "P" },
};

const METRIC_KEYS = Object.keys(TARGETS);

export default function KPIs() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    sprint: 1,
    waitlist_signups: 0, users_registered: 0, users_active_7d: 0,
    cvs_generated: 0, alerts_sent: 0, users_pro: 0, mrr_eur: 0,
    platforms_live: 0, avg_alert_time_sec: null, notes: "",
  });

  useEffect(() => {
    const current = SPRINTS.find((s) => new Date(s.date) >= new Date());
    if (current) setForm((f) => ({ ...f, sprint: current.id }));
    fetchKPIs();
    const sub = supabase
      .channel("kpis_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_kpis" }, fetchKPIs)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchKPIs() {
    const { data } = await supabase.from("cockpit_kpis").select("*").order("date", { ascending: false });
    setEntries(data || []);
  }

  async function addEntry(e) {
    e.preventDefault();
    await supabase.from("cockpit_kpis").insert({ ...form, created_by: user?.id });
    setShowForm(false);
  }

  // Latest values (most recent entry)
  const latest = entries[0] || {};

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>KPIs — Demo Day Metrics</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          + Log KPIs
        </button>
      </div>

      {/* Target cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {METRIC_KEYS.map((key) => {
          const t = TARGETS[key];
          const val = latest[key] || 0;
          const pctMin = t.min > 0 ? Math.min(100, Math.round((val / t.min) * 100)) : 0;
          const pctStretch = t.stretch > 0 ? Math.min(100, Math.round((val / t.stretch) * 100)) : 0;
          const hitMin = val >= t.min;
          const hitStretch = val >= t.stretch;

          return (
            <div key={key} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{t.label}</span>
                <span style={{
                  fontSize: 11, fontFamily: "var(--font-geist-mono)", padding: "2px 6px", borderRadius: 4,
                  background: hitStretch ? "#064e3b" : hitMin ? "#1e3a5f" : "#1e293b",
                  color: hitStretch ? "#6ee7b7" : hitMin ? "#93c5fd" : "#64748b",
                }}>
                  {hitStretch ? "STRETCH" : hitMin ? "MIN" : `${pctMin}%`}
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: hitStretch ? "#6ee7b7" : hitMin ? "#93c5fd" : "#f1f5f9", marginBottom: 8 }}>
                {key === "mrr_eur" ? `${val}` : val}
              </div>
              {/* Progress bar */}
              <div style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
                <div style={{ flex: 1, height: 4, background: "#1e293b", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${pctStretch}%`, borderRadius: 2, transition: "width 0.3s",
                    background: hitStretch ? "#10b981" : hitMin ? "#3b82f6" : "#475569",
                  }} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", fontFamily: "var(--font-geist-mono)" }}>
                <span>Min: {t.min}</span>
                <span>Stretch: {t.stretch}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alert time */}
      {latest.avg_alert_time_sec && (
        <div className="card" style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: latest.avg_alert_time_sec <= 90 ? "#6ee7b7" : "#fcd34d" }}>
            {latest.avg_alert_time_sec}s
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Avg Alert Time</div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Target: &lt; 90 seconds</div>
          </div>
        </div>
      )}

      {/* Log form */}
      {showForm && (
        <form onSubmit={addEntry} className="card" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Log today's KPIs</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
            {METRIC_KEYS.map((key) => (
              <div key={key}>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>
                  {TARGETS[key].label}
                </label>
                <input
                  type="number"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
                  style={{ width: "100%" }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Sprint</label>
              <select value={form.sprint} onChange={(e) => setForm({ ...form, sprint: Number(e.target.value) })}>
                {SPRINTS.map((s) => <option key={s.id} value={s.id}>S{s.id}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Alert Time (sec)</label>
              <input type="number" value={form.avg_alert_time_sec || ""} onChange={(e) => setForm({ ...form, avg_alert_time_sec: Number(e.target.value) || null })} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Notes</label>
              <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="What happened today..." />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn btn-primary">Save KPIs</button>
            <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* History */}
      <div className="card">
        <div className="card-header">KPI History</div>
        {entries.length === 0 ? (
          <p style={{ color: "#475569", fontSize: 13 }}>No KPI entries yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "var(--font-geist-mono)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <th style={{ padding: "8px 6px", textAlign: "left", color: "#64748b" }}>Date</th>
                  <th style={{ padding: "8px 6px", textAlign: "left", color: "#64748b" }}>S</th>
                  {METRIC_KEYS.map((k) => (
                    <th key={k} style={{ padding: "8px 6px", textAlign: "right", color: "#64748b" }}>
                      {TARGETS[k].label.split(" ")[0]}
                    </th>
                  ))}
                  <th style={{ padding: "8px 6px", textAlign: "left", color: "#64748b" }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #0d1117" }}>
                    <td style={{ padding: "6px" }}>{new Date(e.date).toLocaleDateString("fr-FR")}</td>
                    <td style={{ padding: "6px" }}>S{e.sprint}</td>
                    {METRIC_KEYS.map((k) => (
                      <td key={k} style={{ padding: "6px", textAlign: "right", color: e[k] >= TARGETS[k].min ? "#6ee7b7" : "#f1f5f9" }}>
                        {e[k]}
                      </td>
                    ))}
                    <td style={{ padding: "6px", color: "#94a3b8", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {e.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
