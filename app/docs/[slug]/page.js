"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";

export default function DocPage() {
  const { slug } = useParams();
  const router = useRouter();
  const { user, builder } = useAuth();
  const [doc, setDoc] = useState(null);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDoc();
    const sub = supabase
      .channel(`doc_${slug}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "cockpit_docs", filter: `slug=eq.${slug}` }, fetchDoc)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, [slug]);

  async function fetchDoc() {
    const { data } = await supabase
      .from("cockpit_docs")
      .select("*")
      .eq("slug", slug)
      .single();
    if (data) {
      setDoc(data);
      setContent(data.content);
    }
    setLoading(false);
  }

  async function save() {
    setSaving(true);
    await supabase
      .from("cockpit_docs")
      .update({
        content,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq("slug", slug);
    setSaving(false);
    setEditing(false);
  }

  if (loading) {
    return <div style={{ color: "#475569", padding: 40, textAlign: "center" }}>Loading...</div>;
  }

  if (!doc) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "#ef4444", marginBottom: 16 }}>Chapter not found</p>
        <Link href="/docs" className="btn">Back to docs</Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <Link href="/docs" style={{ fontSize: 12, color: "#3b82f6", textDecoration: "none", marginBottom: 6, display: "block" }}>
            &larr; All chapters
          </Link>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>{doc.title}</h2>
          {doc.part && <span style={{ fontSize: 12, color: "#64748b" }}>{doc.part}</span>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {editing ? (
            <>
              <button className="btn" onClick={() => { setEditing(false); setContent(doc.content); }}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => setEditing(true)}>
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          style={{
            width: "100%",
            minHeight: 600,
            padding: 20,
            background: "#0d1117",
            border: "1px solid #3b82f6",
            borderRadius: 12,
            color: "#e2e8f0",
            fontSize: 14,
            lineHeight: 1.7,
            fontFamily: "var(--font-geist-mono)",
            resize: "vertical",
          }}
        />
      ) : (
        <div
          className="card"
          style={{
            whiteSpace: "pre-wrap",
            fontSize: 14,
            lineHeight: 1.7,
            color: "#cbd5e1",
            fontFamily: "var(--font-geist-mono)",
            minHeight: 400,
          }}
        >
          {doc.content || "No content yet. Click Edit to add content."}
        </div>
      )}

      {/* Metadata */}
      <div style={{ marginTop: 16, fontSize: 11, color: "#475569", fontFamily: "var(--font-geist-mono)", display: "flex", gap: 16 }}>
        <span>Last updated: {new Date(doc.updated_at).toLocaleString("fr-FR")}</span>
        {builder && <span>Editing as: {builder.name}</span>}
      </div>
    </div>
  );
}
