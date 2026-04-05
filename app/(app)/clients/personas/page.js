"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#ec4899";

export default function PersonasPage() {
  const { user } = useAuth();
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    who: "",
    pain: "",
    willingness: "",
    platform: "",
  });

  const fetchPersonas = async () => {
    const { data } = await supabase
      .from("cockpit_vision")
      .select("*")
      .eq("topic", "market")
      .order("created_at", { ascending: false });
    setPersonas(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPersonas();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = JSON.stringify(form);
    await supabase.from("cockpit_vision").insert({
      topic: "market",
      title: form.name,
      body,
      builder: user?.email || "unknown",
      pinned: false,
    });
    setForm({ name: "", who: "", pain: "", willingness: "", platform: "" });
    setShowForm(false);
    fetchPersonas();
  };

  const parseBody = (body) => {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personas"
        subtitle="Target user profiles for RADAR"
        color={COLOR}
      />

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium"
          style={{ backgroundColor: COLOR }}
        >
          {showForm ? "Cancel" : "+ Add Persona"}
        </button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-semibold text-white">New Persona</h3>
            {[
              { key: "name", label: "Name", placeholder: "e.g. Sophie CTO" },
              { key: "who", label: "Who", placeholder: "CTO at a 20-person startup" },
              { key: "pain", label: "Pain Point", placeholder: "Spends 3h/day on repetitive alerts" },
              { key: "willingness", label: "Willingness to Pay", placeholder: "€14/mo for automation" },
              { key: "platform", label: "Platform Used", placeholder: "Slack, GitHub, Linear" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-sm text-zinc-400 mb-1">{label}</label>
                <input
                  type="text"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pink-500"
                  required
                />
              </div>
            ))}
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: COLOR }}
            >
              Save Persona
            </button>
          </form>
        </Card>
      )}

      {loading ? (
        <p className="text-zinc-500 text-sm">Loading...</p>
      ) : personas.length === 0 ? (
        <Card>
          <p className="text-zinc-400 text-center py-8">
            No personas yet. Add your first target user profile above.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personas.map((p) => {
            const data = parseBody(p.body);
            return (
              <Card key={p.id}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLOR }}
                    />
                    <h3 className="text-lg font-semibold text-white">
                      {p.title}
                    </h3>
                  </div>
                  {data ? (
                    <div className="space-y-2 text-sm">
                      <p className="text-zinc-400">
                        <span className="text-zinc-500">Who:</span>{" "}
                        <span className="text-zinc-300">{data.who}</span>
                      </p>
                      <p className="text-zinc-400">
                        <span className="text-zinc-500">Pain:</span>{" "}
                        <span className="text-zinc-300">{data.pain}</span>
                      </p>
                      <p className="text-zinc-400">
                        <span className="text-zinc-500">Willingness:</span>{" "}
                        <span className="text-zinc-300">{data.willingness}</span>
                      </p>
                      <p className="text-zinc-400">
                        <span className="text-zinc-500">Platform:</span>{" "}
                        <span className="text-zinc-300">{data.platform}</span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-zinc-400 text-sm">{p.body}</p>
                  )}
                  <p className="text-zinc-600 text-xs">
                    by {p.builder} &middot;{" "}
                    {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
