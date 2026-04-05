"use client";
import { useState, useEffect } from "react";
import { supabase, SPRINTS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#f59e0b";
const CATEGORIES = [
  { key: "keep", label: "Keep", color: "text-green-400", border: "border-green-500/30", bg: "bg-green-500/10" },
  { key: "stop", label: "Stop", color: "text-red-400", border: "border-red-500/30", bg: "bg-red-500/10" },
  { key: "try", label: "Try", color: "text-blue-400", border: "border-blue-500/30", bg: "bg-blue-500/10" },
];

export default function RetroPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sprintFilter, setSprintFilter] = useState(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const cs = [...SPRINTS].reverse().find((s) => s.date <= todayStr) || SPRINTS[0];
    return cs.id;
  });
  const [inputs, setInputs] = useState({ keep: "", stop: "", try: "" });

  useEffect(() => {
    fetchItems();
    const channel = supabase
      .channel("retro-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_retro" }, () => fetchItems())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sprintFilter]);

  async function fetchItems() {
    const { data } = await supabase
      .from("cockpit_retro")
      .select("*")
      .eq("sprint", sprintFilter)
      .order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  }

  async function addItem(category) {
    const body = inputs[category]?.trim();
    if (!body) return;
    await supabase.from("cockpit_retro").insert({ sprint: sprintFilter, category, body });
    setInputs({ ...inputs, [category]: "" });
  }

  async function deleteItem(id) {
    if (!confirm("Supprimer cet item ?")) return;
    await supabase.from("cockpit_retro").delete().eq("id", id);
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Rétrospective" color={COLOR} />

      {/* Sprint filter */}
      <select
        value={sprintFilter}
        onChange={(e) => setSprintFilter(Number(e.target.value))}
        className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
      >
        {SPRINTS.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      {loading ? (
        <p className="text-zinc-400">Chargement...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => {
            const catItems = items.filter((i) => i.category === cat.key);
            return (
              <div key={cat.key} className="space-y-3">
                <h3 className={`text-lg font-bold ${cat.color}`}>{cat.label}</h3>

                {/* Add input */}
                <div className="flex gap-2">
                  <input
                    placeholder={`Ajouter un ${cat.label}...`}
                    value={inputs[cat.key]}
                    onChange={(e) => setInputs({ ...inputs, [cat.key]: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addItem(cat.key)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white"
                  />
                  <button
                    onClick={() => addItem(cat.key)}
                    className="px-3 py-2 rounded text-sm font-medium text-black"
                    style={{ backgroundColor: COLOR }}
                  >
                    +
                  </button>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border ${cat.border} ${cat.bg} flex items-start justify-between gap-2`}
                    >
                      <p className="text-sm text-zinc-200">{item.body}</p>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-zinc-500 hover:text-red-400 text-xs shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {catItems.length === 0 && (
                    <p className="text-xs text-zinc-500 text-center py-4">Aucun item</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
