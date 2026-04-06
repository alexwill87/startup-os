"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

const COLOR = "#10b981";

const PILLARS = [
  { id: "general", label: "General" },
  { id: "why", label: "Why / Strategy" },
  { id: "team", label: "Team" },
  { id: "project", label: "Project" },
  { id: "market", label: "Market" },
  { id: "finance", label: "Finance" },
  { id: "config", label: "Config" },
];

const STATUSES = [
  { id: "draft", label: "Draft", color: "#64748b" },
  { id: "review", label: "In Review", color: "#f59e0b" },
  { id: "approved", label: "Approved", color: "#10b981" },
  { id: "archived", label: "Archived", color: "#475569" },
  { id: "outdated", label: "Outdated", color: "#ef4444" },
];

const FILE_ICONS = {
  "application/pdf": { label: "PDF", color: "#ef4444" },
  "image/png": { label: "IMG", color: "#3b82f6" },
  "image/jpeg": { label: "IMG", color: "#3b82f6" },
  "image/gif": { label: "GIF", color: "#8b5cf6" },
  "text/plain": { label: "TXT", color: "#64748b" },
  "text/markdown": { label: "MD", color: "#64748b" },
  "text/csv": { label: "CSV", color: "#10b981" },
  "application/json": { label: "JSON", color: "#f59e0b" },
  "application/zip": { label: "ZIP", color: "#6366f1" },
};

const inputClass = "w-full py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm font-mono outline-none focus:border-[#3b82f6] transition-colors";

