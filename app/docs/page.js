"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const PART_COLORS = {
  "PART 1 — THE PRODUCT": "#3b82f6",
  "PART 2 — ARCHITECTURE": "#10b981",
  "PART 3 — COMPLETE TASK LIST": "#f59e0b",
  "PART 4 — TEAM OF 3 SPLIT": "#8b5cf6",
  "PART 5 — DEFINITION OF DONE": "#ef4444",
  "Introduction": "#94a3b8",
};

export default function DocsIndex() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocs();
    const sub = supabase
      .channel("docs_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_docs" }, fetchDocs)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchDocs() {
    const { data } = await supabase
      .from("cockpit_docs")
      .select("slug, title, part, chapter_order, updated_at")
      .order("chapter_order", { ascending: true });
    setDocs(data || []);
    setLoading(false);
  }

  // Group by part
  const grouped = {};
  docs.forEach((d) => {
    const p = d.part || "Introduction";
    if (!grouped[p]) grouped[p] = [];
    grouped[p].push(d);
  });

  if (loading) {
    return <div style={{ color: "#475569", padding: 40, textAlign: "center" }}>Loading docs...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Documentation Radar A-Z</h2>
        <span style={{ fontSize: 12, color: "#64748b", fontFamily: "var(--font-geist-mono)" }}>
          {docs.length} chapters
        </span>
      </div>

      {Object.entries(grouped).map(([part, chapters]) => (
        <div key={part} style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
            paddingBottom: 8, borderBottom: `2px solid ${PART_COLORS[part] || "#1e293b"}`,
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: PART_COLORS[part] || "#94a3b8" }}>
              {part}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {chapters.map((doc) => (
              <Link
                key={doc.slug}
                href={`/docs/${doc.slug}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: "#0d1117",
                  border: "1px solid #1e293b",
                  borderRadius: 8,
                  textDecoration: "none",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = PART_COLORS[part] || "#3b82f6";
                  e.currentTarget.style.background = "#111827";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1e293b";
                  e.currentTarget.style.background = "#0d1117";
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>
                  {doc.title}
                </span>
                <span style={{ fontSize: 11, color: "#475569", fontFamily: "var(--font-geist-mono)" }}>
                  {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString("fr-FR") : ""}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
