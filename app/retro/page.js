"use client";

import { useEffect, useState } from "react";
import { supabase, SPRINTS } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

const CATEGORIES = [
  { id: "keep", label: "Keep", color: "#6ee7b7", bg: "#064e3b33" },
  { id: "stop", label: "Stop", color: "#fca5a5", bg: "#450a0a33" },
  { id: "try", label: "Try", color: "#93c5fd", bg: "#1e3a5f33" },
];

export default function Retro() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [activeSprint, setActiveSprint] = useState(
    SPRINTS.find((s) => new Date(s.date) >= new Date())?.id || 1
  );
  const [newItem, setNewItem] = useState({ keep: "", stop: "", try: "" });

  useEffect(() => {
    fetchItems();
    const sub = supabase
      .channel("retro_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_retro" }, fetchItems)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchItems() {
    const { data } = await supabase
      .from("cockpit_retro")
      .select("*")
      .order("created_at", { ascending: true });
    setItems(data || []);
  }

  async function addItem(category) {
    const body = newItem[category]?.trim();
    if (!body) return;
    await supabase.from("cockpit_retro").insert({
      sprint: activeSprint,
      category,
      body,
      author_id: user.id,
    });
    setNewItem({ ...newItem, [category]: "" });
  }

  async function deleteItem(id) {
    await supabase.from("cockpit_retro").delete().eq("id", id);
  }

  const sprintItems = items.filter((i) => i.sprint === activeSprint);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Retro</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {SPRINTS.map((s) => (
            <button
              key={s.id}
              className={`btn ${activeSprint === s.id ? "btn-primary" : ""}`}
              onClick={() => setActiveSprint(s.id)}
            >
              S{s.id}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-3">
        {CATEGORIES.map((cat) => {
          const catItems = sprintItems.filter((i) => i.category === cat.id);
          return (
            <div key={cat.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: cat.color }}>{cat.label}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>{catItems.length}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                {catItems.map((item) => (
                  <div
                    key={item.id}
                    className="card"
                    style={{ padding: 12, background: cat.bg, borderColor: cat.color + "33" }}
                  >
                    <div style={{ fontSize: 13, marginBottom: 6 }}>{item.body}</div>
                    <button
                      className="btn"
                      style={{ fontSize: 10, padding: "2px 6px", color: "#ef4444" }}
                      onClick={() => deleteItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  placeholder={`Add ${cat.label.toLowerCase()}...`}
                  value={newItem[cat.id]}
                  onChange={(e) => setNewItem({ ...newItem, [cat.id]: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addItem(cat.id)}
                  style={{ flex: 1 }}
                />
                <button className="btn" onClick={() => addItem(cat.id)}>+</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
