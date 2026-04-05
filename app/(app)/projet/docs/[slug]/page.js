"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";
import Link from "next/link";

const COLOR = "#f59e0b";

export default function DocViewerPage() {
  const { user } = useAuth();
  const { slug } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDoc();
    const channel = supabase
      .channel(`doc-${slug}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "cockpit_docs",
        filter: `slug=eq.${slug}`,
      }, (payload) => {
        setDoc(payload.new);
        if (!editing) setContent(payload.new.content || "");
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [slug]);

  async function fetchDoc() {
    const { data } = await supabase
      .from("cockpit_docs")
      .select("*")
      .eq("slug", slug)
      .single();
    setDoc(data);
    setContent(data?.content || "");
    setLoading(false);
  }

  async function saveDoc() {
    setSaving(true);
    await supabase
      .from("cockpit_docs")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", doc.id);
    setSaving(false);
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Document" color={COLOR} />
        <p className="text-zinc-400 mt-4">Chargement...</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-6">
        <PageHeader title="Document introuvable" color={COLOR} />
        <Link href="/projet/docs" className="text-sm hover:underline" style={{ color: COLOR }}>
          ← Retour aux docs
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/projet/docs" className="text-sm hover:underline" style={{ color: COLOR }}>
            ← Retour aux docs
          </Link>
          <PageHeader title={doc.title} color={COLOR} />
          <p className="text-xs text-zinc-400 mt-1">
            {doc.part}
            {doc.updated_at && ` — Mis à jour le ${new Date(doc.updated_at).toLocaleDateString("fr-FR")}`}
          </p>
        </div>
        <button
          onClick={() => {
            if (editing) saveDoc();
            else setEditing(true);
          }}
          className="px-4 py-2 rounded text-sm font-medium text-black"
          style={{ backgroundColor: COLOR }}
          disabled={saving}
        >
          {saving ? "Sauvegarde..." : editing ? "Sauvegarder" : "Modifier"}
        </button>
      </div>

      <Card>
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded p-4 text-sm text-zinc-200 font-mono min-h-[400px] focus:outline-none focus:border-amber-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setEditing(false); setContent(doc.content || ""); }}
                className="px-3 py-1.5 rounded text-sm bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed">
            {doc.content || "Aucun contenu."}
          </pre>
        )}
      </Card>
    </div>
  );
}
