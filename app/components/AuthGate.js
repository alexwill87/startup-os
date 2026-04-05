"use client";

import { useAuth } from "@/lib/AuthProvider";
import { ALLOWED_EMAILS } from "@/lib/supabase";
import LoginScreen from "./LoginScreen";
import Navbar from "./Navbar";

export default function AuthGate({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080c14",
          color: "#475569",
          fontFamily: "var(--font-geist-mono)",
          fontSize: 14,
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user || !ALLOWED_EMAILS.includes(user.email)) {
    return <LoginScreen />;
  }

  return (
    <>
      <Navbar />
      <main style={{ padding: 24 }}>{children}</main>
    </>
  );
}
