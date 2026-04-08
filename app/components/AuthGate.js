"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";
import LoginScreen from "./LoginScreen";
import Sidebar from "./Sidebar";
import FeedbackWidget from "./FeedbackWidget";
import ChatPanel from "./ChatPanel";

const PUBLIC_ROUTES = ["/apply"];

export default function AuthGate({ children }) {
  const pathname = usePathname();
  const { user, member, loading } = useAuth();

  // Public routes bypass auth entirely
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return children;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#080c14" }}>
        <span className="text-[#475569] text-sm font-mono">Loading...</span>
      </div>
    );
  }

  // Not logged in, or not a member
  if (!user || !member) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main
        className="min-h-screen p-8 lg:p-10 overflow-y-auto"
        style={{ marginLeft: "260px" }}
      >
        <div className="max-w-[1200px]">
          {children}
        </div>
      </main>
      <FeedbackWidget />
      <ChatPanel />
    </div>
  );
}
