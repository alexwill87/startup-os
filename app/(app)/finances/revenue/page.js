"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#ef4444";

const TARGETS = {
  users_pro: { min: 1, stretch: 5, label: "Pro Users" },
  mrr_eur: { min: 14, stretch: 70, label: "MRR (EUR)" },
};

export default function RevenuePage() {
  const [kpiHistory, setKpiHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("cockpit_kpis")
        .select("date, users_pro, mrr_eur")
        .order("date", { ascending: true });
      setKpiHistory(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const latest = kpiHistory.length > 0 ? kpiHistory[kpiHistory.length - 1] : null;
  const usersPro = latest?.users_pro || 0;
  const mrr = latest?.mrr_eur || 0;

  // Unit economics estimates
  const arpu = usersPro > 0 ? mrr / usersPro : 14; // default to plan price
  const estimatedLTV = arpu * 12; // 12 month lifetime assumption
  const estimatedCAC = 0; // organic only for now

  const maxMrr = Math.max(...kpiHistory.map((k) => k.mrr_eur || 0), TARGETS.mrr_eur.stretch);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revenue"
        subtitle="Revenue tracking and unit economics"
        color={COLOR}
      />

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : (
        <>
          {/* Current metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(TARGETS).map(([key, target]) => {
              const value = latest?.[key] || 0;
              const pctMin = target.min > 0 ? Math.min((value / target.min) * 100, 100) : 0;
              const pctStretch = target.stretch > 0 ? Math.min((value / target.stretch) * 100, 100) : 0;
              return (
                <Card key={key}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-zinc-400 text-sm">{target.label}</p>
                      <p className="text-2xl font-bold text-white">
                        {key === "mrr_eur" ? `${value} EUR` : value}
                      </p>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Min: {target.min}</span>
                        <span>Stretch: {target.stretch}</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-3">
                        <div
                          className="h-3 rounded-full transition-all"
                          style={{
                            width: `${pctStretch}%`,
                            backgroundColor: pctMin >= 100 ? "#22c55e" : COLOR,
                          }}
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        {pctMin >= 100 ? "Min target reached!" : `${pctMin.toFixed(0)}% to min target`}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* MRR progression */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3">MRR Progression</h3>
            <Card>
              {kpiHistory.length === 0 ? (
                <p className="text-zinc-400 text-center py-6">No KPI data yet.</p>
              ) : (
                <div className="space-y-2">
                  {kpiHistory.map((entry) => {
                    const pct = maxMrr > 0 ? ((entry.mrr_eur || 0) / maxMrr) * 100 : 0;
                    return (
                      <div key={entry.date} className="flex items-center gap-3">
                        <span className="text-zinc-500 text-xs w-20 shrink-0">
                          {entry.date}
                        </span>
                        <div className="flex-1 bg-zinc-800 rounded-full h-6 relative">
                          <div
                            className="h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                            style={{
                              width: `${Math.max(pct, 5)}%`,
                              backgroundColor: COLOR,
                            }}
                          >
                            <span className="text-xs text-white font-mono">
                              {entry.mrr_eur || 0} EUR
                            </span>
                          </div>
                        </div>
                        <span className="text-zinc-500 text-xs w-16 text-right shrink-0">
                          {entry.users_pro || 0} pro
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Unit economics */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Unit Economics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <p className="text-zinc-400 text-xs">ARPU</p>
                <p className="text-white text-xl font-bold">{arpu.toFixed(0)} EUR/mo</p>
                <p className="text-zinc-500 text-xs">per pro user</p>
              </Card>
              <Card>
                <p className="text-zinc-400 text-xs">Estimated LTV</p>
                <p className="text-white text-xl font-bold">{estimatedLTV.toFixed(0)} EUR</p>
                <p className="text-zinc-500 text-xs">12-month assumption</p>
              </Card>
              <Card>
                <p className="text-zinc-400 text-xs">Estimated CAC</p>
                <p className="text-green-400 text-xl font-bold">{estimatedCAC} EUR</p>
                <p className="text-zinc-500 text-xs">organic acquisition only</p>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
