"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/app/components/Card";
import PageHeader from "@/app/components/PageHeader";

export default function ConfigPage() {
  const { user } = useAuth();
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [dbStatus, setDbStatus] = useState("checking");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deploymentUrl, setDeploymentUrl] = useState("");

  useEffect(() => {
    setDeploymentUrl(window.location.origin);
    loadConfig();
  }, []);

  async function loadConfig() {
    // Check DB connection
    const { error: pingError } = await supabase
      .from("cockpit_members")
      .select("id", { head: true });
    setDbStatus(pingError ? "error" : "connected");

    // Load project name
    const { data: nameRow } = await supabase
      .from("cockpit_vision")
      .select("content")
      .eq("topic", "other")
      .eq("title", "config:project_name")
      .maybeSingle();
    if (nameRow?.content) setProjectName(nameRow.content);

    // Load description
    const { data: descRow } = await supabase
      .from("cockpit_vision")
      .select("content")
      .eq("topic", "other")
      .eq("title", "config:description")
      .maybeSingle();
    if (descRow?.content) setDescription(descRow.content);

    // Member count
    const { count } = await supabase
      .from("cockpit_members")
      .select("*", { count: "exact", head: true });
    setMemberCount(count || 0);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    // Upsert project name
    const { data: existingName } = await supabase
      .from("cockpit_vision")
      .select("id")
      .eq("topic", "other")
      .eq("title", "config:project_name")
      .maybeSingle();

    if (existingName) {
      await supabase
        .from("cockpit_vision")
        .update({ content: projectName })
        .eq("id", existingName.id);
    } else {
      await supabase.from("cockpit_vision").insert({
        topic: "other",
        title: "config:project_name",
        content: projectName,
        created_by: user?.id || null,
      });
    }

    // Upsert description
    const { data: existingDesc } = await supabase
      .from("cockpit_vision")
      .select("id")
      .eq("topic", "other")
      .eq("title", "config:description")
      .maybeSingle();

    if (existingDesc) {
      await supabase
        .from("cockpit_vision")
        .update({ content: description })
        .eq("id", existingDesc.id);
    } else {
      await supabase.from("cockpit_vision").insert({
        topic: "other",
        title: "config:description",
        content: description,
        created_by: user?.id || null,
      });
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "Not configured";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Configuration"
        subtitle="View and edit your project settings"
      />

      {/* Editable fields */}
      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-bold" style={{ color: "#64748b" }}>
            Project Settings
          </h2>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Project"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Project Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: "#64748b" }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {saved && (
              <span className="text-sm text-green-600 font-medium">
                Saved!
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Read-only info */}
      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-bold" style={{ color: "#64748b" }}>
            Environment
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Supabase URL</span>
              <span className="text-sm font-mono text-gray-700 truncate max-w-xs">
                {supabaseUrl}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Deployment URL</span>
              <span className="text-sm font-mono text-gray-700 truncate max-w-xs">
                {deploymentUrl}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Supabase Connection</span>
              <span
                className="text-sm font-medium px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor:
                    dbStatus === "connected"
                      ? "#dcfce7"
                      : dbStatus === "error"
                        ? "#fee2e2"
                        : "#f1f5f9",
                  color:
                    dbStatus === "connected"
                      ? "#16a34a"
                      : dbStatus === "error"
                        ? "#dc2626"
                        : "#64748b",
                }}
              >
                {dbStatus === "connected"
                  ? "Connected"
                  : dbStatus === "error"
                    ? "Error"
                    : "Checking..."}
              </span>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Members</span>
              <span className="text-sm font-medium text-gray-700">
                {memberCount}
              </span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-500">Database Tables</span>
              <span className="text-sm font-medium text-gray-700">8</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
