"use client";

import { useState, useEffect } from "react";

const ROLES = [
  { id: "observer", label: "Observer", desc: "Follow the project, see KPIs, give feedback", color: "#64748b" },
  { id: "mentor", label: "Mentor", desc: "Advise the team, review goals, vote on decisions", color: "#10b981" },
  { id: "cofounder", label: "Co-founder", desc: "Join the core team, build and ship together", color: "#3b82f6" },
];

export default function ApplyPage() {
  const [form, setForm] = useState({ name: "", email: "", role: "observer", message: "", linkedin: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [projectName, setProjectName] = useState("Startup OS");
  const [projectLogo, setProjectLogo] = useState(null);

  useEffect(() => {
    fetch("/api/project").then((r) => r.json()).then((d) => {
      if (d.name) setProjectName(d.name);
      if (d.logo) setProjectLogo(d.logo);
    }).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;
    setSending(true); setError(null);

    try {
      const res = await fetch("/api/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setSending(false); return; }
      setSent(true);
    } catch { setError("Something went wrong."); }
    finally { setSending(false); }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#080c14" }}>
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-2xl font-bold">+</div>
          <h1 className="text-2xl font-extrabold text-white">Application Submitted</h1>
          <p className="text-sm text-[#94a3b8]">Thank you, {form.name}! The team has been notified. You'll receive a magic link by email once reviewed.</p>
          <a href="/" className="inline-block mt-4 text-xs text-blue-400 hover:underline">Back to home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#080c14" }}>
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center space-y-2">
          {projectLogo ? (
            <img src={projectLogo} alt="" className="w-16 h-16 mx-auto rounded-xl object-contain" />
          ) : (
            <div className="w-16 h-16 mx-auto rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-2xl font-extrabold">
              {projectName.charAt(0)}
            </div>
          )}
          <h1 className="text-3xl font-extrabold text-white">{projectName}</h1>
          <p className="text-sm text-[#94a3b8]">Request access to the project cockpit</p>
        </div>

        <form onSubmit={submit} className="space-y-4 p-6 rounded-xl border border-[#1e293b]" style={{ backgroundColor: "#0d1117" }}>
          <div>
            <label className="block text-[10px] text-[#475569] font-bold uppercase mb-1">Full Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none focus:border-blue-500" required />
          </div>
          <div>
            <label className="block text-[10px] text-[#475569] font-bold uppercase mb-1">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none focus:border-blue-500" required />
          </div>
          <div>
            <label className="block text-[10px] text-[#475569] font-bold uppercase mb-1">LinkedIn (optional)</label>
            <input type="url" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
              className="w-full py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-[10px] text-[#475569] font-bold uppercase mb-1">I want to join as</label>
            <div className="space-y-2">
              {ROLES.map((role) => (
                <label key={role.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all"
                  style={{ borderColor: form.role === role.id ? role.color : "#1e293b", backgroundColor: form.role === role.id ? role.color + "08" : "transparent" }}>
                  <input type="radio" name="role" value={role.id} checked={form.role === role.id}
                    onChange={(e) => setForm({ ...form, role: e.target.value })} className="sr-only" />
                  <div className="w-3 h-3 rounded-full border-2 flex items-center justify-center" style={{ borderColor: form.role === role.id ? role.color : "#334155" }}>
                    {form.role === role.id && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: role.color }} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: form.role === role.id ? role.color : "#e2e8f0" }}>{role.label}</p>
                    <p className="text-[10px] text-[#475569]">{role.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-[#475569] font-bold uppercase mb-1">Why do you want to join? (optional)</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3}
              className="w-full py-2.5 px-3 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none focus:border-blue-500 resize-none" />
          </div>
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}
          <button type="submit" disabled={sending} className="w-full py-3 text-sm font-bold rounded-lg text-white bg-blue-500 hover:bg-blue-600 transition disabled:opacity-50">
            {sending ? "Submitting..." : "Request Access"}
          </button>
        </form>

        <p className="text-center text-[10px] text-[#334155]">Powered by <a href="https://github.com/alexwill87/startup-os" className="text-[#475569] hover:text-white">Startup OS</a></p>
      </div>
    </div>
  );
}
