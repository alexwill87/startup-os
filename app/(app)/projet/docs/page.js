"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";
import Link from "next/link";

const COLOR = "#f59e0b";

export default function DocsIndexPage() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocs();
  }, []);

  async function fetchDocs() {
    const { data } = await supabase
      .from("cockpit_docs")
      .select("*")
      .order("chapter_order", { ascending: true });
    setDocs(data || []);
    setLoading(false);
  }

  // Group by part
  const grouped = docs.reduce((acc, doc) => {
    const part = doc.part || "Sans catégorie";
    if (!acc[part]) acc[part] = [];
    acc[part].push(doc);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader title="Documentation" color={COLOR} />
        <p className="text-zinc-400 mt-4">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Documentation" color={COLOR} />

      {Object.keys(grouped).length === 0 ? (
        <p className="text-zinc-400">Aucun document trouvé.</p>
      ) : (
        Object.entries(grouped).map(([part, partDocs]) => (
          <div key={part} className="space-y-3">
            <h2 className="text-lg font-bold text-white border-b border-zinc-700 pb-1">{part}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {partDocs.map((doc) => (
                <Link key={doc.id} href={`/projet/docs/${doc.slug}`}>
                  <Card>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-white font-medium">{doc.title}</h3>
                        <p className="text-xs text-zinc-400 mt-1">{doc.part}</p>
                      </div>
                      {doc.updated_at && (
                        <span className="text-xs text-zinc-500 shrink-0">
                          {new Date(doc.updated_at).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
