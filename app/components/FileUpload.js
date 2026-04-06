"use client";

import { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { logActivity } from "@/lib/activity";

const FILE_ICONS = {
  "application/pdf": "PDF",
  "image/png": "IMG",
  "image/jpeg": "IMG",
  "image/gif": "IMG",
  "image/svg+xml": "SVG",
  "text/plain": "TXT",
  "text/markdown": "MD",
  "text/csv": "CSV",
  "application/json": "JSON",
  "application/zip": "ZIP",
  "application/sql": "SQL",
};

export default function FileUpload({ folder = "general", onUpload }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (const file of files) {
      const fileName = `${folder}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("project-files")
        .upload(fileName, file, { upsert: false });

      if (!error) {
        logActivity("created", "file", { title: file.name });
        if (onUpload) onUpload();
      } else {
        console.error("Upload error:", error.message);
      }
    }
    setUploading(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
        dragOver
          ? "border-[#3b82f6] bg-[#3b82f6]/5"
          : "border-[#1e293b] hover:border-[#334155] bg-[#0a0f1a]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg,.gif,.svg,.txt,.md,.csv,.json,.zip,.sql,.docx,.xlsx"
      />
      <div className="text-[#475569] text-sm">
        {uploading ? (
          <span className="text-[#3b82f6]">Uploading...</span>
        ) : (
          <>
            <p className="font-medium mb-1">Drop files here or click to browse</p>
            <p className="text-xs text-[#334155]">PDF, images, MD, CSV, JSON, ZIP, SQL, DOCX — up to 50MB</p>
          </>
        )}
      </div>
    </div>
  );
}

export function FileList({ files, folder, onDelete }) {
  if (!files || files.length === 0) return null;

  async function handleDelete(fileName) {
    if (!confirm("Delete this file?")) return;
    await supabase.storage.from("project-files").remove([fileName]);
    logActivity("deleted", "file", { title: fileName.split("/").pop() });
    if (onDelete) onDelete();
  }

  function getPublicUrl(name) {
    const { data } = supabase.storage.from("project-files").getPublicUrl(name);
    return data?.publicUrl;
  }

  return (
    <div className="space-y-2">
      {files.map((file) => {
        const icon = FILE_ICONS[file.metadata?.mimetype] || "FILE";
        const name = file.name;
        const size = file.metadata?.size ? `${(file.metadata.size / 1024).toFixed(0)} KB` : "";
        const url = getPublicUrl(`${folder}/${name}`);

        return (
          <div key={file.id || name} className="flex items-center gap-3 p-3 rounded-lg bg-[#0d1117] border border-[#1e293b] hover:border-[#334155] transition-colors">
            <span className="text-[10px] font-mono font-bold px-2 py-1 rounded bg-[#1e293b] text-[#94a3b8] flex-shrink-0">
              {icon}
            </span>
            <div className="flex-1 min-w-0">
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-white hover:text-[#3b82f6] truncate block">
                {name}
              </a>
              <span className="text-[10px] text-[#475569] font-mono">{size}</span>
            </div>
            <button
              onClick={() => handleDelete(`${folder}/${name}`)}
              className="text-[10px] text-red-400 hover:text-red-300 font-mono px-2 py-1"
            >
              Delete
            </button>
          </div>
        );
      })}
    </div>
  );
}