export default function FilesPage() {
  const { user, member } = useAuth();
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [form, setForm] = useState({
    title: "", description: "", purpose: "", pillar: "general", status: "draft", tags: "",
  });
  const inputRef = useRef(null);

  useEffect(() => {
    fetchFiles();
    const sub = supabase
      .channel("files_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "cockpit_files" }, fetchFiles)
      .subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  async function fetchFiles() {
    const { data } = await supabase
      .from("cockpit_files")
      .select("*")
      .order("created_at", { ascending: false });
    setFiles(data || []);
    setLoading(false);
  }

  async function handleUpload(fileObj) {
    if (!fileObj) return;
    setSelectedFile(fileObj);
    setForm((f) => ({ ...f, title: fileObj.name.replace(/\.[^/.]+$/, "") }));
    setShowUpload(true);
  }

  async function submitUpload(e) {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);

    const storagePath = `${form.pillar}/${Date.now()}-${selectedFile.name}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("project-files")
      .upload(storagePath, selectedFile, { upsert: false });

    if (uploadError) {
      alert("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    // Save metadata
    const tags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : null;
    await supabase.from("cockpit_files").insert({
      file_name: selectedFile.name,
      storage_path: storagePath,
      pillar: form.pillar,
      title: form.title || selectedFile.name,
      description: form.description || null,
      purpose: form.purpose || null,
      status: form.status,
      mime_type: selectedFile.type,
      file_size: selectedFile.size,
      tags,
      uploaded_by: user?.id,
      uploaded_by_name: member?.name || "Unknown",
      uploaded_by_email: user?.email,
    });

    logActivity("created", "file", { title: form.title || selectedFile.name });

    setShowUpload(false);
    setSelectedFile(null);
    setForm({ title: "", description: "", purpose: "", pillar: "general", status: "draft", tags: "" });
    setUploading(false);
  }

  async function updateFileStatus(id, newStatus) {
    await supabase.from("cockpit_files").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
    logActivity("updated", "file", { title: `status → ${newStatus}` });
  }

  async function deleteFile(file) {
    if (!confirm(`Delete "${file.title || file.file_name}"?`)) return;
    await supabase.storage.from("project-files").remove([file.storage_path]);
    await supabase.from("cockpit_files").delete().eq("id", file.id);
    logActivity("deleted", "file", { title: file.title || file.file_name });
  }

  function getPublicUrl(path) {
    const { data } = supabase.storage.from("project-files").getPublicUrl(path);
    return data?.publicUrl;
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  }

  const filtered = filter === "all" ? files : files.filter((f) => f.pillar === filter);
  const pillarCounts = {};
  files.forEach((f) => { pillarCounts[f.pillar] = (pillarCounts[f.pillar] || 0) + 1; });

  return (
    <div className="space-y-8">
      <PageHeader title="Files" subtitle={`${files.length} files uploaded`} color={COLOR}>
        <button
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono"
        >
          + Upload
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg,.gif,.svg,.txt,.md,.csv,.json,.zip,.sql,.docx,.xlsx"
          onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        />
      </PageHeader>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); e.dataTransfer.files?.[0] && handleUpload(e.dataTransfer.files[0]); }}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          dragOver ? "border-[#3b82f6] bg-[#3b82f6]/5" : "border-[#1e293b] bg-[#0a0f1a]"
        }`}
      >
        <p className="text-[#475569] text-sm">Drop a file here — PDF, images, MD, CSV, JSON, ZIP, SQL — up to 50MB</p>
      </div>

      {/* Upload form (appears after file selection) */}
      {showUpload && selectedFile && (
        <Card>
          <h3 className="text-sm font-bold text-white mb-4">
            Uploading: <span className="text-[#94a3b8] font-normal">{selectedFile.name}</span>
            <span className="text-[10px] text-[#475569] ml-2 font-mono">{formatSize(selectedFile.size)}</span>
          </h3>
          <form onSubmit={submitUpload} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Title</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputClass} required />
              </div>
              <div>
                <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Pillar</label>
                <select value={form.pillar} onChange={(e) => setForm({ ...form, pillar: e.target.value })} className={inputClass}>
                  {PILLARS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Description — What is this file?</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Market analysis for French freelancers" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Purpose — Why is it useful?</label>
                <input type="text" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. For the investor pitch, Sprint 3 planning" className={inputClass} />
              </div>
              <div>
                <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-[#64748b] font-mono mb-1.5">Tags (comma separated)</label>
              <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. pitch, market, Q2" className={inputClass} />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={uploading} className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono disabled:opacity-50">
                {uploading ? "Uploading..." : "Upload & Save"}
              </button>
              <button type="button" onClick={() => { setShowUpload(false); setSelectedFile(null); }} className="px-4 py-2 rounded-lg border border-[#1e293b] text-[#64748b] text-sm font-mono hover:text-white">
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Pillar filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${filter === "all" ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b] hover:text-white"}`}>
          All ({files.length})
        </button>
        {PILLARS.map((p) => pillarCounts[p.id] ? (
          <button key={p.id} onClick={() => setFilter(p.id)} className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${filter === p.id ? "bg-[#1e3a5f] text-[#93c5fd]" : "border border-[#1e293b] text-[#64748b] hover:text-white"}`}>
            {p.label} ({pillarCounts[p.id]})
          </button>
        ) : null)}
      </div>

      {/* File list */}
      {loading ? (
        <p className="text-[#475569] text-sm font-mono">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card><p className="text-[#475569] text-sm text-center py-8">No files yet. Upload one above.</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => {
            const icon = FILE_ICONS[f.mime_type] || { label: "FILE", color: "#64748b" };
            const statusObj = STATUSES.find((s) => s.id === f.status) || STATUSES[0];
            const url = getPublicUrl(f.storage_path);

            return (
              <Card key={f.id} className="hover:border-[#334155] transition-colors">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0" style={{ background: icon.color + "15", color: icon.color }}>
                    {icon.label}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white hover:text-[#3b82f6] transition-colors truncate">
                        {f.title || f.file_name}
                      </a>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: statusObj.color + "15", color: statusObj.color }}>
                        {statusObj.label}
                      </span>
                    </div>

                    {f.description && <p className="text-xs text-[#94a3b8] mb-1">{f.description}</p>}
                    {f.purpose && <p className="text-[11px] text-[#475569] mb-1">Purpose: {f.purpose}</p>}

                    <div className="flex items-center gap-3 text-[10px] text-[#475569] font-mono">
                      <span>{f.file_name}</span>
                      <span>{formatSize(f.file_size)}</span>
                      <span>by {f.uploaded_by_name}</span>
                      <span>{new Date(f.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      {f.pillar !== "general" && (
                        <span className="px-1.5 py-0.5 rounded bg-[#1e293b] text-[#64748b]">{f.pillar}</span>
                      )}
                    </div>

                    {f.tags && f.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {f.tags.map((t) => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#1e293b] text-[#64748b]">#{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <select
                      value={f.status}
                      onChange={(e) => updateFileStatus(f.id, e.target.value)}
                      className="py-1 px-2 rounded border border-[#1e293b] bg-[#0a0f1a] text-[#94a3b8] text-[10px] font-mono outline-none"
                    >
                      {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <button onClick={() => deleteFile(f)} className="text-[10px] text-red-400 hover:text-red-300 font-mono py-1">
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
