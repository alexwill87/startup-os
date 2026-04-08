"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function LoginScreen() {
  const [pName, setPName] = useState("");
  const [pLogo, setPLogo] = useState(null);
  const [pDesc, setPDesc] = useState("");
  const [pFeatures, setPFeatures] = useState([]);
  const [email, setEmail] = useState("");

  useEffect(() => {
    fetch("/api/project").then((r) => r.json()).then((d) => {
      if (d.name) setPName(d.name);
      if (d.logo) setPLogo(d.logo);
      if (d.description) setPDesc(d.description);
      if (d.features?.length) setPFeatures(d.features);
    }).catch(() => {});
  }, []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
    });
    if (error) setError(error.message);
    else setSuccess("Check your inbox — we sent you a login link.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen" style={{ background: "#080c14" }}>
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-12">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            {pLogo && <img src={pLogo} alt="" className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-contain" />}
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              {pName || "Startup OS"}
            </h1>
          </div>
          <p className="text-lg text-[#94a3b8] max-w-2xl mx-auto leading-relaxed">
            {pDesc || "Your startup cockpit. Define, vote, build, and ship — together."}
          </p>
        </div>
      </div>

      {/* Features grid */}
      {pFeatures.filter((f) => f.title).length > 0 && (
        <div className="max-w-4xl mx-auto px-6 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pFeatures.filter((f) => f.title).map((f, i) => (
              <div key={i} className="p-5 rounded-xl border border-[#1e293b] bg-[#0d1117]">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 text-lg font-bold mb-3">{f.icon || "+"}</div>
                <h3 className="text-sm font-bold text-white mb-1">{f.title}</h3>
                <p className="text-xs text-[#64748b]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Login + Apply */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Login */}
          <div className="p-6 rounded-xl border border-[#1e293b] bg-[#0d1117]">
            <h2 className="text-base font-bold text-white mb-1">Team Member?</h2>
            <p className="text-xs text-[#475569] mb-4">Sign in with your email to access the cockpit.</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@email.com"
                className="w-full py-3 px-4 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm outline-none focus:border-blue-500" />
              {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">{error}</p>}
              {success && <p className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg py-2 px-3">{success}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-lg text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 transition disabled:opacity-50">
                {loading ? "Sending..." : "Send Login Link"}
              </button>
            </form>
          </div>

          {/* Apply */}
          <div className="p-6 rounded-xl border border-[#1e293b] bg-[#0d1117]">
            <h2 className="text-base font-bold text-white mb-1">Want to Join?</h2>
            <p className="text-xs text-[#475569] mb-4">Apply for access as a mentor, observer, or co-founder.</p>
            <div className="space-y-3">
              {[
                { role: "Observer", desc: "Follow progress, see KPIs, give feedback", color: "#64748b" },
                { role: "Mentor", desc: "Advise the team, vote on goals and decisions", color: "#10b981" },
                { role: "Co-founder", desc: "Join the core team, build and ship", color: "#3b82f6" },
              ].map((r) => (
                <div key={r.role} className="flex items-center gap-3 p-3 rounded-lg border border-[#1e293b]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                  <div className="flex-1">
                    <p className="text-xs font-bold" style={{ color: r.color }}>{r.role}</p>
                    <p className="text-[10px] text-[#475569]">{r.desc}</p>
                  </div>
                </div>
              ))}
              <Link href="/apply"
                className="block w-full py-3 rounded-lg text-sm font-bold text-center text-purple-400 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition">
                Request Access
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-[#1e293b] py-6 text-center">
        <p className="text-[10px] text-[#334155]">
          Powered by <a href="https://github.com/alexwill87/startup-os" target="_blank" rel="noopener noreferrer" className="text-[#475569] hover:text-white">Startup OS</a>
        </p>
      </div>
    </div>
  );
}
