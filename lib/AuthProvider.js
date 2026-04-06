"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMember(authUser) {
    if (!authUser?.email) {
      setMember(null);
      return;
    }

    const { data } = await supabase
      .from("cockpit_members")
      .select("*")
      .eq("email", authUser.email)
      .in("status", ["active", "invited"])
      .single();

    if (data) {
      setMember(data);

      // If member was "invited" and just logged in, mark as active + link user_id
      if (data.status === "invited") {
        await supabase
          .from("cockpit_members")
          .update({ status: "active", user_id: authUser.id, last_seen_at: new Date().toISOString() })
          .eq("id", data.id);
      } else {
        // Update last seen
        await supabase
          .from("cockpit_members")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", data.id);
      }
    } else {
      setMember(null);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadMember(u).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        loadMember(u);
      } else {
        setMember(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Backward-compatible "builder" alias
  const builder = member
    ? { name: member.name, role: member.builder || "?", color: member.color || "#3b82f6", branch: member.name?.toLowerCase() }
    : null;

  return (
    <AuthContext.Provider value={{ user, member, builder, loading, isAdmin: member?.role === "admin" || member?.role === "cofounder" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
