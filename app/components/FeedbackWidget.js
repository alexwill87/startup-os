"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthProvider";
import { logActivity } from "@/lib/activity";

const TARGETS = [
  { id: "site", label: "Site (technique)", color: "#3b82f6" },
  { id: "forme", label: "Forme (UX/UI)", color: "#8b5cf6" },
  { id: "fond", label: "Fond (contenu)", color: "#10b981" },
];

const TYPES = [
  { id: "bug", label: "Bug" },
  { id: "improvement", label: "Improvement" },
  { id: "feature", label: "Feature" },
  { id: "question", label: "Question" },
];

export default function FeedbackWidget() {
  const { member } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ target: "forme", type: "improvement", title: "", body: "" });

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.from("cockpit_feedback").insert({
        type: form.type,
        title: `[${form.target}] ${form.title.trim()}`,
        body: `Page: ${pathname}\nTarget: ${form.target}\n\n${form.body || ""}`.trim(),
        author_id: member?.user_id,
        author_name: member?.name || member?.email,
      });
      if (!error) {
        await logActivity("created", "feedback", { title: form.title.trim() });
        setSent(true);
        setForm({ target: "forme", type: "improvement", title: "", body: "" });
        setTimeout(() => { setSent(false); setOpen(false); }, 1500);
      }
    } catch (err) {
      console.error("Feedback error:", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg transition-all hover:scale-110"
        style={{ backgroundColor: open ? "#ef4444" : "#3b82f6" }}
        title="Send feedback"
      >
        {open ? "X" : "?!"}
      </button>

      {/* Feedback panel */}
      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-[340px] rounded-xl border border-[#1e293b] shadow-2xl"
          style={{ backgroundColor: "#0d1117" }}
        >
          {sent ? (
            <div className="p-6 text-center">
              <p className="text-green-400 font-bold text-sm">Feedback sent!</p>
            </div>
          ) : (
            <form onSubmit={submit} className="p-4 space-y-3">
              <p className="text-xs font-bold text-[#64748b] uppercase tracking-wider">Quick Feedback</p>
              <p className="text-[10px] text-[#475569] font-mono">Page: {pathname}</p>

              {/* Target: site / forme / fond */}
              <div className="flex gap-2">
                {TARGETS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm({ ...form, target: t.id })}
                    className="flex-1 text-[10px] font-bold py-1.5 rounded-lg border transition-all"
                    style={{
                      borderColor: form.target === t.id ? t.color : "#1e293b",
                      color: form.target === t.id ? t.color : "#475569",
                      backgroundColor: form.target === t.id ? t.color + "15" : "transparent",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Type */}
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none focus:border-blue-500"
              >
                {TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>

              {/* Title */}
              <input
                type="text"
                placeholder="What's the issue or idea?"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none focus:border-blue-500"
                required
              />

              {/* Body */}
              <textarea
                placeholder="Details (optional)"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={3}
                className="w-full py-2 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-xs outline-none focus:border-blue-500 resize-none"
              />

              <button
                type="submit"
                disabled={sending}
                className="w-full py-2 text-sm font-bold rounded-lg text-white transition-all hover:opacity-90"
                style={{ backgroundColor: "#3b82f6" }}
              >
                {sending ? "Sending..." : "Send Feedback"}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
