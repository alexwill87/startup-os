"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";
import FileUpload, { FileList } from "@/app/components/FileUpload";

const COLOR = "#10b981";

const FOLDERS = [
  { id: "general", label: "General", desc: "Shared project files" },
  { id: "why", label: "Why / Strategy", desc: "Vision docs, pitches, market research" },
  { id: "team", label: "Team", desc: "CVs, org charts, agreements" },
  { id: "project", label: "Project", desc: "Specs, designs, mockups" },
  { id: "market", label: "Market", desc: "Competitor analysis, user research" },
  { id: "finance", label: "Finance", desc: "Budgets, invoices, projections" },
];

export default function FilesPage() {
  const [activeFolder, setActiveFolder] = useState("general");
  const [files, setFiles] = useState([]);
  const [allCounts, setAllCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFiles();
    fetchCounts();
  }, [activeFolder]);

  async function fetchFiles() {
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("project-files")
      .list(activeFolder, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    setFiles(error ? [] : (data || []).filter((f) => f.name !== ".emptyFolderPlaceholder"));
    setLoading(false);
  }

  async function fetchCounts() {
    const counts = {};
    for (const folder of FOLDERS) {
      const { data } = await supabase.storage
        .from("project-files")
        .list(folder.id, { limit: 200 });
      counts[folder.id] = (data || []).filter((f) => f.name !== ".emptyFolderPlaceholder").length;
    }
    setAllCounts(counts);
  }

  const totalFiles = Object.values(allCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Files" subtitle={`${totalFiles} files across ${FOLDERS.length} folders`} color={COLOR} />

      {/* Folder tabs */}
      <div className="flex gap-2 flex-wrap">
        {FOLDERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFolder(f.id)}
            className={`px-3 py-2 rounded-lg text-xs font-mono transition-all ${
              activeFolder === f.id
                ? "bg-[#1e3a5f] text-[#93c5fd] font-bold"
                : "border border-[#1e293b] text-[#64748b] hover:text-white hover:border-[#334155]"
            }`}
          >
            {f.label} {allCounts[f.id] > 0 && `(${allCounts[f.id]})`}
          </button>
        ))}
      </div>

      {/* Upload zone */}
      <FileUpload folder={activeFolder} onUpload={() => { fetchFiles(); fetchCounts(); }} />

      {/* File list */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">
            {FOLDERS.find((f) => f.id === activeFolder)?.label}
          </h3>
          <span className="text-xs text-[#475569] font-mono">{files.length} files</span>
        </div>

        {loading ? (
          <p className="text-[#475569] text-sm font-mono py-4">Loading...</p>
        ) : files.length === 0 ? (
          <p className="text-[#475569] text-sm text-center py-8">
            No files yet. Drag & drop or click above to upload.
          </p>
        ) : (
          <FileList files={files} folder={activeFolder} onDelete={() => { fetchFiles(); fetchCounts(); }} />
        )}
      </Card>

      {/* Accepted formats */}
      <div className="text-[10px] text-[#334155] font-mono">
        Accepted: PDF, PNG, JPG, GIF, SVG, TXT, MD, CSV, JSON, ZIP, SQL, DOCX, XLSX — max 50MB
      </div>
    </div>
  );
}
