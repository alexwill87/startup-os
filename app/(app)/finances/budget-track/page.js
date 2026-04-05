"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#ef4444";

const FREE_TIERS = [
  { name: "Supabase Free", cost: 0, note: "500MB DB, 1GB storage, 2GB bandwidth" },
  { name: "Vercel Free", cost: 0, note: "100GB bandwidth, serverless functions" },
  { name: "GitHub Free", cost: 0, note: "Unlimited public repos, actions minutes" },
];

export default function BudgetTrackPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", cost: "", note: "" });

  const fetchExpenses = async () => {
    const { data } = await supabase
      .from("cockpit_resources")
      .select("*")
      .eq("category", "admin")
      .order("created_at", { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const parseCost = (description) => {
    const match = description?.match(/cost:\s*(\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await supabase.from("cockpit_resources").insert({
      category: "admin",
      title: form.name,
      description: `cost: ${form.cost} EUR/mo — ${form.note}`,
      builder: user?.email || "unknown",
    });
    setForm({ name: "", cost: "", note: "" });
    setShowForm(false);
    fetchExpenses();
  };

  const totalBurn = expenses.reduce((sum, e) => sum + parseCost(e.description), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Tracker"
        subtitle="Monthly expenses and burn rate"
        color={COLOR}
      />

      {/* Burn rate summary */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-zinc-400 text-sm">Monthly Burn Rate</p>
            <p className="text-3xl font-bold text-white">{totalBurn.toFixed(2)} EUR</p>
          </div>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{
              backgroundColor: totalBurn === 0 ? "#22c55e20" : "#ef444420",
              color: totalBurn === 0 ? "#22c55e" : "#ef4444",
            }}
          >
            {totalBurn === 0 ? "0" : totalBurn.toFixed(0)}
          </div>
        </div>
      </Card>

      {/* Free tiers */}
      <div>
        <h3 className="text-sm font-medium text-zinc-400 mb-3">Free Tier Services</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FREE_TIERS.map((item) => (
            <Card key={item.name}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 text-sm font-bold">
                  $0
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{item.name}</p>
                  <p className="text-zinc-500 text-xs">{item.note}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Paid expenses */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-400">Monthly Expenses</h3>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3 py-1 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: COLOR }}
          >
            {showForm ? "Cancel" : "+ Add Expense"}
          </button>
        </div>

        {showForm && (
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Service Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Claude API"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Monthly Cost (EUR)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  placeholder="0.00"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Note</label>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Usage details..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: COLOR }}
              >
                Save Expense
              </button>
            </form>
          </Card>
        )}

        {loading ? (
          <p className="text-zinc-500 text-sm">Loading...</p>
        ) : expenses.length === 0 ? (
          <Card>
            <p className="text-zinc-400 text-center py-6">
              No paid expenses yet. Running on free tiers only.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {expenses.map((e) => (
              <Card key={e.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{e.title}</p>
                    <p className="text-zinc-500 text-xs">{e.description}</p>
                  </div>
                  <p className="text-red-400 font-mono text-sm font-bold">
                    {parseCost(e.description).toFixed(2)} EUR
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
