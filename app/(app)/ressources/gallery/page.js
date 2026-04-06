"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#10b981";

const PILLARS = [
  { id: "all", label: "All" },
  { id: "general", label: "General" },
  { id: "why", label: "Why" },
  { id: "team", label: "Team" },
  { id: "project", label: "Project" },
  { id: "market", label: "Market" },
  { id: "finance", label: "Finance" },
];

export default function GalleryPage() {
  const [images, setImages] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // grid or list

  useEffect(() => {
    fetchImages();
    const sub = supabase
      .channel("gallery_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_files" }, fetchImages)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchImages() {
    const { data } = await supabase
      .from("cockpit_files")
      .select("*")
      .like("mime_type", "image/%")
      .order("created_at", { ascending: false });
    setImages(data || []);
    setLoading(false);
  }

  function getUrl(path) {
    const { data } = supabase.storage.from("project-files").getPublicUrl(path);
    return data?.publicUrl;
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  const filtered = filter === "all" ? images : images.filter((i) => i.pillar === filter);
  const pillarCounts = {};
  images.forEach((i) => { pillarCounts[i.pillar] = (pillarCounts[i.pillar] || 0) + 1; });

  return (
    <div className="space-y-8">
      <PageHeader title="Gallery" subtitle={`${images.length} images`} color={COLOR}>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono ${viewMode === "grid" ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b]"}`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono ${viewMode === "list" ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b]"}`}
          >
            List
          </button>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {PILLARS.map((p) => {
          const count = p.id === "all" ? images.length : (pillarCounts[p.id] || 0);
          if (p.id !== "all" && count === 0) return null;
          return (
            <button
              key={p.id}
              onClick={() => setFilter(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                filter === p.id ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b] hover:text-white"
              }`}
            >
              {p.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Gallery */}
      {loading ? (
        <p className="text-[#475569] text-sm font-mono">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-[#475569] text-sm text-center py-12">
            No images yet. Upload images in Resources &gt; Files.
          </p>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((img) => {
            const url = getUrl(img.storage_path);
            return (
              <div
                key={img.id}
                onClick={() => setLightbox(img)}
                className="cursor-pointer group rounded-xl overflow-hidden border border-[#1e293b] hover:border-[#334155] transition-all bg-[#0d1117]"
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={url}
                    alt={img.title || img.file_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                    <div className="p-3 opacity-0 group-hover:opacity-100 transition-opacity w-full">
                      <p className="text-white text-xs font-medium truncate">{img.title || img.file_name}</p>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-white truncate">{img.title || img.file_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-[#475569] font-mono">{formatSize(img.file_size)}</span>
                    <span className="text-[9px] text-[#475569] font-mono">{img.pillar}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {filtered.map((img) => {
            const url = getUrl(img.storage_path);
            return (
              <div
                key={img.id}
                onClick={() => setLightbox(img)}
                className="flex items-center gap-4 p-3 rounded-lg bg-[#0d1117] border border-[#1e293b] hover:border-[#334155] transition-colors cursor-pointer"
              >
                <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{img.title || img.file_name}</p>
                  {img.description && <p className="text-xs text-[#94a3b8] truncate">{img.description}</p>}
                  <div className="flex gap-3 mt-1 text-[10px] text-[#475569] font-mono">
                    <span>{formatSize(img.file_size)}</span>
                    <span>{img.pillar}</span>
                    <span>by {img.uploaded_by_name}</span>
                    <span>{new Date(img.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-white/60 hover:text-white text-2xl"
            >
              &times;
            </button>

            {/* Image */}
            <img
              src={getUrl(lightbox.storage_path)}
              alt={lightbox.title}
              className="w-full h-auto max-h-[75vh] object-contain rounded-xl"
            />

            {/* Info */}
            <div className="mt-4 text-center">
              <h3 className="text-lg font-bold text-white">{lightbox.title || lightbox.file_name}</h3>
              {lightbox.description && <p className="text-sm text-[#94a3b8] mt-1">{lightbox.description}</p>}
              {lightbox.purpose && <p className="text-xs text-[#475569] mt-1">Purpose: {lightbox.purpose}</p>}
              <div className="flex justify-center gap-4 mt-2 text-[11px] text-[#475569] font-mono">
                <span>{formatSize(lightbox.file_size)}</span>
                <span>{lightbox.pillar}</span>
                <span>by {lightbox.uploaded_by_name}</span>
                <a
                  href={getUrl(lightbox.storage_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3b82f6] hover:underline"
                >
                  Open original
                </a>
              </div>
              {lightbox.tags && lightbox.tags.length > 0 && (
                <div className="flex justify-center gap-1.5 mt-2">
                  {lightbox.tags.map((t) => (
                    <span key={t} className="text-[9px] px-2 py-0.5 rounded-full bg-[#1e293b] text-[#64748b]">#{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Nav arrows */}
            <button
              className="absolute left-0 top-1/2 -translate-y-1/2 -ml-12 text-white/40 hover:text-white text-3xl"
              onClick={() => {
                const idx = filtered.findIndex((i) => i.id === lightbox.id);
                if (idx > 0) setLightbox(filtered[idx - 1]);
              }}
            >
              &#8249;
            </button>
            <button
              className="absolute right-0 top-1/2 -translate-y-1/2 -mr-12 text-white/40 hover:text-white text-3xl"
              onClick={() => {
                const idx = filtered.findIndex((i) => i.id === lightbox.id);
                if (idx < filtered.length - 1) setLightbox(filtered[idx + 1]);
              }}
            >
              &#8250;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
