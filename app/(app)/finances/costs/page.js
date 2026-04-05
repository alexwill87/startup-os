"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#ef4444";

const API_COSTS = {
  haiku: { name: "Claude Haiku", costPerCall: 0.001, unit: "per call" },
  sonnet: { name: "Claude Sonnet", costPerCall: 0.01, unit: "per call" },
};

export default function CostsPage() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestKPIs = async () => {
      const { data } = await supabase
        .from("cockpit_kpis")
        .select("*")
        .order("date", { ascending: false })
        .limit(1);
      setKpis(data?.[0] || null);
      setLoading(false);
    };
    fetchLatestKPIs();
  }, []);

  const alertsSent = kpis?.alerts_sent || 0;
  const cvsGenerated = kpis?.cvs_generated || 0;

  // Estimate: alerts use Haiku, CVs use Sonnet
  const alertsCost = alertsSent * API_COSTS.haiku.costPerCall;
  const cvsCost = cvsGenerated * API_COSTS.sonnet.costPerCall;
  const totalCurrent = alertsCost + cvsCost;

  // Projections at scale
  const projections = [
    { label: "Current", alerts: alertsSent, cvs: cvsGenerated },
    { label: "10x Growth", alerts: alertsSent * 10, cvs: cvsGenerated * 10 },
    { label: "100x Growth", alerts: alertsSent * 100, cvs: cvsGenerated * 100 },
    { label: "Target (500 alerts, 200 CVs)", alerts: 500, cvs: 200 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Costs Breakdown"
        subtitle="API cost estimates and projections"
        color={COLOR}
      />

      {/* API pricing reference */}
      <div>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">API Pricing</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.values(API_COSTS).map((api) => (
            <Card key={api.name}>
              <div className="flex items-center justify-between">
                <p className="text-white text-sm font-medium">{api.name}</p>
                <p className="text-zinc-300 font-mono text-sm">
                  ~${api.costPerCall} {api.unit}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading KPI data...</p>
      ) : (
        <>
          {/* Current usage costs */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Current Month Estimates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card>
                <p className="text-zinc-400 text-xs">Alerts (Haiku)</p>
                <p className="text-white text-lg font-bold">{alertsSent} calls</p>
                <p className="text-red-400 font-mono text-sm">${alertsCost.toFixed(3)}</p>
              </Card>
              <Card>
                <p className="text-zinc-400 text-xs">CV Generation (Sonnet)</p>
                <p className="text-white text-lg font-bold">{cvsGenerated} calls</p>
                <p className="text-red-400 font-mono text-sm">${cvsCost.toFixed(3)}</p>
              </Card>
              <Card>
                <p className="text-zinc-400 text-xs">Total Estimated</p>
                <p className="text-2xl font-bold" style={{ color: COLOR }}>
                  ${totalCurrent.toFixed(3)}
                </p>
                <p className="text-zinc-500 text-xs">this period</p>
              </Card>
            </div>
          </div>

          {/* Cost projections */}
          <div>
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Cost Projections</h3>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-500 text-left">
                      <th className="pb-3 pr-4">Scenario</th>
                      <th className="pb-3 pr-4">Alerts</th>
                      <th className="pb-3 pr-4">CVs</th>
                      <th className="pb-3 pr-4">Alert Cost</th>
                      <th className="pb-3 pr-4">CV Cost</th>
                      <th className="pb-3">Total/mo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projections.map((p) => {
                      const ac = p.alerts * API_COSTS.haiku.costPerCall;
                      const cc = p.cvs * API_COSTS.sonnet.costPerCall;
                      return (
                        <tr key={p.label} className="border-t border-zinc-800">
                          <td className="py-2 pr-4 text-zinc-300">{p.label}</td>
                          <td className="py-2 pr-4 text-zinc-400">{p.alerts}</td>
                          <td className="py-2 pr-4 text-zinc-400">{p.cvs}</td>
                          <td className="py-2 pr-4 text-zinc-400 font-mono">${ac.toFixed(2)}</td>
                          <td className="py-2 pr-4 text-zinc-400 font-mono">${cc.toFixed(2)}</td>
                          <td className="py-2 font-mono font-bold" style={{ color: COLOR }}>
                            ${(ac + cc).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {!kpis && (
            <Card>
              <p className="text-zinc-400 text-center py-4">
                No KPI data yet. Log your first KPIs to see cost estimates.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
