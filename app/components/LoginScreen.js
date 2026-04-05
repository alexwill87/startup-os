"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [mode, setMode] = useState("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (mode === "magic") {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      });
      if (error) setError(error.message);
      else setSuccess("Check your inbox — we sent you a login link.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
      <div className="w-full max-w-[380px] px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">&#x1F6E1;</div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Project <span className="text-[#3b82f6]">OS</span>
          </h1>
          <p className="text-[#475569] text-xs font-mono mt-2">
            Team dashboard for builders
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#0d1117] border border-[#1e293b] rounded-2xl p-7">
          {/* Mode toggle */}
          <div className="flex bg-[#0a0f1a] rounded-lg p-1 gap-1 mb-6">
            {[["magic", "Magic Link"], ["signin", "Password"]].map(([m, label]) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className={`flex-1 py-2 rounded-md text-xs font-mono transition-all ${
                  mode === m
                    ? "bg-[#1e3a5f] text-[#93c5fd] font-bold"
                    : "text-[#475569] hover:text-[#94a3b8]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full py-3 px-4 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm font-mono outline-none focus:border-[#3b82f6] transition-colors"
            />

            {mode === "signin" && (
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full py-3 px-4 rounded-lg border border-[#1e293b] bg-[#0a0f1a] text-white text-sm font-mono outline-none focus:border-[#3b82f6] transition-colors"
              />
            )}

            {error && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg py-2.5 px-3 text-red-400 text-xs font-mono">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg py-2.5 px-3 text-emerald-400 text-xs font-mono">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-[#1e3a5f] to-[#2d1b69] text-[#93c5fd] text-sm font-bold font-mono hover:opacity-90 disabled:opacity-50 disabled:cursor-wait transition-opacity"
            >
              {loading
                ? "..."
                : mode === "magic"
                ? "Send Login Link"
                : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-[#334155] text-[11px] font-mono mt-5">
          Invitation only — ask your team admin for access.
        </p>
      </div>
    </div>
  );
}
