"use client";

import { useAuth } from "@/lib/AuthProvider";
import { ALLOWED_EMAILS } from "@/lib/supabase";
import LoginScreen from "./LoginScreen";
import Sidebar from "./Sidebar";

export default function AuthGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
        <span className="text-[#475569] text-sm font-mono">Loading...</span>
      </div>
    );
  }

  if (!user || !ALLOWED_EMAILS.includes(user.email)) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-[260px] p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
