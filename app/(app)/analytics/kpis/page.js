"use client";
import { useState, useEffect } from "react";
import { supabase, SPRINTS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#06b6d4";

const TARGETS = {
  waitlist_signups: { min: 30, stretch: 100, label: "Waitlist Signups" },
  users_registered: { min: 15, stretch: 40, label: "Registered Users" },
  users_active_7d: { min: 10, stretch: 25, label: "Active Users (7d)" },
  cvs_generated: { min: 50, stretch: 200, label: "CVs Generated" },
  alerts_sent: { min: 100, stretch: 500, label: "Alerts Sent" },
  users_pro: { min: 1, stretch: 5, label: "Pro Users" },
  mrr_eur: { min: 14, stretch: 70, label: "MRR (EUR)" },
  platforms_live: { min: 6, stretch: 9, label: "Platforms Live" },
};

const emptyForm = {
  date: new Date().toISOString().split("T")[0],
  sprint: "",
  waitlist_signups: "",
  users_registered: "",
  users_active_7d: "",
  cvs_generated: "",
  alerts_sent: "",
  users_pro: "",
  mrr_eur: "",
  platforms_live: "",
  avg_alert_time_sec: "",
  notes: "",
};

export default function KPIsPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchKPIs = async () => {
    const { data } = await supabase
      .from("cockpit_kpis")
      .select("*")
      .order("date", { ascending: false });
    setHistory(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchKPIs();
    const channel = supabase
      .channel("kpis-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_kpis" }, () => {
        fetchKPIs();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {};
    Object.keys(emptyForm).forEach((key) => {
      if (form[key] !== "" && form[key] !== undefined) {
        if (["date", "sprint", "notes"].includes(key)) {
          payload[key] = form[key];
        } else {
          payload[key] = parseFloat(form[key]);
        }
      }
    });
    await supabase.from("cockpit_kpis").insert(payload);
    setForm(emptyForm);
    setShowForm(false);
    fetchKPIs();
  };

  const latest = history.length > 0 ? history[0] : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="KPIs"
        subtitle="Key Performance Indicators tracking"
        color={COLOR}
      />

      {/* Stat cards with progress bars */}
      {latest && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(TARGETS).map(([key, target]) => {
            const value = latest[key] || 0;
            const pctMin = target.min > 0 ? Math.min((value / target.min) * 100, 100) : 0;
            const pctStretch = target.stretch > 0 ? Math.min((value / target.stretch) * 100, 100) : 0;
            const hitMin = pctMin >= 100;
            return (
              <Card key={key}>
                <div className="space-y-2">
                  <p className="text-zinc-400 text-xs">{target.label}</p>
                  <p className="text-white text-2xl font-bold">{value}</p>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${pctStretch}%`,
                        backgroundColor: hitMin ? "#22c55e" : COLOR,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>Min: {target.min}</span>
                    <span>Stretch: {target.stretch}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add KPI form */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: COLOR }}
        >
          {showForm ? "Cancel" : "+ Log KPIs"}
        </button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Log KPI Entry</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Sprint</label>
                <input
                  type="text"
                  value={form.sprint}
                  onChange={(e) => setForm({ ...form, sprint: e.target.value })}
                  placeholder="e.g. S1"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
              {Object.entries(TARGETS).map(([key, target]) => (
                <div key={key}>
                  <label className="block text-sm text-zinc-400 mb-1">{target.label}</label>
                  <input
                    type="number"
                    step="any"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder="0"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Avg Alert Time (sec)</label>
                <input
                  type="number"
                  step="any"
                  value={form.avg_alert_time_sec}
                  onChange={(e) => setForm({ ...form, avg_alert_time_sec: e.target.value })}
                  placeholder="0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Any comments..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: COLOR }}
            >
              Save KPI Entry
            </button>
          </form>
        </Card>
      )}

      {/* History table */}
      <div>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">History</h3>
        {loading ? (
          <p className="text-zinc-500 text-sm">Loading...</p>
        ) : history.length === 0 ? (
          <Card>
            <p className="text-zinc-400 text-center py-6">No KPI entries yet.</p>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-zinc-500 text-left text-xs">
                    <th className="pb-2 pr-3">Date</th>
                    <th className="pb-2 pr-3">Sprint</th>
                    {Object.values(TARGETS).map((t) => (
                      <th key={t.label} className="pb-2 pr-3">{t.label}</th>
                    ))}
                    <th className="pb-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id || row.date} className="border-t border-zinc-800">
                      <td className="py-2 pr-3 text-zinc-300 whitespace-nowrap">{row.date}</td>
                      <td className="py-2 pr-3 text-zinc-400">{row.sprint}</td>
                      {Object.keys(TARGETS).map((key) => (
                        <td key={key} className="py-2 pr-3 text-zinc-400 font-mono">
                          {row[key] ?? "-"}
                        </td>
                      ))}
                      <td className="py-2 text-zinc-500 text-xs max-w-[150px] truncate">
                        {row.notes}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
