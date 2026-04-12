"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import {
  PageLayout, Topbar, PageTitle, KpiRow, KpiCard, Button, Footer,
  FormGroup, FormLabel, FormInput,
} from "@/app/components/ui";

export default function V1FinancePage() {
  const { user, canEdit } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", cost: "", note: "" });

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses() {
    const { data } = await supabase
      .from("cockpit_resources")
      .select("*")
      .eq("category", "admin")
      .order("created_at", { ascending: false });
    setExpenses(data || []);
    setLoading(false);
  }

  function parseCost(description) {
    const match = description?.match(/cost:\s*(\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await supabase.from("cockpit_resources").insert({
      category: "admin",
      title: form.name,
      description: `cost: ${form.cost} EUR/mo — ${form.note}`,
      builder: user?.email || "unknown",
    });
    setForm({ name: "", cost: "", note: "" });
    setShowForm(false);
    fetchExpenses();
  }

  async function deleteExpense(id) {
    if (!confirm("Delete this expense?")) return;
    await supabase.from("cockpit_resources").delete().eq("id", id);
    fetchExpenses();
  }

  const totalBurn = expenses.reduce((sum, e) => sum + parseCost(e.description), 0);
  const yearlyBurn = totalBurn * 12;

  return (
    <PageLayout>
      <Topbar
        breadcrumb={["Business", "Finance"]}
        actions={
          <>
            <Button variant="ghost" onClick={fetchExpenses}>Refresh</Button>
            {canEdit && <Button variant="primary" onClick={() => setShowForm(!showForm)}>{showForm ? "Close form" : "Add Expense"}</Button>}
          </>
        }
      />
      <main style={{ flex: 1, padding: "1.5rem 1.75rem", overflowY: "auto", maxWidth: "1100px", width: "100%", margin: "0 auto" }}>
        <PageTitle title="Finance" description="Monthly burn rate, expenses, and runway." />

        <KpiRow>
          <KpiCard label="Monthly burn" value={`${totalBurn.toFixed(0)} €`} trend="per month" variant={totalBurn === 0 ? "success" : "warn"} />
          <KpiCard label="Yearly burn" value={`${yearlyBurn.toFixed(0)} €`} trend="extrapolated" variant="default" />
          <KpiCard label="Expenses" value={String(expenses.length)} trend="tracked items" variant="muted" />
        </KpiRow>

        {showForm && canEdit && (
          <section style={{ padding: "1.25rem 1.5rem", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>Add a recurring expense</h3>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <FormGroup>
                <FormLabel>Service name *</FormLabel>
                <FormInput type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Vercel Pro" required />
              </FormGroup>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                <FormGroup>
                  <FormLabel>Cost (EUR/mo) *</FormLabel>
                  <FormInput type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Note</FormLabel>
                  <FormInput type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="What it covers..." />
                </FormGroup>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button variant="primary" type="submit">Save</Button>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </form>
          </section>
        )}

        {loading ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>Loading...</p>
        ) : expenses.length === 0 ? (
          <p style={{ textAlign: "center", color: "var(--text-3)", padding: "2rem 0" }}>No expenses tracked yet. You're at zero burn.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {expenses.map((e) => {
              const cost = parseCost(e.description);
              return (
                <article
                  key={e.id}
                  style={{
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "0.875rem 1.25rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", margin: 0 }}>{e.title}</h3>
                    <p style={{ fontSize: "11.5px", color: "var(--text-3)", margin: "2px 0 0" }}>{e.description}</p>
                  </div>
                  <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", flexShrink: 0 }}>
                    {cost.toFixed(2)} €
                  </span>
                  {canEdit && <Button variant="danger" onClick={() => deleteExpense(e.id)}>Delete</Button>}
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </PageLayout>
  );
}
