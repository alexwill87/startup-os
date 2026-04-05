"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#10b981";

const FREE_TOOLS = [
  { name: "Supabase", description: "Database & Auth (Free tier)", tier: "Free" },
  { name: "Vercel", description: "Hosting & Deployment (Free tier)", tier: "Free" },
  { name: "GitHub", description: "Version Control & CI (Free tier)", tier: "Free" },
];

export default function BudgetPage() {
  const { user } = useAuth();
  const [budgetItems, setBudgetItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", cost: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBudgetItems();
  }, []);

  async function fetchBudgetItems() {
    try {
      const { data, error } = await supabase
        .from("cockpit_resources")
        .select("*")
        .eq("category", "admin")
        .contains("tags", ["budget"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBudgetItems(data || []);
    } catch (err) {
      console.error("Error fetching budget items:", err);
    } finally {
      setLoading(false);
    }
  }

  async function addBudgetItem() {
    if (!form.title || !form.cost) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("cockpit_resources").insert({
        title: form.title,
        url: "",
        category: "admin",
        description: form.description || null,
        tags: ["budget", `${form.cost}€/mo`],
        pinned: false,
        added_by: user?.email || "unknown",
      });
      if (error) throw error;
      setForm({ title: "", description: "", cost: "" });
      setShowForm(false);
      await fetchBudgetItems();
    } catch (err) {
      console.error("Error adding budget item:", err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id) {
    try {
      const { error } = await supabase.from("cockpit_resources").delete().eq("id", id);
      if (error) throw error;
      await fetchBudgetItems();
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  }

  function parseCost(item) {
    const costTag = (item.tags || []).find((t) => t.includes("€/mo"));
    if (costTag) {
      const num = parseFloat(costTag.replace("€/mo", ""));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  }

  const totalMonthly = budgetItems.reduce((sum, item) => sum + parseCost(item), 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="Budget"
        subtitle="Project costs and monthly burn rate"
        color={COLOR}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Free Tier Tools</p>
            <p className="text-3xl font-bold text-emerald-400">{FREE_TOOLS.length}</p>
            <p className="text-xs text-gray-500 mt-1">No cost</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Paid Services</p>
            <p className="text-3xl font-bold text-orange-400">{budgetItems.length}</p>
            <p className="text-xs text-gray-500 mt-1">Active subscriptions</p>
          </div>
        </Card>
        <Card>
          <div className="text-center">
            <p className="text-sm text-gray-400 mb-1">Monthly Burn Rate</p>
            <p className="text-3xl font-bold text-white">{totalMonthly.toFixed(2)}€</p>
            <p className="text-xs text-gray-500 mt-1">per month</p>
          </div>
        </Card>
      </div>

      {/* Free Tier Section */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
          Free Tier
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FREE_TOOLS.map((tool) => (
            <Card key={tool.name}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">{tool.name}</h3>
                  <p className="text-xs text-gray-400">{tool.description}</p>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-400/20 text-emerald-400">
                  {tool.tier}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Paid Services Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-400 inline-block" />
            Paid Services
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: COLOR }}
          >
            {showForm ? "Cancel" : "+ Add Item"}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <Card>
            <div className="space-y-4 mb-4">
              <h3 className="text-lg font-bold text-white">New Budget Item</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Service name *"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="number"
                  placeholder="Cost (€/month) *"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={addBudgetItem}
                disabled={saving || !form.title || !form.cost}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors"
                style={{ backgroundColor: COLOR }}
              >
                {saving ? "Adding..." : "Add Item"}
              </button>
            </div>
          </Card>
        )}

        {/* Items List */}
        {loading ? (
          <p className="text-gray-400 text-center py-8">Loading budget items...</p>
        ) : budgetItems.length === 0 ? (
          <Card>
            <p className="text-gray-400 text-center py-4">No paid services yet. Looking good!</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {budgetItems.map((item) => {
              const cost = parseCost(item);
              return (
                <Card key={item.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-semibold">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-gray-400">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-orange-400 font-bold">{cost.toFixed(2)}€/mo</span>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-400/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Total */}
            <div className="flex justify-end pt-2">
              <div className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700">
                <span className="text-gray-400 text-sm mr-3">Total:</span>
                <span className="text-white font-bold text-lg">{totalMonthly.toFixed(2)}€/mo</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
