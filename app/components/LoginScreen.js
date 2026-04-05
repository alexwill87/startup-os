"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <span className="login-icon">&#x1F6E1;</span>
          <h1>
            Radar <span className="accent">Cockpit</span>
          </h1>
          <p className="subtitle">Internal team dashboard</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="restricted">Restricted to Radar team members only.</p>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #080c14;
          font-family: var(--font-geist-sans);
        }
        .login-card {
          width: 100%;
          max-width: 380px;
          background: #0d1117;
          border: 1px solid #1e293b;
          border-radius: 16px;
          padding: 32px;
        }
        .login-header {
          text-align: center;
          margin-bottom: 28px;
        }
        .login-icon {
          font-size: 40px;
          display: block;
          margin-bottom: 12px;
        }
        h1 {
          font-size: 24px;
          font-weight: 800;
          color: #f1f5f9;
          margin: 0;
        }
        .accent {
          color: #3b82f6;
        }
        .subtitle {
          color: #475569;
          font-size: 13px;
          margin-top: 6px;
          font-family: var(--font-geist-mono);
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 8px;
          border: 1px solid #1e293b;
          background: #0a0f1a;
          color: #f1f5f9;
          font-size: 13px;
          font-family: var(--font-geist-mono);
          outline: none;
          box-sizing: border-box;
        }
        input:focus {
          border-color: #3b82f6;
        }
        button {
          padding: 12px;
          border-radius: 8px;
          border: none;
          background: linear-gradient(135deg, #1e3a5f, #2d1b69);
          color: #93c5fd;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          font-family: var(--font-geist-mono);
          margin-top: 4px;
        }
        button:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        .error {
          background: #1a0a0a;
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 8px 12px;
          color: #ef4444;
          font-size: 12px;
        }
        .restricted {
          text-align: center;
          color: #334155;
          font-size: 11px;
          margin-top: 20px;
          font-family: var(--font-geist-mono);
        }
      `}</style>
    </div>
  );
}
